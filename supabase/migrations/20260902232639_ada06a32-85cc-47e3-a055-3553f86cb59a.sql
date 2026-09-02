ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS logos jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.logo_requests ADD COLUMN IF NOT EXISTS extra_logos jsonb NOT NULL DEFAULT '[]'::jsonb;