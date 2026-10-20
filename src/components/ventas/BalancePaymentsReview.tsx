import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

interface BalancePayment {
  id: string;
  external_payment_id: string;
  method: string | null;
  amount: number;
  proof_url: string | null;
  payment_reference: string | null;
  status: "por_revisar" | "aprobado" | "rechazado";
  reason: string | null;
  reviewed_by_name: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  por_revisar: "Por revisar",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

/** Pagos de saldo enviados por la tienda web (Bionovations Direct). */
export default function BalancePaymentsReview({ externalOrderId }: { externalOrderId: string }) {
  const { role } = useAuth();
  const canReview = role === "admin" || role === "contabilidad";
  const qc = useQueryClient();
  const baseExt = externalOrderId.split("#")[0];
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["balance-payments", baseExt],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_balance_payments")
        .select("id, external_payment_id, method, amount, proof_url, payment_reference, status, reason, reviewed_by_name, created_at")
        .eq("external_order_id", baseExt)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BalancePayment[];
    },
  });

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (!data.length) return null;

  const review = async (id: string, approve: boolean) => {
    const reason = reasons[id]?.trim() ?? "";
    if (!approve && !reason) {
      toast.error("Escribe el motivo del rechazo");
      return;
    }
    setBusy(id);
    const { data: res, error } = await supabase.rpc("review_balance_payment", {
      _id: id, _approve: approve, _reason: reason || null,
    } as never);
    setBusy(null);
    const r = res as { success?: boolean; message?: string } | null;
    if (error || !r?.success) {
      toast.error("No se pudo revisar el pago", { description: error?.message ?? r?.message });
      return;
    }
    toast.success(approve ? "Pago aprobado y sumado al abono" : "Pago rechazado");
    qc.invalidateQueries({ queryKey: ["balance-payments", baseExt] });
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["order-payments"] });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Pagos del saldo (tienda web)</p>
      {data.map((p) => (
        <div key={p.id} className="space-y-2 rounded-md border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">${Math.round(p.amount).toLocaleString("es-CO")}</span>
            <Badge variant={p.status === "por_revisar" ? "secondary" : p.status === "aprobado" ? "default" : "destructive"}>
              {STATUS_LABEL[p.status]}
            </Badge>
          </div>
          <div className="text-muted-foreground break-words">
            {[p.method, p.payment_reference && `Ref. ${p.payment_reference}`, new Date(p.created_at).toLocaleString("es-CO")]
              .filter(Boolean).join(" · ")}
          </div>
          {p.proof_url && (
            <a href={p.proof_url} target="_blank" rel="noreferrer" className="text-primary underline">
              Ver comprobante
            </a>
          )}
          {p.reason && <div className="text-muted-foreground">Motivo: {p.reason}</div>}
          {p.reviewed_by_name && p.status !== "por_revisar" && (
            <div className="text-xs text-muted-foreground">Revisado por {p.reviewed_by_name}</div>
          )}
          {p.status === "por_revisar" && canReview && (
            <div className="space-y-2">
              <Textarea
                placeholder="Motivo (obligatorio si rechazas)"
                value={reasons[p.id] ?? ""}
                onChange={(e) => setReasons((s) => ({ ...s, [p.id]: e.target.value }))}
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={busy === p.id} onClick={() => review(p.id, true)}>Aprobar</Button>
                <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => review(p.id, false)}>Rechazar</Button>
              </div>
            </div>
          )}
          {p.status === "por_revisar" && !canReview && (
            <div className="text-xs text-muted-foreground">Pendiente de revisión por Contabilidad. El pedido no se despacha hasta aprobarlo.</div>
          )}
        </div>
      ))}
    </div>
  );
}
