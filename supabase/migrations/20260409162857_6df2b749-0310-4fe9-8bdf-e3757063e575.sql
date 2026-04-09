INSERT INTO storage.buckets (id, name, public) VALUES ('molde-templates', 'molde-templates', true);

CREATE POLICY "Molde templates are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'molde-templates');

CREATE POLICY "Authenticated users can upload molde templates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'molde-templates' AND auth.role() = 'authenticated');