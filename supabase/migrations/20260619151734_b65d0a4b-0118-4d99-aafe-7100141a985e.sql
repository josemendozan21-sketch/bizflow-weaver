
CREATE POLICY "Redes assets ver" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'social-media-assets' AND (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'disenador') OR public.has_role(auth.uid(),'community_manager')
));

CREATE POLICY "Redes assets insertar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'social-media-assets' AND (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'disenador') OR public.has_role(auth.uid(),'community_manager')
));

CREATE POLICY "Redes assets borrar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'social-media-assets' AND (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'disenador') OR public.has_role(auth.uid(),'community_manager')
));

CREATE POLICY "Redes assets actualizar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'social-media-assets' AND (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'disenador') OR public.has_role(auth.uid(),'community_manager')
));
