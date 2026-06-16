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
import { Inbox, Package, Truck, Paintbrush, Factory, Calendar, User as UserIcon, ShoppingBag, ArrowLeft, Search } from "lucide-react";
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

// ---------- Sweatspot kit helpers ----------
type KitComponent = {
  key: "silicona" | "cuello" | "boquilla";
  label: string;
  itemName: string;       // resolved stock_items.name
  defaultQty: number;
  category: "materia_prima";
};

const normalizeSize = (product: string): string | null => {
  // "Termo 250 ML Juguetón" -> "250ml"; we only support 250ml / 500ml siliconas in stock today.
  const m = product.match(/(\d{2,4})\s*ml/i);
  if (!m) return null;
  return `${m[1]}ml`;
};

const capitalize = (s: string) => s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;

const buildSweatspotKit = (order: MayorOrder): KitComponent[] => {
  const qty = order.quantity;
  const color = capitalize((order as any).silicone_color || "");
  const size = normalizeSize(order.product); // "250ml" | "500ml" | null
  const siliconaName = color && size ? `Silicona ${color} ${size}` : "";
  const cuelloName = color ? `Cuello ${color}` : "";
  return [
    { key: "silicona", label: `Siliconas${siliconaName ? ` (${siliconaName})` : ""}`, itemName: siliconaName, defaultQty: qty + 2, category: "materia_prima" },
    { key: "cuello", label: `Cuellos${cuelloName ? ` (${cuelloName})` : ""}`, itemName: cuelloName, defaultQty: qty, category: "materia_prima" },
    { key: "boquilla", label: "Boquillas", itemName: "Boquillas", defaultQty: qty, category: "materia_prima" },
  ];
};

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
  const [searchQuery, setSearchQuery] = useState("");
  const [kitQuantities, setKitQuantities] = useState<Record<string, string>>({});

  const isSweatspotKit = delivering?.order.brand === "sweatspot" && delivering?.target === "estampacion";
  const activeKit = useMemo(
    () => (isSweatspotKit && delivering ? buildSweatspotKit(delivering.order) : []),
    [isSweatspotKit, delivering]
  );

  const filterOrders = (list: MayorOrder[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (o) =>
        o.client_name.toLowerCase().includes(q) ||
        o.product.toLowerCase().includes(q) ||
        o.advisor_name.toLowerCase().includes(q)
    );
  };

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
      // Solo pedidos recién ingresados que aún no han iniciado ningún paso
      // (sin entrega a estampación ni orden de producción de cuerpos creada).
      const { data, error } = await supabase
        .from("orders")
        .select("id,brand,client_name,product,quantity,advisor_name,delivery_date,production_status,created_at,observations,silicone_color,ink_color")
        .eq("sale_type", "mayor")
        .gte("created_at", "2026-05-15")
        .in("production_status", ["pendiente", "diseno"])
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
        .select("id,brand,client_name,product,quantity,advisor_name,delivery_date,production_status,created_at,observations,silicone_color,ink_color")
        .eq("sale_type", "menor")
        .in("production_status", ACTIVE_STATUSES)
        .gte("created_at", "2026-05-15")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MayorOrder[];
    },
    refetchInterval: 15_000,
  });

  // Fetch which orders already had a delivery movement OR an ACTIVE body production task.
  // Once production finalizes its task, the order reappears in the inbox (only Estampación).
  const { data: orderStates = { deliveredIds: new Set<string>(), producedIds: new Set<string>() } } = useQuery({
    queryKey: ["mayor-orders-delivered"],
    queryFn: async () => {
      const [mov, tasks] = await Promise.all([
        supabase.from("inventory_movements").select("order_id")
          .eq("direction", "entrega").not("order_id", "is", null),
        supabase.from("body_production_tasks").select("order_id,status" as any)
          .not("order_id", "is", null),
      ]);
      const deliveredIds = new Set<string>();
      const producedIds = new Set<string>();
      (mov.data || []).forEach((m: any) => m.order_id && deliveredIds.add(m.order_id));
      (tasks.data || []).forEach((t: any) => {
        if (!t.order_id) return;
        if (t.status === "finalizado") {
          producedIds.add(t.order_id);
        } else {
          deliveredIds.add(t.order_id);
        }
      });
      // Orders already entregadas a estampación no deben reaparecer aunque haya tarea finalizada
      producedIds.forEach((id) => { if (deliveredIds.has(id)) producedIds.delete(id); });
      return { deliveredIds, producedIds };
    },
    refetchInterval: 15_000,
  });
  const deliveredIds = orderStates.deliveredIds;
  const producedIds = orderStates.producedIds;

  const findStockItem = (o: MayorOrder, category: "producto_terminado" | "cuerpos_referencias" = "producto_terminado") => {
    // Normalize: lowercase, collapse repeated "(frío)/(térmico)" suffixes, trim
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/(\((?:frío|frio|térmico|termico)\))(\s*\1)+/g, "$1")
        .trim();
    const stripTemp = (s: string) =>
      norm(s).replace(/\s*\((?:frío|frio|térmico|termico)\)\s*$/g, "").trim();
    const target = norm(o.product);
    const targetBase = stripTemp(o.product);
    const candidates = stockItems.filter(
      (s) => s.brand === o.brand && s.category === category
    );
    // 1) exact normalized match (may have duplicates)
    let matches = candidates.filter((s) => norm(s.name) === target);
    // 2) fall back to base name match (without temperature suffix)
    if (matches.length === 0) {
      matches = candidates.filter((s) => stripTemp(s.name) === targetBase);
    }
    if (matches.length === 0) return undefined;
    // Aggregate stock across duplicate references to avoid picking a 0-stock duplicate
    const totalAvailable = matches.reduce((sum, s) => sum + (Number(s.available) || 0), 0);
    const primary = matches.reduce((a, b) =>
      (Number(b.available) || 0) > (Number(a.available) || 0) ? b : a
    );
    return { ...primary, available: totalAvailable };
  };

  const pending = useMemo(() => orders.filter((o) => !deliveredIds.has(o.id)), [orders, deliveredIds]);
  const delivered = useMemo(() => orders.filter((o) => deliveredIds.has(o.id)), [orders, deliveredIds]);

  const openDeliver = (order: MayorOrder, target: Target) => {
    setDelivering({ order, target });
    setQty(String(order.quantity));
    setObs("");
    setPlastico("frio");
    if (order.brand === "sweatspot" && target === "estampacion") {
      const kit = buildSweatspotKit(order);
      const init: Record<string, string> = {};
      kit.forEach((c) => { init[c.key] = String(c.defaultQty); });
      setKitQuantities(init);
    } else {
      setKitQuantities({});
    }
  };

  const confirmDeliver = async () => {
    if (!delivering || !user) return;
    const { order, target } = delivering;

    // ---- Sweatspot kit flow ----
    if (order.brand === "sweatspot" && target === "estampacion") {
      const kit = buildSweatspotKit(order);
      const rows = kit.map((c) => ({ c, q: Number(kitQuantities[c.key] || 0) }));
      const invalid = rows.find((r) => !r.q || r.q <= 0);
      if (invalid) { toast.error(`Cantidad inválida para ${invalid.c.label}`); return; }
      const missingRef = rows.find((r) => !r.c.itemName);
      if (missingRef) {
        toast.error("Falta color/tamaño en el pedido para resolver el kit (silicona/cuello).");
        return;
      }
      setBusy(true);
      const movements = rows.map((r) => {
        const stock = stockItems.find(
          (s) => s.brand === "sweatspot" && s.category === "materia_prima" &&
                 s.name.toLowerCase() === r.c.itemName.toLowerCase()
        );
        return {
          stock_item_id: stock?.id ?? null,
          item_name: r.c.itemName,
          brand: "sweatspot",
          category: "materia_prima" as const,
          quantity: r.q,
          direction: "entrega" as const,
          area: "estampacion" as const,
          reason: `Kit Sweatspot — Pedido de ${order.client_name}` + (obs ? ` — ${obs}` : ""),
          order_id: order.id,
          recorded_by: user.id,
          recorded_by_name: user.email || "Inventarios",
        };
      });
      const { error } = await supabase.from("inventory_movements").insert(movements as any);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success(`Kit entregado a Estampación (${rows.map(r => `${r.q} ${r.c.key}`).join(", ")}).`);
      setDelivering(null);
      qc.invalidateQueries({ queryKey: ["mayor-orders-inbox"] });
      qc.invalidateQueries({ queryKey: ["mayor-orders-delivered"] });
      return;
    }

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
      const cat = target === "estampacion" ? "cuerpos_referencias" : "producto_terminado";
      const item = findStockItem(order, cat);
      const { error } = await supabase.from("inventory_movements").insert({
        stock_item_id: item?.id ?? null,
        item_name: order.product,
        brand: order.brand,
        category: cat,
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
    const isSweatspotMayor = kind === "mayor" && o.brand === "sweatspot";
    // For mayor: check blank bodies (cuerpos) — those are what get sent to Estampación.
    // For detal: check finished product.
    const item = findStockItem(o, kind === "mayor" ? "cuerpos_referencias" : "producto_terminado");
    const stock = item ? Number(item.available) : null;
    // If production already finalized cuerpos for this order, force-show only Estampación.
    const producedReady = kind === "mayor" && producedIds.has(o.id);
    const enough = producedReady || (stock !== null && stock >= o.quantity);
    const stockBadge = isSweatspotMayor
      ? <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Entrega por kit</Badge>
      : stock === null
      ? (producedReady
          ? <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Cuerpos producidos</Badge>
          : <Badge variant="outline">Sin referencia en stock</Badge>)
      : enough
        ? <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {producedReady ? "Cuerpos producidos" : `Stock: ${stock}`}
          </Badge>
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
            ) : isSweatspotMayor ? (
              <div className="pt-1">
                <Button size="sm" variant="default" className="w-full gap-1.5"
                  onClick={() => openDeliver(o, "estampacion")}>
                  <Paintbrush className="h-3.5 w-3.5" /> Entregar Kit a Estampación
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {producedReady ? (
                  <Button size="sm" variant="default" className="flex-1 min-w-[140px] gap-1.5"
                    onClick={() => openDeliver(o, "estampacion")}>
                    <Paintbrush className="h-3.5 w-3.5" /> Entregar a Estampación
                  </Button>
                ) : (stock === null || stock === 0) ? (
                  <Button size="sm" variant="default" className="flex-1 min-w-[140px] gap-1.5"
                    onClick={() => openDeliver(o, "produccion")}>
                    <Factory className="h-3.5 w-3.5" /> Producir cuerpos
                  </Button>
                ) : enough ? (
                  <Button size="sm" variant="default" className="flex-1 min-w-[140px] gap-1.5"
                    onClick={() => openDeliver(o, "estampacion")}>
                    <Paintbrush className="h-3.5 w-3.5" /> Entregar a Estampación
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="flex-1 min-w-[140px] gap-1.5"
                      onClick={() => openDeliver(o, "estampacion")}>
                      <Paintbrush className="h-3.5 w-3.5" /> Entregar a Estampación
                    </Button>
                    <Button size="sm" variant="default" className="flex-1 min-w-[140px] gap-1.5"
                      onClick={() => openDeliver(o, "produccion")}>
                      <Factory className="h-3.5 w-3.5" /> Producir cuerpos
                    </Button>
                  </>
                )}
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

      </div>
    );
  }

  if (view === "detal") {
    const filteredPendingRetail = filterOrders(pendingRetail);
    const filteredDeliveredRetail = filterOrders(deliveredRetail);
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setView("menu")}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <Card>
          <CardHeader className="pb-3 space-y-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Pedidos al detal
              <Badge variant="secondary">{filteredPendingRetail.length} pendientes</Badge>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, producto o asesor…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loadingRetail ? (
              <p className="text-center text-sm text-muted-foreground py-6">Cargando…</p>
            ) : filteredPendingRetail.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery.trim() ? "Ningún pedido coincide con la búsqueda." : "No hay pedidos al detal pendientes."}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredPendingRetail.map((o) => renderCard(o, false, "detal"))}
              </div>
            )}
          </CardContent>
        </Card>

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
  const filteredPending = filterOrders(pending);
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setView("menu")}>
        <ArrowLeft className="h-4 w-4" /> Volver
      </Button>
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Bandeja de pedidos al por mayor
            <Badge variant="secondary">{filteredPending.length} pendientes</Badge>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar referencia, molde, cliente o asesor…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-6">Cargando…</p>
          ) : filteredPending.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery.trim() ? "Ningún pedido coincide con la búsqueda." : "No hay pedidos al por mayor pendientes de entrega."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredPending.map((o) => renderCard(o, false))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!delivering} onOpenChange={(o) => !o && setDelivering(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isSweatspotKit
                ? "Entregar Kit a Estampación"
                : delivering?.target === "produccion"
                ? "Solicitar producción de cuerpos"
                : `Entregar a ${delivering ? TARGET_LABEL[delivering.target] : ""}`}
            </DialogTitle>
            <DialogDescription>
              {delivering && `${delivering.order.product} — Pedido de ${delivering.order.client_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {isSweatspotKit ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Pedido de {delivering?.order.quantity} uds. Ajusta cantidades del kit a entregar:
                </p>
                {activeKit.map((c) => (
                  <div key={c.key}>
                    <Label>{c.label}</Label>
                    <Input
                      type="number" min="1"
                      value={kitQuantities[c.key] ?? ""}
                      onChange={(e) => setKitQuantities((p) => ({ ...p, [c.key]: e.target.value }))}
                    />
                    {!c.itemName && (
                      <p className="text-[11px] text-destructive mt-1">Falta color/tamaño en el pedido para resolver esta referencia.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <Label>{delivering?.target === "produccion" ? "Cantidad a producir" : "Cantidad a entregar"}</Label>
                <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="1" />
              </div>
            )}
            {delivering?.target === "produccion" && !isSweatspotKit && (
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
              {isSweatspotKit
                ? "Confirmar entrega del kit"
                : delivering?.target === "produccion" ? "Crear orden de producción" : "Confirmar entrega"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WholesaleOrdersInbox;