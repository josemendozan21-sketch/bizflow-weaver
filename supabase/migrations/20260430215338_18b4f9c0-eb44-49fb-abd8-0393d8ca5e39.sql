ALTER TABLE public.product_gallery
  ADD COLUMN IF NOT EXISTS ink_color text,
  ADD COLUMN IF NOT EXISTS gel_color text,
  ADD COLUMN IF NOT EXISTS source_order_id uuid,
  ADD COLUMN IF NOT EXISTS source_production_order_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS product_gallery_source_production_order_id_key
  ON public.product_gallery (source_production_order_id)
  WHERE source_production_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_gallery_ink_color_idx ON public.product_gallery (ink_color);
CREATE INDEX IF NOT EXISTS product_gallery_gel_color_idx ON public.product_gallery (gel_color);