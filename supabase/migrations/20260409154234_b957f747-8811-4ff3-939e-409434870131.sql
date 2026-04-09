
-- Create event type enum
CREATE TYPE public.event_type AS ENUM ('feria', 'carrera', 'activacion');

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  city TEXT NOT NULL,
  event_type public.event_type NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event products table
CREATE TABLE public.event_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Magical',
  quantity_needed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_products ENABLE ROW LEVEL SECURITY;

-- Policies for events
CREATE POLICY "Authenticated users can view events"
  ON public.events FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage events"
  ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Asesor comercial can manage events"
  ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'asesor_comercial'));

-- Policies for event_products
CREATE POLICY "Authenticated users can view event products"
  ON public.event_products FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage event products"
  ON public.event_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Asesor comercial can manage event products"
  ON public.event_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'asesor_comercial'));

-- Trigger for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
