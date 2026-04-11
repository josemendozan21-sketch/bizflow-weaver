import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, CheckCircle, Download, AlertCircle, Clock } from "lucide-react";
import { useOrders, type Order } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { exportOrdersToExcel } from "@/lib/exportSiigo";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { AccountingOrder } from "@/stores/accountingStore";

/** Map a Supabase Order to the AccountingOrder shape used by the export util */
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

/** Determines if an order can be invoiced */
function canInvoice(o: Order): boolean {
  // Al por menor: solo si está pago
  if (o.sale_type === "menor") {
    return !!o.payment_complete;
  }
  // Al por mayor: se factura de inmediato si tiene RUT
  if (o.sale_type === "mayor") {
    return !!o.client_nit;
  }
  return false;
}

function getBlockReason(o: Order): string | null {
  if (o.sale_type === "menor" && !o.payment_complete) {
    return "Pendiente de pago completo";
  }
  if (o.sale_type === "mayor" && !o.client_nit) {
    return "Falta adjuntar RUT del cliente";
  }
  return null;
}

const InvoiceDialog = ({ order, onConfirm }: { order: Order; onConfirm: (id: string, data: { invoiceNumber: string; invoiceAmount: number; invoiceNotes?: string }) => void }) => {
  const [open, setOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState(order.total_amount?.toString() || "");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  const handleConfirm = () => {
    onConfirm(order.id, {
      invoiceNumber,
      invoiceAmount: parseFloat(invoiceAmount),
      invoiceNotes,
    });
    setOpen(false);
    setInvoiceNumber("");
    setInvoiceAmount("");
    setInvoiceNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full">
          <FileText className="h-4 w-4 mr-1" />
          Facturar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar factura</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cliente: <span className="font-semibold text-foreground">{order.client_name}</span>
        </p>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Número de factura</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Ej: FAC-001" />
          </div>
          <div className="space-y-1.5">
            <Label>Monto total ($)</Label>
            <Input type="number" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} placeholder="Ej: 150000" />
          </div>
          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <Textarea value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)} placeholder="Observaciones de facturación" rows={2} />
          </div>
          <Button className="w-full" onClick={handleConfirm} disabled={!invoiceNumber.trim() || !invoiceAmount.trim()}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Marcar como facturado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
        </div>
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

  const pending = allOrders.filter((o) => o.invoice_status === "pendiente");
  const invoiced = allOrders.filter((o) => o.invoice_status === "facturado");

  const handleMarkInvoiced = async (id: string, data: { invoiceNumber: string; invoiceAmount: number; invoiceNotes?: string }) => {
    const { error } = await supabase
      .from("orders")
      .update({
        invoice_status: "facturado",
        invoice_number: data.invoiceNumber,
        invoice_amount: data.invoiceAmount,
        invoice_notes: data.invoiceNotes || "",
        invoice_date: new Date().toISOString().slice(0, 10),
      })
      .eq("id", id);

    if (error) {
      toast.error("Error al facturar", { description: error.message });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    toast.success("Pedido facturado correctamente");
  };

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
    const acc = toAccountingOrder(order);
    exportOrdersToExcel([acc], `siigo_${order.client_name.replace(/\s+/g, "_")}_${order.created_at?.slice(0, 10)}.xlsx`);
    toast.success("Archivo exportado");
  };

  const handleExportSelected = (ids: Set<string>, label: string) => {
    const selected = allOrders.filter((o) => ids.has(o.id)).map(toAccountingOrder);
    if (selected.length === 0) {
      toast.error("Selecciona al menos un pedido para exportar.");
      return;
    }
    exportOrdersToExcel(selected, `siigo_${label}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${selected.length} pedido(s) exportados`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando pedidos...</div>;
  }

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

      <Tabs defaultValue="pendientes">
        <TabsList>
          <TabsTrigger value="pendientes">Pendientes por facturar ({pending.length})</TabsTrigger>
          <TabsTrigger value="facturados">Facturados ({invoiced.length})</TabsTrigger>
        </TabsList>

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
                  <Button size="sm" variant="outline" onClick={() => handleExportSelected(selectedPending, "pendientes")}>
                    <Download className="h-4 w-4 mr-1" />Exportar selección ({selectedPending.size})
                  </Button>
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
                                  <InvoiceDialog order={order} onConfirm={handleMarkInvoiced} />
                                </div>
                              )}
                              <Button size="sm" variant="outline" onClick={() => handleExportSingle(order)}>
                                <Download className="h-4 w-4" />
                              </Button>
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
                      <TableHead>Factura</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cant.</TableHead>
                      <TableHead>Notas</TableHead>
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
                        <TableCell className="font-mono">{order.invoice_number}</TableCell>
                        <TableCell>${order.invoice_amount?.toLocaleString()}</TableCell>
                        <TableCell>{order.invoice_date}</TableCell>
                        <TableCell>{order.product}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{order.invoice_notes}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => handleExportSingle(order)} title="Exportar pedido">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Contabilidad;
