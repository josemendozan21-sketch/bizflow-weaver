import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, PackagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Task {
  id: string;
  referencia: string;
  unidades: number;
  status: string;
  created_at: string;
}

export const SweatspotBodyTasksPanel = () => {
  const queryClient = useQueryClient();
  const [finalizeTask, setFinalizeTask] = useState<Task | null>(null);
  const [qtyStr, setQtyStr] = useState("");
  const [madeBy, setMadeBy] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["body_production_tasks", "sweatspot"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("body_production_tasks")
        .select("id, referencia, unidades, status, created_at")
        .eq("brand", "sweatspot")
        .neq("status", "finalizado")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Task[];
    },

  });

  const openFinalize = (t: Task) => {
    setFinalizeTask(t);
    setQtyStr(String(t.unidades));
    setMadeBy("");
  };

  const finalize = async () => {
    if (!finalizeTask) return;
    const qty = Number(qtyStr);
    if (!qty || qty <= 0) return toast.error("Cantidad inválida");
    if (!madeBy.trim()) return toast.error("Indica quién lo produjo");
    setSaving(true);
    try {
      const { error: updErr } = await supabase
        .from("body_production_tasks")
        .update({ status: "finalizado", completed_at: new Date().toISOString(), unidades: qty } as any)
        .eq("id", finalizeTask.id);
      if (updErr) throw updErr;

      const name = finalizeTask.referencia.replace(/\s*\((Frío|Frio|Térmico|Termico|Calor)\)\s*$/i, "").trim();
      const { data: stockRow } = await supabase
        .from("stock_items")
        .select("id")
        .eq("brand", "sweatspot")
        .ilike("name", name)
        .maybeSingle();

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error: movErr } = await supabase.from("inventory_movements").insert({
        stock_item_id: stockRow?.id ?? null,
        item_name: finalizeTask.referencia,
        brand: "sweatspot",
        category: "producto_terminado",
        quantity: qty,
        direction: "retorno",
        area: "produccion",
        movement_kind: "entrada",
        purpose: `Producido por ${madeBy.trim()}`,
        reason: "AUTO_REQ: Pendiente de recepción en Inventarios",
        requested_by_name: madeBy.trim(),
        recorded_by: authUser?.id ?? null,
        recorded_by_name: authUser?.email ?? "Producción",
        reception_confirmed: false,
      } as any);
      if (movErr) {
        await supabase
          .from("body_production_tasks")
          .update({ status: "pendiente", completed_at: null } as any)
          .eq("id", finalizeTask.id);
        throw movErr;
      }

      await supabase.from("notifications").insert({
        target_role: "inventarios",
        title: "Producción Sweatspot finalizada — confirmar recepción",
        message: `${qty} uds de "${finalizeTask.referencia}" finalizadas por ${madeBy.trim()}.`,
        type: "success",
      } as any);

      toast.success("Enviado a Inventarios para confirmación de recepción.");
      setFinalizeTask(null);
      queryClient.invalidateQueries({ queryKey: ["body_production_tasks", "sweatspot"] });
    } catch (e: any) {
      toast.error(`No se pudo finalizar: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackagePlus className="h-4 w-4" /> Solicitudes de Inventarios ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay solicitudes pendientes de Inventarios.</p>
          )}
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{t.referencia}</p>
                <p className="text-xs text-muted-foreground">
                  {t.unidades} uds · {new Date(t.created_at).toLocaleDateString("es-CO")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline">{t.status}</Badge>
                <Button size="sm" onClick={() => openFinalize(t)}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Finalizar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!finalizeTask} onOpenChange={(o) => !o && setFinalizeTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar producción</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cantidad producida</Label>
              <Input type="number" value={qtyStr} onChange={(e) => setQtyStr(e.target.value)} />
            </div>
            <div>
              <Label>Producido por</Label>
              <Input value={madeBy} onChange={(e) => setMadeBy(e.target.value)} placeholder="Nombre" />
            </div>
            <p className="text-xs text-muted-foreground">
              El stock se suma únicamente cuando Inventarios confirma la recepción.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeTask(null)}>Cancelar</Button>
            <Button onClick={finalize} disabled={saving}>Finalizar y enviar a inventario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
