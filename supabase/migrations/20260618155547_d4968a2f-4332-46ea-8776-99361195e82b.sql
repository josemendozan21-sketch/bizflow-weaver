
CREATE TABLE public.pos_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.pos_locations(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  event_type TEXT NOT NULL CHECK (event_type IN ('turno','cerrado','refuerzo','actividad')),
  title TEXT NOT NULL,
  notes TEXT,
  assigned_to TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_calendar_events TO authenticated;
GRANT ALL ON public.pos_calendar_events TO service_role;

ALTER TABLE public.pos_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage pos_calendar_events"
  ON public.pos_calendar_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "POS for location manage events"
  ON public.pos_calendar_events FOR ALL TO authenticated
  USING (public.is_pos_for_location(location_id))
  WITH CHECK (public.is_pos_for_location(location_id));

CREATE POLICY "Contabilidad read pos_calendar_events"
  ON public.pos_calendar_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'contabilidad'));

CREATE INDEX pos_calendar_events_location_date_idx
  ON public.pos_calendar_events (location_id, event_date);

CREATE TRIGGER update_pos_calendar_events_updated_at
  BEFORE UPDATE ON public.pos_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
