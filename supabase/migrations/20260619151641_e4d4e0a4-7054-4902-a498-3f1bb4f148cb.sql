
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL CHECK (brand IN ('bionovations','sweatspot','magical')),
  scheduled_date date NOT NULL,
  title text NOT NULL,
  description text,
  hashtags text,
  networks text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'programado' CHECK (status IN ('idea','programado','publicado')),
  is_special_date boolean NOT NULL DEFAULT false,
  asset_url text,
  asset_path text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Redes ver" ON public.social_posts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'disenador') OR public.has_role(auth.uid(),'community_manager'));

CREATE POLICY "Redes insertar" ON public.social_posts FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'disenador') OR public.has_role(auth.uid(),'community_manager'));

CREATE POLICY "Redes actualizar" ON public.social_posts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'disenador') OR public.has_role(auth.uid(),'community_manager'));

CREATE POLICY "Redes borrar" ON public.social_posts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'disenador') OR public.has_role(auth.uid(),'community_manager'));

CREATE INDEX idx_social_posts_brand_date ON public.social_posts(brand, scheduled_date);

CREATE TRIGGER update_social_posts_updated_at
BEFORE UPDATE ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
