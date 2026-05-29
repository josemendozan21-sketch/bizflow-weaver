
-- 1. Fix corrupted negative balance before aggregation
UPDATE public.stock_items
   SET available = 0
 WHERE id = '06a11816-808f-4a59-a0b9-7e791f7845aa'
   AND available < 0;

-- Also normalize any other accidentally-negative balances to 0 so the sum is meaningful
UPDATE public.stock_items SET available = 0 WHERE available < 0;
UPDATE public.stock_items SET in_process = 0 WHERE in_process < 0;

-- 2. Consolidate duplicates: for each (name, brand, category) keep the oldest row
WITH ranked AS (
  SELECT id, name, brand, category, available, in_process, created_at,
         ROW_NUMBER() OVER (PARTITION BY name, brand, category ORDER BY created_at ASC, id ASC) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY name, brand, category ORDER BY created_at ASC, id ASC) AS keep_id
  FROM public.stock_items
),
dupes AS (
  SELECT id AS old_id, keep_id, available, in_process
  FROM ranked
  WHERE rn > 1
),
totals AS (
  SELECT keep_id,
         SUM(available)  AS extra_available,
         SUM(in_process) AS extra_in_process
  FROM dupes
  GROUP BY keep_id
)
-- Sum duplicates' stock into the kept row
UPDATE public.stock_items s
   SET available  = s.available  + t.extra_available,
       in_process = s.in_process + t.extra_in_process
  FROM totals t
 WHERE s.id = t.keep_id;

-- 3. Reassign historical inventory_movements to the kept row, then delete duplicate rows
WITH ranked AS (
  SELECT id,
         FIRST_VALUE(id) OVER (PARTITION BY name, brand, category ORDER BY created_at ASC, id ASC) AS keep_id,
         ROW_NUMBER()    OVER (PARTITION BY name, brand, category ORDER BY created_at ASC, id ASC) AS rn
  FROM public.stock_items
),
dupes AS (
  SELECT id AS old_id, keep_id FROM ranked WHERE rn > 1
)
UPDATE public.inventory_movements m
   SET stock_item_id = d.keep_id
  FROM dupes d
 WHERE m.stock_item_id = d.old_id;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY name, brand, category ORDER BY created_at ASC, id ASC) AS rn
  FROM public.stock_items
)
DELETE FROM public.stock_items
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 4. Prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS stock_items_name_brand_category_unique
  ON public.stock_items (name, brand, category);
