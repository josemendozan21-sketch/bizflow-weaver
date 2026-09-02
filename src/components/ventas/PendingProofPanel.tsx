import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, Trash2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { isOrderFullyPaid, type Order } from "@/hooks/useOrders";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";

export function PendingProofPanel({ orders, isAdmin }: { orders: Order[]; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const pending = useMemo(
    () =>
      orders
        .filter((o) => !o.payment_proof_url && !isOrderFullyPaid(o) && o.payment_method !== "obsequio")
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [orders]
  );

  if (pending.length === 0) return null;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const allSelected = selected.size === pending.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(pending.map((o) => o.id)));

  const ids = Array.from(selected);
  const selectedTotal = pending
    .filter((o) => selected.has(o.id))
    .reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

  const markPaid = async () => {
    if (!confirm(`¿Marcar ${ids.length} pedido(s) como pagados y cerrarlos?`)) return;
    setBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({ payment_complete: true, payment_method: "pagado" })
      .in("id", ids);
    setBusy(false);
    if (error) return toast.error("No se pudo actualizar: " + error.message);
    toast.success(`${ids.length} pedido(s) marcados como pagados.`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const removeOrders = async () => {
    if (!confirm(`¿Eliminar definitivamente ${ids.length} pedido(s)? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    const { error } = await supabase.from("orders").delete().in("id", ids);
    setBusy(false);
    if (error) return toast.error("No se pudo eliminar: " + error.message);
    toast.success(`${ids.length} pedido(s) eliminados.`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader className="pb-3">
        <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-sm">Pedidos sin soporte de pago</CardTitle>
          <Badge variant="secondary">{pending.length}</Badge>
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={toggleAll}>
              {allSelected ? "Quitar selección" : "Seleccionar todos"}
            </Button>
            {selected.size > 0 && (
              <>
                <span className="text-xs text-muted-foreground">
                  {selected.size} seleccionado(s) — ${selectedTotal.toLocaleString("es-CO")}
                </span>
                <Button size="sm" onClick={markPaid} disabled={busy}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                  Marcar como pagado y cerrar
                </Button>
                {isAdmin && (
                  <Button size="sm" variant="destructive" onClick={removeOrders} disabled={busy}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto rounded-md border bg-background divide-y">
            {pending.map((o) => (
              <label key={o.id} className="flex items-center gap-3 p-2.5 text-sm cursor-pointer hover:bg-muted/50">
                <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggle(o.id)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <OrderCodeBadge code={(o as any).order_code} compact />
                    <p className="font-medium truncate">{o.client_name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {o.product} — {o.quantity} uds · {format(new Date(o.created_at), "d MMM yyyy", { locale: es })}
                    {isAdmin && o.advisor_name ? ` · ${o.advisor_name}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">
                  ${(Number(o.total_amount) || 0).toLocaleString("es-CO")}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
