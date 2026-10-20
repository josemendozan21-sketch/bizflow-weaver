ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_made_to_order boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text;

CREATE OR REPLACE FUNCTION public.web_check_availability_v2(_ref_keys text[], _brand text, _categories text[], _kind text)
RETURNS TABLE(ref_key text, name text, brand text, category text, product_type text, color text, unit text, available numeric, in_process numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.ref_key, s.name, s.brand, s.category, s.product_type, s.color, s.unit,
         COALESCE(s.available,0)::numeric, COALESCE(s.in_process,0)::numeric
  FROM public.stock_items s
  WHERE (_ref_keys IS NULL OR s.ref_key = ANY(_ref_keys))
    AND (_brand IS NULL OR s.brand = _brand OR s.brand = 'ambas')
    AND (_categories IS NULL OR s.category = ANY(_categories))
    AND (_kind IS NULL OR (s.category = 'materia_prima' AND (
          (_kind = 'gel' AND s.name ~* '^(gel|carbopol|colorante|mezcla)')
       OR (_kind = 'silicona' AND s.name ~* '^silicona')
       OR (_kind = 'tinta' AND s.name ~* '^tinta')
       OR (_kind = 'escarcha' AND s.name ~* '^escarcha'))))
  ORDER BY s.brand, s.category, s.name;
$$;
REVOKE ALL ON FUNCTION public.web_check_availability_v2(text[], text, text[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.web_check_availability_v2(text[], text, text[], text) TO service_role;