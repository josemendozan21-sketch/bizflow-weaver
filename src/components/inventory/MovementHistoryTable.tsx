import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInventoryMovements } from "@/hooks/useInventoryMovements";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { baseRefName } from "@/lib/canonicalBodyRef";
import { matchesQuery } from "@/lib/search";
import { RESERVATIONS_ENABLED } from "@/lib/featureFlags";

const extractTipo = (ref: string): "Frío" | "Térmico" | null => {
  const m = ref.match(/\((Frío|Frio|Térmico|Termico|Calor)\)/i);
  if (!m) return null;
  const t = m[1].toLowerCase();
  if (t === "frío" || t === "frio") return "Frío";
  return "Térmico";
};

const KIND_LABEL: Record<string, { label: string; cls: string }> = {
  entrada: { label: "Entrada", cls: "border-emerald-500/60 text-emerald-700 dark:text-emerald-400" },
  salida: { label: "Salida", cls: "border-orange-500/60 text-orange-700 dark:text-orange-400" },
  reserva: { label: "Reserva", cls: "border-amber-500/60 text-amber-700 dark:text-amber-400" },
  liberar_reserva: { label: "Liberar", cls: "border-blue-500/60 text-blue-700 dark:text-blue-400" },
};

const CAT_LABEL: Record<string, string> = {
  materia_prima: "Materia prima",
  cuerpos_referencias: "Cuerpos",
  producto_terminado: "Producto terminado",
  importados: "Importados",
};

export default function MovementHistoryTable() {
  const { movements, isLoading, refetch } = useInventoryMovements();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("todas");
  const [catFilter, setCatFilter] = useState("todas");
  const [kindFilter, setKindFilter] = useState("todos");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const confirmReception = async (m: typeof movements[number]) => {
    if (confirmingId) return;
    setConfirmingId(m.id);
    try {
      // Guard against double-confirmation (double click / stale list): re-read the row.
      const { data: fresh, error: freshErr } = await supabase
        .from("inventory_movements")
        .select("reception_confirmed")
        .eq("id", m.id)
        .maybeSingle();
      if (freshErr) throw freshErr;
      if (!fresh || (fresh as any).reception_confirmed !== false) {
        toast.info("Esta entrada ya fue recibida. No se sumó nada.");
        refetch();
        return;
      }

      // For cuerpos_referencias the canonical row is (base name + product_type),
      // not the suffix-named row that stock_item_id may point to.
      let targetId: string | null = m.stock_item_id;
      if (m.category === "cuerpos_referencias") {
        const base = baseRefName(m.item_name);
        const tipo = extractTipo(m.item_name);
        const { data: rows } = await supabase
          .from("stock_items")
          .select("id, name, product_type, available, in_process")
          .eq("category", "cuerpos_referencias")
          .eq("brand", m.brand);
        const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const canonical = (rows || []).find(
          (r: any) =>
            norm(baseRefName(r.name)) === norm(base) &&
            (!tipo || !r.product_type || r.product_type === tipo)
        );
        if (canonical) targetId = canonical.id;
      }

      if (!targetId) {
        toast.error("Movimiento sin ítem de stock asociado.");
        return;
      }

      const { data: stock, error: stockErr } = await supabase
        .from("stock_items")
        .select("available, in_process")
        .eq("id", targetId)
        .single();
      if (stockErr || !stock) throw stockErr || new Error("Ítem no encontrado");

      const newAvailable = Number(stock.available || 0) + Number(m.quantity);
      const newInProcess = Math.max(Number(stock.in_process || 0) - Number(m.quantity), 0);

      const { error: updErr } = await supabase
        .from("stock_items")
        .update({ available: newAvailable, in_process: newInProcess } as any)
        .eq("id", targetId);
      if (updErr) throw updErr;

      // For magical body references, mirror into body_stock so production views stay in sync
      if (m.category === "cuerpos_referencias" && m.brand === "magical") {
        const { data: bs } = await supabase
          .from("body_stock")
          .select("id, available")
          .eq("brand", "magical")
          .ilike("referencia", m.item_name)
          .maybeSingle();
        if (bs) {
          await supabase
            .from("body_stock")
            .update({ available: Number(bs.available || 0) + Number(m.quantity) })
            .eq("id", bs.id);
        } else {
          await supabase
            .from("body_stock")
            .insert({ brand: "magical", referencia: m.item_name, available: Number(m.quantity) });
        }
      }

      const { error: confErr } = await supabase
        .from("inventory_movements")
        .update({
          reception_confirmed: true,
          reception_confirmed_at: new Date().toISOString(),
          reception_confirmed_by: user?.id ?? null,
          reception_confirmed_by_name: user?.email ?? "Inventarios",
        } as any)
        .eq("id", m.id);
      if (confErr) throw confErr;

      toast.success(`Recepción confirmada: ${m.quantity} uds de "${m.item_name}".`);
      refetch();
    } catch (err: any) {
      toast.error(`No se pudo confirmar: ${err?.message || err}`);
    } finally {
      setConfirmingId(null);
    }
  };

  const brands = useMemo(
    () => Array.from(new Set(movements.map((m) => m.brand))).sort(),
    [movements],
  );

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (brandFilter !== "todas" && m.brand !== brandFilter) return false;
      if (catFilter !== "todas" && m.category !== catFilter) return false;
      const kind = m.movement_kind || (m.direction === "retorno" ? "entrada" : "salida");
      if (kindFilter !== "todos" && kind !== kindFilter) return false;
      if (!matchesQuery(
        [m.item_name, m.brand, m.requested_by_name, m.purpose, m.reason, m.supplier, m.recorded_by_name],
        search,
      )) return false;
      return true;
    });
  }, [movements, brandFilter, catFilter, kindFilter, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-primary" /> Historial de movimientos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="Buscar ítem, marca, solicitante, motivo…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="salida">Salidas</SelectItem>
              {RESERVATIONS_ENABLED && <SelectItem value="reserva">Reservas</SelectItem>}
              {RESERVATIONS_ENABLED && <SelectItem value="liberar_reserva">Liberaciones</SelectItem>}
            </SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las marcas</SelectItem>
              {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {Object.entries(CAT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Ítem</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead>Solicita</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Cargando...</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Sin movimientos</TableCell></TableRow>
              )}
              {filtered.map((m) => {
                const k = m.movement_kind || (m.direction === "retorno" ? "entrada" : "salida");
                const meta = KIND_LABEL[k] || KIND_LABEL.salida;
                const pendingReception = m.reception_confirmed === false;
                return (
                  <TableRow key={m.id} className={pendingReception ? "bg-amber-50/50 dark:bg-amber-950/20" : undefined}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(m.recorded_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                        {pendingReception && (
                          <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-400 text-[10px]">
                            Pendiente recepción
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{m.brand}</TableCell>
                    <TableCell className="text-xs">{CAT_LABEL[m.category] || m.category}</TableCell>
                    <TableCell className="font-medium text-sm">{m.item_name}</TableCell>
                    <TableCell className="text-right font-semibold">{m.quantity}</TableCell>
                    <TableCell className="text-xs">{m.requested_by_name || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[260px] truncate" title={m.purpose || m.reason || ""}>
                      {m.purpose || m.reason || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {pendingReception ? (
                        <Button
                          size="sm"
                          variant="default"
                          disabled={confirmingId === m.id}
                          onClick={() => confirmReception(m)}
                          className="gap-1"
                        >
                          {confirmingId === m.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Confirmar recepción
                        </Button>
                      ) : m.reception_confirmed_at ? (
                        <span className="text-[11px] text-muted-foreground">
                          Recibido {new Date(m.reception_confirmed_at).toLocaleDateString("es-CO")}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}