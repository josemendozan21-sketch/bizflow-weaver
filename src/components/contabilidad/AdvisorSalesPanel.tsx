import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { startOfMonth, endOfMonth, isWithinInterval, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { getOrderBalance, getOrderPaidAmount, isOrderFullyPaid, type Order } from "@/hooks/useOrders";

interface Props {
  orders: Order[];
}

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString("es-CO")}`;
}

export default function AdvisorSalesPanel({ orders }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [scope, setScope] = useState<"mes" | "rango" | "todo">("mes");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [advisorFilter, setAdvisorFilter] = useState<string>("__all__");
  const [paymentFilter, setPaymentFilter] = useState<"todos" | "pagados" | "pendientes">("todos");
  const [dateBasis, setDateBasis] = useState<"pedido" | "factura">("pedido");

  const refDate = (o: Order) =>
    dateBasis === "factura" ? o.invoice_date || o.created_at : o.created_at;

  const years = useMemo(() => {
    const set = new Set<number>();
    orders.forEach((o) => {
      const d = o.created_at;
      if (d) set.add(new Date(d).getFullYear());
    });
    set.add(now.getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [orders]);

  const advisors = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      const id = o.advisor_id || "—";
      if (!map.has(id)) map.set(id, o.advisor_name || "Sin asesor");
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders;

    if (scope === "mes") {
      const start = startOfMonth(new Date(year, month, 1));
      const end = endOfMonth(new Date(year, month, 1));
      list = list.filter((o) => {
        const ref = refDate(o);
        if (!ref) return false;
        const d = typeof ref === "string" ? parseISO(ref) : new Date(ref);
        return isWithinInterval(d, { start, end });
      });
    } else if (scope === "rango" && (dateFrom || dateTo)) {
      const start = dateFrom ? parseISO(dateFrom) : new Date(0);
      const end = dateTo ? parseISO(dateTo + "T23:59:59") : new Date(8640000000000000);
      list = list.filter((o) => {
        const ref = refDate(o);
        if (!ref) return false;
        const d = typeof ref === "string" ? parseISO(ref) : new Date(ref);
        return d >= start && d <= end;
      });
    }

    if (advisorFilter !== "__all__") {
      list = list.filter((o) => (o.advisor_id || "—") === advisorFilter);
    }

    if (paymentFilter === "pagados") {
      list = list.filter(isOrderFullyPaid);
    } else if (paymentFilter === "pendientes") {
      list = list.filter((o) => getOrderBalance(o) > 0 && !isOrderFullyPaid(o));
    }

    return list;
  }, [orders, year, month, scope, dateFrom, dateTo, advisorFilter, paymentFilter, dateBasis]);

  const summary = useMemo(() => {
    const map = new Map<
      string,
      {
        advisorId: string;
        advisorName: string;
        ordersCount: number;
        invoicedCount: number;
        totalSold: number;
        totalInvoiced: number;
        totalAbonado: number;
        saldoPendiente: number;
        ventaMayor: number;
        ventaMenor: number;
      }
    >();

    for (const o of filtered) {
      const key = o.advisor_id || "—";
      const total = Number(o.total_amount || 0);
      const abono = getOrderPaidAmount(o);
      const cur = map.get(key) || {
        advisorId: key,
        advisorName: o.advisor_name || "Sin asesor",
        ordersCount: 0,
        invoicedCount: 0,
        totalSold: 0,
        totalInvoiced: 0,
        totalAbonado: 0,
        saldoPendiente: 0,
        ventaMayor: 0,
        ventaMenor: 0,
      };
      cur.ordersCount += 1;
      cur.totalSold += total;
      cur.totalAbonado += abono;
      if (o.invoice_status === "facturado") {
        cur.invoicedCount += 1;
        cur.totalInvoiced += Number(o.invoice_amount || total);
      }
      cur.saldoPendiente += getOrderBalance(o);
      if (o.sale_type === "mayor") cur.ventaMayor += total;
      else cur.ventaMenor += total;
      map.set(key, cur);
    }

    return Array.from(map.values()).sort((a, b) => b.totalSold - a.totalSold);
  }, [filtered]);

  const totals = useMemo(() => {
    return summary.reduce(
      (acc, s) => {
        acc.orders += s.ordersCount;
        acc.invoiced += s.invoicedCount;
        acc.sold += s.totalSold;
        acc.invoicedAmt += s.totalInvoiced;
        acc.pending += s.saldoPendiente;
        return acc;
      },
      { orders: 0, invoiced: 0, sold: 0, invoicedAmt: 0, pending: 0 }
    );
  }, [summary]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Ventas por asesor</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {scope === "mes"
                  ? `Periodo: ${format(new Date(year, month, 1), "MMMM yyyy", { locale: es })}`
                  : scope === "rango"
                  ? `Periodo: ${dateFrom || "inicio"} → ${dateTo || "hoy"}`
                  : "Periodo: Todos los pedidos"}
                {" · "}
                {dateBasis === "pedido" ? "por fecha de pedido" : "por fecha de factura"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={dateBasis} onValueChange={(v) => setDateBasis(v as "pedido" | "factura")}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pedido">Fecha de pedido</SelectItem>
                  <SelectItem value="factura">Fecha de factura</SelectItem>
                </SelectContent>
              </Select>
              <Select value={scope} onValueChange={(v) => setScope(v as "mes" | "rango" | "todo")}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Por mes</SelectItem>
                  <SelectItem value="rango">Rango fechas</SelectItem>
                  <SelectItem value="todo">Histórico</SelectItem>
                </SelectContent>
              </Select>
              {scope === "mes" && (
                <>
                  <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {format(new Date(2024, i, 1), "MMMM", { locale: es })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              {scope === "rango" && (
                <>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[150px]"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[150px]"
                  />
                </>
              )}
              <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Asesor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los asesores</SelectItem>
                  {advisors.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as any)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los pagos</SelectItem>
                  <SelectItem value="pagados">Pagados</SelectItem>
                  <SelectItem value="pendientes">Pendientes por pagar</SelectItem>
                </SelectContent>
              </Select>
              {(advisorFilter !== "__all__" || paymentFilter !== "todos" || dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAdvisorFilter("__all__");
                    setPaymentFilter("todos");
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Pedidos</p>
              <p className="text-lg font-bold">{totals.orders}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Vendido</p>
              <p className="text-lg font-bold">{fmt(totals.sold)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Facturado</p>
              <p className="text-lg font-bold text-emerald-600">{fmt(totals.invoicedAmt)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className="text-lg font-bold text-amber-600">{fmt(totals.pending)}</p>
            </div>
          </div>

          {summary.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No hay ventas en el periodo seleccionado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asesor</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Vendido</TableHead>
                    <TableHead className="text-right">Mayor</TableHead>
                    <TableHead className="text-right">Menor</TableHead>
                    <TableHead className="text-right">Facturado</TableHead>
                    <TableHead className="text-right">Saldo pendiente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((s) => (
                    <TableRow key={s.advisorId}>
                      <TableCell className="font-medium">{s.advisorName}</TableCell>
                      <TableCell className="text-right">
                        {s.ordersCount}
                        {s.invoicedCount > 0 && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {s.invoicedCount} fact.
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{fmt(s.totalSold)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmt(s.ventaMayor)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmt(s.ventaMenor)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{fmt(s.totalInvoiced)}</TableCell>
                      <TableCell className="text-right text-amber-600">{fmt(s.saldoPendiente)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}