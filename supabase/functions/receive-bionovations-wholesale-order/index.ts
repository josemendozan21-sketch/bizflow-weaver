import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

const ADVISOR_ID = '00000000-0000-0000-0000-000000000003'
const ADVISOR_NAME = 'Bionovations Mayorista Web'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const str = z.string().trim().max(1000).optional().nullable()
const Line = z.object({
  product: z.string().trim().min(1).max(200),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative().optional().nullable(),
  ink_count: z.number().int().min(1).max(3).optional().nullable(),
  ink_color: str, ink_color_2: str, ink_color_3: str,
  glitter_color: str, silicone_color: str, gel_color: str,
  logo_url: str, logo_url_2: str, logo_name: str, logo_name_2: str,
  personalization: str, observations: str,
})
const Body = z.object({
  external_order_id: z.string().trim().min(1).max(200),
  client_name: z.string().trim().min(1).max(200),
  client_nit: str, client_phone: str, client_email: str,
  client_address: str, client_address_complement: str, client_city: str,
  payment_method: str, payment_reference: str, payment_proof_url: str,
  abono: z.number().nonnegative().optional().nullable(),
  payment_complete: z.boolean().optional().nullable(),
  made_to_order: z.boolean().optional().default(false),
  shipping_cost: z.number().nonnegative().optional().nullable(),
  delivery_date: str,
  observations: str,
  lines: z.array(Line).min(1).max(50),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const expected = Deno.env.get('BIONOVATIONS_WEBHOOK_TOKEN') ?? ''
    if (!expected || (req.headers.get('x-webhook-token') ?? '') !== expected) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const parsed = Body.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400)
    const b = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const ext = b.external_order_id
    const findExisting = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_code, external_order_id')
        .or(`external_order_id.eq.${JSON.stringify(ext)},external_order_id.like.${JSON.stringify(ext + '#%')}`)
      return data ?? []
    }
    const existing = await findExisting()
    if (existing.length) {
      return json({
        ok: true, duplicate: true,
        order_code: existing[0].order_code,
        order_ids: existing.map((o) => o.id),
      })
    }

    const total = b.lines.reduce((s, l) => s + (l.unit_price ?? 0) * l.quantity, 0)
    const insertedIds: string[] = []
    let orderCode: string | null = null

    for (let i = 0; i < b.lines.length; i++) {
      const l = b.lines[i]
      const inkCount = l.ink_count ?? (l.ink_color_3 ? 3 : l.ink_color_2 ? 2 : 1)
      const lineTotal = (l.unit_price ?? 0) * l.quantity
      const row: Record<string, unknown> = {
        brand: 'magical_warmers',
        sale_type: 'mayor',
        client_name: b.client_name,
        client_nit: b.client_nit ?? null,
        client_phone: b.client_phone ?? null,
        client_email: b.client_email ?? null,
        client_address: b.client_address ?? null,
        client_address_complement: b.client_address_complement ?? null,
        client_city: b.client_city ?? null,
        product: l.product,
        quantity: l.quantity,
        unit_price: l.unit_price ?? null,
        total_amount: l.unit_price != null ? lineTotal : null,
        // El abono se reparte proporcionalmente entre líneas
        abono: b.abono != null && total > 0 ? Math.round((b.abono * lineTotal) / total) : (i === 0 ? b.abono ?? null : null),
        ink_count: inkCount,
        ink_color: l.ink_color ?? null,
        ink_color_2: inkCount >= 2 ? l.ink_color_2 ?? null : null,
        ink_color_3: inkCount >= 3 ? l.ink_color_3 ?? null : null,
        glitter_color: l.glitter_color ?? null,
        silicone_color: l.silicone_color ?? null,
        gel_color: l.gel_color ?? null,
        logo_url: l.logo_url ?? null,
        logo_url_2: l.logo_url_2 ?? null,
        logo_name: l.logo_name ?? null,
        logo_name_2: l.logo_name_2 ?? null,
        logo_count: l.logo_url_2 ? 2 : l.logo_url ? 1 : 0,
        personalization: l.personalization ?? null,
        observations: [b.made_to_order ? 'BAJO PEDIDO' : null, b.observations, l.observations].filter(Boolean).join(' · ') || null,
        payment_method: b.payment_method ?? null,
        payment_reference: b.payment_reference ?? null,
        payment_proof_url: b.payment_proof_url ?? null,
        payment_complete: b.payment_complete ?? false,
        shipping_cost: i === 0 ? b.shipping_cost ?? null : null,
        delivery_date: b.delivery_date ?? null,
        is_made_to_order: b.made_to_order,
        advisor_id: ADVISOR_ID,
        advisor_name: ADVISOR_NAME,
        production_status: 'pendiente',
        external_order_id: i === 0 ? ext : `${ext}#${i + 1}`,
        line_index: i + 1,
        line_count: b.lines.length,
      }
      if (orderCode) row.order_code = orderCode
      const { data, error } = await supabase.from('orders').insert(row).select('id, order_code').single()
      if (error) {
        if (error.code === '23505' && i === 0) {
          const again = await findExisting()
          return json({ ok: true, duplicate: true, order_code: again[0]?.order_code ?? null, order_ids: again.map((o) => o.id) })
        }
        console.error('Insert error:', error)
        return json({ error: error.message, inserted_order_ids: insertedIds }, 500)
      }
      insertedIds.push(data.id)
      orderCode = orderCode ?? data.order_code
    }

    return json({ ok: true, duplicate: false, order_code: orderCode, order_ids: insertedIds })
  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: String(err) }, 500)
  }
})
