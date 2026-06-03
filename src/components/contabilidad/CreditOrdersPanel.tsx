import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useOrders, getOrderBalance } from "@/hooks/useOrders";
import { PaymentsList } from "@/components/ventas/PaymentsList";
import { AddPaymentDialog } from "@/components/ventas/AddPaymentDialog";
import { differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, CreditCard } from "lucide-react";

function dueColor(dueDate: string | null | undefined): { label: string; cls: string } {
  if (!dueDate) return { label: "Sin fecha", cls: "bg-muted text-muted-foreground" };
  const days = differenceInCalendarDays(new Date(dueDate), new Date());
  if (days < 0) return { label: `Vencido ${Math.abs(days)}d`, cls: "bg-red-100 text-red-800" };
  if (days <= 3) return { label: `Vence en ${days}d`, cls: "bg-amber-100 text-amber-800" };
  if (days <= 14) return { label: `Vence en ${days}d`, cls: "bg-yellow-100 text-yellow-800" };
  return { label: `Vence en ${days}d`, cls: "bg-green-100 text-green-800" };
}

export function CreditOrdersPanel() {
  const { data: orders = [] } = useOrders();

  const creditOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.is_credit &&
          !o.payment_complete &&
          (o.production_status === "despachado" ||
            o.production_status === "entregado" ||
            o.credit_dispatched_pending_payment),
      ),
    [orders],
  );

  const totalDue = creditOrders.reduce((s, o) => s + getOrderBalance(o), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5" />
          Pedidos a crédito pendientes de cobro
          <Badge variant="outline">{creditOrders.length}</Badge>
        </CardTitle>
        {totalDue > 0 && (
          <p className="text-sm text-muted-foreground">
            Total por cobrar:{" "}
            <span className="font-semibold text-destructive">
              ${totalDue.toLocaleString("es-CO")}
            </span>
          </p>
        )}
      </CardHeader>
      <CardContent>
        {creditOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay pedidos a crédito pendientes de cobro.
          </p>
        ) : (
          <div className="space-y-2">
            {creditOrders.map((o) => {
              const balance = getOrderBalance(o);
              const due = dueColor(o.payment_due_date);
              return (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{o.client_name}</span>
                      <Badge className={`${due.cls} hover:${due.cls}`}>{due.label}</Badge>
                      {o.payment_due_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(o.payment_due_date), "d MMM yyyy", { locale: es })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {o.product} · {o.quantity} uds · {o.advisor_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className="font-semibold text-destructive">
                      ${balance.toLocaleString("es-CO")}
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        Detalle
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{o.client_name} — {o.product}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Total</p>
                            <p className="font-medium">${Number(o.total_amount).toLocaleString("es-CO")}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Pagado</p>
                            <p className="font-medium text-green-700">
                              ${Number(o.abono || 0).toLocaleString("es-CO")}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Saldo</p>
                            <p className="font-medium text-destructive">
                              ${balance.toLocaleString("es-CO")}
                            </p>
                          </div>
                        </div>
                        {o.payment_due_date && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Vence: </span>
                            <span className="font-medium">
                              {format(new Date(o.payment_due_date), "d MMM yyyy", { locale: es })}
                            </span>
                          </p>
                        )}
                        <div className="flex justify-end">
                          <AddPaymentDialog orderId={o.id} pendingBalance={balance} />
                        </div>
                        <PaymentsList orderId={o.id} total={Number(o.total_amount) || 0} />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              );
            })}
            {creditOrders.some((o) => {
              if (!o.payment_due_date) return false;
              return differenceInCalendarDays(new Date(o.payment_due_date), new Date()) < 0;
            }) && (
              <p className="text-xs text-amber-700 flex items-center gap-1 pt-2">
                <AlertTriangle className="h-3.5 w-3.5" /> Hay pedidos vencidos. Hacer seguimiento.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}