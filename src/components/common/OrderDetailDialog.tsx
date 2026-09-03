import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Package, Truck, Wallet, FileText, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";
import { PaymentsList } from "@/components/ventas/PaymentsList";
import { OrderChangeLogPanel } from "@/components/ventas/OrderChangeLogPanel";
import { useOrderDeliveries } from "@/hooks/useOrderDeliveries";
import { useOrderCharges } from "@/hooks/useOrderCharges";
import {
  getOrderBalance,
  getOrderPaidAmount,
  isOrderFullyPaid,
  PRODUCTION_STATUS_COLORS,
  PRODUCTION_STATUS_LABELS,
  type Order,
} from "@/hooks/useOrders";
import { useAuth } from "@/contexts/AuthContext";
import { getOrderViewScope, isFieldVisibleForScope } from "@/lib/orderAccess";

interface Props {
  orderId?: string;
  orderCode?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const money = (n: unknown) => `$${(Number(n) || 0).toLocaleString("es-CO")}`;
const date = (v?: string | null, withTime = false) =>
  v ? format(new Date(v), withTime ? "d MMM yyyy, h:mm a" : "d MMM yyyy", { locale: es }) : "—";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground break-words">{value ?? "—"}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </h3>
  );
}

/** Ficha de solo lectura con TODOS los detalles de un pedido. */
export default function OrderDetailDialog({ orderId, orderCode, open, onOpenChange }: Props) {
  const { role } = useAuth();
  const scope = getOrderViewScope(role);
  const designOnly = scope === "design";
  const operationsOnly = scope === "operations";
  const restricted = designOnly || operationsOnly;
  const { data: order, isLoading } = useQuery({
    queryKey: ["order-detail", orderId ?? orderCode],
    enabled: open && (!!orderId || !!orderCode),
    queryFn: async () => {
      let q = supabase.from("orders").select("*").limit(1);
      q = orderId ? q.eq("id", orderId) : q.eq("order_code", orderCode!);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as Order | null;
    },
  });

  const { deliveries } = useOrderDeliveries(open ? order?.id : undefined);
  const { data: charges = [] } = useOrderCharges(open ? order?.id : undefined);

  const total = Number(order?.total_amount) || 0;
  const paid = order ? getOrderPaidAmount(order) : 0;
  const balance = order ? getOrderBalance(order) : 0;
  const fullyPaid = order ? isOrderFullyPaid(order) : false;
  const deliveredQty =
    Number(order?.delivered_quantity) || deliveries.reduce((s, d) => s + Number(d.quantity || 0), 0);

  const logos = [
    { url: order?.logo_url, name: order?.logo_name },
    { url: order?.logo_url_2, name: order?.logo_name_2 },
  ].filter((l) => l.url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap pr-6">
            <OrderCodeBadge
              code={order?.order_code}
              lineIndex={order?.line_index}
              lineCount={order?.line_count}
            />
            <span>{order?.client_name || "Detalle del pedido"}</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading || !order ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando pedido…
              </span>
            ) : (
              "No se encontró el pedido."
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Estado */}
            <section className="space-y-3">
              <SectionTitle icon={Package}>Estado</SectionTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={PRODUCTION_STATUS_COLORS[order.production_status] || "bg-muted"}>
                  {PRODUCTION_STATUS_LABELS[order.production_status] || order.production_status}
                </Badge>
                <Badge variant="outline">{order.brand === "sweatspot" ? "Sweatspot" : "Magical Warmers"}</Badge>
                <Badge variant="outline">{order.sale_type === "menor" ? "Al detal" : "Al por mayor"}</Badge>
                {order.is_recompra && <Badge variant="secondary">Recompra</Badge>}
                {order.is_credit && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Crédito</Badge>}
                {!restricted &&
                  (fullyPaid ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pagado</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Saldo {money(balance)}</Badge>
                  ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Asesor" value={order.advisor_name} />
                <Field label="Creado" value={date(order.created_at, true)} />
                <Field label="Fecha de entrega" value={date(order.delivery_date)} />
                <Field
                  label="Entregado"
                  value={`${deliveredQty} / ${order.quantity} uds${
                    deliveredQty < order.quantity ? ` · pendiente ${order.quantity - deliveredQty}` : ""
                  }`}
                />
                <Field label="Última actualización" value={date(order.updated_at, true)} />
                <Field label="Devuelto" value={order.returned_at ? date(order.returned_at) : "—"} />
              </div>
            </section>

            <Separator />

            {/* Cliente y despacho */}
            {restricted ? (
              <section className="space-y-3">
                <SectionTitle icon={Truck}>Cliente</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Cliente" value={order.client_name} />
                  <Field label="Ciudad" value={order.client_city} />
                  {operationsOnly && <Field label="Despachado" value={date(order.dispatched_at, true)} />}
                </div>
              </section>
            ) : (
            <section className="space-y-3">
              <SectionTitle icon={Truck}>Cliente y despacho</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Cliente" value={order.client_name} />
                <Field label="NIT / CC" value={order.client_nit} />
                <Field label="Teléfono" value={order.client_phone} />
                <Field label="Email" value={order.client_email} />
                <Field label="Ciudad" value={order.client_city} />
                <Field
                  label="Dirección"
                  value={[order.client_address, order.client_address_complement].filter(Boolean).join(" — ") || "—"}
                />
                <Field label="Despachado" value={date(order.dispatched_at, true)} />
                <Field label="Transportadora" value={order.transportadora} />
                <Field label="Guía" value={order.numero_guia} />
              </div>
              {order.dispatch_notes && <Field label="Notas de despacho" value={order.dispatch_notes} />}
            </section>
            )}

            <Separator />

            {/* Producto */}
            <section className="space-y-3">
              <SectionTitle icon={Palette}>Producto</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Producto" value={order.product} />
                <Field label="Cantidad" value={`${order.quantity} uds`} />
                {!restricted && <Field label="Precio unitario" value={money(order.unit_price)} />}
                <Field label="Color de tinta" value={order.ink_color} />
                <Field label="Color de gel" value={order.gel_color} />
                <Field label="Color de silicona" value={order.silicone_color} />
              </div>
              {order.personalization && <Field label="Personalización" value={order.personalization} />}
              {order.observations && <Field label="Observaciones" value={order.observations} />}
              {logos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {logos.map((l, i) => (
                    <a
                      key={i}
                      href={l.url as string}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline"
                    >
                      {l.name || `Logo ${i + 1}`}
                    </a>
                  ))}
                </div>
              )}
            </section>

            {!restricted && (
            <>
            <Separator />

            {/* Dinero */}
            <section className="space-y-3">
              <SectionTitle icon={Wallet}>Pagos</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Total" value={<span className="font-semibold">{money(total)}</span>} />
                <Field label="Pagado" value={<span className="text-green-700 font-semibold">{money(paid)}</span>} />
                <Field
                  label="Saldo"
                  value={
                    <span className={balance > 0 ? "text-destructive font-semibold" : "text-green-700 font-semibold"}>
                      {money(balance)}
                    </span>
                  }
                />
                <Field label="Método de pago" value={order.payment_method} />
                <Field label="Vencimiento (crédito)" value={date(order.payment_due_date)} />
                <Field label="Costo de envío" value={money(order.shipping_cost)} />
              </div>
              {charges.length > 0 && (
                <div className="rounded-md border p-2 space-y-1">
                  <p className="text-xs font-medium">Cargos adicionales</p>
                  {charges.map((c) => (
                    <div key={c.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{c.concept}</span>
                      <span>{money(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <PaymentsList orderId={order.id} total={total} />
            </section>

            <Separator />

            {/* Facturación */}
            <section className="space-y-3">
              <SectionTitle icon={FileText}>Facturación</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="N° de factura" value={order.invoice_number} />
                <Field label="Estado" value={order.invoice_status} />
                <Field label="Fecha" value={date(order.invoice_date)} />
                <Field label="Valor facturado" value={money(order.invoice_amount)} />
                <Field
                  label="Archivo"
                  value={
                    order.invoice_file_url ? (
                      <a href={order.invoice_file_url} target="_blank" rel="noreferrer" className="text-primary underline">
                        Ver factura
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                {order.invoice_notes && <Field label="Notas" value={order.invoice_notes} />}
              </div>
            </section>
            </>
            )}

            {/* Entregas parciales */}
            {!restricted && deliveries.length > 0 && (
              <>
                <Separator />
                <section className="space-y-2">
                  <SectionTitle icon={Package}>Entregas parciales</SectionTitle>
                  <div className="space-y-1">
                    {deliveries.map((d) => (
                      <div key={d.id} className="flex justify-between text-xs border rounded-md px-2 py-1">
                        <span>
                          {date(d.delivered_at)} · {d.quantity} uds
                          {d.notes ? ` · ${d.notes}` : ""}
                        </span>
                        <span className="text-muted-foreground">{d.delivered_by_name || "—"}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            <OrderChangeLogPanel
              orderId={order.id}
              fieldFilter={restricted ? (f) => isFieldVisibleForScope(f, scope) : undefined}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
