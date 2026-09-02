import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type DisputeStatus = "pendiente" | "aprobada" | "rechazada";

export interface OrderValueDispute {
  id: string;
  order_id: string;
  requested_by: string;
  requested_by_name: string | null;
  current_amount: number;
  proposed_amount: number;
  reason: string;
  evidence_url: string | null;
  status: DisputeStatus;
  resolved_by: string | null;
  resolved_by_name: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useOrderDisputes() {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ["order_value_disputes", user?.id, role],
    enabled: !!user,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_value_disputes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as OrderValueDispute[];
    },
  });
}

export function useCreateOrderDispute() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      order_id: string;
      current_amount: number;
      proposed_amount: number;
      reason: string;
      evidence?: File | null;
    }) => {
      let evidence_url: string | null = null;
      if (input.evidence && input.evidence.size > 0) {
        const ext = input.evidence.name.split(".").pop();
        const path = `dispute_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, input.evidence);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
        evidence_url = urlData.publicUrl;
      }

      const { error } = await supabase.from("order_value_disputes").insert({
        order_id: input.order_id,
        requested_by: user?.id || "",
        requested_by_name: user?.email || null,
        current_amount: input.current_amount,
        proposed_amount: input.proposed_amount,
        reason: input.reason,
        evidence_url,
      });
      if (error) throw error;

      await supabase.from("notifications").insert({
        target_role: "contabilidad",
        title: "Solicitud de corrección de valor",
        message: `${user?.email || "Un asesor"} solicita corregir el valor de un pedido a $${Math.round(
          input.proposed_amount
        ).toLocaleString("es-CO")}. Motivo: ${input.reason}`,
        type: "info",
        reference_id: input.order_id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order_value_disputes"] });
      toast.success("Solicitud enviada a Contabilidad");
    },
    onError: (e: any) => toast.error("No se pudo enviar la solicitud", { description: e.message }),
  });
}

export function useResolveOrderDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      disputeId,
      approve,
      note,
    }: {
      disputeId: string;
      approve: boolean;
      note?: string;
    }) => {
      const { error } = await supabase.rpc("resolve_order_value_dispute", {
        _dispute_id: disputeId,
        _approve: approve,
        _note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["order_value_disputes"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(vars.approve ? "Corrección aprobada" : "Solicitud rechazada");
    },
    onError: (e: any) => toast.error("No se pudo resolver", { description: e.message }),
  });
}
