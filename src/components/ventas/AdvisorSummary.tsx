import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getOrderBalance, getOrderPaidAmount, isOrderFullyPaid, useOrders } from "@/hooks/useOrders";
import { Loader2, DollarSign, CreditCard, Truck, Clock, Wallet } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export function AdvisorSummary() {
  const { data: orders = [], isLoading } = useOrders();
  const [recaudosDia, setRecaudosDia] = useState(0);

  useEffect(() => {
    (async () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const { data } = await supabase
        .from("order_payments")
        .select("amount")
        .eq("payment_date", todayStr);
      const total = (data ?? []).reduce(
        (s: number, r: any) => s + Number(r.amount || 0),
        0,
      );
      setRecaudosDia(total);
    })();
  }, []);

  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisMonthOrders = orders.filter((o) =>
      isWithinInterval(new Date(o.created_at), { start: monthStart, end: monthEnd })
    );

    const ventasMes = thisMonthOrders.reduce(
      (sum, o) => sum + (Number(o.total_amount) || 0),
      0
    );

    const pedidosPorPagar = orders.filter(
      (o) => !isOrderFullyPaid(o) && o.sale_type === "mayor" && o.production_status !== "entregado"
    );

    const contraEntrega = orders.filter(
      (o) => o.payment_method === "contra_entrega" && o.production_status !== "entregado"
    );

    const saldoPendiente = orders.reduce((sum, o) => {
      return sum + getOrderBalance(o);
    }, 0);

    return {
      ventasMes,
      pedidosPorPagar: pedidosPorPagar.length,
      contraEntrega: contraEntrega.length,
      saldoPendiente,
      totalPedidosMes: thisMonthOrders.length,
    };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    {
      title: "Ventas del mes",
      value: `$${metrics.ventasMes.toLocaleString("es-CO")}`,
      subtitle: `${metrics.totalPedidosMes} pedido(s) en ${format(new Date(), "MMMM yyyy", { locale: es })}`,
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Recaudos del día",
      value: `$${recaudosDia.toLocaleString("es-CO")}`,
      subtitle: "Dinero efectivamente ingresado hoy (abonos y pagos completos)",
      icon: Wallet,
      color: "text-emerald-700",
      bg: "bg-emerald-100",
    },
    {
      title: "Pedidos por pagar",
      value: String(metrics.pedidosPorPagar),
      subtitle: "Pedidos al por mayor pendientes de pago completo",
      icon: CreditCard,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Contra entrega",
      value: String(metrics.contraEntrega),
      subtitle: "Pedidos con pago contra entrega activos",
      icon: Truck,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Saldo pendiente",
      value: `$${metrics.saldoPendiente.toLocaleString("es-CO")}`,
      subtitle: "Total por cobrar a clientes",
      icon: Clock,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className="text-lg font-bold text-foreground">{card.value}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail table of pending balances */}
      {orders.filter((o) => getOrderBalance(o) > 0).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3">Saldos pendientes por cliente</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Cliente</th>
                    <th className="pb-2 font-medium">Producto</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-right">Abono</th>
                    <th className="pb-2 font-medium text-right">Saldo</th>
                    <th className="pb-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {orders
                    .filter((o) => getOrderBalance(o) > 0)
                    .map((o) => {
                      const total = Number(o.total_amount) || 0;
                      const abono = getOrderPaidAmount(o);
                      const saldo = getOrderBalance(o);
                      return (
                        <tr key={o.id} className="border-b last:border-0">
                          <td className="py-2">{o.client_name}</td>
                          <td className="py-2 text-muted-foreground">{o.product}</td>
                          <td className="py-2 text-right">${total.toLocaleString("es-CO")}</td>
                          <td className="py-2 text-right">${abono.toLocaleString("es-CO")}</td>
                          <td className="py-2 text-right font-medium text-destructive">
                            ${saldo.toLocaleString("es-CO")}
                          </td>
                          <td className="py-2 text-xs text-muted-foreground">{o.production_status}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
