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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, Package, Truck, Paintbrush, Factory, Calendar, User as UserIcon, ShoppingBag, Search, X, RotateCcw } from "lucide-react";

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

type BandejaTab = "mayor" | "detal" | "entregados";

// ---------- Sweatspot kit helpers ----------
type KitComponent = {
  key: "silicona" | "cuello" | "boquilla";
  label: string;
  itemName: string;
  defaultQty: number;
  category: "materia_prima";
};

const normalizeSize = (product: string): string | null => {
  const m = product.match(/(\d{2,4})\s*ml/i);
  if (!m) return null;
  return `${m[1]}ml`;
};

const capitalize = (s: string) => s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;

const buildSweatspotKit = (order: MayorOrder): KitComponent[] => {
  const qty = order.quantity;
  const color = capitalize((order as any).silicone_color || "");
  const size = normalizeSize(order.product);
  const siliconaName = color && size ? `Silicona ${color} ${size}` : "";
  const cuelloName = color ? `Cuello ${color}` : "";
  return [
    { key: "silicona", label: `Siliconas${siliconaName ? ` (${siliconaName})` : ""}`, itemName: siliconaName, defaultQty: qty + 2, category: "materia_prima" },
    { key: "cuello", label: `Cuellos${cuelloName ? ` (${cuelloName})` : ""}`, itemName: cuelloName, defaultQty: qty, category: "materia_prima" },
    { key: "boquilla", label: "Boquillas", itemName: "Boquillas", defaultQty: qty, category: "materia_prima" },
  ];
};

// ---------- Online / multi-item product parser ----------
type ParsedLine = { name: string; qty: number };

const parseOrderLines = (product: string, fallbackQty: number): ParsedLine[] => {
  if (!product) return [{ name: product || "", qty: fallbackQty }];
  const parts = product.split("|").map((p) => p.trim()).filter(Boolean);
  const lines: ParsedLine[] = parts.map((part) => {
    const m = part.match(/^(.*?)[\s]*x\s*(\d+)\s*$/i);
    if (m) return { name: m[1].trim(), qty: Number(m[2]) || 1 };
    return { name: part, qty: 1 };
  });
  if (lines.length === 1 && !/x\s*\d+\s*$/i.test(parts[0])) {
    lines[0].qty = fallbackQty || 1;
  }
  return lines;
};

const WholesaleOrdersInbox = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { stockItems } = useInventory();
  const [activeTab, setActiveTab] = useState<BandejaTab>("mayor");
  const [delivering, setDelivering] = useState<{ order: MayorOrder; target: Target } | null>(null);
  const [qty, setQty] = useState<string>("");
  const [obs, setObs] = useState<string>("");
  const [plastico, setPlastico] = useState<"frio" | "calor">("frio");
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [kitQuantities, setKitQuantities] = useState<Record<string, string>>({});
  const [lineRows, setLineRows] = useState<Array<{ name: string; qty: string; stockItemId: string }>>([]);

  const ARCHIVE_KEY = "inbox-archived-order-ids";
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(ARCHIVE_KEY);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set<string>();
    }
  });
  const persistArchived = (next: Set<string>) => {
    setArchivedIds(new Set(next));
    try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(Array.from(next))); } catch {}
  };

  const [confirmArchive, setConfirmArchive] = useState<{ id: string; clientName: string } | null>(null);

  const archiveOrder = (id: string, clientName: string) => {
    const next = new Set(archivedIds); next.add(id); persistArchived(next);
    toast.success(`Pedido de ${clientName} movido a Entregados recientes.`);
  };
  const unarchiveOrder = (id: string) => {
    const next = new Set(archivedIds); next.delete(id); persistArchived(next);
    toast.success("Pedido restaurado a la bandeja.");
  };

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
        .select("id,brand,client_name,product,quantity,advisor_name,delivery_date,production_status,created_at,observations,silicone_color,ink_color")
        .eq("sale_type", "mayor")
        .gte("created_at", "2026-05-15")
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

  const { data: orderStates = { deliveredIds: new Set<string>(), producedIds: new Set<string>(), inProductionIds: new Set<string>() } } = useQuery({
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
      const inProductionIds = new Set<string>();
      (mov.data || []).forEach((m: any) => m.order_id && deliveredIds.add(m.order_id));
      (tasks.data || []).forEach((t: any) => {
        if (!t.order_id) return;
        if (t.status === "finalizado") {
          producedIds.add(t.order_id);
        } else {
          inProductionIds.add(t.order_id);
        }
      });
      producedIds.forEach((id) => { if (deliveredIds.has(id)) producedIds.delete(id); });
      inProductionIds.forEach((id) => { if (deliveredIds.has(id)) inProductionIds.delete(id); });
      return { deliveredIds, producedIds, inProductionIds };
    },
    refetchInterval: 15_000,
  });
  const deliveredIds = orderStates.deliveredIds;
  const producedIds = orderStates.producedIds;
  const inProductionIds = orderStates.inProductionIds;

  const findStockItem = (o: MayorOrder, category: "producto_terminado" | "cuerpos_referencias" = "producto_terminado") => {
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
    let matches = candidates.filter((s) => norm(s.name) === target);
    if (matches.length === 0) {
      matches = candidates.filter((s) => stripTemp(s.name) === targetBase);
    }
    if (matches.length === 0) return undefined;
    const totalAvailable = matches.reduce((sum, s) => sum + (Number(s.available) || 0), 0);
    const primary = matches.reduce((a, b) =>
      (Number(b.available) || 0) > (Number(a.available) || 0) ? b : a
    );
    return { ...primary, available: totalAvailable };
  };

  const pending = useMemo(
    () => orders.filter((o) => !deliveredIds.has(o.id) && !archivedIds.has(o.id) && !inProductionIds.has(o.id)),
    [orders, deliveredIds, archivedIds, inProductionIds]
  );
  const inProduction = useMemo(
    () => orders.filter((o) => inProductionIds.has(o.id) && !deliveredIds.has(o.id) && !archivedIds.has(o.id)),
    [orders, inProductionIds, deliveredIds, archivedIds]
  );
  const delivered = useMemo(
    () => orders.filter((o) => deliveredIds.has(o.id) || archivedIds.has(o.id)),
    [orders, deliveredIds, archivedIds]
  );

  const pendingRetail = useMemo(
    () => retailOrders.filter((o) => !deliveredIds.has(o.id) && !archivedIds.has(o.id)),
    [retailOrders, deliveredIds, archivedIds]
  );
  const deliveredRetail = useMemo(
    () => retailOrders.filter((o) => deliveredIds.has(o.id) || archivedIds.has(o.id)),
    [retailOrders, deliveredIds, archivedIds]
  );

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
    // Para entregas al detal (logística) parseamos pedidos online multi-ítem
    if (target === "logistica") {
      const parsed = parseOrderLines(order.product, order.quantity);
      const cat = "producto_terminado";
      const rows = parsed.map((p) => {
        const guess = stockItems.find(
          (s) =>
            s.brand === order.brand &&
            s.category === cat &&
            s.name.trim().toLowerCase() === p.name.trim().toLowerCase()
        );
        return { name: p.name, qty: String(p.qty), stockItemId: guess?.id ?? "" };
      });
      setLineRows(rows);
    } else {
      setLineRows([]);
    }
  };

  const confirmDeliver = async () => {
    if (!delivering || !user) return;
    const { order, target } = delivering;

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
    } else if (target === "logistica" && lineRows.length > 0) {
      // Pedido al detal (potencialmente multi-ítem desde checkout online)
      const cat = "producto_terminado";
      const invalid = lineRows.find((r) => !r.stockItemId || !Number(r.qty) || Number(r.qty) <= 0);
      if (invalid) {
        setBusy(false);
        toast.error(`Asigna ítem y cantidad válida para "${invalid.name}"`);
        return;
      }
      const movements = lineRows.map((r) => {
        const stock = stockItems.find((s) => s.id === r.stockItemId);
        return {
          stock_item_id: r.stockItemId,
          item_name: stock?.name || r.name,
          brand: order.brand,
          category: cat,
          quantity: Number(r.qty),
          direction: "entrega" as const,
          area: "logistica" as const,
          reason: `Pedido al detal de ${order.client_name}` + (obs ? ` — ${obs}` : ""),
          order_id: order.id,
          recorded_by: user.id,
          recorded_by_name: user.email || "Inventarios",
        };
      });
      const { error } = await supabase.from("inventory_movements").insert(movements as any);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success(`Entregado a Logística (${lineRows.length} ${lineRows.length === 1 ? "ítem" : "ítems"}).`);
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
    const isManuallyArchived = archivedIds.has(o.id) && !deliveredIds.has(o.id);
    const isSweatspotMayor = kind === "mayor" && o.brand === "sweatspot";
    const item = findStockItem(o, kind === "mayor" ? "cuerpos_referencias" : "producto_terminado");
    const stock = item ? Number(item.available) : null;
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
              <div className="pt-1 flex gap-2">
                <Button size="sm" variant="default" className="w-full gap-1.5"
                  onClick={() => openDeliver(o, "logistica")}>
                  <Truck className="h-3.5 w-3.5" /> Entregar a Logística
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5"
                  title="Quitar de la bandeja"
                  onClick={() => setConfirmArchive({ id: o.id, clientName: o.client_name })}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : isSweatspotMayor ? (
              <div className="pt-1 flex gap-2">
                <Button size="sm" variant="default" className="w-full gap-1.5"
                  onClick={() => openDeliver(o, "estampacion")}>
                  <Paintbrush className="h-3.5 w-3.5" /> Entregar Kit a Estampación
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5"
                  title="Quitar de la bandeja"
                  onClick={() => setConfirmArchive({ id: o.id, clientName: o.client_name })}>
                  <X className="h-3.5 w-3.5" />
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
                <Button size="sm" variant="outline" className="gap-1.5"
                  title="Quitar de la bandeja"
                  onClick={() => setConfirmArchive({ id: o.id, clientName: o.client_name })}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          )}

          {isDelivered && isManuallyArchived && (
            <div className="pt-1">
              <Button size="sm" variant="ghost" className="w-full gap-1.5"
                onClick={() => unarchiveOrder(o.id)}>
                <RotateCcw className="h-3.5 w-3.5" /> Restaurar a la bandeja
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const SearchBar = () => (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar referencia, cliente, producto o asesor…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-9"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BandejaTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mayor" className="gap-1.5">
            <Inbox className="h-4 w-4" /> Al por mayor
            <Badge variant="secondary" className="ml-1">{pending.length + inProduction.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="detal" className="gap-1.5">
            <ShoppingBag className="h-4 w-4" /> Al detal
            <Badge variant="secondary" className="ml-1">{pendingRetail.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="entregados" className="gap-1.5">
            <Package className="h-4 w-4" /> Entregados
            <Badge variant="secondary" className="ml-1">{delivered.length + deliveredRetail.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mayor" className="mt-4 space-y-4">
          <SearchBar />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                Pendientes de entrega
                <Badge variant="secondary">{filterOrders(pending).length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-sm text-muted-foreground py-6">Cargando…</p>
              ) : filterOrders(pending).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery.trim() ? "Ningún pedido coincide con la búsqueda." : "No hay pedidos al por mayor pendientes de entrega."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filterOrders(pending).map((o) => renderCard(o, false))}
                </div>
              )}
            </CardContent>
          </Card>

          {filterOrders(inProduction).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Factory className="h-4 w-4 text-blue-600" />
                  Producción de cuerpos
                  <Badge variant="secondary">{filterOrders(inProduction).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {filterOrders(inProduction).map((o) => renderCard(o, true))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="detal" className="mt-4 space-y-4">
          <SearchBar />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Pedidos al detal
                <Badge variant="secondary">{filterOrders(pendingRetail).length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRetail ? (
                <p className="text-center text-sm text-muted-foreground py-6">Cargando…</p>
              ) : filterOrders(pendingRetail).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery.trim() ? "Ningún pedido coincide con la búsqueda." : "No hay pedidos al detal pendientes."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filterOrders(pendingRetail).map((o) => renderCard(o, false, "detal"))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entregados" className="mt-4 space-y-4">
          <SearchBar />

          {filterOrders(delivered).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Entregados al por mayor
                  <Badge variant="secondary">{filterOrders(delivered).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {filterOrders(delivered).map((o) => renderCard(o, true))}
                </div>
              </CardContent>
            </Card>
          )}

          {filterOrders(deliveredRetail).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  Entregados al detal
                  <Badge variant="secondary">{filterOrders(deliveredRetail).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {filterOrders(deliveredRetail).map((o) => renderCard(o, true, "detal"))}
                </div>
              </CardContent>
            </Card>
          )}

          {filterOrders(delivered).length === 0 && filterOrders(deliveredRetail).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery.trim() ? "Ningún pedido coincide con la búsqueda." : "No hay pedidos entregados."}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

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

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar de la bandeja?</AlertDialogTitle>
            <AlertDialogDescription>
              El pedido de <span className="font-semibold text-foreground">{confirmArchive?.clientName}</span> se moverá a <strong>Entregados recientes</strong>. Podrás restaurarlo desde allí si lo necesitas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmArchive(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmArchive) {
                  archiveOrder(confirmArchive.id, confirmArchive.clientName);
                  setConfirmArchive(null);
                }
              }}
            >
              Sí, quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WholesaleOrdersInbox;
