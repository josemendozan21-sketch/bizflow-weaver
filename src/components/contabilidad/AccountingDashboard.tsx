import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Clock, TrendingUp } from "lucide-react";
import type { Order } from "@/hooks/useOrders";
import { startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from "date-fns";

interface Props {
  orders: Order[];
}

function getAgingLabel(days: number): { label: string; color: string } {
  if (days <= 7) return { label: "< 1 semana", color: "bg-green-100 text-green-800" };
  if (days <= 14) return { label: "1-2 semanas", color: "bg-yellow-100 text-yellow-800" };
  if (days <= 30) return { label: "2-4 semanas", color: "bg-orange-100 text-orange-800" };
  return { label: `${days} días`, color: "bg-red-100 text-red-800" };
}

const AccountingDashboard = ({ orders }: Props) => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const metrics = useMemo(() => {
    const thisMonth = orders.filter((o) =>
      isWithinInterval(new Date(o.created_at), { start: monthStart, end: monthEnd })
    );

    const ventasTotales = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const ventasMes = thisMonth.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const totalCobrado = orders.reduce((s, o) => s + Number(o.abono || 0), 0);
    const saldoPendiente = ventasTotales - totalCobrado;

    // Per-advisor breakdown
    const byAdvisor = new Map<string, { name: string; total: number; cobrado: number; count: number }>();
    for (const o of orders) {
      const key = o.advisor_id;
      const prev = byAdvisor.get(key) || { name: o.advisor_name, total: 0, cobrado: 0, count: 0 };
      prev.total += Number(o.total_amount || 0);
      prev.cobrado += Number(o.abono || 0);
      prev.count += 1;
      byAdvisor.set(key, prev);
    }

    // Order aging for unpaid orders
    const aging = orders
      .filter((o) => !o.payment_complete)
      .map((o) => ({
        ...o,
        days: differenceInDays(now, new Date(o.created_at)),
      }))
      .sort((a, b) => b.days - a.days);

    return { ventasTotales, ventasMes, totalCobrado, saldoPendiente, byAdvisor: Array.from(byAdvisor.values()).sort((a, b) => b.total - a.total), aging };
  }, [orders, monthStart, monthEnd]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">${metrics.ventasTotales.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas del mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">${metrics.ventasMes.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total cobrado</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">${metrics.totalCobrado.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo pendiente</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">${metrics.saldoPendiente.toLocaleString()}</p></CardContent>
        </Card>
      </div>

      {/* Per-advisor table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" /> Ventas por asesor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asesor</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Venta total</TableHead>
                <TableHead className="text-right">Cobrado</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.byAdvisor.map((a) => (
                <TableRow key={a.name}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-right">{a.count}</TableCell>
                  <TableCell className="text-right">${a.total.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-emerald-600">${a.cobrado.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-amber-600">${(a.total - a.cobrado).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {metrics.byAdvisor.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order aging */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" /> Antigüedad de pedidos pendientes de pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.aging.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">Todos los pedidos están pagados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Asesor</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Abono</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Antigüedad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.aging.slice(0, 50).map((o) => {
                  const { label, color } = getAgingLabel(o.days);
                  const saldo = Number(o.total_amount || 0) - Number(o.abono || 0);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.client_name}</TableCell>
                      <TableCell>{o.advisor_name}</TableCell>
                      <TableCell>{o.product}</TableCell>
                      <TableCell className="text-right">${Number(o.total_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">${Number(o.abono || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold text-amber-600">${saldo.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{o.created_at?.slice(0, 10)}</TableCell>
                      <TableCell><Badge className={color}>{label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountingDashboard;
