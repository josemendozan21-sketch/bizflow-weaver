
DROP POLICY IF EXISTS "Authenticated insert staff_attendance" ON public.staff_attendance;
DROP POLICY IF EXISTS "Authenticated update staff_attendance" ON public.staff_attendance;

CREATE POLICY "Authenticated insert staff_attendance" ON public.staff_attendance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update staff_attendance" ON public.staff_attendance
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
