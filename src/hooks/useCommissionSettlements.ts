import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SettlementDraft } from "@/lib/commissionSettlement";

export interface Settlement {
  id: string;
  advisor_id: string;
  advisor_name: string | null;
  pay_period: string;
  status: string;
  current_amount: number;
  carryover_amount: number;
  bonus_amount: number;
  adjustment_amount: number;
  total_amount: number;
  notes: string | null;
  approved_at: string | null;
  returned_note: string | null;
  confirmed_at: string | null;
  dispute_note: string | null;
  created_at: string;
}
export interface SettlementItem {
  id: string; settlement_id: string; order_id: string; order_code: string | null; client_name: string | null;
  sale_date: string | null; completed_date: string | null; paid_date?: string | null; causation_period: string; base_amount: number;
  rate: number; amount: number; is_carryover: boolean;
}
export interface Payout {
  id: string; settlement_id: string | null; advisor_id: string; pay_period: string; amount: number;
  paid_at: string; reference: string | null; proof_url: string | null; notes: string | null; created_at: string;
}
export interface SettlementLog {
  id: string; settlement_id: string; action: string; note: string | null; amount: number | null;
  actor_name: string | null; created_at: string;
}

const db = supabase as any;
const KEY = ["commission_settlements"];

export function useSettlementData() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const [s, i, p, l] = await Promise.all([
        db.from("commission_settlements").select("*").order("pay_period", { ascending: false }),
        db.from("commission_settlement_items").select("*").range(0, 19999),
        db.from("commission_payouts").select("*").order("paid_at", { ascending: false }),
        db.from("commission_settlement_log").select("*").order("created_at", { ascending: false }),
      ]);
      for (const r of [s, i, p, l]) if (r.error) throw r.error;
      return {
        settlements: (s.data || []) as Settlement[],
        items: (i.data || []) as SettlementItem[],
        payouts: (p.data || []) as Payout[],
        logs: (l.data || []) as SettlementLog[],
      };
    },
  });
}

async function actorName() {
  const { data } = await supabase.auth.getUser();
  return data.user?.email || null;
}
async function log(settlement_id: string, action: string, note?: string | null, amount?: number | null) {
  await db.from("commission_settlement_log").insert({ settlement_id, action, note: note || null, amount: amount ?? null, actor_name: await actorName() });
}

export function useSettlementActions() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: KEY });

  const approve = useMutation({
    mutationFn: async (p: { advisorId: string; advisorName: string; draft: SettlementDraft; adjustment: number; notes: string; existingId?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const row = {
        advisor_id: p.advisorId, advisor_name: p.advisorName, pay_period: p.draft.payPeriod, status: "pendiente_pago",
        current_amount: Math.round(p.draft.currentAmount), carryover_amount: Math.round(p.draft.carryoverAmount),
        bonus_amount: p.draft.bonus, adjustment_amount: Math.round(p.adjustment),
        total_amount: Math.round(p.draft.total + p.adjustment), notes: p.notes || null,
        approved_by: u.user?.id, approved_at: new Date().toISOString(), returned_note: null,
      };
      let id = p.existingId;
      if (id) {
        const { error } = await db.from("commission_settlements").update(row).eq("id", id);
        if (error) throw error;
        await db.from("commission_settlement_items").delete().eq("settlement_id", id);
      } else {
        const { data, error } = await db.from("commission_settlements").insert(row).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      const items = [...p.draft.current, ...p.draft.carryover].map((l) => ({
        settlement_id: id, order_id: l.order.id, order_code: l.order.order_code || null, client_name: l.order.client_name,
        sale_date: l.saleDate.toISOString().slice(0, 10), completed_date: l.completedDate.toISOString().slice(0, 10),
        paid_date: l.paidDate ? l.paidDate.toISOString().slice(0, 10) : null,
        causation_period: l.causationPeriod, base_amount: Math.round(l.base), rate: l.rate, amount: Math.round(l.amount),
        is_carryover: l.isCarryover,
      }));
      if (items.length) {
        const { error } = await db.from("commission_settlement_items").insert(items);
        if (error) throw error;
      }
      await log(id!, "aprobada", p.notes, row.total_amount);
    },
    onSuccess: done,
  });

  const returnForReview = useMutation({
    mutationFn: async (p: { id: string; note: string }) => {
      const { error } = await db.from("commission_settlements").update({ status: "en_revision", returned_note: p.note }).eq("id", p.id);
      if (error) throw error;
      await log(p.id, "devuelta_revision", p.note);
    },
    onSuccess: done,
  });

  const registerPayout = useMutation({
    mutationFn: async (p: { settlement: Settlement; amount: number; paidAt: string; reference: string; file?: File | null }) => {
      let proof_url: string | null = null;
      if (p.file) {
        const path = `commissions/${p.settlement.id}/${Date.now()}-${p.file.name}`;
        const { error } = await supabase.storage.from("payment-proofs").upload(path, p.file);
        if (error) throw error;
        proof_url = path;
      }
      const { data: u } = await supabase.auth.getUser();
      const { error } = await db.from("commission_payouts").insert({
        settlement_id: p.settlement.id, advisor_id: p.settlement.advisor_id, pay_period: p.settlement.pay_period,
        amount: p.amount, paid_at: p.paidAt, reference: p.reference || null, proof_url, registered_by: u.user?.id,
      });
      if (error) throw error;
      await db.from("commission_settlements").update({ status: "pago_registrado", confirmed_at: null, confirmed_by: null }).eq("id", p.settlement.id);
      await log(p.settlement.id, "pago_registrado", p.reference, p.amount);
    },
    onSuccess: done,
  });

  const respond = useMutation({
    mutationFn: async (p: { id: string; confirm: boolean; note: string }) => {
      const { error } = await db.rpc("advisor_respond_settlement", { _settlement_id: p.id, _confirm: p.confirm, _note: p.note || null });
      if (error) throw error;
    },
    onSuccess: done,
  });

  return { approve, returnForReview, registerPayout, respond };
}
