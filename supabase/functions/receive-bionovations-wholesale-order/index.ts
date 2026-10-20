import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

// Pedidos de Bionovations Direct: se tratan exactamente como si un asesor
// los creara en Ventas (Magical al por mayor).
const ADVISOR_ID = '00000000-0000-0000-0000-000000000003'
const ADVISOR_NAME = 'Bionovations Mayorista Web'
const IVA_RATE = 19
const MAX_LOGO_BYTES = 15 * 1024 * 1024

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const str = z.string().trim().max(2000).optional().nullable()
const LogoIn = z.object({ name: str, url: z.string().trim().url().max(2000) })
const Line = z.object({
  product: z.string().trim().min(1).max(200),
  type: str, // Frío / Térmico
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative().optional().nullable(),
  ink_count: z.number().int().min(1).max(3).optional().nullable(),
  ink_color: str, ink_color_2: str, ink_color_3: str,
  glitter_color: str, silicone_color: str, gel_color: str,
  logo_url: str, logo_url_2: str, logo_name: str, logo_name_2: str,
  personalization: str, observations: str,
  is_gift: z.boolean().optional().default(false),
})
const Body = z.object({
  external_order_id: z.string().trim().min(1).max(200),
  client_name: z.string().trim().min(1).max(200),
  client_nit: str, client_phone: str, client_email: str,
  client_address: str, client_address_complement: str, client_city: str,
  payment_method: str, payment_reference: str, payment_proof_url: str,
  payment_date: str,
  abono: z.number().nonnegative().optional().nullable(),
  payment_complete: z.boolean().optional().nullable(),
  price_includes_tax: z.boolean().optional().default(true),
  made_to_order: z.boolean().optional().default(false),
  is_recompra: z.boolean().optional().default(false),
  reuse_previous_logo: z.boolean().optional().default(false),
  logos: z.array(LogoIn).max(10).optional(),
  logo_instructions: str,
  shipping_cost: z.number().nonnegative().optional().nullable(),
  delivery_date: str,
  observations: str,
  lines: z.array(Line).min(1).max(50),
})

function normType(t?: string | null): string | null {
  if (!t) return null
  const n = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (n.startsWith('frio')) return 'Frío'
  if (n.startsWith('term') || n.startsWith('calor')) return 'Térmico'
  return t.trim()
}

function prorate(bases: number[], total: number): number[] {
  const out = bases.map(() => 0)
  const sum = bases.reduce((s, v) => s + v, 0)
  if (sum <= 0 || total <= 0) return out
  let last = -1
  bases.forEach((b, i) => { if (b > 0) last = i })
  let acc = 0
  bases.forEach((b, i) => {
    if (b <= 0) return
    if (i === last) out[i] = Math.max(total - acc, 0)
    else { out[i] = Math.round((total * b) / sum); acc += out[i] }
  })
  return out
}

/** Copia el logo a la plataforma para no depender de la página web. */
async function copyLogo(sb: SupabaseClient, url: string): Promise<string> {
  try {
    if (!/^https?:\/\//i.test(url)) return url
    const res = await fetch(url)
    if (!res.ok) { console.warn('Logo download failed', res.status, url); return url }
    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.byteLength === 0 || buf.byteLength > MAX_LOGO_BYTES) return url
    const ct = res.headers.get('content-type') ?? 'application/octet-stream'
    const fromUrl = url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
    const ext = /^[a-z0-9]{2,5}$/.test(fromUrl) ? fromUrl : (ct.split('/')[1]?.split('+')[0] ?? 'bin')
    const path = `originals/${crypto.randomUUID()}.${ext}`
    const { error } = await sb.storage.from('logo-files').upload(path, buf, { contentType: ct })
    if (error) { console.warn('Logo upload failed', error.message); return url }
    return sb.storage.from('logo-files').getPublicUrl(path).data.publicUrl
  } catch (e) {
    console.warn('Logo copy error', e)
    return url
  }
}

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

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const ext = b.external_order_id
    const findExisting = async () => {
      const { data } = await sb
        .from('orders')
        .select('id, order_code')
        .or(`external_order_id.eq.${JSON.stringify(ext)},external_order_id.like.${JSON.stringify(ext + '#%')}`)
        .order('line_index')
      return data ?? []
    }
    const existing = await findExisting()
    if (existing.length) {
      return json({ ok: true, duplicate: true, order_code: existing[0].order_code, order_ids: existing.map((o) => o.id) })
    }

    // ---- Logos (pedido completo, como en Ventas) ----
    const rawLogos: Array<{ name: string | null; url: string }> = b.logos?.length
      ? b.logos.map((l) => ({ name: l.name ?? null, url: l.url }))
      : (() => {
          const l0 = b.lines[0]
          const arr: Array<{ name: string | null; url: string }> = []
          if (l0.logo_url) arr.push({ name: l0.logo_name ?? null, url: l0.logo_url })
          if (l0.logo_url_2) arr.push({ name: l0.logo_name_2 ?? null, url: l0.logo_url_2 })
          return arr
        })()
    const personalization = b.lines.map((l) => l.personalization).filter(Boolean).join(' — ') || null
    const reuse = b.reuse_previous_logo && rawLogos.length > 0
    const noLogo = rawLogos.length === 0 && !personalization
    const logoSource = noLogo ? 'sin_logo' : reuse ? 'reutilizado' : 'nuevo'
    const logos = reuse
      ? rawLogos
      : await Promise.all(rawLogos.map(async (l) => ({ name: l.name, url: await copyLogo(sb, l.url) })))
    const nowIso = new Date().toISOString()

    // ---- Totales / IVA / abono ----
    const typed = b.lines.map((l) => {
      const t = normType(l.type)
      return { ...l, referencia: t ? `${l.product} (${t})` : l.product }
    })
    const bases = typed.map((l) => (l.is_gift ? 0 : (l.unit_price ?? 0) * l.quantity))
    const productsBase = bases.reduce((s, v) => s + v, 0)
    const iva = b.price_includes_tax ? 0 : Math.round((productsBase * IVA_RATE) / 100)
    const ivas = prorate(bases, iva)
    const lineTotals = bases.map((v, i) => v + ivas[i])
    const grand = lineTotals.reduce((s, v) => s + v, 0)
    const abonoTotal = b.payment_complete ? grand : (b.abono ?? 0)
    const abonos = prorate(lineTotals, abonoTotal)

    const insertedIds: string[] = []
    let orderCode: string | null = null

    for (let i = 0; i < typed.length; i++) {
      const l = typed[i]
      const inkCount = l.ink_count ?? (l.ink_color_3 ? 3 : l.ink_color_2 ? 2 : 1)
      const row: Record<string, unknown> = {
        brand: 'magical',
        sale_type: 'mayor',
        client_name: b.client_name,
        client_nit: b.client_nit ?? null,
        client_phone: b.client_phone ?? null,
        client_email: b.client_email ?? null,
        client_address: b.client_address ?? null,
        client_address_complement: b.client_address_complement ?? null,
        client_city: b.client_city ?? null,
        product: l.referencia,
        quantity: l.quantity,
        unit_price: l.unit_price ?? 0,
        total_amount: lineTotals[i],
        subtotal_amount: bases[i],
        price_includes_tax: b.price_includes_tax,
        tax_rate: b.price_includes_tax ? 0 : IVA_RATE,
        tax_amount: ivas[i],
        abono: abonos[i],
        ink_count: inkCount,
        ink_color: l.ink_color ?? null,
        ink_color_2: inkCount >= 2 ? l.ink_color_2 ?? null : null,
        ink_color_3: inkCount >= 3 ? l.ink_color_3 ?? null : null,
        glitter_color: l.glitter_color ?? null,
        silicone_color: l.silicone_color ?? null,
        gel_color: l.gel_color ?? null,
        logo_url: logos[0]?.url ?? null,
        logo_url_2: logos[1]?.url ?? null,
        logo_name: logos[0]?.name ?? null,
        logo_name_2: logos[1]?.name ?? null,
        logo_count: logos.length,
        logos,
        logo_source: logoSource,
        logo_source_at: nowIso,
        logo_source_by: ADVISOR_ID,
        logo_source_by_name: ADVISOR_NAME,
        personalization: l.personalization ?? null,
        observations: [
          b.made_to_order ? 'BAJO PEDIDO' : null,
          b.observations, l.observations,
          l.is_gift ? '🎁 OBSEQUIO' : null,
        ].filter(Boolean).join(' | ') || null,
        payment_method: b.payment_method ?? null,
        payment_reference: b.payment_reference ?? null,
        payment_proof_url: b.payment_proof_url ?? null,
        payment_complete: b.payment_complete ?? false,
        payment_date: b.payment_date ?? nowIso.slice(0, 10),
        shipping_cost: i === 0 ? b.shipping_cost ?? null : null,
        delivery_date: b.delivery_date ?? null,
        is_made_to_order: b.made_to_order,
        is_recompra: b.is_recompra,
        advisor_id: ADVISOR_ID,
        advisor_name: ADVISOR_NAME,
        production_status: 'pendiente',
        external_order_id: i === 0 ? ext : `${ext}#${i + 1}`,
        line_index: i + 1,
        line_count: typed.length,
      }
      if (orderCode) row.order_code = orderCode
      const { data, error } = await sb.from('orders').insert(row).select('id, order_code').single()
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

      // Avisos de pedido nuevo (igual que createOrderNotifications)
      const shortDesc = `${l.quantity} uds de ${l.referencia} — Magical Warmers para ${b.client_name}`
      const notifs: Array<Record<string, unknown>> = [
        { target_role: 'inventarios', title: 'Nuevo pedido — revisar inventario', message: `Nuevo pedido: ${shortDesc}`, type: 'nuevo_pedido', reference_id: data.id },
        { target_role: 'contabilidad', title: 'Nuevo pedido registrado', message: `Pedido al por mayor: ${shortDesc}`, type: 'nuevo_pedido', reference_id: data.id },
        { target_role: 'logistica', title: 'Nuevo pedido para planear despacho', message: `Próximo despacho: ${shortDesc}.`, type: 'nuevo_pedido', reference_id: data.id },
      ]
      if (logoSource === 'nuevo') {
        notifs.push(
          { target_role: 'disenador', title: 'Nueva solicitud de diseño', message: `Logo pendiente para ${b.client_name} — ${l.referencia} (Magical Warmers)`, type: 'diseno_logo', reference_id: data.id },
          { target_role: 'estampacion', title: 'Pedido con logo en preparación', message: `Próximo trabajo: ${shortDesc}. Pendiente aprobación de diseño.`, type: 'nuevo_pedido', reference_id: data.id },
        )
      }
      const { error: nErr } = await sb.from('notifications').insert(notifs)
      if (nErr) console.warn('Notifications error:', nErr.message)
    }

    const firstId = insertedIds[0]
    const codeLabel = orderCode ? `Pedido ${orderCode}` : 'Nuevo pedido'
    let logoRequestId: string | null = null

    // Solicitud de diseño (igual que createLogoRequestFromOrder)
    if (logoSource === 'nuevo' || (b.is_recompra && reuse && b.logo_instructions)) {
      const { data: lr, error: lrErr } = await sb.from('logo_requests').insert({
        brand: 'Magical Warmers',
        client_name: b.client_name,
        logo_name: logos.map((l) => l.name).filter(Boolean).slice(0, 2).join(' + ') || null,
        product: typed[0].referencia,
        advisor_id: ADVISOR_ID,
        advisor_name: ADVISOR_NAME,
        original_logo_url: logos[0]?.url ?? 'PENDIENTE_DISENO_DESDE_CERO',
        original_logo_url_2: logos[1]?.url ?? null,
        extra_logos: logos.slice(2),
        client_comments: [`${codeLabel}`, b.observations].filter(Boolean).join(' | ') || null,
        additional_instructions: [
          reuse ? 'AJUSTE DE LOGO EXISTENTE (recompra)' : '',
          personalization ?? '',
          b.logo_instructions ?? '',
        ].filter(Boolean).join(' — ') || null,
        status: 'pendiente_diseno',
        from_recompra: b.is_recompra,
        order_id: firstId,
      }).select('id').single()
      if (lrErr) console.error('Logo request error:', lrErr.message)
      logoRequestId = lr?.id ?? null
    }

    // Trazabilidad del logo (igual que notifyLogoFlow)
    if (logoSource !== 'sin_logo') {
      const base = `${codeLabel} — ${b.client_name} · ${typed[0].referencia} (Magical Warmers)`
      const extraNotifs = logoSource === 'reutilizado'
        ? [{ target_role: 'estampacion', title: 'Recompra con el mismo logo', message: `${base}. Se reutiliza el logo ya aprobado; el archivo está disponible en el pedido.`, type: 'nuevo_pedido', reference_id: firstId }]
        : [
            ...(b.is_recompra ? [{ target_role: 'disenador', title: 'Recompra con logo actualizado', message: `${base}. El cliente envió un LOGO NUEVO: revise la solicitud de diseño.`, type: 'diseno_logo', reference_id: firstId }] : []),
            { target_role: 'estampacion', title: b.is_recompra ? 'Recompra con logo NUEVO' : 'Pedido con logo nuevo', message: `${base}. Hay un archivo de logo NUEVO adjunto al pedido.`, type: 'diseno_logo', reference_id: firstId },
          ]
      await sb.from('notifications').insert(extraNotifs)
      const { error: clErr } = await sb.from('order_change_log').insert({
        order_id: firstId,
        order_code: orderCode,
        field: 'logo_source',
        old_value: null,
        new_value: `${logoSource === 'nuevo' ? 'Logo NUEVO' : 'Logo reutilizado'}${logos[0]?.url ? ` — ${logos[0].url}` : ''}`,
        changed_by: ADVISOR_ID,
        changed_by_name: ADVISOR_NAME,
      })
      if (clErr) console.warn('Change log error:', clErr.message)
    }

    return json({ ok: true, duplicate: false, order_code: orderCode, order_ids: insertedIds, logo_request_id: logoRequestId })
  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: String(err) }, 500)
  }
})
