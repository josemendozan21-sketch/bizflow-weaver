
-- Staff members
CREATE TABLE public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  area text NOT NULL CHECK (area IN ('estampacion','produccion','logistica')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_members TO authenticated;
GRANT ALL ON public.staff_members TO service_role;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view staff_members"
  ON public.staff_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages staff_members"
  ON public.staff_members FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Attendance
CREATE TABLE public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  work_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Bogota')::date,
  check_in_at timestamptz,
  check_out_at timestamptz,
  check_in_photo_url text,
  check_out_photo_url text,
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_attendance_staff_date ON public.staff_attendance(staff_id, work_date);
CREATE INDEX idx_staff_attendance_date ON public.staff_attendance(work_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_attendance TO authenticated;
GRANT ALL ON public.staff_attendance TO service_role;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view staff_attendance"
  ON public.staff_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert staff_attendance"
  ON public.staff_attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update staff_attendance"
  ON public.staff_attendance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin deletes staff_attendance"
  ON public.staff_attendance FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_staff_members_updated
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_staff_attendance_updated
  BEFORE UPDATE ON public.staff_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed staff
INSERT INTO public.staff_members (full_name, area) VALUES
  ('Luciana', 'estampacion'),
  ('Mary', 'estampacion'),
  ('Luisa', 'estampacion'),
  ('Sebastián', 'produccion'),
  ('Helena', 'produccion'),
  ('Luz', 'produccion'),
  ('Mauricio', 'produccion'),
  ('Samuel', 'produccion'),
  ('Ingrid', 'produccion'),
  ('Jailin', 'logistica');

-- Storage bucket for attendance photos
INSERT INTO storage.buckets (id, name, public) VALUES ('attendance-photos', 'attendance-photos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Attendance photos public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'attendance-photos');
CREATE POLICY "Authenticated upload attendance photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attendance-photos');
CREATE POLICY "Authenticated update attendance photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'attendance-photos');
