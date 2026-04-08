import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, CheckCircle } from "lucide-react";
import { useAccountingStore, type AccountingOrder } from "@/stores/accountingStore";
import OrderDetailCard from "@/components/contabilidad/OrderDetailCard";

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
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Ej: FAC-001"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Monto total ($)</Label>
            <Input
              type="number"
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(e.target.value)}
              placeholder="Ej: 150000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              placeholder="Observaciones de facturación"
              rows={2}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleConfirm}
            disabled={!invoiceNumber.trim() || !invoiceAmount.trim()}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Marcar como facturado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Contabilidad = () => {
  const { orders, markInvoiced } = useAccountingStore();

  const pending = orders.filter((o) => o.status === "pendiente");
  const invoiced = orders.filter((o) => o.status === "facturado");

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
          <CardContent>
            <p className="text-2xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Facturados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{invoiced.length}</p>
          </CardContent>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pending.map((order) => (
                <OrderDetailCard
                  key={order.id}
                  order={order}
                  actionSlot={<InvoiceDialog order={order} onConfirm={markInvoiced} />}
                />
              ))}
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
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Clasificación</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead>Monto facturado</TableHead>
                      <TableHead>Fecha factura</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiced.map((order) => (
                      <TableRow key={order.id}>
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
