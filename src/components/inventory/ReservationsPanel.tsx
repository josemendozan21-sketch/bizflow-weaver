import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import DebouncedSearchInput from "@/components/inventory/DebouncedSearchInput";
import { BookmarkCheck, RotateCcw, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ReservationRow {
  id: string;
  order_id: string;
  order_code: string | null;
  stock_item_id: string | null;
  item_name: string;
  brand: string;
  category: string;
  quantity: number;
  status: string;
  created_at: string;
  released_at: string | null;
  released_by_name: string | null;
  release_reason: string | null;
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

export interface ReservationWithOrder extends ReservationRow {
  order?: OrderRow;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  activa: { label: "Reservado", cls: "bg-amber-500 hover:bg-amber-600 text-white" },
  consumida: { label: "Entregado", cls: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  liberada: { label: "Liberado", cls: "bg-muted text-muted-foreground" },
};

const ReservationsPanel = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [releasing, setReleasing] = useState<ReservationWithOrder | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["order-reservations"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("order_reservations")
        .select(
          "id,order_id,order_code,stock_item_id,item_name,brand,category,quantity,status,created_at,released_at,released_by_name,release_reason",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const list = (rows || []) as ReservationRow[];

      const orderIds = Array.from(new Set(list.map((r) => r.order_id).filter(Boolean)));
      let orders: OrderRow[] = [];
      if (orderIds.length) {
        const { data: os } = await supabase
          .from("orders")
          .select("id,client_name,product,quantity,advisor_name,delivery_date,production_status")
          .in("id", orderIds);
        orders = (os || []) as OrderRow[];
      }
      const orderMap = new Map(orders.map((o) => [o.id, o]));
      return list.map((r) => ({ ...r, order: orderMap.get(r.order_id) })) as ReservationWithOrder[];
    },
    refetchInterval: 15_000,
  });

  const all = useMemo(() => data || [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) =>
      [r.item_name, r.brand, r.order_code, r.order?.client_name, r.order?.advisor_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [all, search]);

  const active = filtered.filter((r) => r.status === "activa");
  const history = filtered.filter((r) => r.status !== "activa").slice(0, 40);
  const totalReserved = active.reduce((s, r) => s + Number(r.quantity || 0), 0);

  const confirmRelease = async () => {
    if (!releasing) return;
    if (!reason.trim()) {
      toast.error("Indique el motivo de la liberación");
      return;
    }
    setBusy(true);
    try {
      const { data: res, error } = await supabase.rpc("release_order_reservation", {
        _reservation_id: releasing.id,
        _reason: reason.trim(),
      });
      if (error) throw new Error(error.message);
      const payload = res as { ok?: boolean; message?: string } | null;
      if (payload && payload.ok === false) throw new Error(payload.message || "No se pudo liberar");
      toast.success(`Liberadas ${releasing.quantity} uds de "${releasing.item_name}".`);
      setReleasing(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["order-reservations"] });
      qc.invalidateQueries({ queryKey: ["stock_items"] });
      qc.invalidateQueries({ queryKey: ["inventory-movements"] });
      qc.invalidateQueries({ queryKey: ["inventory-dashboard-stats"] });
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
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <BookmarkCheck className="h-4 w-4" />
            Inventario reservado
            <Badge variant="secondary">{active.length} {active.length === 1 ? "reserva" : "reservas"}</Badge>
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
              {totalReserved.toLocaleString("es-CO")} uds apartadas
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Al crear un pedido, las unidades se apartan automáticamente y dejan de contar como disponibles.
            La reserva se consume cuando Inventarios confirma el abastecimiento y se libera si el pedido se cancela.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <DebouncedSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por cliente, referencia, pedido o asesor..."
          />

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando reservas…</p>
          ) : active.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay inventario reservado pendiente.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {active.map((r) => (
                <Card key={r.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">{r.brand}</Badge>
                      <Badge className={STATUS_META.activa.cls}>
                        {Number(r.quantity).toLocaleString("es-CO")} reservadas
                      </Badge>
                      {r.order_code && <Badge variant="secondary">{r.order_code}</Badge>}
                      {r.order?.production_status && (
                        <Badge variant="outline" className="capitalize">
                          {r.order.production_status.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold">{r.order?.client_name || "Sin pedido asociado"}</h4>
                      <p className="text-sm text-muted-foreground">{r.item_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Asesor: {r.order?.advisor_name || "—"}</div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {r.order?.delivery_date
                          ? format(new Date(r.order.delivery_date), "dd MMM yyyy", { locale: es })
                          : "Sin fecha"}
                      </div>
                      <div className="col-span-2">
                        Reservado el {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => { setReleasing(r); setReason(""); }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Liberar reserva
                    </Button>
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
            <CardTitle className="text-base">Historial de reservas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((r) => {
              const meta = STATUS_META[r.status] || STATUS_META.liberada;
              return (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.item_name} · {Number(r.quantity).toLocaleString("es-CO")} uds
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.order?.client_name || "Sin pedido"}
                      {r.order_code ? ` · ${r.order_code}` : ""}
                      {r.released_at
                        ? ` · ${format(new Date(r.released_at), "dd MMM yyyy HH:mm", { locale: es })}`
                        : ""}
                      {r.released_by_name ? ` · ${r.released_by_name}` : ""}
                      {r.release_reason ? ` · ${r.release_reason}` : ""}
                    </p>
                  </div>
                  <Badge className={meta.cls}>{meta.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!releasing} onOpenChange={(o) => !o && setReleasing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar reserva</DialogTitle>
            <DialogDescription>
              Las {releasing ? Number(releasing.quantity).toLocaleString("es-CO") : 0} uds de
              {" "}"{releasing?.item_name}" volverán al inventario disponible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="release-reason">
              Motivo <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="release-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: el cliente desistió del pedido"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleasing(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={confirmRelease} disabled={busy || !reason.trim()}>
              {busy ? "Liberando..." : "Liberar reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReservationsPanel;
