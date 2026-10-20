import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

// Recibe de Bionovations Direct las decisiones del cliente y los pagos del saldo.
const ADVISOR_ID = '00000000-0000-0000-0000-000000000003'
const ACTOR = 'Cliente web'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const Decision = z.object({
  type: z.literal('client_decision'),
  external_order_id: z.string().trim().min(1).max(200),
  action_type: z.enum(['logo_design', 'stamp_size', 'stamp_inkgel', 'note']),
  decision: z.enum(['aprobado', 'ajustes', 'nota']),
  comment: z.string().trim().max(4000).optional().nullable(),
  actor: z.string().trim().max(100).optional().nullable(),
})
const Payment = z.object({
  type: z.literal('balance_payment'),
  external_order_id: z.string().trim().min(1).max(200),
  balance_payment_id: z.string().trim().min(1).max(200),
  method: z.string().trim().max(100).optional().nullable(),
  amount: z.number().positive(),
  proof_url: z.string().trim().url().max(2000).optional().nullable(),
  payment_reference: z.string().trim().max(200).optional().nullable(),
  status: z.enum(['por_revisar', 'aprobado']),
})
const Body = z.discriminatedUnion('type', [Decision, Payment])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const expected = Deno.env.get('BIONOVATIONS_WEBHOOK_TOKEN') ?? ''
    if (!expected || (req.headers.get('x-webhook-token') ?? '') !== expected) return json({ error: 'Unauthorized' }, 401)
    const parsed = Body.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400)
    const b = parsed.data

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })

    const ext = b.external_order_id
    const { data: lines } = await sb
      .from('orders')
      .select('id, order_code, client_name, product, line_index')
      .eq('advisor_id', ADVISOR_ID)
      .or(`external_order_id.eq.${JSON.stringify(ext)},external_order_id.like.${JSON.stringify(ext + '#%')}`)
      .order('line_index')
    if (!lines?.length) return json({ error: 'Pedido no encontrado' }, 404)
    const first = lines[0]
    const ids = lines.map((l) => l.id)
    const label = `Pedido ${first.order_code ?? ''} — ${first.client_name}`

    const log = (field: string, oldV: string | null, newV: string, reason?: string | null) =>
      sb.from('order_change_log').insert({
        order_id: first.id, order_code: first.order_code, field, old_value: oldV, new_value: newV,
        changed_by: null, changed_by_name: ACTOR, reason: reason ?? null,
      })

    if (b.type === 'client_decision') {
      const comment = b.comment?.trim() || null
      if (b.action_type === 'note') {
        if (!comment) return json({ error: 'La nota no tiene comentario' }, 400)
        await log('client_note', null, `Nota: ${comment}`, comment)
        await sb.from('order_change_log').select('id').limit(0)
        for (const role of ['disenador', 'estampacion']) {
          await sb.from('notifications').insert({
            target_role: role, title: 'Nota del cliente web',
            message: `${label}: ${comment}`, type: 'nuevo_pedido', reference_id: first.id,
          })
        }
        return json({ ok: true, applied: 'nota' })
      }
      if (b.action_type === 'logo_design') {
        const { data: lr } = await sb
          .from('logo_requests')
          .select('id, status, advisor_feedback')
          .in('order_id', ids)
          .order('created_at', { ascending: false })
          .limit(1).maybeSingle()
        if (!lr) return json({ error: 'El pedido no tiene solicitud de diseño' }, 409)
        const stamp = `[${ACTOR}] ${comment ?? ''}`.trim()
        const feedback = comment ? [lr.advisor_feedback, stamp].filter(Boolean).join('\n') : lr.advisor_feedback
        const upd: Record<string, unknown> = { advisor_feedback: feedback }
        if (b.decision === 'aprobado') { upd.status = 'aprobado'; upd.approved_at = new Date().toISOString() }
        if (b.decision === 'ajustes') upd.status = 'ajustes_solicitados'
        const { error } = await sb.from('logo_requests').update(upd).eq('id', lr.id)
        if (error) return json({ error: error.message }, 500)
        await log('logo_design', lr.status, b.decision === 'nota' ? `Nota: ${comment ?? ''}` : String(upd.status), comment)
        await sb.from('notifications').insert({
          target_role: 'disenador',
          title: b.decision === 'aprobado' ? 'Cliente web aprobó el diseño' : b.decision === 'ajustes' ? 'Cliente web pidió ajustes al diseño' : 'Nota del cliente web sobre el diseño',
          message: `${label}${comment ? `: ${comment}` : ''}`,
          type: 'diseno_logo', reference_id: first.id,
        })
        return json({ ok: true, applied: b.decision, logo_request_id: lr.id })
      }

      // Aprobaciones de estampado (igual que StampingApprovals del asesor)
      const step = b.action_type === 'stamp_size' ? 'size' : 'inkgel'
      const statusCol = `stamp_${step}_status`
      const { data: pos } = await sb
        .from('production_orders')
        .select(`id, ${statusCol}, stamp_advisor_feedback`)
        .in('order_id', ids)
      if (!pos?.length) {
        // Aún no hay orden de producción ni foto: se guarda la decisión para Estampación.
        const stepLbl = step === 'size' ? 'tamaño' : 'tinta y gel'
        await log(statusCol, null, `Decisión anticipada: ${b.decision}${comment ? ` · ${comment}` : ''}`, comment)
        await sb.from('notifications').insert({
          target_role: 'estampacion',
          title: `Cliente web (${stepLbl}): ${b.decision}`,
          message: `${label}${comment ? `: ${comment}` : ''}. Aún sin orden de producción; quedó en el historial del pedido.`,
          type: 'nuevo_pedido', reference_id: first.id,
        })
        return json({ ok: true, applied: b.decision, pending_production_order: true })
      }
      const upd: Record<string, unknown> = {}
      if (comment) upd.stamp_advisor_feedback = `[${ACTOR}] ${comment}`
      if (b.decision === 'aprobado') {
        upd[statusCol] = 'aprobado'
        upd[`stamp_${step}_approved_at`] = new Date().toISOString()
      } else if (b.decision === 'ajustes') {
        upd[statusCol] = 'rechazado'
        upd[`stamp_${step}_photo_url`] = null
      }
      if (Object.keys(upd).length) {
        const { error } = await sb.from('production_orders').update(upd).in('id', pos.map((p) => p.id))
        if (error) return json({ error: error.message }, 500)
      }
      const stepLabel = step === 'size' ? 'tamaño' : 'tinta y gel'
      await log(statusCol, (pos[0] as any)[statusCol] ?? null, b.decision === 'nota' ? `Nota: ${comment ?? ''}` : String(upd[statusCol]), comment)
      await sb.from('notifications').insert({
        target_role: 'estampacion',
        title: b.decision === 'aprobado' ? `Cliente web aprobó la foto de ${stepLabel}` : b.decision === 'ajustes' ? `Cliente web rechazó la foto de ${stepLabel}` : `Nota del cliente web (${stepLabel})`,
        message: `${label}${comment ? `: ${comment}` : ''}`,
        type: 'nuevo_pedido', reference_id: first.id,
      })
      return json({ ok: true, applied: b.decision })
    }

    // ---- Pago del saldo ----
    const { data: existing } = await sb
      .from('order_balance_payments')
      .select('id, status')
      .eq('external_payment_id', b.balance_payment_id)
      .maybeSingle()
    if (existing) return json({ ok: true, duplicate: true, status: existing.status })

    const approved = b.status === 'aprobado'
    const { data: bp, error } = await sb.from('order_balance_payments').insert({
      order_id: first.id,
      external_order_id: ext,
      external_payment_id: b.balance_payment_id,
      method: b.method ?? null,
      amount: b.amount,
      proof_url: b.proof_url ?? null,
      payment_reference: b.payment_reference ?? null,
      status: b.status,
      reviewed_by_name: approved ? 'Bionovations Direct' : null,
      reviewed_at: approved ? new Date().toISOString() : null,
    }).select('id').single()
    if (error) {
      if (error.code === '23505') return json({ ok: true, duplicate: true })
      return json({ error: error.message }, 500)
    }
    if (approved) {
      const { error: apErr } = await sb.rpc('apply_balance_payment', { _id: bp.id, _by_name: 'Bionovations Direct' })
      if (apErr) return json({ error: apErr.message }, 500)
    }
    const amountLabel = `$${Math.round(b.amount).toLocaleString('es-CO')}`
    await log('balance_payment', null, `${amountLabel} · ${b.status}${b.payment_reference ? ` · ref ${b.payment_reference}` : ''}`)
    await sb.from('notifications').insert({
      target_role: 'contabilidad',
      title: approved ? 'Pago de saldo web aprobado' : 'Comprobante de saldo por revisar',
      message: `${label}: ${amountLabel}${b.method ? ` (${b.method})` : ''}${approved ? '' : '. Revíselo en el detalle del pedido.'}`,
      type: 'nuevo_pedido', reference_id: first.id,
    })
    return json({ ok: true, duplicate: false, status: b.status, id: bp.id })
  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: String(err) }, 500)
  }
})
