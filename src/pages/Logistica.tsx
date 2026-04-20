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
import { useQueryClient } from "@tanstack/react-query";
import { Package, Truck, CheckCircle2, Clock, AlertTriangle, CalendarDays, FileCheck, Download, FileImage, MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";

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

function generateLabelsForOrders(orders: Order[]) {
  if (orders.length === 0) return;
  const labelsHtml = orders.map((o) => {
    const total = Number(o.total_amount) || 0;
    const abono = Number(o.abono) || 0;
    const saldo = total - abono;
    const shippingCost = Number(o.shipping_cost) || 0;
    let pagoInfo = "";
    if (o.sale_type === "menor") {
      if (o.payment_method === "contra_entrega") {
        pagoInfo = `CONTRA ENTREGA: $${(saldo + shippingCost).toLocaleString("es-CO")}`;
      } else {
        pagoInfo = "PAGADO";
      }
    } else {
      pagoInfo = saldo <= 0 ? "PAGO COMPLETO" : `SALDO: $${saldo.toLocaleString("es-CO")}`;
    }
    return `
      <div class="label">
        <div class="header">Rótulo de Envío</div>
        <div class="row"><span class="lbl">Destinatario:</span> <span class="val">${o.client_name}</span></div>
        <div class="row"><span class="lbl">Cédula/NIT:</span> <span class="val">${o.client_nit || "—"}</span></div>
        <div class="row"><span class="lbl">Ciudad:</span> <span class="val">${o.client_city || "—"}</span></div>
        <div class="row"><span class="lbl">Dirección:</span> <span class="val">${o.client_address || "—"}</span></div>
        <div class="row"><span class="lbl">Celular:</span> <span class="val">${o.client_phone || "—"}</span></div>
        <div class="divider"></div>
        <div class="row"><span class="lbl">Producto:</span> <span class="val">${o.product}</span></div>
        <div class="row"><span class="lbl">Unidades:</span> <span class="val">${o.quantity}</span></div>
        <div class="row pago"><span class="lbl">Pago:</span> <span class="val">${pagoInfo}</span></div>
        ${o.observations ? `<div class="row obs"><span class="lbl">Obs:</span> <span class="val">${o.observations}</span></div>` : ""}
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
    .label { width: 10cm; height: 10cm; border: 2px solid #000; padding: 8mm; page-break-after: always; display: flex; flex-direction: column; justify-content: center; }
    .label:last-child { page-break-after: auto; }
    .header { text-align: center; font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px; letter-spacing: 1px; }
    .row { font-size: 11px; margin-bottom: 3px; line-height: 1.3; }
    .lbl { font-weight: bold; text-transform: uppercase; color: #333; }
    .val { font-weight: 600; }
    .divider { border-top: 1px dashed #999; margin: 4px 0; }
    .pago { font-size: 12px; font-weight: bold; margin-top: 2px; }
    .obs { font-size: 10px; font-style: italic; color: #555; }
    @media print { body { margin: 0; } }
  </style></head><body>${labelsHtml}
  <script>window.onload=()=>{window.print();}</script>
  </body></html>`);
  printWindow.document.close();
  toast.success("Rótulos generados", { description: `${orders.length} rótulo(s) listo(s) para imprimir/guardar como PDF.` });
}

const Logistica = () => {
  const { role } = useAuth();
  const isLogisticsOrAdmin = role === "logistica" || role === "admin";
  const canEdit = canEditSection(role, "/logistica");
  const { data: allOrders = [] } = useOrders();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
        </TabsList>

        <TabsContent value="ready">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg">Pedidos listos para despacho</CardTitle>
              <div className="flex gap-2">
                {selectedIds.size > 0 && (
                  <Button variant="outline" size="sm" onClick={() => generateLabelsForOrders(readyOrders.filter(o => selectedIds.has(o.id)))}>
                    <FileImage className="h-4 w-4 mr-2" /> Descargar rótulos ({selectedIds.size})
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
              {readyOrders.length === 0 ? (
                <EmptyState icon={<Package className="h-12 w-12 mb-3 opacity-40" />} title="No hay pedidos listos para despacho" subtitle="Los pedidos aparecerán aquí cuando estén listos y pagados." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={readyOrders.length > 0 && readyOrders.every(o => selectedIds.has(o.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(new Set(readyOrders.map(o => o.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readyOrders.map((order) => (
                      <TableRow key={order.id} className={selectedIds.has(order.id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(order.id)}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedIds);
                              if (checked) next.add(order.id);
                              else next.delete(order.id);
                              setSelectedIds(next);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{order.client_name}</TableCell>
                        <TableCell><Badge variant={order.brand === "magical" ? "default" : "secondary"}>{brandLabel(order.brand)}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{saleLabel(order.sale_type)}</Badge></TableCell>
                        <TableCell>{order.product}</TableCell>
                        <TableCell className="text-right font-medium">{order.quantity.toLocaleString()}</TableCell>
                        <TableCell><PaymentBadge order={order} /></TableCell>
                        <TableCell className="text-right space-x-2">
                          <ShippingLabelDialog clientName={order.client_name} />
                          {canEdit && <DispatchDialog order={order} />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader><CardTitle className="text-lg">Pedidos recién montados — Pendientes de despacho</CardTitle></CardHeader>
            <CardContent>
              {pendingOrders.length === 0 ? (
                <EmptyState icon={<AlertTriangle className="h-12 w-12 mb-3 opacity-40" />} title="No hay pedidos pendientes" subtitle="Los pedidos al por mayor aparecerán aquí hasta que producción los apruebe y estén pagados." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead>Fecha creación</TableHead>
                      <TableHead>Fecha entrega est.</TableHead>
                      <TableHead>Antigüedad</TableHead>
                      <TableHead>Estado producción</TableHead>
                      <TableHead>Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders.map((order) => {
                      const createdDate = new Date(order.created_at);
                      const aging = differenceInDays(new Date(), createdDate);
                      const paid = order.payment_complete || (order.total_amount && order.abono && Number(order.abono) >= Number(order.total_amount));
                      return (
                        <TableRow key={order.id} className={paid ? "" : "opacity-60"}>
                          <TableCell className="font-medium">{order.client_name}</TableCell>
                          <TableCell><Badge variant={order.brand === "magical" ? "default" : "secondary"}>{brandLabel(order.brand)}</Badge></TableCell>
                          <TableCell>{order.product}</TableCell>
                          <TableCell className="text-right font-medium">{order.quantity.toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{format(createdDate, "dd MMM yyyy", { locale: es })}</TableCell>
                          <TableCell className="text-sm">
                            {order.delivery_date ? (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                {format(new Date(order.delivery_date), "dd MMM yyyy", { locale: es })}
                              </span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell><AgingBadge days={aging} /></TableCell>
                          <TableCell><ProductionStatusBadge status={order.production_status} order={order} /></TableCell>
                          <TableCell><PaymentBadge order={order} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatched">
          <Card>
            <CardHeader><CardTitle className="text-lg">Pedidos despachados</CardTitle></CardHeader>
            <CardContent>
              {dispatchedOrders.length === 0 ? (
                <EmptyState icon={<CheckCircle2 className="h-12 w-12 mb-3 opacity-40" />} title="No hay pedidos despachados aún" subtitle="Los pedidos despachados aparecerán en este historial." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead>Transportadora</TableHead>
                      <TableHead>Guía</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead>Fecha despacho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatchedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.client_name}</TableCell>
                        <TableCell><Badge variant={order.brand === "magical" ? "default" : "secondary"}>{brandLabel(order.brand)}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{saleLabel(order.sale_type)}</Badge></TableCell>
                        <TableCell>{order.product}</TableCell>
                        <TableCell className="text-right font-medium">{order.quantity.toLocaleString()}</TableCell>
                        <TableCell>{order.transportadora || "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{order.numero_guia || "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{order.dispatch_notes || "—"}</TableCell>
                        <TableCell>{order.dispatched_at || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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

function DispatchDialog({ order }: { order: Order }) {
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
      const path = `guias/${order.id}_${Date.now()}.${ext}`;
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
    }).eq("id", order.id);

    setUploading(false);

    if (error) {
      toast.error("Error al despachar", { description: error.message });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["orders"] });
    toast.success("Pedido despachado", { description: `Pedido de ${order.client_name} marcado como despachado.` });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar despacho</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Pedido de <span className="font-semibold text-foreground">{order.client_name}</span> — {order.quantity} uds de {order.product}
        </p>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Transportadora</Label>
            <Select value={transportadora} onValueChange={setTransportadora}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar transportadora" />
              </SelectTrigger>
              <SelectContent>
                {TRANSPORTADORAS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

export default Logistica;
