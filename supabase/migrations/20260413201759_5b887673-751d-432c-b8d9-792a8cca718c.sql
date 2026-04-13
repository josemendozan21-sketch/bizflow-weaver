-- Add stamping approval columns to production_orders
ALTER TABLE public.production_orders
  ADD COLUMN stamp_size_photo_url text,
  ADD COLUMN stamp_size_status text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN stamp_size_approved_at timestamptz,
  ADD COLUMN stamp_inkgel_photo_url text,
  ADD COLUMN stamp_inkgel_status text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN stamp_inkgel_approved_at timestamptz,
  ADD COLUMN stamp_advisor_feedback text;

-- Create storage bucket for stamping photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('stamping-photos', 'stamping-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for stamping photos
CREATE POLICY "Anyone can view stamping photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'stamping-photos');

CREATE POLICY "Authenticated users can upload stamping photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stamping-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update stamping photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'stamping-photos' AND auth.role() = 'authenticated');
