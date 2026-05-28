import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, Package, Truck, Paintbrush, Factory, Calendar, User as UserIcon, ShoppingBag, ArrowLeft } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

interface MayorOrder {
  id: string;
  brand: string;
  client_name: string;
  product: string;
  quantity: number;
  advisor_name: string;
  delivery_date: string | null;
  production_status: string;
  created_at: string;
  observations: string | null;
}

const ACTIVE_STATUSES = [
  "pendiente", "diseno", "produccion_cuerpos", "estampacion",
  "dosificacion", "sellado", "recorte", "empaque", "listo",
];

type Target = "estampacion" | "produccion" | "logistica";

const TARGET_LABEL: Record<Target, string> = {
  estampacion: "Estampación",
  produccion: "Producción",
  logistica: "Logística",
};

type BandejaView = "menu" | "mayor" | "detal";

const WholesaleOrdersInbox = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { stockItems } = useInventory();
  const [view, setView] = useState<BandejaView>("menu");
  const [delivering, setDelivering] = useState<{ order: MayorOrder; target: Target } | null>(null);
  const [qty, setQty] = useState<string>("");
  const [obs, setObs] = useState<string>("");
  const [plastico, setPlastico] = useState<"frio" | "calor">("frio");
  const [busy, setBusy] = useState(false);

  // Realtime: pop up toast + refetch when a new order arrives
  useEffect(() => {
    const channel = supabase
      .channel("inventory-orders-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const o: any = payload.new;
          const tipo = o.sale_type === "detal" ? "al detal" : "al por mayor";
          toast.success(`Nuevo pedido ${tipo}`, {
            description: `${o.client_name} — ${Number(o.quantity || 0).toLocaleString("es-CO")} × ${o.product}`,
            duration: 8000,
          });
          qc.invalidateQueries({ queryKey: ["mayor-orders-inbox"] });
          qc.invalidateQueries({ queryKey: ["detal-orders-inbox"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["mayor-orders-inbox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,brand,client_name,product,quantity,advisor_name,delivery_date,production_status,created_at,observations")
        .eq("sale_type", "mayor")
        .in("production_status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MayorOrder[];
    },
    refetchInterval: 15_000,
  });

  const { data: retailOrders = [], isLoading: loadingRetail } = useQuery({
    queryKey: ["detal-orders-inbox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,brand,client_name,product,quantity,advisor_name,delivery_date,production_status,created_at,observations")
        .eq("sale_type", "menor")
        .in("production_status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MayorOrder[];
    },
    refetchInterval: 15_000,
  });

  // Fetch which orders already had a delivery movement OR a body production task (to dim them)
  const { data: deliveredIds = new Set<string>() } = useQuery({
    queryKey: ["mayor-orders-delivered"],
    queryFn: async () => {
      const [mov, tasks] = await Promise.all([
        supabase.from("inventory_movements").select("order_id")
          .eq("direction", "entrega").not("order_id", "is", null),
        supabase.from("body_production_tasks").select("order_id" as any)
          .not("order_id", "is", null),
      ]);
      const set = new Set<string>();
      (mov.data || []).forEach((m: any) => m.order_id && set.add(m.order_id));
      (tasks.data || []).forEach((t: any) => t.order_id && set.add(t.order_id));
      return set;
    },
    refetchInterval: 15_000,
  });

  const findStockItem = (o: MayorOrder) => {
    return stockItems.find(
      (s) => s.brand === o.brand && s.category === "producto_terminado" &&
        s.name.toLowerCase() === o.product.toLowerCase()
    );
  };

  const pending = useMemo(() => orders.filter((o) => !deliveredIds.has(o.id)), [orders, deliveredIds]);
  const delivered = useMemo(() => orders.filter((o) => deliveredIds.has(o.id)), [orders, deliveredIds]);

  const openDeliver = (order: MayorOrder, target: Target) => {
    setDelivering({ order, target });
    setQty(String(order.quantity));
    setObs("");
    setPlastico("frio");
  };

  const confirmDeliver = async () => {
    if (!delivering || !user) return;
    const { order, target } = delivering;
    const quantity = Number(qty);
    if (!quantity || quantity <= 0) {
      toast.error("Cantidad inválida");
      return;
    }
    setBusy(true);

    if (target === "produccion") {
      const { error } = await supabase.from("body_production_tasks").insert({
        referencia: order.product,
        unidades: quantity,
        tipo_plastico: plastico,
        status: "pendiente",
        order_id: order.id,
      } as any);
      if (!error) {
        await supabase.from("notifications").insert({
          target_role: "produccion",
          title: "Nueva orden de producción de cuerpos",
          message: `Inventarios solicita producir ${quantity} uds de "${order.product}" (${plastico}) para pedido de ${order.client_name}.`
            + (obs ? ` Obs: ${obs}` : ""),
          type: "info",
          reference_id: order.id,
        });
      }
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success(`Orden de producción creada (${quantity} uds). Los cuerpos volverán a inventario al terminar.`);
    } else {
      const item = findStockItem(order);
      const { error } = await supabase.from("inventory_movements").insert({
        stock_item_id: item?.id ?? null,
        item_name: order.product,
        brand: order.brand,
        category: "producto_terminado",
        quantity,
        direction: "entrega",
        area: target,
        reason: `Pedido al por mayor de ${order.client_name}` + (obs ? ` — ${obs}` : ""),
        order_id: order.id,
        recorded_by: user.id,
        recorded_by_name: user.email || "Inventarios",
      } as any);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success(`Entregado ${quantity} uds a ${TARGET_LABEL[target]}`);
    }

    setDelivering(null);
    qc.invalidateQueries({ queryKey: ["mayor-orders-inbox"] });
    qc.invalidateQueries({ queryKey: ["detal-orders-inbox"] });
    qc.invalidateQueries({ queryKey: ["mayor-orders-delivered"] });
  };

  const renderCard = (o: MayorOrder, isDelivered: boolean, kind: "mayor" | "detal" = "mayor") => {
    const item = findStockItem(o);
    const stock = item ? Number(item.available) : null;
    const enough = stock !== null && stock >= o.quantity;
    const stockBadge = stock === null
      ? <Badge variant="outline">Sin referencia en stock</Badge>
      : enough
        ? <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Stock: {stock}</Badge>
        : stock > 0
          ? <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Stock parcial: {stock} / {o.quantity}</Badge>
          : <Badge variant="destructive">Sin stock</Badge>;

    return (
      <Card key={o.id} className={isDelivered ? "opacity-60" : ""}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {kind === "mayor"
                  ? <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Mayor</Badge>
                  : <Badge className="bg-purple-600 hover:bg-purple-700 text-white">Detal</Badge>}
                <Badge variant="outline" className="capitalize">{o.brand}</Badge>
                {isDelivered && <Badge variant="secondary">Entregado</Badge>}
              </div>
              <h3 className="font-semibold mt-1.5">{o.client_name}</h3>
              <p className="text-sm text-muted-foreground">
                {o.quantity.toLocaleString("es-CO")} × {o.product}
              </p>
            </div>
            <div className="text-right shrink-0">{stockBadge}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <UserIcon className="h-3 w-3" /> {o.advisor_name}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              {o.delivery_date ? format(new Date(o.delivery_date), "dd MMM yyyy", { locale: es }) : "Sin fecha"}
            </div>
            <div className="col-span-2">
              Recibido {formatDistanceToNow(new Date(o.created_at), { addSuffix: true, locale: es })}
            </div>
          </div>

          {o.observations && (
            <div className="text-xs bg-muted/50 rounded p-2">
              <span className="font-medium">Obs:</span> {o.observations}
            </div>
          )}

          {!isDelivered && (
            kind === "detal" ? (
              <div className="pt-1">
                <Button size="sm" variant="default" className="w-full gap-1.5"
                  onClick={() => openDeliver(o, "logistica")}>
                  <Truck className="h-3.5 w-3.5" /> Entregar a Logística
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 min-w-[140px] gap-1.5"
                  onClick={() => openDeliver(o, "estampacion")}>
                  <Paintbrush className="h-3.5 w-3.5" /> Entregar a Estampación
                </Button>
                <Button size="sm" variant="default" className="flex-1 min-w-[140px] gap-1.5"
                  onClick={() => openDeliver(o, "produccion")}>
                  <Factory className="h-3.5 w-3.5" /> Producir cuerpos
                </Button>
              </div>
            )
          )}
        </CardContent>
      </Card>
    );
  };

  const pendingRetail = useMemo(() => retailOrders.filter((o) => !deliveredIds.has(o.id)), [retailOrders, deliveredIds]);
  const deliveredRetail = useMemo(() => retailOrders.filter((o) => deliveredIds.has(o.id)), [retailOrders, deliveredIds]);

  if (view === "menu") {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <button onClick={() => setView("detal")} className="text-left">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-purple-600" />
                  Pedidos al detal
                  <Badge variant="secondary">{pendingRetail.length} pendientes</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Entregar productos terminados a Logística para despacho.</p>
                {pendingRetail.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Último: {pendingRetail[0]?.client_name} — {pendingRetail[0]?.quantity} × {pendingRetail[0]?.product}
                  </div>
                )}
              </CardContent>
            </Card>
          </button>

          <button onClick={() => setView("mayor")} className="text-left">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-blue-600" />
                  Pedidos al por mayor
                  <Badge variant="secondary">{pending.length} pendientes</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Entregar a Estampación o solicitar producción de cuerpos.</p>
                {pending.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Último: {pending[0]?.client_name} — {pending[0]?.quantity.toLocaleString("es-CO")} × {pending[0]?.product}
                  </div>
                )}
              </CardContent>
            </Card>
          </button>
        </div>

        {(delivered.length > 0 || deliveredRetail.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Entregados recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {deliveredRetail.slice(0, 3).map((o) => renderCard(o, true, "detal"))}
                {delivered.slice(0, 3).map((o) => renderCard(o, true))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (view === "detal") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setView("menu")}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Pedidos al detal
              <Badge variant="secondary">{pendingRetail.length} pendientes</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRetail ? (
              <p className="text-center text-sm text-muted-foreground py-6">Cargando…</p>
            ) : pendingRetail.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay pedidos al detal pendientes.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {pendingRetail.map((o) => renderCard(o, false, "detal"))}
              </div>
            )}
          </CardContent>
        </Card>
        {deliveredRetail.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Entregados recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {deliveredRetail.slice(0, 6).map((o) => renderCard(o, true, "detal"))}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!delivering} onOpenChange={(o) => !o && setDelivering(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {delivering?.target === "produccion"
                  ? "Solicitar producción de cuerpos"
                  : `Entregar a ${delivering ? TARGET_LABEL[delivering.target] : ""}`}
              </DialogTitle>
              <DialogDescription>
                {delivering && `${delivering.order.product} — Pedido de ${delivering.order.client_name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>{delivering?.target === "produccion" ? "Cantidad a producir" : "Cantidad a entregar"}</Label>
                <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="1" />
              </div>
              {delivering?.target === "produccion" && (
                <div>
                  <Label>Tipo de plástico</Label>
                  <Select value={plastico} onValueChange={(v) => setPlastico(v as "frio" | "calor")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="frio">Frío</SelectItem>
                      <SelectItem value="calor">Calor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Observación (opcional)</Label>
                <Textarea value={obs} onChange={(e) => setObs(e.target.value)}
                  placeholder="Ej: pendiente sticker, falta sello..." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDelivering(null)}>Cancelar</Button>
              <Button onClick={confirmDeliver} disabled={busy}>
                {delivering?.target === "produccion" ? "Crear orden de producción" : "Confirmar entrega"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // view === "mayor"
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setView("menu")}>
        <ArrowLeft className="h-4 w-4" /> Volver
      </Button>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Bandeja de pedidos al por mayor
            <Badge variant="secondary">{pending.length} pendientes</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-6">Cargando…</p>
          ) : pending.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay pedidos al por mayor pendientes de entrega.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pending.map((o) => renderCard(o, false))}
            </div>
          )}
        </CardContent>
      </Card>

      {delivered.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Entregados recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {delivered.slice(0, 6).map((o) => renderCard(o, true))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!delivering} onOpenChange={(o) => !o && setDelivering(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {delivering?.target === "produccion"
                ? "Solicitar producción de cuerpos"
                : `Entregar a ${delivering ? TARGET_LABEL[delivering.target] : ""}`}
            </DialogTitle>
            <DialogDescription>
              {delivering && `${delivering.order.product} — Pedido de ${delivering.order.client_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{delivering?.target === "produccion" ? "Cantidad a producir" : "Cantidad a entregar"}</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="1" />
            </div>
            {delivering?.target === "produccion" && (
              <div>
                <Label>Tipo de plástico</Label>
                <Select value={plastico} onValueChange={(v) => setPlastico(v as "frio" | "calor")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frio">Frío</SelectItem>
                    <SelectItem value="calor">Calor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Observación (opcional)</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)}
                placeholder="Ej: pendiente sticker, falta sello..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDelivering(null)}>Cancelar</Button>
            <Button onClick={confirmDeliver} disabled={busy}>
              {delivering?.target === "produccion" ? "Crear orden de producción" : "Confirmar entrega"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WholesaleOrdersInbox;