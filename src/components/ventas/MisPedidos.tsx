import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrders, PRODUCTION_STATUS_LABELS, PRODUCTION_STATUS_COLORS } from "@/hooks/useOrders";
import { Loader2, Package, Calendar, DollarSign, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function MisPedidos() {
  const { data: orders = [], isLoading } = useOrders();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No tienes pedidos registrados aún.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{orders.length} pedido(s) registrado(s)</p>
      <div className="grid gap-4 md:grid-cols-2">
        {orders.map((order) => (
          <Card key={order.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{order.client_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {order.brand === "magical" ? "Magical Warmers" : "Sweatspot"} · {order.sale_type === "mayor" ? "Al por mayor" : "Al por menor"}
                  </p>
                </div>
                <Badge className={PRODUCTION_STATUS_COLORS[order.production_status] || "bg-muted text-muted-foreground"}>
                  {PRODUCTION_STATUS_LABELS[order.production_status] || order.production_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  <span>{order.product}</span>
                </div>
                <div className="text-right font-medium">{order.quantity} uds</div>
              </div>

              {(order.total_amount ?? 0) > 0 && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>Total: ${Number(order.total_amount).toLocaleString()}</span>
                  </div>
                  {(order.abono ?? 0) > 0 && (
                    <div className="text-right text-muted-foreground">
                      Abono: ${Number(order.abono).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {order.client_city && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{order.client_city}</span>
                </div>
              )}

              {order.delivery_date && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Entrega: {format(new Date(order.delivery_date), "d MMM yyyy", { locale: es })}</span>
                </div>
              )}

              {order.logo_url && (
                <div className="text-xs text-primary">🎨 Solicitud de diseño vinculada</div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>{order.advisor_name}</span>
                <span>{format(new Date(order.created_at), "d MMM yyyy HH:mm", { locale: es })}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
