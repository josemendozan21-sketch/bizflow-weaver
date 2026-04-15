import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Download, Clock, FileText, ExternalLink, BarChart3, Wallet, Trash2 } from "lucide-react";
import AccountingDashboard from "@/components/contabilidad/AccountingDashboard";
import CajaMenor from "@/components/contabilidad/CajaMenor";
import { useOrders, type Order } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { exportOrdersToExcel } from "@/lib/exportSiigo";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAccountingAlerts } from "@/hooks/useAccountingAlerts";
import type { AccountingOrder } from "@/stores/accountingStore";

function toAccountingOrder(o: Order): AccountingOrder {
  return {
    id: o.id,
    clientName: o.client_name,
    brand: o.brand as "magical" | "sweatspot",
    product: o.product,
    quantity: o.quantity,
    saleType: o.sale_type as "mayor" | "menor",
    clientType: o.sale_type === "mayor" ? "Cliente empresa" : "Venta mostrador",
    createdAt: o.created_at?.slice(0, 10) ?? "",
    totalAmount: o.total_amount ?? undefined,
    abono: o.abono ?? undefined,
    hasRut: !!o.client_nit,
    email: o.client_email ?? undefined,
    cedula: o.client_nit ?? undefined,
    direccion: o.client_address ?? undefined,
    ciudad: o.client_city ?? undefined,
    observaciones: o.observations ?? undefined,
    status: (o.invoice_status as "pendiente" | "facturado") ?? "pendiente",
    invoiceNumber: o.invoice_number ?? undefined,
    invoiceDate: o.invoice_date ?? undefined,
    invoiceAmount: o.invoice_amount ?? undefined,
    invoiceNotes: o.invoice_notes ?? undefined,
    dispatchedAt: o.dispatched_at ?? undefined,
    transportadora: o.transportadora ?? undefined,
    numeroGuia: o.numero_guia ?? undefined,
  };
}

function canInvoice(o: Order): boolean {
  if (o.sale_type === "menor") return !!o.payment_complete;
  if (o.sale_type === "mayor") return !!o.client_nit;
  return false;
}

function getBlockReason(o: Order): string | null {
  if (o.sale_type === "menor" && !o.payment_complete) return "Pendiente de pago completo";
  if (o.sale_type === "mayor" && !o.client_nit) return "Falta adjuntar RUT del cliente";
  return null;
}

const UploadInvoiceButton = ({ order, onUploaded }: { order: Order; onUploaded: () => void }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${order.id}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("invoice-files")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("invoice-files").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          invoice_status: "facturado",
          invoice_file_url: urlData.publicUrl,
          invoice_date: new Date().toISOString().slice(0, 10),
        })
        .eq("id", order.id);
      if (updateError) throw updateError;

      toast.success("Factura adjuntada correctamente");
      onUploaded();
    } catch (err: any) {
      toast.error("Error al subir factura", { description: err.message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.pdf,.doc,.docx" className="hidden" onChange={handleFile} />
      <Button size="sm" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
        <Upload className="h-4 w-4 mr-1" />
        {uploading ? "Subiendo..." : "Adjuntar factura"}
      </Button>
    </>
  );
};

const OrderCard = ({ order, actionSlot }: { order: Order; actionSlot?: React.ReactNode }) => {
  const isMayor = order.sale_type === "mayor";
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{order.client_name}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={order.brand === "magical" ? "default" : "secondary"}>
                {order.brand === "magical" ? "Magical Warmers" : "Sweatspot"}
              </Badge>
              <Badge variant={isMayor ? "default" : "outline"}>
                {isMayor ? "Al por mayor" : "Al por menor"}
              </Badge>
            </div>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{order.created_at?.slice(0, 10)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Producto: </span><span className="font-medium">{order.product}</span></div>
          <div><span className="text-muted-foreground">Cantidad: </span><span className="font-medium">{order.quantity}</span></div>
          <div><span className="text-muted-foreground">Total: </span><span className="font-bold">${order.total_amount?.toLocaleString() ?? "—"}</span></div>
          {isMayor && order.abono != null && order.abono > 0 && (
            <div><span className="text-muted-foreground">Abono: </span><span className="font-medium">${order.abono.toLocaleString()}</span></div>
          )}
          {order.client_email && <div><span className="text-muted-foreground">Email: </span><span className="font-medium">{order.client_email}</span></div>}
          {order.client_nit && <div><span className="text-muted-foreground">{isMayor ? "RUT" : "Cédula"}: </span><span className="font-medium">{order.client_nit}</span></div>}
          {order.client_address && <div className="col-span-2"><span className="text-muted-foreground">Dirección: </span><span className="font-medium">{order.client_address}</span></div>}
          {order.client_city && <div><span className="text-muted-foreground">Ciudad: </span><span className="font-medium">{order.client_city}</span></div>}
          {(order as any).is_recompra && (
            <div className="col-span-2">
              <Badge variant="outline" className="border-primary text-primary">🔄 Recompra</Badge>
            </div>
          )}
        </div>

        {/* Payment proof from initial payment */}
        {order.payment_proof_url && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="h-4 w-4" />
              <span className="font-medium">Soporte de pago adjunto</span>
            </div>
            <a href={order.payment_proof_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                <ExternalLink className="h-3 w-3" /> Ver soporte
              </Button>
            </a>
          </div>
        )}

        {order.observations && (
          <p className="text-sm text-muted-foreground border-t pt-2">{order.observations}</p>
        )}
        {actionSlot && <div className="border-t pt-3">{actionSlot}</div>}
      </CardContent>
    </Card>
  );
};

const Contabilidad = () => {
  const { role } = useAuth();
  const isReadOnly = role === "asesor_comercial";
  const { data: allOrders = [], isLoading } = useOrders();
  const queryClient = useQueryClient();
  const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set());
  const [selectedInvoiced, setSelectedInvoiced] = useState<Set<string>>(new Set());

  // Realtime popup alerts for new orders
  useAccountingAlerts();

  const pending = allOrders.filter((o) => o.invoice_status === "pendiente");
  const invoiced = allOrders.filter((o) => o.invoice_status === "facturado");

  const toggleSelection = (id: string, set: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  const toggleAllPending = () => {
    setSelectedPending(selectedPending.size === pending.length ? new Set() : new Set(pending.map((o) => o.id)));
  };

  const toggleAllInvoiced = () => {
    setSelectedInvoiced(selectedInvoiced.size === invoiced.length ? new Set() : new Set(invoiced.map((o) => o.id)));
  };

  const handleExportSingle = (order: Order) => {
    exportOrdersToExcel([toAccountingOrder(order)], `siigo_${order.client_name.replace(/\s+/g, "_")}_${order.created_at?.slice(0, 10)}.xlsx`);
    toast.success("Archivo exportado");
  };

  const handleExportSelected = (ids: Set<string>, label: string) => {
    const selected = allOrders.filter((o) => ids.has(o.id)).map(toAccountingOrder);
    if (selected.length === 0) { toast.error("Selecciona al menos un pedido."); return; }
    exportOrdersToExcel(selected, `siigo_${label}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${selected.length} pedido(s) exportados`);
  };

  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: ["orders"] });

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.")) return;
    try {
      // Delete related production orders first
      await supabase.from("production_orders").delete().eq("order_id", orderId);
      await supabase.from("logo_requests").delete().eq("id", orderId);
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
      toast.success("Pedido eliminado");
      refreshOrders();
    } catch (err: any) {
      toast.error("Error al eliminar", { description: err.message });
    }
  };

  const handleDeleteSelected = async (ids: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    if (!confirm(`¿Eliminar ${ids.size} pedido(s)? Esta acción no se puede deshacer.`)) return;
    try {
      for (const id of ids) {
        await supabase.from("production_orders").delete().eq("order_id", id);
      }
      const { error } = await supabase.from("orders").delete().in("id", Array.from(ids));
      if (error) throw error;
      toast.success(`${ids.size} pedido(s) eliminados`);
      setter(new Set());
      refreshOrders();
    } catch (err: any) {
      toast.error("Error al eliminar", { description: err.message });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando pedidos...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contabilidad</h1>
        <p className="text-muted-foreground">Facturación y control de pedidos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total pedidos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{allOrders.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">{pending.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Facturados</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{invoiced.length}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue={isReadOnly ? "pendientes" : "dashboard"}>
        <TabsList>
          {!isReadOnly && <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />Dashboard</TabsTrigger>}
          <TabsTrigger value="pendientes">Pendientes ({pending.length})</TabsTrigger>
          <TabsTrigger value="facturados">Facturados ({invoiced.length})</TabsTrigger>
          {!isReadOnly && <TabsTrigger value="caja_menor"><Wallet className="h-4 w-4 mr-1" />Caja menor</TabsTrigger>}
        </TabsList>

        {!isReadOnly && (
          <TabsContent value="dashboard">
            <AccountingDashboard orders={allOrders} />
          </TabsContent>
        )}

        <TabsContent value="pendientes">
          {pending.length === 0 ? (
            <Card><CardContent className="pt-6"><p className="text-muted-foreground text-center py-8">No hay pedidos pendientes por facturar.</p></CardContent></Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox checked={selectedPending.size === pending.length && pending.length > 0} onCheckedChange={toggleAllPending} />
                  <span className="text-sm text-muted-foreground">{selectedPending.size > 0 ? `${selectedPending.size} seleccionado(s)` : "Seleccionar todos"}</span>
                </div>
                {selectedPending.size > 0 && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleExportSelected(selectedPending, "pendientes")}>
                      <Download className="h-4 w-4 mr-1" />Exportar selección ({selectedPending.size})
                    </Button>
                    {role === "admin" && (
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteSelected(selectedPending, setSelectedPending)}>
                        <Trash2 className="h-4 w-4 mr-1" />Eliminar selección ({selectedPending.size})
                      </Button>
                    )}
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pending.map((order) => {
                  const blocked = !canInvoice(order);
                  const reason = getBlockReason(order);
                  return (
                    <div key={order.id} className="relative">
                      <div className="absolute top-4 right-4 z-10">
                        <Checkbox checked={selectedPending.has(order.id)} onCheckedChange={() => toggleSelection(order.id, selectedPending, setSelectedPending)} />
                      </div>
                      <OrderCard
                        order={order}
                        actionSlot={
                          <div className="space-y-2">
                            {blocked && reason && (
                              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-md p-2">
                                <Clock className="h-4 w-4 shrink-0" />
                                <span>{reason}</span>
                              </div>
                            )}
                            <div className="flex gap-2">
                              {!isReadOnly && !blocked && (
                                <div className="flex-1">
                                  <UploadInvoiceButton order={order} onUploaded={refreshOrders} />
                                </div>
                              )}
                              <Button size="sm" variant="outline" onClick={() => handleExportSingle(order)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              {role === "admin" && (
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteOrder(order.id)} title="Eliminar pedido">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="facturados">
          {invoiced.length === 0 ? (
            <Card><CardContent className="pt-6"><p className="text-muted-foreground text-center py-8">No hay pedidos facturados aún.</p></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={selectedInvoiced.size === invoiced.length && invoiced.length > 0} onCheckedChange={toggleAllInvoiced} />
                    <span className="text-sm text-muted-foreground">{selectedInvoiced.size > 0 ? `${selectedInvoiced.size} seleccionado(s)` : "Seleccionar todos"}</span>
                  </div>
                  {selectedInvoiced.size > 0 && (
                    <Button size="sm" variant="outline" onClick={() => handleExportSelected(selectedInvoiced, "facturados")}>
                      <Download className="h-4 w-4 mr-1" />Exportar selección ({selectedInvoiced.size})
                    </Button>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cant.</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiced.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell><Checkbox checked={selectedInvoiced.has(order.id)} onCheckedChange={() => toggleSelection(order.id, selectedInvoiced, setSelectedInvoiced)} /></TableCell>
                        <TableCell className="font-medium">{order.client_name}</TableCell>
                        <TableCell>
                          <Badge variant={order.sale_type === "mayor" ? "default" : "outline"}>
                            {order.sale_type === "mayor" ? "Mayor" : "Menor"}
                          </Badge>
                        </TableCell>
                        <TableCell>${order.total_amount?.toLocaleString() ?? "—"}</TableCell>
                        <TableCell>{order.invoice_date}</TableCell>
                        <TableCell>{order.product}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>
                          {order.invoice_file_url ? (
                            <a href={order.invoice_file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                              <FileText className="h-4 w-4" />Descargar
                            </a>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleExportSingle(order)} title="Exportar SIIGO">
                              <Download className="h-4 w-4" />
                            </Button>
                            {role === "admin" && (
                              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteOrder(order.id)} title="Eliminar pedido">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {!isReadOnly && (
          <TabsContent value="caja_menor">
            <CajaMenor />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Contabilidad;
