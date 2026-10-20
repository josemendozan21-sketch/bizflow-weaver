import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Envía a Bionovations Direct los eventos pendientes de sus pedidos.
// Se despierta al encolar un evento y cada hora como respaldo de reintentos.
const TARGET = 'https://uizcgbsxvdzbssorfygi.supabase.co/functions/v1/internal-order-event'
const MAX_ATTEMPTS = 10

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const token = Deno.env.get('BIONOVATIONS_WEBHOOK_TOKEN') ?? ''
  if (!token) return json({ error: 'Token not configured' }, 500)
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const { data: events, error } = await sb
    .from('external_order_events')
    .select('id, payload, attempts')
    .eq('status', 'pendiente')
    .lte('next_attempt_at', new Date().toISOString())
    .order('created_at')
    .limit(50)
  if (error) return json({ error: error.message }, 500)

  let sent = 0, failed = 0
  for (const ev of events ?? []) {
    // Reclamar el evento para evitar envíos dobles si corren dos despachadores
    const { data: claimed } = await sb
      .from('external_order_events')
      .update({ status: 'enviando' })
      .eq('id', ev.id).eq('status', 'pendiente')
      .select('id')
    if (!claimed?.length) continue
    let errText: string | null = null
    try {
      const res = await fetch(TARGET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-webhook-token': token },
        body: JSON.stringify(ev.payload),
      })
      if (!res.ok) errText = `[${res.status}] ${(await res.text()).slice(0, 500)}`
      else await res.body?.cancel()
    } catch (e) {
      errText = String((e as Error)?.message ?? e)
    }
    if (!errText) {
      sent++
      await sb.from('external_order_events')
        .update({ status: 'enviado', sent_at: new Date().toISOString(), attempts: ev.attempts + 1, last_error: null })
        .eq('id', ev.id)
    } else {
      failed++
      const attempts = ev.attempts + 1
      const delayMin = Math.min(2 ** attempts, 360)
      await sb.from('external_order_events').update({
        status: attempts >= MAX_ATTEMPTS ? 'fallido' : 'pendiente',
        attempts,
        last_error: errText,
        next_attempt_at: new Date(Date.now() + delayMin * 60_000).toISOString(),
      }).eq('id', ev.id)
      console.error('Event delivery failed', ev.id, errText)
    }
  }
  return json({ ok: true, sent, failed })
})
