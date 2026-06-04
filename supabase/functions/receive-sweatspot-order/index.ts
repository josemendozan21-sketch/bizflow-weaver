import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Auth: shared token via header
    const provided = req.headers.get('x-webhook-token') ?? ''
    const expected = Deno.env.get('SWEATSPOT_WEBHOOK_TOKEN') ?? ''
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Required fields
    const client_name = String(body.client_name ?? '').trim()
    const product = String(body.product ?? '').trim()
    const quantity = Number(body.quantity ?? 0)

    if (!client_name || !product || !quantity || quantity <= 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: client_name, product, quantity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const SWEATSPOT_WEB_ADVISOR_ID = '00000000-0000-0000-0000-000000000001'

    // Dedup determinístico: si el cliente envía external_order_id lo usamos,
    // si no, generamos un hash estable del payload + ventana de 10 min para
    // bloquear reentregas duplicadas del webhook (mismo pedido, segundos aparte)
    // sin bloquear recompras legítimas días después.
    const providedExternalId = body.external_order_id
      ? String(body.external_order_id).trim()
      : null
    const dedupWindow = Math.floor(Date.now() / (1000 * 60 * 10)) // bucket 10 min
    const dedupKey = providedExternalId
      ? providedExternalId
      : 'sw:' + (await sha256Hex([
          client_name,
          product,
          String(quantity),
          String(body.client_phone ?? ''),
          String(body.client_email ?? ''),
          String(body.total_amount ?? ''),
          String(dedupWindow),
        ].join('|'))).slice(0, 32)

    const order = {
      // Pedidos que entran desde la web de Sweatspot SIEMPRE son ventas al detal
      // de producto terminado de la marca Sweatspot. Forzamos estos valores para
      // que entren al flujo correcto (inventarios + logística al detal) sin
      // depender de lo que envíe el cliente.
      brand: 'sweatspot',
      sale_type: 'menor',
      client_name,
      client_nit: body.client_nit ?? null,
      client_phone: body.client_phone ?? null,
      client_email: body.client_email ?? null,
      client_address: body.client_address ?? null,
      client_city: body.client_city ?? null,
      product,
      quantity: Math.floor(quantity),
      unit_price: body.unit_price ?? null,
      total_amount: body.total_amount ?? null,
      abono: body.abono ?? null,
      ink_color: body.ink_color ?? null,
      gel_color: body.gel_color ?? null,
      silicone_color: body.silicone_color ?? null,
      observations: body.observations ?? null,
      personalization: body.personalization ?? null,
      payment_method: body.payment_method ?? null,
      payment_proof_url: body.payment_proof_url ?? null,
      payment_complete: body.payment_complete ?? null,
      shipping_cost: body.shipping_cost ?? null,
      advisor_id: SWEATSPOT_WEB_ADVISOR_ID,
      advisor_name: String(body.advisor_name ?? 'Sweatspot Web'),
      // Los pedidos web de Sweatspot son producto terminado al detal: entran
      // directamente como "listo" para que aparezcan en Logística y se pueda
      // generar el rótulo de envío sin pasar por producción.
      production_status: 'listo',
      external_order_id: dedupKey,
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Si ya existe un pedido con este dedupKey, lo devolvemos como duplicado
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('external_order_id', dedupKey)
      .maybeSingle()
    if (existing) {
      return new Response(
        JSON.stringify({ ok: true, duplicate: true, order_id: existing.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data, error } = await supabase.from('orders').insert(order).select().single()

    if (error) {
      // Si chocamos con el índice único de external_order_id, es un duplicado
      // por carrera concurrente — devolvemos OK para que el webhook no reintente.
      if (String(error.message).includes('orders_external_order_id_unique_idx') ||
          String((error as any).code) === '23505') {
        return new Response(
          JSON.stringify({ ok: true, duplicate: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      console.error('Insert error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, order_id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unhandled error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})