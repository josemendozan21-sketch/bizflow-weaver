import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    const provided = req.headers.get('x-webhook-token') ?? ''
    const expected = Deno.env.get('SWEATSPOT_WEBHOOK_TOKEN') ?? ''
    if (!expected || provided !== expected) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return json({ error: 'Invalid JSON body' }, 400)

    const action = String((body as Record<string, unknown>).action ?? '').trim()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    )

    // Housekeeping: libera reservas vencidas en cada llamada
    await supabase.rpc('expire_web_reservations')

    const b = body as Record<string, unknown>

    if (action === 'availability') {
      const raw = b.ref_keys ?? b.ref_key
      const refKeys = Array.isArray(raw)
        ? raw.map((k) => String(k))
        : raw
          ? [String(raw)]
          : null
      const { data, error } = await supabase.rpc('web_check_availability', { _ref_keys: refKeys })
      if (error) return json({ error: error.message }, 500)
      return json({ success: true, items: data ?? [] })
    }

    if (action === 'reserve') {
      const external_id = String(b.external_id ?? '').trim()
      const ref_key = String(b.ref_key ?? '').trim()
      const quantity = Number(b.quantity ?? 0)
      if (!external_id || !ref_key || !quantity || quantity <= 0) {
        return json({ error: 'Missing required fields: external_id, ref_key, quantity' }, 400)
      }
      const { data, error } = await supabase.rpc('web_reserve_stock', {
        _external_id: external_id,
        _ref_key: ref_key,
        _quantity: quantity,
      })
      if (error) return json({ error: error.message }, 500)
      const result = data as Record<string, unknown>
      return json(result, result?.success ? 200 : 409)
    }

    if (action === 'confirm' || action === 'release') {
      const external_id = String(b.external_id ?? '').trim()
      if (!external_id) return json({ error: 'Missing required field: external_id' }, 400)
      const { data, error } =
        action === 'confirm'
          ? await supabase.rpc('web_confirm_reservation', { _external_id: external_id })
          : await supabase.rpc('web_release_reservation', {
              _external_id: external_id,
              _reason: b.reason ? String(b.reason) : null,
            })
      if (error) return json({ error: error.message }, 500)
      const result = data as Record<string, unknown>
      return json(result, result?.success ? 200 : 409)
    }

    if (action === 'expire') {
      const { data, error } = await supabase.rpc('expire_web_reservations')
      if (error) return json({ error: error.message }, 500)
      return json({ success: true, expired: data ?? 0 })
    }

    return json({ error: 'Unknown action. Use availability | reserve | confirm | release | expire' }, 400)
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
