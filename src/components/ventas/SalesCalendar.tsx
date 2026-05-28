import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrderBalance, getOrderPaidAmount, useOrders } from "@/hooks/useOrders";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Truck, DollarSign, Loader2 } from "lucide-react";

const fmt = (n: number) => `$${(n || 0).toLocaleString("es-CO")}`;

const CHANNEL_LABELS: Record<string, string> = {
  nequi: "Nequi",
  bancolombia: "Bancolombia",
  davivienda: "Davivienda",
  link_pago: "Link de pago",
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  paypal: "PayPal",
  otro: "Otro",
};

function extractChannel(obs: string | null | undefined): string | null {
  if (!obs) return null;
  const m = obs.match(/Medio de pago:\s*([^|]+)/i);
  if (!m) return null;
  const raw = m[1].trim().toLowerCase();
  return CHANNEL_LABELS[raw] || m[1].trim();
}

export function SalesCalendar() {
  const { data: orders = [], isLoading } = useOrders();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Date>(new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = useMemo(() => {
    const arr: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      arr.push(d);
      d = addDays(d, 1);
    }
    return arr;
  }, [gridStart, gridEnd]);

  const ordersByDay = useMemo(() => {
    const map = new Map<string, typeof orders>();
    for (const o of orders) {
      const dateStr = (o as any).payment_date || format(new Date(o.created_at), "yyyy-MM-dd");
      const k = dateStr.length >= 10 ? dateStr.slice(0, 10) : format(new Date(o.created_at), "yyyy-MM-dd");
      const list = map.get(k) || [];
      list.push(o);
      map.set(k, list);
    }
    return map;
  }, [orders]);

  const dayStats = (d: Date) => {
    const list = ordersByDay.get(format(d, "yyyy-MM-dd")) || [];
    let total = 0,
      abonado = 0,
      contraEntrega = 0;
    for (const o of list) {
      total += Number(o.total_amount || 0);
      abonado += getOrderPaidAmount(o);
      if (o.payment_method === "contra_entrega") contraEntrega += 1;
    }
    return { count: list.length, total, abonado, saldo: Math.max(total - abonado, 0), contraEntrega, list };
  };

  const monthStats = useMemo(() => {
    let total = 0,
      abonado = 0,
      contraEntrega = 0,
      pedidos = 0;
    for (const o of orders) {
      const dateStr = (o as any).payment_date || format(new Date(o.created_at), "yyyy-MM-dd");
      const d = new Date(dateStr.length >= 10 ? dateStr.slice(0, 10) : o.created_at);
      if (d < monthStart || d > monthEnd) continue;
      pedidos += 1;
      total += Number(o.total_amount || 0);
      abonado += getOrderPaidAmount(o);
      if (o.payment_method === "contra_entrega") contraEntrega += 1;
    }
    return { total, abonado, saldo: Math.max(total - abonado, 0), contraEntrega, pedidos };
  }, [orders, monthStart, monthEnd]);

  const selectedStats = dayStats(selected);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="space-y-4">
      {/* Month summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Pedidos del mes</p>
          <p className="text-lg font-bold">{monthStats.pedidos}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Total ventas</p>
          <p className="text-lg font-bold">{fmt(monthStats.total)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Abonado</p>
          <p className="text-lg font-bold text-green-600">{fmt(monthStats.abonado)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
          <p className="text-lg font-bold text-destructive">{fmt(monthStats.saldo)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Button variant="outline" size="sm" onClick={() => setCursor(subMonths(cursor, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold capitalize">
              {format(cursor, "MMMM yyyy", { locale: es })}
            </h3>
            <Button variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((w) => (
              <div key={w} className="text-center text-xs text-muted-foreground font-medium py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const s = dayStats(d);
              const inMonth = isSameMonth(d, cursor);
              const isSel = isSameDay(d, selected);
              const isToday = isSameDay(d, new Date());
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelected(d)}
                  className={`min-h-[68px] rounded-md border p-1.5 text-left transition-colors ${
                    isSel ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  } ${!inMonth ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>
                      {format(d, "d")}
                    </span>
                    {s.count > 0 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        {s.count}
                      </Badge>
                    )}
                  </div>
                  {s.count > 0 && (
                    <div className="mt-1 space-y-0.5">
                      <div className="text-[10px] font-semibold leading-tight">{fmt(s.total)}</div>
                      {s.saldo > 0 && (
                        <div className="text-[10px] text-destructive leading-tight">
                          Saldo {fmt(s.saldo)}
                        </div>
                      )}
                      {s.contraEntrega > 0 && (
                        <div className="flex items-center gap-0.5 text-[10px] text-blue-600">
                          <Truck className="h-2.5 w-2.5" /> {s.contraEntrega}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day detail */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold capitalize">
              {format(selected, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{selectedStats.count} pedidos</Badge>
              <Badge variant="secondary" className="gap-1">
                <DollarSign className="h-3 w-3" /> {fmt(selectedStats.total)}
              </Badge>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                Abonado {fmt(selectedStats.abonado)}
              </Badge>
              {selectedStats.saldo > 0 && (
                <Badge variant="destructive">Saldo {fmt(selectedStats.saldo)}</Badge>
              )}
              {selectedStats.contraEntrega > 0 && (
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1">
                  <Truck className="h-3 w-3" /> {selectedStats.contraEntrega} contra entrega
                </Badge>
              )}
            </div>
          </div>

          {selectedStats.list.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay pedidos este día.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="pb-2 font-medium">Cliente</th>
                    <th className="pb-2 font-medium">Asesor</th>
                    <th className="pb-2 font-medium">Producto</th>
                    <th className="pb-2 font-medium">Pago</th>
                    <th className="pb-2 font-medium">Cuenta / Medio</th>
                    <th className="pb-2 font-medium">Fecha pago</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-right">Abono</th>
                    <th className="pb-2 font-medium text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStats.list.map((o) => {
                    const total = Number(o.total_amount || 0);
                    const abono = getOrderPaidAmount(o);
                    const saldo = getOrderBalance(o);
                    const isCE = o.payment_method === "contra_entrega";
                    const channel = extractChannel(o.observations) || (o.payment_method && !["contra_entrega","pagado","obsequio"].includes(o.payment_method) ? o.payment_method : null);
                    const isPaid = !!o.payment_complete || (Number(o.abono) || 0) > 0 || o.payment_method === "pagado" || o.payment_method === "obsequio";
                    const sameDay = isSameDay(new Date(o.created_at), selected);
                    const pagoLabel = isCE
                      ? "—"
                      : !isPaid
                        ? "Sin pago"
                        : sameDay
                          ? "Pago del día"
                          : `Pago previo (${format(new Date(o.created_at), "d MMM", { locale: es })})`;
                    const pagoClass = isCE
                      ? "text-muted-foreground"
                      : !isPaid
                        ? "text-destructive"
                        : sameDay
                          ? "text-green-700"
                          : "text-amber-700";
                    return (
                      <tr key={o.id} className="border-b last:border-0">
                        <td className="py-2">{o.client_name}</td>
                        <td className="py-2 text-xs text-muted-foreground">{o.advisor_name || "—"}</td>
                        <td className="py-2 text-muted-foreground">
                          {o.product} <span className="text-xs">×{o.quantity}</span>
                        </td>
                        <td className="py-2">
                          {isCE ? (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1">
                              <Truck className="h-3 w-3" /> Contra entrega
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {o.payment_method || "—"}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-xs">{channel || <span className="text-muted-foreground">—</span>}</td>
                        <td className={`py-2 text-xs font-medium ${pagoClass}`}>{pagoLabel}</td>
                        <td className="py-2 text-right">{fmt(total)}</td>
                        <td className="py-2 text-right text-green-600">{fmt(abono)}</td>
                        <td className="py-2 text-right font-medium text-destructive">
                          {saldo > 0 ? fmt(saldo) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td colSpan={6} className="py-2 text-right">Totales:</td>
                    <td className="py-2 text-right">{fmt(selectedStats.total)}</td>
                    <td className="py-2 text-right text-green-600">{fmt(selectedStats.abonado)}</td>
                    <td className="py-2 text-right text-destructive">{fmt(selectedStats.saldo)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}