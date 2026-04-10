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
import { FileText, CheckCircle, Download } from "lucide-react";
import { useAccountingStore, type AccountingOrder } from "@/stores/accountingStore";
import OrderDetailCard from "@/components/contabilidad/OrderDetailCard";
import { exportOrdersToExcel } from "@/lib/exportSiigo";
import { toast } from "sonner";

const InvoiceDialog = ({ order, onConfirm }: { order: AccountingOrder; onConfirm: (id: string, data: { invoiceNumber: string; invoiceAmount: number; invoiceNotes?: string }) => void }) => {
  const [open, setOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState(order.totalAmount?.toString() || "");
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
          Cliente: <span className="font-semibold text-foreground">{order.clientName}</span>
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

const Contabilidad = () => {
  const { role } = useAuth();
  const isReadOnly = role === "asesor_comercial";
  const { orders, markInvoiced } = useAccountingStore();
  const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set());
  const [selectedInvoiced, setSelectedInvoiced] = useState<Set<string>>(new Set());

  const pending = orders.filter((o) => o.status === "pendiente");
  const invoiced = orders.filter((o) => o.status === "facturado");

  const toggleSelection = (id: string, set: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  const toggleAllPending = () => {
    if (selectedPending.size === pending.length) {
      setSelectedPending(new Set());
    } else {
      setSelectedPending(new Set(pending.map((o) => o.id)));
    }
  };

  const toggleAllInvoiced = () => {
    if (selectedInvoiced.size === invoiced.length) {
      setSelectedInvoiced(new Set());
    } else {
      setSelectedInvoiced(new Set(invoiced.map((o) => o.id)));
    }
  };

  const handleExportSingle = (order: AccountingOrder) => {
    exportOrdersToExcel([order], `siigo_${order.clientName.replace(/\s+/g, "_")}_${order.createdAt}.xlsx`);
    toast.success("Archivo exportado", { description: `Pedido de ${order.clientName} exportado.` });
  };

  const handleExportSelected = (ids: Set<string>, label: string) => {
    const selected = orders.filter((o) => ids.has(o.id));
    if (selected.length === 0) {
      toast.error("Sin selección", { description: "Selecciona al menos un pedido para exportar." });
      return;
    }
    exportOrdersToExcel(selected, `siigo_${label}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Archivo exportado", { description: `${selected.length} pedido(s) exportados.` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contabilidad</h1>
        <p className="text-muted-foreground">Facturación y control de pedidos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total pedidos</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{orders.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">{pending.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Facturados</CardTitle>
          </CardHeader>
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
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center py-8">No hay pedidos pendientes por facturar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedPending.size === pending.length && pending.length > 0}
                    onCheckedChange={toggleAllPending}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedPending.size > 0 ? `${selectedPending.size} seleccionado(s)` : "Seleccionar todos"}
                  </span>
                </div>
                {selectedPending.size > 0 && (
                  <Button size="sm" variant="outline" onClick={() => handleExportSelected(selectedPending, "pendientes")}>
                    <Download className="h-4 w-4 mr-1" />
                    Exportar selección ({selectedPending.size})
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pending.map((order) => (
                  <div key={order.id} className="relative">
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                      <Checkbox
                        checked={selectedPending.has(order.id)}
                        onCheckedChange={() => toggleSelection(order.id, selectedPending, setSelectedPending)}
                      />
                    </div>
                    <OrderDetailCard
                      order={order}
                      actionSlot={
                        <div className="flex gap-2">
                          {!isReadOnly && (
                            <div className="flex-1">
                              <InvoiceDialog order={order} onConfirm={markInvoiced} />
                            </div>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleExportSingle(order)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="facturados">
          {invoiced.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center py-8">No hay pedidos facturados aún.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedInvoiced.size === invoiced.length && invoiced.length > 0}
                      onCheckedChange={toggleAllInvoiced}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedInvoiced.size > 0 ? `${selectedInvoiced.size} seleccionado(s)` : "Seleccionar todos"}
                    </span>
                  </div>
                  {selectedInvoiced.size > 0 && (
                    <Button size="sm" variant="outline" onClick={() => handleExportSelected(selectedInvoiced, "facturados")}>
                      <Download className="h-4 w-4 mr-1" />
                      Exportar selección ({selectedInvoiced.size})
                    </Button>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Clasificación</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead>Monto facturado</TableHead>
                      <TableHead>Fecha factura</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiced.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedInvoiced.has(order.id)}
                            onCheckedChange={() => toggleSelection(order.id, selectedInvoiced, setSelectedInvoiced)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{order.clientName}</TableCell>
                        <TableCell>
                          <Badge variant={order.clientType === "Cliente empresa" ? "default" : "outline"}>
                            {order.clientType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{order.invoiceNumber}</TableCell>
                        <TableCell>${order.invoiceAmount?.toLocaleString()}</TableCell>
                        <TableCell>{order.invoiceDate}</TableCell>
                        <TableCell>{order.product}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{order.invoiceNotes}</TableCell>
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
