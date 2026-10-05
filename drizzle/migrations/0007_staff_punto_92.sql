ALTER TABLE public.staff_members DROP CONSTRAINT staff_members_area_check;
ALTER TABLE public.staff_members ADD CONSTRAINT staff_members_area_check CHECK (area IN ('estampacion','produccion','logistica','punto_92'));
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS staff_role text;
CREATE POLICY "POS adds punto_92 staff" ON public.staff_members FOR INSERT TO authenticated
  WITH CHECK (area = 'punto_92' AND (public.has_role(auth.uid(),'pos_punto'::app_role) OR public.has_role(auth.uid(),'admin'::app_role)));