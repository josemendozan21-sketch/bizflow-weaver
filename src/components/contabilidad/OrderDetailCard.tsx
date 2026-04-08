import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, User, Building2, Mail, MapPin, CreditCard, Package } from "lucide-react";
import type { AccountingOrder } from "@/stores/accountingStore";

interface OrderDetailCardProps {
  order: AccountingOrder;
  actionSlot?: React.ReactNode;
}

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div>
        <span className="text-muted-foreground">{label}: </span>
        <span className="text-foreground font-medium">{value}</span>
      </div>
    </div>
  );
};

const OrderDetailCard = ({ order, actionSlot }: OrderDetailCardProps) => {
  const isMayor = order.saleType === "mayor";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              {isMayor ? <Building2 className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
              {order.clientName}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={order.brand === "magical" ? "default" : "secondary"}>
                {order.brand === "magical" ? "Magical Warmers" : "Sweatspot"}
              </Badge>
              <Badge variant={isMayor ? "default" : "outline"}>
                {isMayor ? "Al por mayor" : "Al por menor"}
              </Badge>
              <Badge variant={order.clientType === "Cliente empresa" ? "default" : "outline"} className={order.clientType === "Venta mostrador" ? "border-amber-500 text-amber-600" : ""}>
                {order.clientType}
              </Badge>
            </div>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{order.createdAt}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client info section */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Datos del cliente</p>
          {isMayor ? (
            <>
              <InfoRow icon={Building2} label="Empresa" value={order.clientName} />
              <InfoRow icon={FileText} label="RUT" value={order.hasRut ? "Adjunto ✓" : "No adjunto"} />
              <InfoRow icon={Mail} label="Email" value={order.email} />
              <InfoRow icon={MapPin} label="Dirección" value={order.direccion} />
              <InfoRow icon={MapPin} label="Ciudad" value={order.ciudad} />
            </>
          ) : (
            <>
              <InfoRow icon={User} label="Cliente" value={order.clientName} />
              {order.cedula && <InfoRow icon={CreditCard} label="Cédula" value={order.cedula} />}
              {order.email && <InfoRow icon={Mail} label="Email" value={order.email} />}
              <InfoRow icon={MapPin} label="Dirección" value={order.direccion || "No registrada"} />
              <InfoRow icon={MapPin} label="Ciudad" value={order.ciudad || "No registrada"} />
              <div className="text-sm">
                <span className="text-muted-foreground">Tipo: </span>
                <span className="font-medium text-foreground">
                  {order.clientType === "Venta mostrador" ? "Venta mostrador" : "Cliente normal"}
                </span>
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Product & amounts */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Producto y valores</p>
          <InfoRow icon={Package} label="Producto" value={order.product} />
          <InfoRow icon={Package} label="Cantidad" value={order.quantity?.toString()} />
          <div className="flex items-start gap-2 text-sm">
            <CreditCard className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <span className="text-muted-foreground">Valor total: </span>
              <span className="text-foreground font-bold">
                {order.totalAmount ? `$${order.totalAmount.toLocaleString()}` : "—"}
              </span>
              {isMayor && order.abono != null && order.abono > 0 && (
                <span className="text-muted-foreground ml-2">(Abono: ${order.abono.toLocaleString()})</span>
              )}
            </div>
          </div>
        </div>

        {order.observaciones && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observaciones</p>
              <p className="text-sm text-foreground">{order.observaciones}</p>
            </div>
          </>
        )}

        {actionSlot && (
          <>
            <Separator />
            <div>{actionSlot}</div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderDetailCard;
