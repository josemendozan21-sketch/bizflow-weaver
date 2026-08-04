import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import DebouncedSearchInput from "@/components/inventory/DebouncedSearchInput";
import { BookmarkCheck, Truck, Paintbrush, RotateCcw, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

interface MovementRow {
  id: string;
  order_id: string | null;
  stock_item_id: string | null;
  item_name: string;
  brand: string;
  category: string;
  quantity: number;
  movement_kind: string;
  recorded_at: string;
  reason: string | null;
  recorded_by_name: string | null;
}

interface OrderRow {
  id: string;
  client_name: string;
  product: string;
  quantity: number;
  advisor_name: string | null;
  delivery_date: string | null;
  production_status: string | null;
}

export interface ReservationGroup {
  key: string;
  orderId: string | null;
  stockItemId: string | null;
  itemName: string;
  brand: string;
  category: string;
  reserved: number;
  released: number;
  pending: number;
  lastAt: string;
  by: string | null;
  order?: OrderRow;
}

const ReservationsPanel = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [dispatching, setDispatching] = useState<ReservationGroup | null>(null);
  const [releasing, setReleasing] = useState<ReservationGroup | null>(null);
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-reservations"],
    queryFn: async () => {
      const { data: movs, error } = await supabase
        .from("inventory_movements")
        .select("id,order_id,stock_item_id,item_name,brand,category,quantity,movement_kind,recorded_at,reason,recorded_by_name")
        .in("movement_kind", ["reserva", "liberar_reserva"])
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      const rows = (movs || []) as MovementRow[];

      const orderIds = Array.from(new Set(rows.map((r) => r.order_id).filter(Boolean))) as string[];
      let orders: OrderRow[] = [];
      if (orderIds.length) {
        const { data: os } = await supabase
          .from("orders")
          .select("id,client_name,product,quantity,advisor_name,delivery_date,production_status")
          .in("id", orderIds);
        orders = (os || []) as OrderRow[];
      }
      const orderMap = new Map(orders.map((o) => [o.id, o]));

      const groups = new Map<string, ReservationGroup>();
      rows.forEach((r) => {
        const key = `${r.order_id ?? "sin-pedido"}::${r.stock_item_id ?? r.item_name}`;
        const g = groups.get(key) || {
          key,
          orderId: r.order_id,
          stockItemId: r.stock_item_id,
          itemName: r.item_name,
          brand: r.brand,
          category: r.category,
          reserved: 0,
          released: 0,
          pending: 0,
          lastAt: r.recorded_at,
          by: r.recorded_by_name,
          order: r.order_id ? orderMap.get(r.order_id) : undefined,
        };
        if (r.movement_kind === "reserva") g.reserved += Number(r.quantity) || 0;
        else g.released += Number(r.quantity) || 0;
        if (new Date(r.recorded_at) > new Date(g.lastAt)) g.lastAt = r.recorded_at;
        groups.set(key, g);
      });

      return Array.from(groups.values())
        .map((g) => ({ ...g, pending: Math.max(g.reserved - g.released, 0) }))
        .sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
    },
    refetchInterval: 15_000,
  });

  const all = data || [];
  const active = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = all.filter((g) => g.pending > 0);
    if (!q) return list;
    return list.filter((g) =>
      [g.itemName, g.brand, g.order?.client_name, g.order?.product, g.order?.advisor_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [all, search]);
  const history = useMemo(() => all.filter((g) => g.pending === 0), [all]);

  const totalReserved = active.reduce((s, g) => s + g.pending, 0);

  const openDispatch = (g: ReservationGroup) => {
    setDispatching(g);
    setQty(String(g.pending));
    setNote("");
  };
  const openRelease = (g: ReservationGroup) => {
    setReleasing(g);
    setQty(String(g.pending));
    setNote("");
  };

  const runMovements = async (rows: Record<string, unknown>[]) => {
    for (const row of rows) {
      const { error } = await supabase.from("inventory_movements").insert(row as never);
      if (error) throw new Error(error.message);
    }
  };

  const confirmDispatch = async () => {
    if (!dispatching || !user) return;
    const q = Number(qty);
    if (!q || q <= 0 || q > dispatching.pending) { toast.error("Cantidad inválida"); return; }
    setBusy(true);
    const base = {
      stock_item_id: dispatching.stockItemId,
      item_name: dispatching.itemName,
      brand: dispatching.brand,
      category: dispatching.category,
      quantity: q,
      order_id: dispatching.orderId,
      recorded_by: user.id,
      recorded_by_name: user.email || "Inventarios",
      area: "estampacion",
    };
    try {
      // 1) libera la reserva (in_process → available) y 2) registra la salida física
      await runMovements([
        { ...base, direction: "retorno", movement_kind: "liberar_reserva",
          reason: `Liberación de reserva para entrega a Estampación${dispatching.order ? ` — ${dispatching.order.client_name}` : ""}` },
        { ...base, direction: "entrega", movement_kind: "salida",
          purpose: "Entrega de cuerpos a Estampación",
          reason: `Entrega a Estampación${dispatching.order ? ` — Pedido de ${dispatching.order.client_name}` : ""}${note ? ` — ${note}` : ""}` },
      ]);
      toast.success(`Entregadas ${q} uds de "${dispatching.itemName}" a Estampación.`);
      setDispatching(null);
      qc.invalidateQueries({ queryKey: ["inventory-reservations"] });
      qc.invalidateQueries({ queryKey: ["stock_items"] });
      qc.invalidateQueries({ queryKey: ["inventory-movements"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo entregar");
    } finally {
      setBusy(false);
    }
  };

  const confirmRelease = async () => {
    if (!releasing || !user) return;
    const q = Number(qty);
    if (!q || q <= 0 || q > releasing.pending) { toast.error("Cantidad inválida"); return; }
    setBusy(true);
    try {
      await runMovements([{
        stock_item_id: releasing.stockItemId,
        item_name: releasing.itemName,
        brand: releasing.brand,
        category: releasing.category,
        quantity: q,
        order_id: releasing.orderId,
        recorded_by: user.id,
        recorded_by_name: user.email || "Inventarios",
        area: "estampacion",
        direction: "retorno",
        movement_kind: "liberar_reserva",
        reason: `Reserva liberada${releasing.order ? ` — ${releasing.order.client_name}` : ""}${note ? ` — ${note}` : ""}`,
      }]);
      toast.success(`Liberadas ${q} uds de "${releasing.itemName}".`);
      setReleasing(null);
      qc.invalidateQueries({ queryKey: ["inventory-reservations"] });
      qc.invalidateQueries({ queryKey: ["stock_items"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo liberar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookmarkCheck className="h-4 w-4" />
            Inventario reservado
            <Badge variant="secondary">{active.length} {active.length === 1 ? "reserva" : "reservas"}</Badge>
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white">{totalReserved.toLocaleString("es-CO")} uds apartadas</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Unidades apartadas por pedido. El pedido ya está en Estampación para avanzar con la muestra;
            aquí Inventarios entrega físicamente los cuerpos cuando se inicia el pedido completo.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <DebouncedSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por cliente, referencia o asesor..."
          />

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando reservas…</p>
          ) : active.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No hay inventario reservado pendiente de entrega.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {active.map((g) => (
                <Card key={g.key}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="capitalize">{g.brand}</Badge>
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                            {g.pending.toLocaleString("es-CO")} reservadas
                          </Badge>
                          {g.order?.production_status && (
                            <Badge variant="secondary" className="capitalize">{g.order.production_status.replace(/_/g, " ")}</Badge>
                          )}
                        </div>
                        <h4 className="font-semibold mt-1.5">{g.order?.client_name || "Sin pedido asociado"}</h4>
                        <p className="text-sm text-muted-foreground">{g.itemName}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Asesor: {g.order?.advisor_name || "—"}</div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {g.order?.delivery_date
                          ? format(new Date(g.order.delivery_date), "dd MMM yyyy", { locale: es })
                          : "Sin fecha"}
                      </div>
                      <div className="col-span-2">
                        Reservado el {format(new Date(g.lastAt), "dd MMM yyyy HH:mm", { locale: es })}
                        {g.by ? ` por ${g.by}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" className="flex-1 min-w-[160px] gap-1.5" onClick={() => openDispatch(g)}>
                        <Truck className="h-3.5 w-3.5" /> Entregar cuerpos a Estampación
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openRelease(g)}
                        title="Devolver las unidades al stock disponible">
                        <RotateCcw className="h-3.5 w-3.5" /> Liberar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Paintbrush className="h-4 w-4" /> Reservas ya entregadas o liberadas
              <Badge variant="outline">{history.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {history.slice(0, 25).map((g) => (
              <div key={g.key} className="flex items-center justify-between text-xs border-b py-1.5 last:border-0">
                <span className="truncate">
                  <span className="font-medium">{g.order?.client_name || "Sin pedido"}</span> — {g.itemName}
                </span>
                <span className="text-muted-foreground shrink-0 ml-2">
                  {g.reserved.toLocaleString("es-CO")} uds · {format(new Date(g.lastAt), "dd MMM", { locale: es })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!dispatching} onOpenChange={(o) => !o && setDispatching(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entregar cuerpos a Estampación</DialogTitle>
            <DialogDescription>
              Se liberará la reserva y se descontará el inventario como salida hacia Estampación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-medium">{dispatching?.itemName}</span>
              {dispatching?.order ? ` — Pedido de ${dispatching.order.client_name}` : ""}
            </div>
            <div className="space-y-1.5">
              <Label>Cantidad a entregar (reservadas: {dispatching?.pending ?? 0})</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatching(null)} disabled={busy}>Cancelar</Button>
            <Button onClick={confirmDispatch} disabled={busy}>{busy ? "Entregando…" : "Confirmar entrega"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!releasing} onOpenChange={(o) => !o && setReleasing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar reserva</DialogTitle>
            <DialogDescription>Las unidades vuelven al stock disponible.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Cantidad a liberar (reservadas: {releasing?.pending ?? 0})</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleasing(null)} disabled={busy}>Cancelar</Button>
            <Button onClick={confirmRelease} disabled={busy}>{busy ? "Liberando…" : "Liberar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReservationsPanel;