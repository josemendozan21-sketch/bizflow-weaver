-- 1) Add unique constraint so the upsert on source_production_order_id works
ALTER TABLE public.product_gallery
  ADD CONSTRAINT product_gallery_source_production_order_unique
  UNIQUE (source_production_order_id);

-- 2) Backfill existing finished production-order photos into the gallery
INSERT INTO public.product_gallery (
  brand, product_name, photo_url, storage_path,
  client_name, logo_reference, ink_color, gel_color, notes,
  uploaded_by, uploaded_by_name,
  source_order_id, source_production_order_id, created_at
)
SELECT
  po.brand,
  CASE
    WHEN po.brand = 'magical' AND po.molde IS NOT NULL AND po.molde <> ''
      THEN 'Magical Warmers — ' || po.molde
    WHEN po.brand = 'magical'
      THEN 'Magical Warmers'
    WHEN po.brand = 'sweatspot' AND po.thermo_size IS NOT NULL AND po.thermo_size <> ''
      THEN 'Termo ' || po.thermo_size
    ELSE 'Sweatspot'
  END AS product_name,
  po.finished_photo_url,
  COALESCE(
    NULLIF(split_part(po.finished_photo_url, '/object/public/finished-products/', 2), ''),
    NULLIF(split_part(po.finished_photo_url, '/object/public/product-gallery/', 2), ''),
    po.finished_photo_url
  ) AS storage_path,
  po.client_name,
  po.logo_file,
  po.ink_color,
  po.gel_color,
  po.observations,
  COALESCE(po.advisor_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(po.packager_name, 'Producción'),
  po.order_id,
  po.id,
  COALESCE(po.completed_at, po.updated_at, po.created_at)
FROM public.production_orders po
WHERE po.finished_photo_url IS NOT NULL
  AND po.finished_photo_url <> ''
ON CONFLICT (source_production_order_id) DO NOTHING;