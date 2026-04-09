-- Allow admins to insert user_roles (the ALL policy covers this but let's ensure delete works)
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));