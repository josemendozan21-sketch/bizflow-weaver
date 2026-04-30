import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useOrders, PRODUCTION_STATUS_LABELS, PRODUCTION_STATUS_COLORS, type Order } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, Package, Calendar, DollarSign, MapPin, Upload, CheckCircle2, AlertTriangle, FileText, Camera, User, Pencil, Search } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { StampingApprovals } from "./StampingApprovals";

const STAGE_ORDER = [
  "pendiente",
  "diseno",
  "produccion_cuerpos",
  "estampacion",
  "dosificacion",
  "sellado",
  "recorte",
  "empaque",
  "listo",
  "despachado",
  "entregado",
];

function getStageProgress(status: string): number {
  const idx = STAGE_ORDER.indexOf(status);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

function getFriendlyStageLabel(status: string, order: Order): string {
  if (status === "listo" && order.sale_type === "mayor" && !order.payment_complete) {
    return "Listo — Pendiente aprobación de pago";
  }

  const inProgressStages: Record<string, string> = {
    pendiente: "Pendiente de inicio",
    diseno: "En producción — Diseño de logo",
    produccion_cuerpos: "En producción — Fabricación de cuerpos",
    estampacion: "En producción — Estampación",
    dosificacion: "En producción — Dosificación",
    sellado: "En producción — Sellado",
    recorte: "En producción — Recorte",
    empaque: "En producción — Empaque",
    listo: "Listo para despacho",
    despachado: "Despachado",
    entregado: "Entregado",
  };

  return inProgressStages[status] || PRODUCTION_STATUS_LABELS[status] || status;
}

type OrderCategory = "action" | "production" | "ready" | "dispatched" | "delivered";

function categorizeOrder(o: Order): OrderCategory {
  // Devuelto cuenta como histórico
  if (o.returned_at) return "delivered";
  if (o.production_status === "entregado") return "delivered";
  if (o.production_status === "despachado") return "dispatched";
  if (o.production_status === "listo") {
    // Mayor sin pago confirmado => acción del asesor
    if (o.sale_type === "mayor" && !o.payment_complete) return "action";
    return "ready";
  }
  return "production";
}

interface OrderGroup {
  key: string;
  clientName: string;
  city: string | null;
  brand: string;
  saleType: string;
  items: Order[];
  totalUnits: number;
  totalAmount: number;
  totalAbono: number;
  oldestCreatedAt: string;
  newestCreatedAt: string;
  category: OrderCategory;
  representative: Order; // para mostrar progreso, fecha de entrega, etc.
}

function groupOrders(orders: Order[]): OrderGroup[] {
  const map = new Map<string, OrderGroup>();
  for (const o of orders) {
    const minuteBucket = o.created_at.slice(0, 16); // YYYY-MM-DDTHH:mm
    const key = `${o.client_name || ""}|${o.client_city || ""}|${o.sale_type || ""}|${o.brand || ""}|${minuteBucket}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        clientName: o.client_name,
        city: o.client_city,
        brand: o.brand,
        saleType: o.sale_type,
        items: [],
        totalUnits: 0,
        totalAmount: 0,
        totalAbono: 0,
        oldestCreatedAt: o.created_at,
        newestCreatedAt: o.created_at,
        category: categorizeOrder(o),
        representative: o,
      };
      map.set(key, g);
    }
    g.items.push(o);
    g.totalUnits += Number(o.quantity) || 0;
    g.totalAmount += Number(o.total_amount) || 0;
    g.totalAbono += Number(o.abono) || 0;
    if (o.created_at < g.oldestCreatedAt) g.oldestCreatedAt = o.created_at;
    if (o.created_at > g.newestCreatedAt) g.newestCreatedAt = o.created_at;
  }
  // Recalcular categoría del grupo: prioridad action > production > ready > dispatched > delivered
  const priority: Record<OrderCategory, number> = {
    action: 0, production: 1, ready: 2, dispatched: 3, delivered: 4,
  };
  for (const g of map.values()) {
    g.category = g.items
      .map(categorizeOrder)
      .reduce((a, b) => (priority[a] <= priority[b] ? a : b));
    // Representative: el de menor prioridad (más activo)
    g.representative = g.items.reduce((a, b) =>
      priority[categorizeOrder(a)] <= priority[categorizeOrder(b)] ? a : b
    );
  }
  return Array.from(map.values());
}

export function MisPedidos() {
  const { data: orders = [], isLoading } = useOrders();
  const [activeTab, setActiveTab] = useState<OrderCategory>("production");
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [saleTypeFilter, setSaleTypeFilter] = useState<string>("all");

  // Fetch production orders to get finished product photos
  const { data: productionOrders = [] } = useQuery({
    queryKey: ["production_orders_for_advisor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select("order_id, finished_photo_url, packager_name, final_count")
        .not("finished_photo_url", "is", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Map order_id -> completion info
  const completionMap = new Map(
    productionOrders
      .filter((po) => po.order_id)
      .map((po) => [po.order_id, { photoUrl: po.finished_photo_url, packagerName: po.packager_name, finalCount: po.final_count }])
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No tienes pedidos registrados aún.
        </CardContent>
      </Card>
    );
  }

  // Filtros + agrupación
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (brandFilter !== "all" && o.brand !== brandFilter) return false;
      if (saleTypeFilter !== "all" && o.sale_type !== saleTypeFilter) return false;
      if (!q) return true;
      return (
        (o.client_name || "").toLowerCase().includes(q) ||
        (o.client_nit || "").toLowerCase().includes(q) ||
        (o.product || "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, brandFilter, saleTypeFilter]);

  const groups = useMemo(() => groupOrders(filteredOrders), [filteredOrders]);

  const counts = useMemo(() => {
    const c: Record<OrderCategory, number> = { action: 0, production: 0, ready: 0, dispatched: 0, delivered: 0 };
    for (const g of groups) c[g.category]++;
    return c;
  }, [groups]);

  // Pestaña por defecto: si hay acción requerida, abrir esa; si no, producción.
  // (solo en el render inicial; no se cambia automáticamente después)
  const visibleGroups = useMemo(
    () => groups
      .filter((g) => g.category === activeTab)
      .sort((a, b) => b.newestCreatedAt.localeCompare(a.newestCreatedAt)),
    [groups, activeTab]
  );

  return (
    <div className="space-y-4">
      {/* Stamping approval requests */}
      <StampingApprovals />

      {/* Buscador + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, NIT o producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las marcas</SelectItem>
            <SelectItem value="magical">Magical Warmers</SelectItem>
            <SelectItem value="sweatspot">Sweatspot</SelectItem>
          </SelectContent>
        </Select>
        <Select value={saleTypeFilter} onValueChange={setSaleTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ventas</SelectItem>
            <SelectItem value="mayor">Al por mayor</SelectItem>
            <SelectItem value="menor">Al por menor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OrderCategory)}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="action" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Acción requerida
            <Badge variant={counts.action > 0 ? "destructive" : "secondary"} className="ml-1">{counts.action}</Badge>
          </TabsTrigger>
          <TabsTrigger value="production" className="gap-1.5">
            En producción
            <Badge variant="secondary" className="ml-1">{counts.production}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ready" className="gap-1.5">
            Listos
            <Badge variant="secondary" className="ml-1">{counts.ready}</Badge>
          </TabsTrigger>
          <TabsTrigger value="dispatched" className="gap-1.5">
            Despachados
            <Badge variant="secondary" className="ml-1">{counts.dispatched}</Badge>
          </TabsTrigger>
          <TabsTrigger value="delivered" className="gap-1.5">
            Entregados
            <Badge variant="secondary" className="ml-1">{counts.delivered}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {visibleGroups.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No hay pedidos en esta categoría.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visibleGroups.map((g) => (
                <OrderGroupCard key={g.key} group={g} completionMap={completionMap} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrderGroupCard({
  group,
  completionMap,
}: {
  group: OrderGroup;
  completionMap: Map<string, { photoUrl: string | null; packagerName: string | null; finalCount: number | null }>;
}) {
  const rep = group.representative;
  const progress = getStageProgress(rep.production_status);
  const friendlyLabel = getFriendlyStageLabel(rep.production_status, rep);
  const needsPaymentAction = group.category === "action";
  const isMultiLine = group.items.length > 1;
  const saldo = group.totalAmount - group.totalAbono;

  // Foto(s) de producto finalizado para cualquier línea del grupo
  const completionInfos = group.items
    .map((it) => completionMap.get(it.id))
    .filter((c): c is { photoUrl: string | null; packagerName: string | null; finalCount: number | null } => !!c);

  return (
    <Card className={`overflow-hidden ${needsPaymentAction ? "ring-2 ring-amber-400" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{group.clientName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {group.brand === "magical" ? "Magical Warmers" : "Sweatspot"} · {group.saleType === "mayor" ? "Al por mayor" : "Al por menor"}
              {isMultiLine && <> · <span className="font-medium">{group.items.length} líneas</span></>}
            </p>
          </div>
          <Badge className={PRODUCTION_STATUS_COLORS[rep.production_status] || "bg-muted text-muted-foreground"}>
            {PRODUCTION_STATUS_LABELS[rep.production_status] || rep.production_status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Payment action banner */}
        {needsPaymentAction && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
              <AlertTriangle className="h-4 w-4" />
              Acción requerida: Confirmar pago del excedente
            </div>
            <p className="text-xs text-amber-700">
              Este pedido está listo en producción. Solicita el saldo restante al cliente y sube el soporte de pago para autorizar el despacho.
            </p>
            <div className="text-sm font-medium text-amber-900">
              Saldo pendiente: ${saldo.toLocaleString("es-CO")}
            </div>
            {/* Una confirmación de pago por línea pendiente */}
            {group.items
              .filter((o) => o.production_status === "listo" && o.sale_type === "mayor" && !o.payment_complete)
              .map((o) => (
                <PaymentConfirmDialog key={o.id} order={o} />
              ))}
          </div>
        )}

        {/* Already confirmed badge */}
        {!needsPaymentAction && rep.production_status === "listo" && rep.sale_type === "mayor" && rep.payment_complete && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2 text-green-800 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Pago confirmado — Listo para despacho por logística
          </div>
        )}

        {/* Invoice file download (cualquier línea con factura) */}
        {group.items.find((o) => o.invoice_file_url) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-blue-800">
              <FileText className="h-4 w-4" />
              <span className="font-medium">Factura disponible</span>
            </div>
            <a
              href={group.items.find((o) => o.invoice_file_url)!.invoice_file_url!}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="h-7 text-xs">Descargar</Button>
            </a>
          </div>
        )}

        {/* Foto(s) producto finalizado */}
        {completionInfos.length > 0 && completionInfos[0].photoUrl && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Camera className="h-4 w-4 text-primary" />
              Producto finalizado
            </div>
            <a href={completionInfos[0].photoUrl} target="_blank" rel="noopener noreferrer">
              <img src={completionInfos[0].photoUrl} alt="Producto finalizado" className="rounded-md max-h-48 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity" />
            </a>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {completionInfos[0].packagerName && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />
                  Empacó: <span className="font-medium text-foreground">{completionInfos[0].packagerName}</span>
                </div>
              )}
              {completionInfos[0].finalCount && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Package className="h-3 w-3" />
                  Conteo: <span className="font-medium text-foreground">{completionInfos[0].finalCount} uds</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">{friendlyLabel}</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Líneas del pedido */}
        <div className="space-y-1.5 rounded-md border bg-muted/20 p-2">
          {group.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-1.5 min-w-0">
                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{it.product}</span>
              </div>
              <span className="text-muted-foreground shrink-0">{it.quantity} uds</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
            <span>Total del pedido</span>
            <span className="font-medium text-foreground">{group.totalUnits} uds</span>
          </div>
        </div>

        {group.totalAmount > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Total: ${group.totalAmount.toLocaleString("es-CO")}</span>
            </div>
            {group.totalAbono > 0 && (
              <div className="text-right text-muted-foreground">
                Abono: ${group.totalAbono.toLocaleString("es-CO")}
              </div>
            )}
          </div>
        )}

        {saldo > 0 && group.totalAmount > 0 && (
          <div className="text-xs text-right">
            <span className="text-muted-foreground">Saldo pendiente: </span>
            <span className="font-medium text-destructive">${saldo.toLocaleString("es-CO")}</span>
          </div>
        )}

        {group.city && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{group.city}</span>
          </div>
        )}

        {rep.delivery_date && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Entrega: {format(new Date(rep.delivery_date), "d MMM yyyy", { locale: es })}</span>
          </div>
        )}

        {group.items.some((it) => it.logo_url) && (
          <div className="text-xs text-primary">🎨 Solicitud de diseño vinculada</div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>{rep.advisor_name}</span>
          <span>{format(new Date(group.oldestCreatedAt), "d MMM yyyy HH:mm", { locale: es })}</span>
        </div>

        {/* Editar: una por línea si son varias, una sola si es única */}
        {isMultiLine ? (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Editar línea:</p>
            {group.items.map((it) => (
              <EditOrderDialog key={it.id} order={it} label={`${it.product} — ${it.quantity} uds`} />
            ))}
          </div>
        ) : (
          <EditOrderDialog order={group.items[0]} />
        )}
      </CardContent>
    </Card>
  );
}

function PaymentConfirmDialog({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState(order.payment_proof_url || "");
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const handleUploadAndConfirm = async () => {
    setUploading(true);
    try {
      let finalProofUrl = proofUrl;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${order.id}/soporte_pago_final.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, file, { upsert: true });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(path);
        finalProofUrl = urlData.publicUrl;
      }

      if (!finalProofUrl && !file) {
        toast.error("Debes subir el soporte de pago");
        setUploading(false);
        return;
      }

      const { error } = await supabase.from("orders").update({
        payment_complete: true,
        payment_proof_url: finalProofUrl,
        abono: order.total_amount, // Mark as fully paid
      }).eq("id", order.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Pago confirmado", { description: "El pedido ahora está disponible para despacho en logística." });
      setOpen(false);
    } catch (err: any) {
      toast.error("Error al confirmar pago", { description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const saldo = (Number(order.total_amount) || 0) - (Number(order.abono) || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full">
          <Upload className="h-4 w-4 mr-1" /> Subir soporte y confirmar pago
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar pago completo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p><strong>Cliente:</strong> {order.client_name}</p>
            <p><strong>Producto:</strong> {order.product} — {order.quantity} uds</p>
            <p><strong>Total:</strong> ${Number(order.total_amount).toLocaleString("es-CO")}</p>
            <p><strong>Abono:</strong> ${Number(order.abono).toLocaleString("es-CO")}</p>
            <p className="font-semibold text-destructive">Saldo pendiente: ${saldo.toLocaleString("es-CO")}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Soporte de pago del excedente *</Label>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">Imagen o PDF del comprobante de pago</p>
          </div>

          <Button
            className="w-full"
            onClick={handleUploadAndConfirm}
            disabled={uploading || !file}
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Confirmar pago y autorizar despacho
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const COLOR_OPTIONS = [
  "No Aplica",
  "Azul",
  "Azul claro",
  "Aguamarina",
  "Rojo",
  "Verde",
  "Verde lima",
  "Verde militar",
  "Negro",
  "Blanco",
  "Transparente",
  "Amarillo",
  "Rosado",
  "Morado",
  "Naranja",
  "Gris",
];

const LOCKED_STATUSES = ["despachado", "entregado"];

function EditOrderDialog({ order, label }: { order: Order; label?: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const isLocked = LOCKED_STATUSES.includes(order.production_status);

  // Parse extra cost from observations if present (format: [Costos adicionales: $X - desc])
  const parseExtras = (obs: string | null) => {
    if (!obs) return { extraCost: 0, extraDesc: "", baseObs: "" };
    const match = obs.match(/\[Costos adicionales: \$([0-9.,]+)(?: - ([^\]]+))?\]\s*/);
    if (match) {
      return {
        extraCost: Number(match[1].replace(/[.,]/g, "")) || 0,
        extraDesc: match[2] || "",
        baseObs: obs.replace(match[0], "").trim(),
      };
    }
    return { extraCost: 0, extraDesc: "", baseObs: obs };
  };

  const initialExtras = parseExtras(order.observations);

  const [gelColor, setGelColor] = useState(order.gel_color || "");
  const [inkColor, setInkColor] = useState(order.ink_color || "");
  const [siliconeColor, setSiliconeColor] = useState(order.silicone_color || "");
  const [personalization, setPersonalization] = useState(order.personalization || "");
  const [observations, setObservations] = useState(initialExtras.baseObs);
  const [extraCost, setExtraCost] = useState<number>(initialExtras.extraCost);
  const [extraDesc, setExtraDesc] = useState(initialExtras.extraDesc);
  const [deliveryDate, setDeliveryDate] = useState(order.delivery_date || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      // Rebuild observations with extras tag if any
      let finalObs = observations.trim();
      if (extraCost > 0) {
        const tag = `[Costos adicionales: $${extraCost.toLocaleString("es-CO")}${extraDesc ? ` - ${extraDesc}` : ""}]`;
        finalObs = finalObs ? `${tag} ${finalObs}` : tag;
      }

      // Recalculate total: base (unit_price * quantity) + extra cost
      const baseTotal = (Number(order.unit_price) || 0) * (Number(order.quantity) || 0);
      const newTotal = baseTotal + (Number(extraCost) || 0);

      const { error } = await supabase
        .from("orders")
        .update({
          gel_color: gelColor || null,
          ink_color: inkColor || null,
          silicone_color: siliconeColor || null,
          personalization: personalization || null,
          observations: finalObs || null,
          delivery_date: deliveryDate || null,
          total_amount: newTotal,
        })
        .eq("id", order.id);

      if (error) throw error;

      // Notify production so they see the updated specs
      await supabase.from("notifications").insert({
        target_role: "produccion",
        title: "Pedido actualizado por asesor",
        message: `${order.advisor_name} modificó las especificaciones del pedido de ${order.client_name} (${order.product}). Revisa los nuevos colores/observaciones antes de continuar.`,
        type: "info",
        reference_id: order.id,
      });

      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Pedido actualizado", {
        description: "Se notificó al equipo de producción de los cambios.",
      });
      setOpen(false);
    } catch (err: any) {
      toast.error("Error al actualizar", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Pencil className="h-3.5 w-3.5 mr-1" /> {label || "Ver / Editar detalles"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del pedido — {order.client_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Read-only summary */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p><strong>Producto:</strong> {order.product} — {order.quantity} uds</p>
            <p><strong>Marca:</strong> {order.brand === "magical" ? "Magical Warmers" : "Sweatspot"}</p>
            <p><strong>Tipo:</strong> {order.sale_type === "mayor" ? "Al por mayor" : "Al por menor"}</p>
            <p><strong>Etapa actual:</strong> {PRODUCTION_STATUS_LABELS[order.production_status] || order.production_status}</p>
          </div>

          {isLocked && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              Este pedido ya fue {order.production_status}. No se puede editar. Para cualquier ajuste contacta a logística o administración.
            </div>
          )}

          <fieldset disabled={isLocked || saving} className="space-y-4 disabled:opacity-60">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Color de gel</Label>
                <Select value={gelColor} onValueChange={setGelColor}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Color de tinta</Label>
                <Select value={inkColor} onValueChange={setInkColor}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {order.brand === "sweatspot" && (
              <div className="space-y-1.5">
                <Label>Color de silicona</Label>
                <Input value={siliconeColor} onChange={(e) => setSiliconeColor(e.target.value)} placeholder="Ej: Negro" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Personalización (escarcha, doble tinta, etc.)</Label>
              <Textarea
                value={personalization}
                onChange={(e) => setPersonalization(e.target.value)}
                placeholder="Ej: Escarcha plateada, doble tinta azul + blanco"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Costo adicional ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={extraCost || ""}
                  onChange={(e) => setExtraCost(Number(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Concepto del costo</Label>
                <Input
                  value={extraDesc}
                  onChange={(e) => setExtraDesc(e.target.value)}
                  placeholder="Ej: Escarcha"
                />
              </div>
            </div>
            {extraCost > 0 && (
              <p className="text-xs text-muted-foreground">
                Nuevo total: ${((Number(order.unit_price) || 0) * (Number(order.quantity) || 0) + extraCost).toLocaleString("es-CO")}
              </p>
            )}

            <div className="space-y-1.5">
              <Label>Fecha de entrega</Label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Notas adicionales para producción"
                rows={3}
              />
            </div>
          </fieldset>

          {!isLocked && (
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Guardar cambios
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
