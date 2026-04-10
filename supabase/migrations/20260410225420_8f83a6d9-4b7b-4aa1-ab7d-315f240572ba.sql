
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_role public.app_role NOT NULL,
  target_user_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  reference_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can see notifications for their role or directed to them
CREATE POLICY "Users can view own role notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  public.get_user_role(auth.uid()) = target_role
  OR target_user_id = auth.uid()
);

-- Admins can manage all
CREATE POLICY "Admins can manage all notifications"
ON public.notifications
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Authorized roles can insert notifications
CREATE POLICY "Authorized roles can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'asesor_comercial'::public.app_role)
  OR public.has_role(auth.uid(), 'produccion'::public.app_role)
);

-- Users can mark their notifications as read
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  public.get_user_role(auth.uid()) = target_role
  OR target_user_id = auth.uid()
)
WITH CHECK (
  public.get_user_role(auth.uid()) = target_role
  OR target_user_id = auth.uid()
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Index for faster queries
CREATE INDEX idx_notifications_target_role ON public.notifications (target_role, read, created_at DESC);
CREATE INDEX idx_notifications_target_user ON public.notifications (target_user_id, read, created_at DESC);
