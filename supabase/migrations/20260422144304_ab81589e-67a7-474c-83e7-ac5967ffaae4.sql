UPDATE public.production_orders
SET stamp_size_status = 'aprobado',
    stamp_size_approved_at = COALESCE(stamp_size_approved_at, now()),
    stamp_inkgel_status = 'aprobado',
    stamp_inkgel_approved_at = COALESCE(stamp_inkgel_approved_at, now()),
    stage_status = 'en_proceso',
    stamp_advisor_feedback = NULL
WHERE id = 'e965e589-aa1d-4b36-ad94-fd1e3f6f210b';