
CREATE TABLE public.social_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_ideas TO authenticated;
GRANT ALL ON public.social_ideas TO service_role;
ALTER TABLE public.social_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read ideas" ON public.social_ideas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert ideas" ON public.social_ideas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update ideas" ON public.social_ideas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete ideas" ON public.social_ideas FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_social_ideas_updated BEFORE UPDATE ON public.social_ideas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.social_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_events TO authenticated;
GRANT ALL ON public.social_events TO service_role;
ALTER TABLE public.social_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read events" ON public.social_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert events" ON public.social_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update events" ON public.social_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete events" ON public.social_events FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_social_events_updated BEFORE UPDATE ON public.social_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
