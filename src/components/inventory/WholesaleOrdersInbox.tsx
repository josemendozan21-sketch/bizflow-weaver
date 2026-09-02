import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DebouncedSearchInput from "@/components/inventory/DebouncedSearchInput";
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
import { Inbox, Package, Truck, Paintbrush, Factory, Calendar, User as UserIcon, ShoppingBag, Search, X, RotateCcw, PackageCheck } from "lucide-react";

import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/contexts/AuthContext";
import { ensureProductionOrder, requestProductionForOrder, reserveStockForOrder, type FlowOrder } from "@/lib/orderFlow";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

import { matchesQuery } from "@/lib/search";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";


interface MayorOrder {
  id: string;
  order_code?: string | null;
  line_index?: number | null;
  line_count?: number | null;
  brand: string;
  client_name: string;
  product: string;
  quantity: number;
  advisor_name: string;
  delivery_date: string | null;
  production_status: string;
  created_at: string;
  observations: string | null;
  is_recompra?: boolean | null;
}

const ACTIVE_STATUSES = [
  "pendiente", "diseno", "produccion_cuerpos", "estampacion",
  "dosificacion", "sellado", "recorte", "empaque", "listo",
];

// Solo estos estados siguen pendientes de revisión por Inventarios.
// Cualquier otro (ya en alguna etapa de producción, listo, despachado o entregado)
// no debe aparecer en la bandeja de reserva/despacho.
const INBOX_PENDING_STATUSES = ["pendiente", "diseno"];

type Target = "estampacion" | "produccion" | "logistica" | "terminado";

const TARGET_LABEL: Record<Target, string> = {
  estampacion: "Estampación",
  produccion: "Producción",
  logistica: "Logística",
  terminado: "Logística (producto terminado)",
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

// ---------- Sweatspot color swatch ----------
const COLOR_SWATCH: Record<string, string> = {
  rosado: "#f9a8d4",
  rosa: "#f9a8d4",
  salmon: "#fda4af",
  rojo: "#dc2626",
  azul: "#2563eb",
  morado: "#7c3aed",
  negro: "#111827",
  blanco: "#f9fafb",
  amarillo: "#facc15",
  "verde militar": "#4d5d3a",
  "verde biche": "#84cc16",
  verde: "#22c55e",
  transparente: "transparent",
  naranja: "#fb923c",
  gris: "#9ca3af",
};

const normalizeColor = (s?: string | null) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const swatchFor = (color?: string | null): string | null => {
  const c = normalizeColor(color);
  if (!c) return null;
  return COLOR_SWATCH[c] ?? null;
};

const ColorChip = ({ color }: { color?: string | null }) => {
  if (!color) return null;
  const hex = swatchFor(color);
  const isTransparent = normalizeColor(color) === "transparente";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full border"
        style={{
          background: isTransparent
            ? "repeating-linear-gradient(45deg,#fff,#fff 2px,#cbd5e1 2px,#cbd5e1 4px)"
            : hex ?? "#e5e7eb",
        }}
      />
      {color}
    </span>
  );
};

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

  // El tipo de plástico se deduce del producto del pedido (evita que una referencia
  // térmica se envíe a producción como fría por dejar el valor por defecto).
  useEffect(() => {
    if (!delivering) return;
    const txt = `${delivering.order.product || ""}`;
    setPlastico(/t[eé]rmic|calor/i.test(txt) ? "calor" : "frio");
  }, [delivering]);

  // Archivado compartido en el servidor (antes era localStorage y se descuadraba entre equipos)
  useEffect(() => {
    try { localStorage.removeItem("inbox-archived-order-ids"); } catch { /* noop */ }
  }, []);

  const { data: archivedIds = new Set<string>() } = useQuery({
    queryKey: ["inbox-archived-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id")
        .not("inventory_archived_at", "is", null)
        .gte("created_at", "2026-05-15");
      if (error) throw error;
      return new Set<string>((data || []).map((r: { id: string }) => r.id));
    },
    refetchInterval: 15_000,
  });

  const [confirmArchive, setConfirmArchive] = useState<{ id: string; clientName: string } | null>(null);

  const setArchived = async (id: string, archived: boolean, okMsg: string) => {
    const { error } = await supabase
      .from("orders")
      .update({
        inventory_archived_at: archived ? new Date().toISOString() : null,
        inventory_archived_by: archived ? user?.id ?? null : null,
      })
      .eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar: " + error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["inbox-archived-orders"] });
    toast.success(okMsg);
  };

  const archiveOrder = (id: string, clientName: string) =>
    setArchived(id, true, `Pedido de ${clientName} movido a Entregados recientes.`);
  const unarchiveOrder = (id: string) => setArchived(id, false, "Pedido restaurado a la bandeja.");

  const isSweatspotKit = delivering?.order.brand === "sweatspot" && delivering?.target === "estampacion";
  const activeKit = useMemo(
    () => (isSweatspotKit && delivering ? buildSweatspotKit(delivering.order) : []),
    [isSweatspotKit, delivering]
  );

  const filterOrders = (list: MayorOrder[]) => {
    if (!searchQuery.trim()) return list;
    return list.filter((o) =>
      matchesQuery([o.order_code, o.client_name, o.product, o.advisor_name, o.brand], searchQuery),
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
        .select("id,order_code,line_index,line_count,brand,client_name,product,quantity,advisor_name,delivery_date,production_status,created_at,observations,silicone_color,ink_color,is_recompra")
        .eq("sale_type", "mayor")
        .gte("created_at", "2026-05-15")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MayorOrder[];
    },
    refetchInterval: 15_000,
  });

  const { data: retailOrders = [], isLoading: loadingRetail, error: retailError } = useQuery({
    queryKey: ["detal-orders-inbox-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_code,line_index,line_count,brand,client_name,product,quantity,advisor_name,delivery_date,production_status,created_at,observations,silicone_color,ink_color,is_recompra")
        .in("sale_type", ["menor", "detal"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MayorOrder[];
    },
    refetchInterval: 15_000,
    refetchOnMount: "always",
  });

  const { data: orderStates = { deliveredIds: new Set<string>(), producedIds: new Set<string>(), inProductionIds: new Set<string>() } } = useQuery({
    queryKey: ["mayor-orders-delivered"],
    queryFn: async () => {
      const [mov, tasks, prodOrders] = await Promise.all([
        supabase.from("inventory_movements").select("order_id,movement_kind")
          .eq("direction", "entrega").not("order_id", "is", null),
        supabase.from("body_production_tasks").select("order_id,status" as any)
          .not("order_id", "is", null),
        supabase.from("production_orders").select("order_id,current_stage,completed_at")
          .not("order_id", "is", null),
      ]);
      const deliveredIds = new Set<string>();
      const producedIds = new Set<string>();
      const inProductionIds = new Set<string>();
      (mov.data || []).forEach((m: any) => {
        if (!m.order_id) return;
        // Las reservas NO son entregas: el pedido sigue vivo en el flujo
        if (m.movement_kind === "reserva") return;
        deliveredIds.add(m.order_id);
      });
      (tasks.data || []).forEach((t: any) => {
        if (!t.order_id) return;
        if (t.status === "finalizado") {
          producedIds.add(t.order_id);
        } else {
          inProductionIds.add(t.order_id);
        }
      });
      // Todo pedido con orden de producción activa ya salió de la bandeja de revisión
      (prodOrders.data || []).forEach((p: any) => {
        if (!p.order_id || p.completed_at) return;
        inProductionIds.add(p.order_id);
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

  // Sweatspot: encuentra el ítem SIN LOGO que coincide con color + tamaño del pedido
  const findSweatspotMarkableStock = (o: MayorOrder) => {
    if (o.brand !== "sweatspot") return undefined;
    const orderColor = normalizeColor((o as any).silicone_color);
    const sizeMatch = o.product.match(/(\d{2,4})\s*ml/i);
    const size = sizeMatch ? sizeMatch[1] : null;
    const isJugueton = /juguet/i.test(o.product);
    const candidates = stockItems.filter((s: any) => {
      if (s.brand !== "sweatspot") return false;
      if (s.category !== "producto_terminado") return false;
      const logo = (s.logo || "").toString().toLowerCase().trim();
      const isSinLogo = !logo || logo === "sin logo" || logo === "null";
      if (!isSinLogo) return false;
      if (orderColor && normalizeColor(s.color) !== orderColor) return false;
      if (size) {
        const name = (s.name || "").toLowerCase();
        if (!name.includes(size)) return false;
        if (isJugueton !== /juguet/i.test(name)) return false;
      }
      return true;
    });
    if (candidates.length === 0) return undefined;
    const totalAvailable = candidates.reduce((sum: number, s: any) => sum + (Number(s.available) || 0), 0);
    const primary = candidates.reduce((a: any, b: any) =>
      (Number(b.available) || 0) > (Number(a.available) || 0) ? b : a
    );
    return { ...primary, available: totalAvailable };
  };

  const pending = useMemo(
    () => orders.filter((o) =>
      !deliveredIds.has(o.id) && !archivedIds.has(o.id) && !inProductionIds.has(o.id) &&
      INBOX_PENDING_STATUSES.includes(o.production_status)
    ),
    [orders, deliveredIds, archivedIds, inProductionIds]
  );
  const inProduction = useMemo(
    () => orders.filter((o) =>
      (inProductionIds.has(o.id) ||
        (ACTIVE_STATUSES.includes(o.production_status) && !INBOX_PENDING_STATUSES.includes(o.production_status)))
      && !deliveredIds.has(o.id) && !archivedIds.has(o.id)
    ),
    [orders, inProductionIds, deliveredIds, archivedIds]
  );
  const delivered = useMemo(
    () => orders.filter((o) =>
      deliveredIds.has(o.id) || archivedIds.has(o.id) ||
      (!ACTIVE_STATUSES.includes(o.production_status) && !inProductionIds.has(o.id))
    ),
    [orders, deliveredIds, archivedIds]
  );

  const pendingRetail = useMemo(
    () => retailOrders.filter((o) =>
      !deliveredIds.has(o.id) && !archivedIds.has(o.id) &&
      ACTIVE_STATUSES.includes(o.production_status)
    ),
    [retailOrders, deliveredIds, archivedIds]
  );
  const deliveredRetail = useMemo(
    () => retailOrders.filter((o) =>
      deliveredIds.has(o.id) || archivedIds.has(o.id) ||
      !ACTIVE_STATUSES.includes(o.production_status)
    ),
    [retailOrders, deliveredIds, archivedIds]
  );

  // Todas las líneas por cliente (mayor + detal). Un mismo cliente puede tener
  // varias líneas repartidas en distintas pestañas; el resumen evita que
  // Inventarios crea que "faltan unidades".
  const linesByClient = useMemo(() => {
    const map = new Map<string, MayorOrder[]>();
    [...orders, ...retailOrders].forEach((o) => {
      const key = (o.client_name || "").trim().toLowerCase();
      if (!key) return;
      const arr = map.get(key) || [];
      arr.push(o);
      map.set(key, arr);
    });
    return map;
  }, [orders, retailOrders]);

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
      if (error) { setBusy(false); toast.error(error.message); return; }
      try {
        await ensureProductionOrder(order as unknown as FlowOrder, { needsCuerpos: true });
      } catch (e: any) {
        setBusy(false);
        toast.error(`Kit entregado pero no se pudo crear la orden de producción: ${e.message}`);
        return;
      }
      setBusy(false);
      toast.success(`Kit entregado a Estampación (${rows.map(r => `${r.q} ${r.c.key}`).join(", ")}).`);
      setDelivering(null);
      qc.invalidateQueries({ queryKey: ["mayor-orders-inbox"] });
      qc.invalidateQueries({ queryKey: ["mayor-orders-delivered"] });
      qc.invalidateQueries({ queryKey: ["production_orders"] });
      return;
    }

    const quantity = Number(qty);
    if (!quantity || quantity <= 0) {
      toast.error("Cantidad inválida");
      return;
    }
    setBusy(true);

    if (target === "produccion") {
      // El sistema crea la orden automáticamente con la referencia y cantidad del pedido.
      try {
        await requestProductionForOrder({
          order: order as unknown as FlowOrder,
          tipoPlastico: plastico,
          note: obs || undefined,
        });
      } catch (e: any) {
        setBusy(false);
        toast.error(e.message);
        return;
      }
      setBusy(false);
      toast.success(
        `Orden de producción creada automáticamente (${order.quantity} uds de "${order.product}").`
      );
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
      const isSweatspotMarkable = target === "terminado" && order.brand === "sweatspot";
      const item = isSweatspotMarkable
        ? findSweatspotMarkableStock(order)
        : findStockItem(order, cat);
      if (isSweatspotMarkable && !item) {
        setBusy(false);
        toast.error("No hay termos SIN LOGO que coincidan con color y tamaño. Usa Salir kit.");
        return;
      }
      // Reserva: NO se descuenta el inventario, las unidades quedan apartadas
      // para este pedido y el pedido pasa automáticamente a Estampación.
      try {
        await reserveStockForOrder({
          order: order as unknown as FlowOrder,
          stockItemId: item?.id ?? null,
          itemName: item?.name ?? order.product,
          category: cat,
          quantity,
          userId: user.id,
          userName: user.email,
          note: obs || undefined,
        });
        await ensureProductionOrder(order as unknown as FlowOrder, { needsCuerpos: false });
      } catch (e: any) {
        setBusy(false);
        toast.error(e.message);
        return;
      }
      setBusy(false);
      toast.success(`${quantity} uds enviadas a ${TARGET_LABEL.estampacion}.`);
    }

    setDelivering(null);
    qc.invalidateQueries({ queryKey: ["mayor-orders-inbox"] });
    qc.invalidateQueries({ queryKey: ["detal-orders-inbox"] });
    qc.invalidateQueries({ queryKey: ["mayor-orders-delivered"] });
    qc.invalidateQueries({ queryKey: ["production_orders"] });
  };

  const renderCard = (o: MayorOrder, isDelivered: boolean, kind: "mayor" | "detal" = "mayor") => {
    const isManuallyArchived = archivedIds.has(o.id) && !deliveredIds.has(o.id);
    const isSweatspotMayor = kind === "mayor" && o.brand === "sweatspot";
    const item = findStockItem(o, kind === "mayor" ? "cuerpos_referencias" : "producto_terminado");
    const stock = item ? Number(item.available) : null;
    const finishedItem = kind === "mayor" ? findStockItem(o, "producto_terminado") : null;
    const finishedStock = finishedItem ? Number(finishedItem.available) : 0;
    const finishedEnough = finishedStock >= o.quantity;
    const producedReady = kind === "mayor" && producedIds.has(o.id);
    const enough = producedReady || (stock !== null && stock >= o.quantity);
    const markable = isSweatspotMayor ? findSweatspotMarkableStock(o) : undefined;
    const markableStock = markable ? Number(markable.available) : 0;
    const markableEnough = markableStock >= o.quantity;
    const siliconeColor = (o as any).silicone_color as string | undefined;
    const stockBadge = isSweatspotMayor
      ? (markableEnough
          ? <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">SIN LOGO: {markableStock}</Badge>
          : markableStock > 0
            ? <Badge className="bg-amber-500 hover:bg-amber-600 text-white">SIN LOGO parcial: {markableStock} / {o.quantity}</Badge>
            : <Badge variant="destructive">Sin termos SIN LOGO</Badge>)
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
                {o.is_recompra && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Recompra</Badge>
                )}
                {isDelivered && <Badge variant="secondary">Entregado</Badge>}
              </div>
              <div className="mt-1.5">
                <OrderCodeBadge code={o.order_code} lineIndex={o.line_index} lineCount={o.line_count} compact />
              </div>
              <h3 className="font-semibold">{o.client_name}</h3>
              <p className="text-sm text-muted-foreground">
                {o.quantity.toLocaleString("es-CO")} × {o.product}
              </p>
              {(() => {
                const siblings = (linesByClient.get((o.client_name || "").trim().toLowerCase()) || [])
                  .filter((s) => s.id !== o.id);
                if (siblings.length === 0) return null;
                const totalUds = siblings.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
                  + (Number(o.quantity) || 0);
                return (
                  <div className="mt-1.5 text-xs rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2">
                    <span className="font-medium">
                      Este cliente tiene {siblings.length + 1} líneas ({totalUds.toLocaleString("es-CO")} uds en total):
                    </span>
                    <ul className="mt-1 space-y-0.5">
                      {siblings.map((s) => (
                        <li key={s.id}>
                          • {Number(s.quantity).toLocaleString("es-CO")} × {s.product} — {s.production_status}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
              {isSweatspotMayor && siliconeColor && (
                <div className="mt-1.5"><ColorChip color={siliconeColor} /></div>
              )}
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
              <div className="pt-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={markableEnough ? "default" : "outline"} className="flex-1 min-w-[150px] gap-1.5"
                    onClick={() => openDeliver(o, "terminado")}
                    disabled={!markable}
                    title={markable ? `Termos SIN LOGO disponibles: ${markableStock}` : "Sin termos SIN LOGO que coincidan con color y tamaño"}>
                    <PackageCheck className="h-3.5 w-3.5" />
                    Entregar termos (marcar) {markable ? `(${markableStock})` : "(sin stock)"}
                  </Button>
                  <Button size="sm" variant={markableEnough ? "outline" : "default"} className="flex-1 min-w-[150px] gap-1.5"
                    onClick={() => openDeliver(o, "estampacion")}>
                    <Paintbrush className="h-3.5 w-3.5" /> Salir kit
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5"
                    title="Quitar de la bandeja"
                    onClick={() => setConfirmArchive({ id: o.id, clientName: o.client_name })}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant={enough ? "default" : "outline"} className="flex-1 min-w-[150px] gap-1.5"
                  onClick={() => openDeliver(o, "estampacion")}
                  disabled={!enough}
                  title={enough ? "Enviar cuerpos a Estampación" : "No hay inventario suficiente: solicita producción"}>
                  <Paintbrush className="h-3.5 w-3.5" /> Enviar a Estampación
                </Button>
                {!enough && (
                  <Button size="sm" variant="default" className="flex-1 min-w-[150px] gap-1.5"
                    onClick={() => openDeliver(o, "produccion")}
                    title="El sistema crea la orden de producción con la referencia y cantidad del pedido">
                    <Factory className="h-3.5 w-3.5" /> Solicitar Producción
                  </Button>
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

  const searchBar = (
    <DebouncedSearchInput
      value={searchQuery}
      onChange={setSearchQuery}
      placeholder="Buscar referencia, cliente, producto o asesor…"
      className="pl-9"
    />
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
          {searchBar}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                Pendientes de revisión de inventario
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
                    {searchQuery.trim() ? "Ningún pedido coincide con la búsqueda." : "No hay pedidos al por mayor pendientes de revisión."}
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
                  En proceso (producción / estampación)
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
          {searchBar}

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
              ) : retailError ? (
                <div className="text-center py-8 text-destructive">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No se pudieron cargar los pedidos al detal.</p>
                </div>
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
          {searchBar}

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
                : delivering?.target === "terminado"
                ? (delivering?.order.brand === "sweatspot"
                    ? "Entregar termos SIN LOGO (para marcar)"
                    : "Entregar producto terminado")
                : `Entregar a ${delivering ? TARGET_LABEL[delivering.target] : ""}`}
            </DialogTitle>
            <DialogDescription>
              {delivering && `${delivering.order.product} — Pedido de ${delivering.order.client_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {delivering?.target === "terminado" && delivering?.order.brand === "sweatspot" && (() => {
              const markable = findSweatspotMarkableStock(delivering.order);
              const color = (delivering.order as any).silicone_color as string | undefined;
              return (
                <div className="rounded-md border bg-muted/40 p-2 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Color del termo:</span>
                    {color ? <ColorChip color={color} /> : <span className="text-muted-foreground">sin color en el pedido</span>}
                  </div>
                  {markable ? (
                    <div>
                      Se tomará de: <span className="font-medium">{markable.name}</span>
                      {markable.color ? ` · ${markable.color}` : ""} · <Badge variant="outline" className="ml-1">SIN LOGO</Badge>
                      <span className="ml-2 text-muted-foreground">Disp. {markable.available}</span>
                    </div>
                  ) : (
                    <p className="text-destructive">No hay termos SIN LOGO que coincidan con color y tamaño. Usa “Salir kit”.</p>
                  )}
                </div>
              );
            })()}
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
            ) : delivering?.target === "logistica" && lineRows.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Mapea cada línea del pedido a su producto en inventario. Las cantidades se descontarán al confirmar.
                </p>
                {lineRows.map((r, idx) => {
                  const options = stockItems
                    .filter((s) => s.brand === delivering?.order.brand && s.category === "producto_terminado")
                    .sort((a, b) => a.name.localeCompare(b.name));
                  return (
                    <div key={idx} className="border rounded-md p-2 space-y-2">
                      <div className="text-xs font-medium">{r.name}</div>
                      <div className="grid grid-cols-[1fr_90px] gap-2">
                        <Select
                          value={r.stockItemId}
                          onValueChange={(v) =>
                            setLineRows((prev) => prev.map((x, i) => (i === idx ? { ...x, stockItemId: v } : x)))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona producto en inventario" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} · disp. {s.available}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="1"
                          value={r.qty}
                          onChange={(e) =>
                            setLineRows((prev) => prev.map((x, i) => (i === idx ? { ...x, qty: e.target.value } : x)))
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <Label>{delivering?.target === "produccion" ? "Cantidad a producir" : "Cantidad a enviar"}</Label>
                <Input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  min="1"
                  readOnly={delivering?.target === "produccion"}
                />
                {delivering?.target === "produccion" && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    La orden se crea automáticamente con la referencia y la cantidad del pedido.
                  </p>
                )}
              </div>
            )}
            {delivering?.target === "produccion" && !isSweatspotKit && (
              <div>
                <Label>Tipo de plástico</Label>
                <Select value={plastico} onValueChange={(v) => setPlastico(v as "frio" | "calor")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frio">Frío</SelectItem>
                    <SelectItem value="calor">Térmico</SelectItem>
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
                : delivering?.target === "produccion" ? "Solicitar producción" : "Confirmar envío"}
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
