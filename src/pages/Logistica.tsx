import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useOrders, type Order } from "@/hooks/useOrders";
import { useAuth } from "@/contexts/AuthContext";
import { canEditSection } from "@/lib/rolePermissions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Package, Truck, CheckCircle2, Clock, AlertTriangle, CalendarDays, FileCheck, Download, FileImage, MapPin, PackageX, Undo2, Tent, Pencil } from "lucide-react";
import { FeriaDispatchTab } from "@/components/logistics/FeriaDispatchTab";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import ShippingLabelDialog from "@/components/logistics/ShippingLabelDialog";

function exportOrdersToCSV(orders: Order[], brandLabel: (b: string) => string, saleLabel: (t: string) => string) {
  const headers = ["Cliente", "Cédula/NIT", "Teléfono", "Email", "Ciudad", "Dirección", "Marca", "Tipo", "Producto", "Unidades", "Método de pago", "Valor total", "Abono", "Saldo pendiente", "Costo envío", "Observaciones"];
  const rows = orders.map((o) => {
    const total = Number(o.total_amount) || 0;
    const abono = Number(o.abono) || 0;
    const saldo = total - abono;
    const shippingCost = Number(o.shipping_cost) || 0;
    let metodo = "N/A";
    if (o.sale_type === "menor") {
      metodo = o.payment_method === "contra_entrega" ? `Contra entrega ($${(saldo + shippingCost).toLocaleString("es-CO")})` : o.payment_method === "pagado" ? "Pagado" : "N/A";
    } else {
      metodo = saldo <= 0 ? "Pago completo" : `Saldo: $${saldo.toLocaleString("es-CO")}`;
    }
    return [
      o.client_name,
      o.client_nit || "—",
      o.client_phone || "—",
      o.client_email || "—",
      o.client_city || "—",
      o.client_address || "—",
      brandLabel(o.brand),
      saleLabel(o.sale_type),
      o.product,
      o.quantity,
      metodo,
      total ? `$${total.toLocaleString("es-CO")}` : "—",
      abono ? `$${abono.toLocaleString("es-CO")}` : "—",
      saldo > 0 ? `$${saldo.toLocaleString("es-CO")}` : "$0",
      shippingCost ? `$${shippingCost.toLocaleString("es-CO")}` : "—",
      o.observations || "—",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `despachos_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Archivo descargado");
}

/* ---------- Shipment grouping ---------- */

export interface ShipmentGroup {
  key: string;
  clientName: string;
  clientNit?: string | null;
  clientPhone?: string | null;
  city?: string | null;
  address?: string | null;
  saleType: string;
  brands: string[];
  items: Order[];
  totalUnits: number;
  totalAmount: number;
  totalAbono: number;
  totalShipping: number;
  allIds: string[];
  oldestCreatedAt: string;
  observations: string[];
}

function groupOrdersByShipment(
  orders: Order[],
  extraKeyFn?: (o: Order) => string,
  sortDesc = false,
): ShipmentGroup[] {
  const map = new Map<string, ShipmentGroup>();
  for (const o of orders) {
    const baseKey = `${o.client_name || ""}|${o.client_city || ""}|${o.client_address || ""}|${o.sale_type || ""}`;
    const key = extraKeyFn ? `${baseKey}|${extraKeyFn(o)}` : baseKey;
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        clientName: o.client_name,
        clientNit: o.client_nit,
        clientPhone: o.client_phone,
        city: o.client_city,
        address: o.client_address,
        saleType: o.sale_type,
        brands: [],
        items: [],
        totalUnits: 0,
        totalAmount: 0,
        totalAbono: 0,
        totalShipping: 0,
        allIds: [],
        oldestCreatedAt: o.created_at,
        observations: [],
      };
      map.set(key, group);
    }
    group.items.push(o);
    group.allIds.push(o.id);
    group.totalUnits += Number(o.quantity) || 0;
    group.totalAmount += Number(o.total_amount) || 0;
    group.totalAbono += Number(o.abono) || 0;
    group.totalShipping += Number(o.shipping_cost) || 0;
    if (!group.brands.includes(o.brand)) group.brands.push(o.brand);
    if (o.created_at < group.oldestCreatedAt) group.oldestCreatedAt = o.created_at;
    if (o.observations && !group.observations.includes(o.observations)) group.observations.push(o.observations);
  }
  const groups = Array.from(map.values());
  if (sortDesc) {
    // Sort by most recent dispatched_at across items (fallback to most recent created_at)
    return groups.sort((a, b) => {
      const aLast = a.items.reduce((max, it) => {
        const v = it.dispatched_at || it.created_at;
        return v > max ? v : max;
      }, "");
      const bLast = b.items.reduce((max, it) => {
        const v = it.dispatched_at || it.created_at;
        return v > max ? v : max;
      }, "");
      return bLast.localeCompare(aLast);
    });
  }
  return groups.sort((a, b) => a.oldestCreatedAt.localeCompare(b.oldestCreatedAt));
}

function AdvisorsLine({ items }: { items: Order[] }) {
  const names = Array.from(
    new Set(items.map((it) => it.advisor_name).filter(Boolean) as string[])
  );
  if (names.length === 0) return null;
  return (
    <p className="text-xs text-muted-foreground mt-0.5">
      Asesor: <span className="text-foreground font-medium">{names.join(", ")}</span>
    </p>
  );
}

function generateLabelsForGroups(groups: ShipmentGroup[]) {
  if (groups.length === 0) return;
  const labelsHtml = groups.map((g) => {
    const saldo = g.totalAmount - g.totalAbono;
    const firstItem = g.items[0];
    let pagoInfo = "";
    if (g.saleType === "menor") {
      if (firstItem?.payment_method === "contra_entrega") {
        pagoInfo = `CONTRA ENTREGA: $${(saldo + g.totalShipping).toLocaleString("es-CO")}`;
      } else {
        pagoInfo = "PAGADO";
      }
    } else {
      pagoInfo = saldo <= 0 ? "PAGO COMPLETO" : `SALDO: $${saldo.toLocaleString("es-CO")}`;
    }
    const itemsHtml = g.items
      .map((it) => `<div class="item">• ${it.product} — ${it.quantity} und</div>`)
      .join("");
    return `
      <div class="label">
        <div class="header">Rótulo de Envío</div>
        <div class="row"><span class="lbl">Destinatario:</span> <span class="val">${g.clientName}</span></div>
        <div class="row"><span class="lbl">Cédula/NIT:</span> <span class="val">${g.clientNit || "—"}</span></div>
        <div class="row"><span class="lbl">Ciudad:</span> <span class="val">${g.city || "—"}</span></div>
        <div class="row"><span class="lbl">Dirección:</span> <span class="val">${g.address || "—"}</span></div>
        <div class="row"><span class="lbl">Celular:</span> <span class="val">${g.clientPhone || "—"}</span></div>
        <div class="divider"></div>
        <div class="row"><span class="lbl">Contenido (${g.items.length} items, ${g.totalUnits} und):</span></div>
        <div class="items">${itemsHtml}</div>
        <div class="row pago"><span class="lbl">Pago:</span> <span class="val">${pagoInfo}</span></div>
        ${g.observations.length ? `<div class="row obs"><span class="lbl">Obs:</span> <span class="val">${g.observations.join(" | ")}</span></div>` : ""}
      </div>
    `;
  }).join("");

  const printWindow = window.open("", "_blank", "width=600,height=800");
  if (!printWindow) return;
  printWindow.document.write(`<!DOCTYPE html><html><head><title>Rótulos de envío</title>
  <style>
    @page { size: 10cm 10cm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; }
    .label { width: 10cm; min-height: 10cm; border: 2px solid #000; padding: 6mm; page-break-after: always; display: flex; flex-direction: column; }
    .label:last-child { page-break-after: auto; }
    .header { text-align: center; font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px; letter-spacing: 1px; }
    .row { font-size: 10.5px; margin-bottom: 2px; line-height: 1.3; }
    .items { font-size: 10px; margin: 2px 0 4px 4px; }
    .item { line-height: 1.3; }
    .lbl { font-weight: bold; text-transform: uppercase; color: #333; }
    .val { font-weight: 600; }
    .divider { border-top: 1px dashed #999; margin: 4px 0; }
    .pago { font-size: 11.5px; font-weight: bold; margin-top: 4px; }
    .obs { font-size: 9.5px; font-style: italic; color: #555; }
    @media print { body { margin: 0; } }
  </style></head><body>${labelsHtml}
  <script>window.onload=()=>{window.print();}</script>
  </body></html>`);
  printWindow.document.close();
  toast.success("Rótulos generados", { description: `${groups.length} rótulo(s) consolidado(s) listo(s) para imprimir.` });
}

const Logistica = () => {
  const { role } = useAuth();
  const isLogisticsOrAdmin = role === "logistica" || role === "admin";
  const canEdit = canEditSection(role, "/logistica");
  const { data: allOrders = [] } = useOrders();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch finished product photos from production orders
  const { data: productionOrders = [] } = useQuery({
    queryKey: ["production_orders_for_logistics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select("order_id, finished_photo_url, packager_name, final_count")
        .not("finished_photo_url", "is", null);
      if (error) throw error;
      return data ?? [];
    },
  });
  const completionMap = new Map(
    productionOrders
      .filter((po) => po.order_id)
      .map((po) => [po.order_id, { photoUrl: po.finished_photo_url, packagerName: po.packager_name, finalCount: po.final_count }])
  );

  // Ready for dispatch: retail orders with status "listo" OR wholesale orders that are production-complete AND fully paid
  const readyOrders = allOrders.filter((o) => {
    if (o.production_status === "despachado" || o.production_status === "entregado") return false;
    if (o.dispatched_at) return false;
    if (o.sale_type === "menor") {
      return o.production_status === "listo";
    }
    // Wholesale: must be in "listo" stage AND payment complete
    const productionDone = o.production_status === "listo";
    const paid = o.payment_complete === true || (o.total_amount && o.abono && Number(o.abono) >= Number(o.total_amount));
    return productionDone && paid;
  });

  // Pending: wholesale orders not yet ready (production not done or not paid)
  const pendingOrders = allOrders.filter((o) => {
    if (o.sale_type === "menor") return false;
    if (o.dispatched_at) return false;
    if (o.production_status === "despachado" || o.production_status === "entregado") return false;
    const productionDone = o.production_status === "listo";
    const paid = o.payment_complete === true || (o.total_amount && o.abono && Number(o.abono) >= Number(o.total_amount));
    return !(productionDone && paid);
  });

  const dispatchedOrders = allOrders.filter((o) => o.dispatched_at || o.production_status === "despachado");

  const brandLabel = (brand: string) => brand === "magical" ? "Magical Warmers" : "Sweatspot";
  const saleLabel = (type: string) => type === "mayor" ? "Por mayor" : "Por menor";

  // Build shipment groups
  const readyGroups = groupOrdersByShipment(readyOrders);
  const pendingGroups = groupOrdersByShipment(pendingOrders);
  // Dispatched: include guía in key so different shipments to same client stay separate
  // Sort descending so the most recently dispatched appears first
  const dispatchedGroups = groupOrdersByShipment(
    dispatchedOrders,
    (o) => `${o.numero_guia || ""}|${o.dispatched_at || ""}`,
    true,
  );

  const isGroupSelected = (g: ShipmentGroup) => selectedIds.has(g.key);
  const toggleGroup = (g: ShipmentGroup, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(g.key);
    else next.delete(g.key);
    setSelectedIds(next);
  };
  const selectedGroups = readyGroups.filter(isGroupSelected);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Logística</h1>
        <p className="text-muted-foreground">Gestión de despachos y seguimiento de envíos</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <SummaryCard icon={<Clock className="h-5 w-5 text-amber-600" />} label="Listos para despacho" value={readyOrders.length} bgClass="bg-amber-500/10" />
        <SummaryCard icon={<AlertTriangle className="h-5 w-5 text-orange-600" />} label="Pendientes (mayor)" value={pendingOrders.length} bgClass="bg-orange-500/10" />
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Despachados" value={dispatchedOrders.length} bgClass="bg-green-500/10" />
        <SummaryCard icon={<Package className="h-5 w-5 text-primary" />} label="Unidades listas" value={readyOrders.reduce((s, o) => s + o.quantity, 0)} bgClass="bg-primary/10" />
      </div>

      <Tabs defaultValue="ready" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ready" className="gap-1.5">
            <Truck className="h-4 w-4" /> Listos para despacho
            {readyOrders.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{readyOrders.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Pendientes
            {pendingOrders.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{pendingOrders.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="dispatched" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Despachados
            {dispatchedOrders.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{dispatchedOrders.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="ferias" className="gap-1.5">
            <Tent className="h-4 w-4" /> Ferias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ready">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg">Envíos listos para despacho</CardTitle>
              <div className="flex gap-2">
                {selectedGroups.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => generateLabelsForGroups(selectedGroups)}>
                    <FileImage className="h-4 w-4 mr-2" /> Descargar rótulos ({selectedGroups.length})
                  </Button>
                )}
                {readyOrders.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => exportOrdersToCSV(readyOrders, brandLabel, saleLabel)}>
                    <Download className="h-4 w-4 mr-2" /> Descargar info
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {readyGroups.length === 0 ? (
                <EmptyState icon={<Package className="h-12 w-12 mb-3 opacity-40" />} title="No hay pedidos listos para despacho" subtitle="Los pedidos aparecerán aquí cuando estén listos y pagados." />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1 pb-1 border-b">
                    <Checkbox
                      checked={readyGroups.length > 0 && readyGroups.every(isGroupSelected)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedIds(new Set(readyGroups.map(g => g.key)));
                        else setSelectedIds(new Set());
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Seleccionar todos los envíos ({readyGroups.length})</span>
                  </div>
                  {readyGroups.map((g) => (
                    <ShipmentGroupCard
                      key={g.key}
                      group={g}
                      selected={isGroupSelected(g)}
                      onToggle={(c) => toggleGroup(g, c)}
                      brandLabel={brandLabel}
                      saleLabel={saleLabel}
                      canEdit={canEdit}
                      completionMap={completionMap}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader><CardTitle className="text-lg">Envíos pendientes — Recién montados</CardTitle></CardHeader>
            <CardContent>
              {pendingGroups.length === 0 ? (
                <EmptyState icon={<AlertTriangle className="h-12 w-12 mb-3 opacity-40" />} title="No hay pedidos pendientes" subtitle="Los pedidos al por mayor aparecerán aquí hasta que producción los apruebe y estén pagados." />
              ) : (
                <div className="space-y-3">
                  {pendingGroups.map((g) => (
                    <PendingGroupCard
                      key={g.key}
                      group={g}
                      brandLabel={brandLabel}
                      saleLabel={saleLabel}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatched">
          <Card>
            <CardHeader><CardTitle className="text-lg">Envíos despachados</CardTitle></CardHeader>
            <CardContent>
              {dispatchedGroups.length === 0 ? (
                <EmptyState icon={<CheckCircle2 className="h-12 w-12 mb-3 opacity-40" />} title="No hay pedidos despachados aún" subtitle="Los pedidos despachados aparecerán en este historial." />
              ) : (
                <div className="space-y-3">
                  {dispatchedGroups.map((g) => (
                    <DispatchedGroupCard
                      key={g.key}
                      group={g}
                      brandLabel={brandLabel}
                      saleLabel={saleLabel}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ferias">
          <Card>
            <CardHeader><CardTitle className="text-lg">Solicitudes de ferias</CardTitle></CardHeader>
            <CardContent>
              <FeriaDispatchTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* Sub-components */

function SummaryCard({ icon, label, value, bgClass }: { icon: React.ReactNode; label: string; value: number; bgClass: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`p-2 rounded-md ${bgClass}`}>{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      {icon}
      <p className="font-medium">{title}</p>
      <p className="text-sm">{subtitle}</p>
    </div>
  );
}

function AgingBadge({ days }: { days: number }) {
  if (days <= 3) return <Badge variant="outline" className="border-green-400 text-green-700">{days}d</Badge>;
  if (days <= 7) return <Badge variant="outline" className="border-amber-400 text-amber-700">{days}d</Badge>;
  if (days <= 14) return <Badge variant="outline" className="border-orange-400 text-orange-700">{days}d</Badge>;
  return <Badge variant="destructive">{days}d</Badge>;
}

function PaymentBadge({ order }: { order: Order }) {
  if (order.sale_type === "menor") {
    if (order.payment_method === "pagado") return <Badge className="bg-green-600 hover:bg-green-700">Pagado</Badge>;
    if (order.payment_method === "contra_entrega") return <Badge variant="outline">Contra entrega</Badge>;
    return <Badge variant="outline">N/A</Badge>;
  }
  const paid = order.payment_complete || (order.total_amount && order.abono && Number(order.abono) >= Number(order.total_amount));
  if (paid) return <Badge className="bg-green-600 hover:bg-green-700">Pago completo</Badge>;
  const saldo = (Number(order.total_amount) || 0) - (Number(order.abono) || 0);
  return <Badge variant="destructive">Saldo: ${saldo.toLocaleString("es-CO")}</Badge>;
}

function ProductionStatusBadge({ status, order }: { status: string; order?: Order }) {
  // If production is done but payment not confirmed by advisor
  if (status === "listo" && order && !order.payment_complete) {
    return <Badge variant="outline" className="border-amber-400 text-amber-700">Esperando pago del asesor</Badge>;
  }
  const labels: Record<string, string> = {
    pendiente: "Pendiente",
    produccion_cuerpos: "Prod. Cuerpos",
    estampacion: "Estampación",
    dosificacion: "Dosificación",
    sellado: "Sellado",
    recorte: "Recorte",
    empaque: "Empaque",
    listo: "Listo",
  };
  return <Badge variant="outline">{labels[status] || status}</Badge>;
}

const TRANSPORTADORAS = [
  { value: "coordinadora", label: "Coordinadora" },
  { value: "servientrega", label: "Servientrega" },
  { value: "interrapidisimo", label: "Inter Rapidísimo" },
  { value: "envia", label: "Envía" },
  { value: "bogoexpress", label: "Bogoexpress" },
];

function GroupDispatchDialog({ group }: { group: ShipmentGroup }) {
  const [open, setOpen] = useState(false);
  const [transportadora, setTransportadora] = useState("");
  const [numeroGuia, setNumeroGuia] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [guiaFile, setGuiaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const isBogoexpress = transportadora === "bogoexpress";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setGuiaFile(file);
  };

  const handleConfirm = async () => {
    setUploading(true);
    let guiaFileUrl: string | null = null;

    // Upload guide file if provided
    if (guiaFile) {
      const ext = guiaFile.name.split(".").pop();
      const path = `guias/${group.allIds[0]}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("invoice-files")
        .upload(path, guiaFile);
      if (uploadError) {
        toast.error("Error subiendo guía", { description: uploadError.message });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("invoice-files").getPublicUrl(path);
      guiaFileUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("orders").update({
      production_status: "despachado",
      dispatched_at: new Date().toISOString().slice(0, 10),
      transportadora: TRANSPORTADORAS.find(t => t.value === transportadora)?.label || transportadora || null,
      numero_guia: isBogoexpress ? "N/A - Bogoexpress" : (numeroGuia.trim() || null),
      dispatch_notes: [dispatchNotes.trim(), guiaFileUrl ? `Guía adjunta: ${guiaFileUrl}` : ""].filter(Boolean).join(" | ") || null,
    }).in("id", group.allIds);

    setUploading(false);

    if (error) {
      toast.error("Error al despachar", { description: error.message });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["orders"] });
    toast.success("Envío despachado", { description: `${group.allIds.length} pedido(s) de ${group.clientName} marcados como despachados.` });

    // Notificar al asesor y a contabilidad
    try {
      const advisorIds = Array.from(
        new Set(group.items.map((it: any) => it.advisor_id).filter(Boolean))
      );
      const totalUnits = group.totalUnits;
      const transpLabel =
        TRANSPORTADORAS.find((t) => t.value === transportadora)?.label || transportadora;
      const guiaInfo = isBogoexpress
        ? "Bogoexpress"
        : numeroGuia.trim()
        ? `guía ${numeroGuia.trim()}`
        : "sin guía";

      const notifs: any[] = [
        {
          target_role: "contabilidad",
          title: "Pedido despachado",
          message: `${group.clientName} — ${totalUnits} und. ${transpLabel} (${guiaInfo}). Pendiente facturación.`,
          type: "pedido_despachado",
          reference_id: group.allIds[0],
        },
        {
          target_role: "admin",
          title: "Pedido despachado",
          message: `${group.clientName} — ${totalUnits} und por ${transpLabel}.`,
          type: "pedido_despachado",
          reference_id: group.allIds[0],
        },
      ];
      for (const advisorId of advisorIds) {
        notifs.push({
          target_role: "asesor_comercial",
          target_user_id: advisorId,
          title: "Tu pedido fue despachado",
          message: `${group.clientName} — ${totalUnits} und. Transportadora: ${transpLabel} (${guiaInfo}).`,
          type: "pedido_despachado",
          reference_id: group.allIds[0],
        });
      }
      await supabase.from("notifications").insert(notifs);
    } catch (notifErr) {
      console.error("Error sending dispatch notifications:", notifErr);
    }

    setOpen(false);
    setTransportadora("");
    setNumeroGuia("");
    setDispatchNotes("");
    setGuiaFile(null);
  };

  const canSubmit = transportadora && (isBogoexpress || numeroGuia.trim() || dispatchNotes.trim());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Truck className="h-4 w-4 mr-1" /> Despachar</Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-radix-select-content], [data-radix-popper-content-wrapper], [data-radix-select-viewport], [data-radix-select-item], [role='listbox'], [role='option']")) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-radix-select-content], [data-radix-popper-content-wrapper], [data-radix-select-viewport], [data-radix-select-item], [role='listbox'], [role='option']")) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Confirmar despacho</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Envío de <span className="font-semibold text-foreground">{group.clientName}</span> — {group.items.length} item(s), {group.totalUnits} unidades en total
        </p>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Transportadora</Label>
            <div className="grid grid-cols-2 gap-2">
              {TRANSPORTADORAS.map((t) => {
                const active = transportadora === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTransportadora(t.value)}
                    className={`text-sm rounded-md border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-foreground font-medium ring-1 ring-primary"
                        : "border-input bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {isBogoexpress ? (
            <p className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
              Bogoexpress no genera número de guía. Se registrará automáticamente.
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label>Número de guía</Label>
              <Input value={numeroGuia} onChange={(e) => setNumeroGuia(e.target.value)} placeholder="Ej: 123456789" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Adjuntar guía (PDF / imagen)</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="text-sm" />
            </div>
            {guiaFile && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileCheck className="h-3.5 w-3.5 text-green-600" />
                {guiaFile.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Notas de despacho</Label>
            <Textarea value={dispatchNotes} onChange={(e) => setDispatchNotes(e.target.value)} placeholder="Ej: Se envió por moto propia, entrega en punto..." />
          </div>

          <Button className="w-full" onClick={handleConfirm} disabled={!canSubmit || uploading}>
            <Truck className="h-4 w-4 mr-1" />
            {uploading ? "Subiendo..." : "Marcar como despachado"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Shipment group cards ---------- */

function ShipmentGroupCard({
  group,
  selected,
  onToggle,
  brandLabel,
  saleLabel,
  canEdit,
  completionMap,
}: {
  group: ShipmentGroup;
  selected: boolean;
  onToggle: (checked: boolean) => void;
  brandLabel: (b: string) => string;
  saleLabel: (t: string) => string;
  canEdit: boolean;
  completionMap?: Map<string, { photoUrl: string | null; packagerName: string | null; finalCount: number | null }>;
}) {
  // Find finished photos for items in this group
  const finishedPhotos = group.items
    .map((it) => completionMap?.get(it.id))
    .filter((c): c is { photoUrl: string | null; packagerName: string | null; finalCount: number | null } => !!c && !!c.photoUrl);

  return (
    <div className={`rounded-lg border bg-card transition-colors ${selected ? "border-primary ring-1 ring-primary/30" : ""}`}>
      <div className="flex items-start gap-3 p-4 border-b">
        <Checkbox checked={selected} onCheckedChange={(c) => onToggle(!!c)} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <h3 className="font-semibold text-foreground truncate">{group.clientName}</h3>
            {group.city && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {group.city}
              </span>
            )}
            <Badge variant="outline" className="text-xs">{saleLabel(group.saleType)}</Badge>
            {group.brands.map((b) => (
              <Badge key={b} variant={b === "magical" ? "default" : "secondary"} className="text-xs">{brandLabel(b)}</Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {group.items.length} item(s) · {group.totalUnits} unidades
          </p>
          <AdvisorsLine items={group.items} />
        </div>
        <div className="flex gap-2 shrink-0">
          <ShippingLabelDialog clientName={group.clientName} />
          {canEdit && <GroupDispatchDialog group={group} />}
        </div>
      </div>
      <div className="p-4 pt-3 space-y-1.5">
        {group.items.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground truncate">• {it.product}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-muted-foreground">{it.quantity} und</span>
              <PaymentBadge order={it} />
            </div>
          </div>
        ))}
        {finishedPhotos.length > 0 && (
          <div className="pt-3 mt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Foto(s) de producto terminado ({finishedPhotos.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {finishedPhotos.map((c, idx) => (
                <a
                  key={idx}
                  href={c.photoUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-20 h-20 rounded-md border overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition"
                  title={`Empacado por ${c.packagerName || "—"}${c.finalCount ? ` · ${c.finalCount} und` : ""}`}
                >
                  <img src={c.photoUrl!} alt="Producto terminado" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingGroupCard({
  group,
  brandLabel,
  saleLabel,
}: {
  group: ShipmentGroup;
  brandLabel: (b: string) => string;
  saleLabel: (t: string) => string;
}) {
  const oldestDate = new Date(group.oldestCreatedAt);
  const aging = differenceInDays(new Date(), oldestDate);
  const allPaid = group.items.every((o) => o.payment_complete || (o.total_amount && o.abono && Number(o.abono) >= Number(o.total_amount)));
  const earliestDelivery = group.items
    .map((o) => o.delivery_date)
    .filter(Boolean)
    .sort()[0];
  return (
    <div className={`rounded-lg border bg-card ${allPaid ? "" : "opacity-70"}`}>
      <div className="flex items-start gap-3 p-4 border-b flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <h3 className="font-semibold text-foreground truncate">{group.clientName}</h3>
            {group.city && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {group.city}
              </span>
            )}
            <Badge variant="outline" className="text-xs">{saleLabel(group.saleType)}</Badge>
            {group.brands.map((b) => (
              <Badge key={b} variant={b === "magical" ? "default" : "secondary"} className="text-xs">{brandLabel(b)}</Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {group.items.length} item(s) · {group.totalUnits} unidades · creado {format(oldestDate, "dd MMM yyyy", { locale: es })}
            {earliestDelivery && (
              <> · entrega <span className="inline-flex items-center gap-0.5"><CalendarDays className="h-3 w-3" />{format(new Date(earliestDelivery), "dd MMM", { locale: es })}</span></>
            )}
          </p>
          <AdvisorsLine items={group.items} />
        </div>
        <AgingBadge days={aging} />
      </div>
      <div className="p-4 pt-3 space-y-1.5">
        {group.items.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-3 text-sm flex-wrap">
            <span className="text-foreground truncate">• {it.product} <span className="text-muted-foreground">— {it.quantity} und</span></span>
            <div className="flex items-center gap-2 shrink-0">
              <ProductionStatusBadge status={it.production_status} order={it} />
              <PaymentBadge order={it} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DispatchedGroupCard({
  group,
  brandLabel,
  saleLabel,
}: {
  group: ShipmentGroup;
  brandLabel: (b: string) => string;
  saleLabel: (t: string) => string;
}) {
  const first = group.items[0];
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-start gap-3 p-4 border-b flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <h3 className="font-semibold text-foreground truncate">{group.clientName}</h3>
            {group.city && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {group.city}
              </span>
            )}
            <Badge variant="outline" className="text-xs">{saleLabel(group.saleType)}</Badge>
            {group.brands.map((b) => (
              <Badge key={b} variant={b === "magical" ? "default" : "secondary"} className="text-xs">{brandLabel(b)}</Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {group.items.length} item(s) · {group.totalUnits} unidades · despachado {first?.dispatched_at || "—"}
          </p>
          <AdvisorsLine items={group.items} />
        </div>
        <div className="text-right text-xs space-y-0.5 shrink-0">
          <p className="text-muted-foreground">{first?.transportadora || "—"}</p>
          <p className="font-mono text-foreground">{first?.numero_guia || "—"}</p>
        </div>
      </div>
      <div className="p-4 pt-3 space-y-1">
        {group.items.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground truncate flex items-center gap-2">
              • {it.product}
              {it.returned_at && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <PackageX className="h-3 w-3" /> Devuelto
                </Badge>
              )}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-muted-foreground">{it.quantity} und</span>
              <ReturnOrderButton order={it} />
            </div>
          </div>
        ))}
        {first?.dispatch_notes && (
          <p className="text-xs text-muted-foreground italic pt-2 border-t mt-2">{first.dispatch_notes}</p>
        )}
        {group.items.some((it) => it.returned_at && it.return_notes) && (
          <div className="pt-2 border-t mt-2 space-y-1">
            {group.items
              .filter((it) => it.returned_at && it.return_notes)
              .map((it) => (
                <p key={it.id} className="text-xs text-destructive">
                  <b>Devolución {it.product}:</b> {it.return_notes}
                </p>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Return order button ---------- */

function ReturnOrderButton({ order }: { order: Order }) {
  const { role } = useAuth();
  const canReturn = role === "logistica" || role === "admin";
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(order.return_notes || "");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  if (!canReturn) {
    return order.returned_at ? (
      <Badge variant="destructive" className="text-[10px]">Devuelto</Badge>
    ) : null;
  }

  const isReturned = !!order.returned_at;

  const handleMarkReturned = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          returned_at: new Date().toISOString(),
          return_notes: notes || null,
        })
        .eq("id", order.id);
      if (error) throw error;
      toast.success("Pedido marcado como devuelto", {
        description: "Se aplicará una penalización de $10.000 en la comisión del asesor.",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setOpen(false);
    } catch (err: any) {
      toast.error("Error al marcar devolución", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async () => {
    if (!confirm("¿Deshacer la marca de devolución?")) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ returned_at: null, return_notes: null })
        .eq("id", order.id);
      if (error) throw error;
      toast.success("Devolución anulada");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (isReturned) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs gap-1"
        onClick={handleUndo}
        disabled={saving}
        title="Anular devolución"
      >
        <Undo2 className="h-3 w-3" /> Anular
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
          <PackageX className="h-3 w-3" /> Devuelto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar pedido como devuelto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm space-y-1 rounded-md border p-3 bg-muted/30">
            <p><b>Cliente:</b> {order.client_name}</p>
            <p><b>Producto:</b> {order.product} — {order.quantity} und</p>
            <p><b>Asesor:</b> {order.advisor_name}</p>
          </div>
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Si el pedido es <b>contraentrega</b>, se aplicará una penalización de
              <b> $10.000</b> sobre la comisión del asesor en el módulo de Contabilidad.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Motivo de la devolución (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Cliente no quiso recibir, dirección incorrecta, producto rechazado..."
              rows={3}
            />
          </div>
          <Button className="w-full" onClick={handleMarkReturned} disabled={saving}>
            <PackageX className="h-4 w-4 mr-1" />
            {saving ? "Registrando..." : "Confirmar devolución"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Logistica;
