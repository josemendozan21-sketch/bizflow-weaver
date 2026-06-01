import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

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

    const order = {
      // Pedidos que entran desde la web de Sweatspot SIEMPRE son ventas al detal
      // de producto terminado de la marca Sweatspot. Forzamos estos valores para
      // que entren al flujo correcto (inventarios + logística al detal) sin
      // depender de lo que envíe el cliente.
      brand: 'sweatspot',
      sale_type: 'detal',
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
      production_status: 'pendiente',
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error } = await supabase.from('orders').insert(order).select().single()

    if (error) {
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