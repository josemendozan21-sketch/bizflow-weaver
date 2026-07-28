import { useState, useMemo, useRef } from "react";
import { CompletionDialog } from "./CompletionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Plus,
  Play,
  Package,
  Paintbrush,
  Droplets,
  Stamp,
  Scissors,
  BoxSelect,
  Truck,
  Info,
  Thermometer,
  Snowflake,
  ShieldCheck,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useProductionOrders, type ProductionOrder, type BodyTask, type ProductionStageLog } from "@/hooks/useProductionOrders";
import { useAuth } from "@/contexts/AuthContext";
import { useInventory } from "@/hooks/useInventory";
import { BodyRequirementsPanel } from "./BodyRequirementsPanel";
import { supabase } from "@/integrations/supabase/client";
import { OperatorPromptDialog } from "./OperatorPromptDialog";
import { StageLogsList } from "./StageLogsList";
import { baseRefName } from "@/lib/canonicalBodyRef";

type MagicalStage = "produccion_cuerpos" | "estampacion" | "dosificacion" | "sellado" | "descristalizacion" | "recorte" | "empaque" | "listo";

const STAGE_ORDER: MagicalStage[] = [
  "produccion_cuerpos", "estampacion", "dosificacion", "sellado", "descristalizacion", "recorte", "empaque", "listo",
];

const STAGE_LABELS: Record<string, string> = {
  produccion_cuerpos: "Producción de Cuerpos",
  estampacion: "Estampación",
  dosificacion: "Dosificación",
  sellado: "Sellado",
  descristalizacion: "Descristalización",
  recorte: "Recorte",
  empaque: "Empaque",
  listo: "Listo",
};

const STAGE_ICONS: Record<string, React.ElementType> = {
  produccion_cuerpos: Package,
  estampacion: Paintbrush,
  dosificacion: Droplets,
  sellado: Stamp,
  descristalizacion: Thermometer,
  recorte: Scissors,
  empaque: BoxSelect,
  listo: Truck,
};

const STATUS_BADGE: Record<string, { label: string; variant: "secondary" | "default" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  en_proceso: { label: "En proceso", variant: "default" },
  finalizado: { label: "Finalizado", variant: "outline" },
};

const PLASTICO_OPTIONS = [
  { value: "frio", label: "Frío", icon: Snowflake },
  { value: "calor", label: "Calor", icon: Thermometer },
];

/** Canonical product references used for suggestions in body production */
const CANONICAL_REFERENCES = [
  "Lumbar", "Shoulder", "Cervical", "Multiusos", "Pocket", "Handy",
  "Muela", "Labios", "Círculo 8 cm", "Círculo 12 cm", "Círculo Ojo",
  "Tiroides", "Toalla Higiénica", "Toalla Higienica", "Huskvarna",
  "Corazón Térmico", "Corazon Termico",
  "Bacteria", "Antifaz", "Gafas pequeñas", "Pélvica", "Pelvica",
  "Mariposas", "Mariposa",
  "Gorro quimioterapia", "Gorro Quimioterapia", "Gorro",
  "Tornillo 3D",
  "Tapaojos con Velcro",
  "Mordedores",
];

export const MagicalWarmersWorkflow = () => {
  const { orders, bodyTasks, stageLogs, isLoading, updateStageStatus, advanceStage, addBodyTask, updateBodyTaskStatus, forceCompleteOrder } = useProductionOrders("magical");
  const { bodyStock, stockItems } = useInventory();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBodyForm, setShowBodyForm] = useState(false);
  const [bodyFormPrefill, setBodyFormPrefill] = useState<{ tipoPlastico: "frio" | "calor"; referencia: string; unidades: number } | null>(null);

  const [operatorPrompt, setOperatorPrompt] = useState<
    | { mode: "start" | "finish"; orderId: string; clientName: string }
    | null
  >(null);

  // Confirmation dialog state for production orders in produccion_cuerpos stage
  const [confirmOrder, setConfirmOrder] = useState<ProductionOrder | null>(null);
  const [confirmOrderQty, setConfirmOrderQty] = useState("");

  // Completion dialog state for finishing empaque (last stage before listo)
  const [completionOrder, setCompletionOrder] = useState<ProductionOrder | null>(null);

  // Finalize body task dialog (real units fabricated)
  const [finalizeTask, setFinalizeTask] = useState<BodyTask | null>(null);
  const [finalizeActualQty, setFinalizeActualQty] = useState("");
  const [finalizeFabricatedBy, setFinalizeFabricatedBy] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const activeOrdersAll = orders.filter((o) => o.current_stage !== "listo");
  const completedOrders = orders.filter((o) => o.current_stage === "listo");
  const activeOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return activeOrdersAll;
    return activeOrdersAll.filter((o) =>
      (o.client_name || "").toLowerCase().includes(q) ||
      (o.advisor_name || "").toLowerCase().includes(q) ||
      (o.logo_file || "").toLowerCase().includes(q) ||
      (o.molde || "").toLowerCase().includes(q) ||
      (o.ink_color || "").toLowerCase().includes(q) ||
      (o.gel_color || "").toLowerCase().includes(q) ||
      (o.observations || "").toLowerCase().includes(q)
    );
  }, [activeOrdersAll, searchTerm]);
  const stageCounts = useMemo(() => {
    const m: Record<string, number> = {};
    activeOrdersAll.forEach((o) => { m[o.current_stage] = (m[o.current_stage] || 0) + 1; });
    return m;
  }, [activeOrdersAll]);
  const scrollToStage = (stage: string) => {
    const el = stageRefs.current[stage];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const producibleTasks = bodyTasks;
  const completedBodyTasks = producibleTasks.filter((t) => t.status === "finalizado");
  const inProgressBodyTasks = producibleTasks.filter((t) => t.status !== "finalizado");

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkFinalize = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`¿Finalizar ${ids.length} pedido(s) y enviarlos a Logística?`)) return;
    for (const id of ids) {
      await forceCompleteOrder.mutateAsync({ orderId: id });
    }
    toast.success(`${ids.length} pedido(s) finalizado(s) y enviados a Logística.`);
    setSelected(new Set());
  };

  const handleFinishOrder = (order: ProductionOrder) => {
    if (order.current_stage === "produccion_cuerpos") {
      setConfirmOrder(order);
      setConfirmOrderQty(String(order.quantity));
    } else {
      // Check if this is the last actionable stage (before "listo")
      const stages = order.stages;
      const currentIdx = stages.indexOf(order.current_stage);
      const lastActionableIdx = stages.length - 2;
      if (currentIdx >= lastActionableIdx) {
        setCompletionOrder(order);
      } else {
        setOperatorPrompt({ mode: "finish", orderId: order.id, clientName: order.client_name });
      }
    }
  };

  const openBodyForm = (prefill?: { tipoPlastico: "frio" | "calor"; referencia: string; unidades: number }) => {
    setBodyFormPrefill(prefill ?? null);
    setShowBodyForm(true);
  };

  const handleConfirmOrderAdvance = () => {
    if (!confirmOrder) return;
    const qty = parseInt(confirmOrderQty, 10);
    if (!qty || qty <= 0) {
      toast.error("Ingrese una cantidad válida.");
      return;
    }
    advanceStage.mutate({ orderId: confirmOrder.id, confirmedQuantity: qty });
    setConfirmOrder(null);
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-foreground">Flujo de producción — Magical Warmers</p>
            <p className="text-sm text-muted-foreground mt-1">
              Los pedidos de producción provienen de <span className="font-medium">Ventas</span>. Aquí puedes registrar la producción de cuerpos y dar seguimiento a cada etapa del proceso.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STAGE_ORDER.filter((s) => s !== "listo").map((stage) => {
          const Icon = STAGE_ICONS[stage];
          const count = stageCounts[stage] || 0;
          return (
            <button
              key={stage}
              type="button"
              onClick={() => scrollToStage(stage)}
              disabled={count === 0}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${count > 0 ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer" : "bg-muted text-muted-foreground cursor-default opacity-60"}`}
            >
              <Icon className="h-3 w-3" />
              {STAGE_LABELS[stage]}
              <Badge variant={count > 0 ? "default" : "secondary"} className="h-4 px-1.5 text-[10px]">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, asesor, logo, molde, color gel/tinta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Body Production */}
      <Separator />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-foreground">Cuerpos por producir</h3>
        <p className="text-xs text-muted-foreground">
          Las órdenes las crea Inventarios a partir del pedido. Producción solo las ejecuta.
        </p>
      </div>

      <BodyRequirementsPanel
        references={Array.from(new Set([
          ...CANONICAL_REFERENCES,
          ...stockItems
            .filter((s) => s.brand === "magical" && s.category === "cuerpos_referencias")
            .map((s) => s.name),
          ...bodyStock
            .filter((b) => b.brand.toLowerCase() === "magical")
            .map((b) => b.referencia),
          // Pull mold names from active orders so anything with demand shows up
          ...activeOrdersAll
            .map((o) => (o.molde || "").replace(/\s*\([^)]*\)/g, "").trim())
            .filter(Boolean),
        ]))}
        orders={activeOrdersAll}
        bodyStock={bodyStock}
        stockItems={stockItems}
        onProduce={() =>
          toast.info(
            "Las órdenes de producción se crean automáticamente desde Inventarios a partir del pedido."
          )
        }
      />


      {inProgressBodyTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Cuerpos en producción ({inProgressBodyTasks.length})</h4>
          <p className="text-xs text-muted-foreground">Aún no están en inventario. Finaliza cada producción con las unidades reales fabricadas para enviarlas a inventario.</p>
          <div className="grid gap-2 md:grid-cols-2">
            {inProgressBodyTasks.map((task) => (
              <Card key={task.id} className="border border-primary/30">
                <CardContent className="pt-3 pb-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {task.tipo_plastico === "frio" ? "Frío" : "Calor"} — {task.referencia}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Estimado: {task.unidades} uds · creado {new Date(task.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="default">En proceso</Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Eliminar esta tarea (ya no se va a tomar)"
                        onClick={async () => {
                          if (!confirm(`¿Eliminar la tarea "${task.referencia}" (${task.unidades} uds)? Esta acción no se puede deshacer.`)) return;
                          const { data: delRows, error } = await supabase
                            .from("body_production_tasks")
                            .delete()
                            .eq("id", task.id)
                            .select("id");
                          if (error) { toast.error(`Error al eliminar: ${error.message}`); return; }
                          if (!delRows || delRows.length === 0) {
                            toast.error("No se pudo eliminar: tu usuario no tiene permisos. Avisa al administrador.");
                            return;
                          }
                          toast.success("Tarea eliminada.");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setFinalizeTask(task);
                      setFinalizeActualQty(String(task.unidades));
                      setFinalizeFabricatedBy("");
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Finalizar y enviar a inventario
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {completedBodyTasks.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Ver cuerpos completados ({completedBodyTasks.length})
          </summary>
          <div className="grid gap-2 md:grid-cols-2 mt-2">
            {completedBodyTasks.map((task) => (
              <Card key={task.id} className="border opacity-70">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {task.tipo_plastico === "frio" ? "Frío" : "Calor"} — {task.referencia}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.unidades} uds
                        {task.fabricated_by ? ` · fabricado por ${task.fabricated_by}` : ""}
                        {task.completed_at ? ` · ${new Date(task.completed_at).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">Finalizado</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}

      {/* Production Orders */}
      <Separator />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-foreground">Órdenes de producción ({activeOrders.length} activas)</h3>
        {isAdmin && selected.size > 0 && (
          <Button size="sm" onClick={handleBulkFinalize}>
            <ShieldCheck className="h-4 w-4 mr-1" /> Finalizar {selected.size} seleccionado(s)
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground -mt-4">Estas órdenes se crean automáticamente desde la sección de Ventas.</p>

      {activeOrders.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No hay órdenes activas. Las órdenes se generan desde Ventas.</p>
      )}

      <div className="space-y-6">
        {STAGE_ORDER.filter((s) => s !== "listo").map((stage) => {
          const stageOrders = activeOrders.filter((o) => o.current_stage === stage);
          if (stageOrders.length === 0) return null;
          const StageIcon = STAGE_ICONS[stage] || Package;
          return (
            <div key={stage} ref={(el) => { stageRefs.current[stage] = el; }} className="space-y-2 scroll-mt-4">
              <div className="flex items-center gap-2 border-b pb-1.5">
                <StageIcon className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">{STAGE_LABELS[stage]}</h4>
                <Badge variant="secondary">{stageOrders.length}</Badge>
              </div>
              <div className="grid gap-4">
                {stageOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    stageLogs={stageLogs.filter((l) => l.production_order_id === order.id)}
                    role={role}
                    isAdmin={isAdmin}
                    selected={selected.has(order.id)}
                    onToggleSelect={() => toggleSelect(order.id)}
                    onStart={() => setOperatorPrompt({ mode: "start", orderId: order.id, clientName: order.client_name })}
                    onFinish={() => handleFinishOrder(order)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {completedOrders.length > 0 && (
        <>
          <Separator />
          <h3 className="text-sm font-semibold text-foreground">Órdenes completadas ({completedOrders.length})</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {completedOrders.map((order) => (
              <Card key={order.id} className="border opacity-75">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{order.client_name}</p>
                      <p className="text-xs text-muted-foreground">{order.molde || order.thermo_size} — {order.quantity} uds</p>
                      <p className="text-xs text-muted-foreground">Asesor: {order.advisor_name || "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary/30">
                      <Truck className="h-3 w-3 mr-1" /> Enviado a Logística
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Confirmation Dialog - Body Task */}
      {/* Confirmation Dialog - Production Order (produccion_cuerpos stage) */}
      <Dialog open={!!confirmOrder} onOpenChange={(open) => { if (!open) setConfirmOrder(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cantidad producida</DialogTitle>
            <DialogDescription>
              Confirme la cantidad real de cuerpos producidos para la orden de {confirmOrder?.client_name}.
            </DialogDescription>
          </DialogHeader>
          {confirmOrder && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 text-sm space-y-1">
                <Row label="Cliente" value={confirmOrder.client_name} />
                <Row label="Molde" value={confirmOrder.molde || "-"} />
                <Row label="Cantidad estimada" value={`${confirmOrder.quantity} unidades`} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-order-qty">Cantidad real producida *</Label>
                <Input
                  id="confirm-order-qty"
                  type="number"
                  min="1"
                  value={confirmOrderQty}
                  onChange={(e) => setConfirmOrderQty(e.target.value)}
                  placeholder="Ingrese la cantidad real"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOrder(null)}>Cancelar</Button>
            <Button onClick={handleConfirmOrderAdvance}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar y avanzar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize body task dialog */}
      <Dialog open={!!finalizeTask} onOpenChange={(open) => { if (!open) setFinalizeTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar producción de cuerpos</DialogTitle>
            <DialogDescription>
              Confirma las unidades realmente fabricadas. Solo entonces se sumarán al inventario.
            </DialogDescription>
          </DialogHeader>
          {finalizeTask && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 text-sm space-y-1">
                <Row label="Referencia" value={finalizeTask.referencia} />
                <Row label="Tipo" value={finalizeTask.tipo_plastico === "frio" ? "Frío" : "Calor"} />
                <Row label="Estimado" value={`${finalizeTask.unidades} unidades`} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finalize-qty">Unidades realmente fabricadas *</Label>
                <Input
                  id="finalize-qty"
                  type="number"
                  min="1"
                  value={finalizeActualQty}
                  onChange={(e) => setFinalizeActualQty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finalize-by">Quién fabricó *</Label>
                <Input
                  id="finalize-by"
                  placeholder="Nombre del operario"
                  value={finalizeFabricatedBy}
                  onChange={(e) => setFinalizeFabricatedBy(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeTask(null)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!finalizeTask) return;
                const qty = parseInt(finalizeActualQty, 10);
                if (!qty || qty <= 0) { toast.error("Ingrese una cantidad válida."); return; }
                if (!finalizeFabricatedBy.trim()) { toast.error("Indique quién fabricó."); return; }
                // Canonicalize reference: strip any trailing tipo suffix then append the canonical one.
                // DB convention: "frio" -> "(Frío)", "calor" -> "(Térmico)".
                const tipoLabel = finalizeTask.tipo_plastico === "frio" ? "Frío" : "Térmico";
                const baseRef = finalizeTask.referencia
                  .replace(/\s*\((Frío|Frio|Calor|Térmico|Termico)\)\s*$/i, "")
                  .trim();
                const canonicalRef = `${baseRef} (${tipoLabel})`;
                const { data: updRows, error: updErr } = await supabase
                  .from("body_production_tasks")
                  .update({
                    status: "finalizado",
                    unidades: qty,
                    fabricated_by: finalizeFabricatedBy.trim(),
                    completed_at: new Date().toISOString(),
                    referencia: canonicalRef,
                  })
                  .eq("id", finalizeTask.id)
                  .select("id");
                if (updErr) { toast.error(`Error al finalizar: ${updErr.message}`); return; }
                if (!updRows || updRows.length === 0) {
                  toast.error(
                    "No se pudo finalizar la tarea: la base de datos rechazó la actualización. " +
                    "Tu usuario podría no tener el rol de Producción asignado. Avisa al administrador.",
                  );
                  return;
                }
                // Ensure a stock_items row exists (trigger requires it), but don't add stock yet.
                // Cuerpos are stored in stock_items as base name + product_type, while movements use the visible suffix.
                const { data: stockRows } = await supabase
                  .from("stock_items")
                  .select("id, name, product_type")
                  .eq("brand", "magical")
                  .eq("category", "cuerpos_referencias");
                const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                let stockRow = (stockRows || []).find(
                  (row: any) => norm(baseRefName(row.name)) === norm(baseRef) && (!row.product_type || row.product_type === tipoLabel)
                ) as { id: string } | undefined;
                if (!stockRow) {
                  const { data: created } = await supabase.from("stock_items").insert({
                    name: baseRef,
                    brand: "magical",
                    category: "cuerpos_referencias",
                    available: 0,
                    in_process: 0,
                    unit: "unidades",
                    min_stock: 0,
                    product_type: tipoLabel,
                  } as any).select("id").single();
                  stockRow = created;
                }
                // Register a PENDING-RECEPTION inventory movement.
                // Stock will be added to body_stock + stock_items only when Inventarios
                // confirms reception from the Historial de movimientos.
                const { data: { user: authUser } } = await supabase.auth.getUser();
                const { error: movErr } = await supabase.from("inventory_movements").insert({
                  stock_item_id: stockRow?.id ?? null,
                  item_name: canonicalRef,
                  brand: "magical",
                  category: "cuerpos_referencias",
                  quantity: qty,
                  direction: "retorno",
                  area: "produccion",
                  movement_kind: "entrada",
                  purpose: `Cuerpos fabricados por ${finalizeFabricatedBy.trim()}`,
                  reason: `AUTO_REQ: Pendiente de recepción en Inventarios`,
                  requested_by_name: finalizeFabricatedBy.trim(),
                  recorded_by: authUser?.id ?? null,
                  recorded_by_name: authUser?.email ?? "Producción",
                  reception_confirmed: false,
                } as any);
                if (movErr) {
                  toast.error(`La producción quedó finalizada, pero no llegó a Inventarios: ${movErr.message}. Avisa al administrador.`);
                  return;
                }
                // Notify inventarios so they can confirm reception
                await supabase.from("notifications").insert({
                  target_role: "inventarios",
                  title: "Cuerpos finalizados — confirmar recepción",
                  message: `${qty} uds de "${canonicalRef}" finalizadas por ${finalizeFabricatedBy.trim()}. Confirma la recepción desde el Historial de movimientos.`,
                  type: "success",
                } as any);
                toast.success(`${qty} uds de "${canonicalRef}" enviadas a Inventarios para confirmación.`);
                setFinalizeTask(null);
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Finalizar y enviar a inventario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion Dialog - Photo, Packager, Count */}
      <CompletionDialog
        open={!!completionOrder}
        onClose={() => setCompletionOrder(null)}
        order={completionOrder}
        onConfirm={(data) => {
          if (!completionOrder) return;
          advanceStage.mutate({
            orderId: completionOrder.id,
            completionData: data,
          });
          setCompletionOrder(null);
        }}
      />

      <OperatorPromptDialog
        open={!!operatorPrompt}
        title={operatorPrompt?.mode === "start" ? "Iniciar etapa" : "Finalizar etapa"}
        description={operatorPrompt ? `Pedido de ${operatorPrompt.clientName}. Se registrará la hora actual.` : undefined}
        confirmLabel={operatorPrompt?.mode === "start" ? "Iniciar" : "Finalizar"}
        onCancel={() => setOperatorPrompt(null)}
        onConfirm={(name) => {
          if (!operatorPrompt) return;
          if (operatorPrompt.mode === "start") {
            updateStageStatus.mutate({ orderId: operatorPrompt.orderId, status: "en_proceso", operatorName: name });
          } else {
            advanceStage.mutate({ orderId: operatorPrompt.orderId, operatorName: name });
          }
          setOperatorPrompt(null);
        }}
      />
    </div>
  );
};

/* Order Card */
function OrderCard({ order, stageLogs, role, isAdmin, selected, onToggleSelect, onStart, onFinish }: { order: ProductionOrder; stageLogs: ProductionStageLog[]; role: string | null; isAdmin: boolean; selected: boolean; onToggleSelect: () => void; onStart: () => void; onFinish: () => void }) {
  const stages = order.stages;
  const currentIdx = stages.indexOf(order.current_stage);
  const Icon = STAGE_ICONS[order.current_stage] || Package;
  const badge = STATUS_BADGE[order.stage_status] || STATUS_BADGE.pendiente;
  const isEstampacionStage = order.current_stage === "estampacion";
  const disableButtons = isEstampacionStage && role === "produccion";

  return (
    <Card className={selected ? "ring-2 ring-primary" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label="Seleccionar pedido" />
            )}
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{order.client_name}</CardTitle>
              <p className="text-xs text-muted-foreground">{order.molde} — {order.quantity} uds</p>
              <p className="text-xs text-muted-foreground">Asesor: {order.advisor_name || "—"}</p>
            </div>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1">
          {stages.filter((s) => order.needs_cuerpos || s !== "produccion_cuerpos").map((stage) => {
            const stageIdx = stages.indexOf(stage);
            const isCurrent = stage === order.current_stage;
            const isDone = stageIdx < currentIdx || order.current_stage === "listo";
            return (
              <div key={stage} className="flex items-center gap-1 flex-1">
                <div
                  className={`h-2 flex-1 rounded-full transition-colors ${isDone ? "bg-primary" : isCurrent ? "bg-primary/40" : "bg-muted"}`}
                  title={STAGE_LABELS[stage] || stage}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {stages.filter((s) => order.needs_cuerpos || s !== "produccion_cuerpos").map((stage) => {
            const stageIdx = stages.indexOf(stage);
            const isCurrent = stage === order.current_stage;
            const isDone = stageIdx < currentIdx || order.current_stage === "listo";
            const StageIcon = STAGE_ICONS[stage] || Package;
            return (
              <div key={stage} className={`flex-1 flex flex-col items-center text-center ${isCurrent ? "text-primary font-medium" : isDone ? "text-primary/60" : "text-muted-foreground"}`}>
                <StageIcon className={`h-3.5 w-3.5 mb-0.5 ${isDone ? "text-primary" : ""}`} />
                <span className="text-[10px] leading-tight">{STAGE_LABELS[stage] || stage}</span>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Etapa actual: <span className="font-medium text-foreground">{STAGE_LABELS[order.current_stage] || order.current_stage}</span>
          </span>
          <span className="text-xs text-muted-foreground">Creado: {new Date(order.created_at).toLocaleDateString()}</span>
        </div>

        {order.delivery_date && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <span className="text-muted-foreground">Fecha de entrega: </span>
            <span className="font-semibold text-foreground">{new Date(order.delivery_date).toLocaleDateString()}</span>
          </div>
        )}

        {order.current_stage === "estampacion" && (
          <div className="rounded-md border p-3 text-xs space-y-1">
            <Row label="Color de gel" value={order.gel_color || "-"} />
            <Row label="Color de tinta" value={order.ink_color || "-"} />
            <Row label="Molde / Referencia" value={order.molde || "-"} />
            {order.logo_file && <Row label="Logo" value={order.logo_file} />}
          </div>
        )}

        {order.observations && <p className="text-xs text-muted-foreground italic">Obs: {order.observations}</p>}

        <div className="flex gap-2 pt-1">
          {order.stage_status === "pendiente" && (
            <Button size="sm" variant="outline" onClick={onStart} disabled={disableButtons}>
              <Play className="h-3 w-3 mr-1" /> Iniciar proceso
            </Button>
          )}
          {order.stage_status === "en_proceso" && (
            <Button size="sm" onClick={onFinish} disabled={disableButtons}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Finalizar proceso
            </Button>
          )}
        </div>

        <StageLogsList logs={stageLogs} stageLabels={STAGE_LABELS} />
      </CardContent>
    </Card>
  );
}

/* Body Production Form */
function BodyProductionForm({ onClose, onSubmit, initial }: { onClose: () => void; onSubmit: (data: { tipoPlastico: string; referencia: string; unidades: number }) => void; initial?: { tipoPlastico: "frio" | "calor"; referencia: string; unidades: number } | null }) {
  const [tipoPlastico, setTipoPlastico] = useState<string | null>(initial?.tipoPlastico ?? null);
  const [referencia, setReferencia] = useState(initial?.referencia ?? "");
  const [unidades, setUnidades] = useState(initial?.unidades ? String(initial.unidades) : "");
  const canSubmit = tipoPlastico && referencia && unidades && parseInt(unidades) > 0;
  const { stockItems } = useInventory();
  const referencias = useMemo(() => {
    const fromInv = stockItems
      .filter((s) => s.brand === "magical" && s.category === "cuerpos_referencias")
      .map((s) => s.name);
    const merged = Array.from(new Set([...CANONICAL_REFERENCES, ...fromInv]));
    return merged.sort((a, b) => a.localeCompare(b));
  }, [stockItems]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Nueva producción de cuerpos</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de plástico *</Label>
          <div className="grid grid-cols-2 gap-3">
            {PLASTICO_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = tipoPlastico === opt.value;
              return (
                <button key={opt.value} type="button" onClick={() => setTipoPlastico(opt.value)}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-colors cursor-pointer ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-primary/5"}`}>
                  <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Referencia *</Label>
            <Select value={referencia} onValueChange={setReferencia}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar referencia" />
              </SelectTrigger>
              <SelectContent>
                {referencias.map((ref) => (
                  <SelectItem key={ref} value={ref}>{ref}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Unidades estimadas *</Label>
            <Input type="number" min="1" placeholder="Ej: 200" value={unidades} onChange={(e) => setUnidades(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          La producción se crea en estado <span className="font-medium">en proceso</span>. Al finalizar se piden las unidades reales fabricadas y se envían al inventario.
        </p>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { if (canSubmit && tipoPlastico) onSubmit({ tipoPlastico, referencia, unidades: parseInt(unidades) }); }} disabled={!canSubmit}>
            <Plus className="h-4 w-4 mr-1" /> Crear producción
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}