import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCustomer, useCustomerSales, useUpdateCustomer, SPORT_OPTIONS } from "@/hooks/useCustomers";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ShoppingBag, TrendingUp, Calendar, Sparkles, Coins } from "lucide-react";

type Props = { customerId: string | null; onOpenChange: (open: boolean) => void };
const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

export function CustomerProfileDialog({ customerId, onOpenChange }: Props) {
  const { data: customer } = useCustomer(customerId);
  const { data: sales = [] } = useCustomerSales(customerId);
  const update = useUpdateCustomer();
  const [edit, setEdit] = useState<any>(null);

  useEffect(() => {
    if (customer) setEdit({ ...customer });
  }, [customer?.id]);

  if (!customer || !edit) return null;

  const last = customer.last_purchase_at
    ? Math.floor((Date.now() - new Date(customer.last_purchase_at).getTime()) / 86400000)
    : null;

  const save = async () => {
    try {
      await update.mutateAsync({
        id: customer.id,
        full_name: edit.full_name,
        document: edit.document,
        phone: edit.phone,
        email: edit.email,
        city: edit.city,
        address: edit.address,
        birth_date: edit.birth_date,
        sport: edit.sport,
        notes: edit.notes,
      });
      toast.success("Cliente actualizado");
    } catch (e: any) {
      toast.error(e.message ?? "Error al guardar");
    }
  };

  return (
    <Dialog open={!!customerId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {customer.full_name}
            <Badge variant={customer.status === "activo" ? "default" : "secondary"}>{customer.status}</Badge>
            <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />{customer.tier}</Badge>
            {customer.sport && <Badge variant="outline">{customer.sport}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Card className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Compras</p>
            <p className="text-lg font-bold flex items-center gap-1"><ShoppingBag className="h-4 w-4" />{customer.purchase_count}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Total gastado</p>
            <p className="text-lg font-bold">{fmt(Number(customer.total_spent))}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Ticket prom.</p>
            <p className="text-lg font-bold flex items-center gap-1"><TrendingUp className="h-4 w-4" />{fmt(Number(customer.avg_ticket))}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Última compra</p>
            <p className="text-lg font-bold flex items-center gap-1"><Calendar className="h-4 w-4" />{last == null ? "—" : last === 0 ? "Hoy" : `${last}d`}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Puntos</p>
            <p className="text-lg font-bold flex items-center gap-1"><Coins className="h-4 w-4" />{customer.points_current}</p>
          </Card>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="historial">Historial ({sales.length})</TabsTrigger>
            <TabsTrigger value="fidelizacion">Fidelización</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nombre completo</Label>
                <Input value={edit.full_name ?? ""} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} />
              </div>
              <div><Label>Cédula / NIT</Label><Input value={edit.document ?? ""} onChange={(e) => setEdit({ ...edit, document: e.target.value })} /></div>
              <div><Label>Teléfono</Label><Input value={edit.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
              <div><Label>Ciudad</Label><Input value={edit.city ?? ""} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></div>
              <div className="col-span-2"><Label>Dirección</Label><Input value={edit.address ?? ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
              <div><Label>Fecha de nacimiento</Label><Input type="date" value={edit.birth_date ?? ""} onChange={(e) => setEdit({ ...edit, birth_date: e.target.value })} /></div>
              <div>
                <Label>Deporte principal</Label>
                <Select value={edit.sport ?? ""} onValueChange={(v) => setEdit({ ...edit, sport: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{SPORT_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Notas</Label><Input value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
              <div className="col-span-2 text-[11px] text-muted-foreground">
                Registrado: {new Date(customer.created_at).toLocaleDateString()} · Código de referido: <code>{customer.referral_code}</code>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <Button onClick={save} disabled={update.isPending}>{update.isPending ? "Guardando…" : "Guardar cambios"}</Button>
            </div>
          </TabsContent>

          <TabsContent value="historial">
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin compras registradas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{new Date(s.sale_date).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">
                        {s.items.length === 0 ? <span className="text-muted-foreground">—</span> : (
                          <ul className="space-y-0.5">
                            {s.items.map((it: any, i: number) => (
                              <li key={i}>{it.quantity} × {it.product_name} <span className="text-muted-foreground">({fmt(Number(it.line_total))})</span></li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                      <TableCell className="text-xs capitalize">{s.payment_method}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(Number(s.total_amount))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="fidelizacion">
            <div className="text-center py-8 space-y-2">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">Programa de puntos — próximamente</p>
              <p className="text-xs text-muted-foreground">
                Acumulados: {customer.points_accumulated} pts · Disponibles: {customer.points_current} pts · Nivel: {customer.tier}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}