-- Allow any authenticated staff member to read display_name/email of other users.
-- This is required so production/logistics views can show the advisor's name
-- for orders they did not create themselves.
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
