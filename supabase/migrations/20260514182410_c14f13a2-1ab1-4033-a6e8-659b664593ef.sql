
ALTER TABLE public.pos_sales
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS client_document TEXT,
  ADD COLUMN IF NOT EXISTS discount NUMERIC NOT NULL DEFAULT 0;

INSERT INTO storage.buckets (id, name, public)
VALUES ('pos-product-photos', 'pos-product-photos', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='POS photos public read'
  ) THEN
    CREATE POLICY "POS photos public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'pos-product-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='POS photos authenticated upload'
  ) THEN
    CREATE POLICY "POS photos authenticated upload"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'pos-product-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='POS photos authenticated update'
  ) THEN
    CREATE POLICY "POS photos authenticated update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'pos-product-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='POS photos authenticated delete'
  ) THEN
    CREATE POLICY "POS photos authenticated delete"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'pos-product-photos');
  END IF;
END $$;
