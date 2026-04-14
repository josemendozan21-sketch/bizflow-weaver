INSERT INTO storage.buckets (id, name, public) VALUES ('finished-products', 'finished-products', true);

CREATE POLICY "Authenticated can upload finished photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'finished-products');
CREATE POLICY "Anyone can view finished photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'finished-products');