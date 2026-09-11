import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Truck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import {
  getOrderBalance,
  getOrderPaidAmount,
  getOrderShippingDue,
  type Order,
} from "@/hooks/useOrders";

const money = (n: number) => `$${(Number(n) || 0).toLocaleString("es-CO")}`;

interface Props {
  order: Order;
  /** Muestra solo lectura (sin controles) */
  readOnly?: boolean;
}

/**
 * Gestión del costo de envío de un pedido: contraentrega, por cobrar
 * (se suma al saldo) o ya incluido en los anticipos (solo informativo).
 */
export function OrderShippingPanel({ order, readOnly }: Props) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const canEdit =
    !readOnly &&
    (role === "admin" ||
      role === "contabilidad" ||
      (role === "asesor_comercial" && order.advisor_id === user?.id));

  const mode = order.shipping_payment_mode || "pendiente";
  const [cod, setCod] = useState(mode === "contraentrega");
  const [inAdvances, setInAdvances] = useState(mode === "incluido_anticipos");
  const [amount, setAmount] = useState<string>(
    order.shipping_cost != null && Number(order.shipping_cost) > 0 ? String(order.shipping_cost) : "",
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const m = order.shipping_payment_mode || "pendiente";
    setCod(m === "contraentrega");
    setInAdvances(m === "incluido_anticipos");
    setAmount(order.shipping_cost != null && Number(order.shipping_cost) > 0 ? String(order.shipping_cost) : "");
    setDirty(false);
  }, [order.shipping_payment_mode, order.shipping_cost]);

  const productDue = Math.max((Number(order.total_amount) || 0) - getOrderPaidAmount(order), 0);
  const shippingDue = getOrderShippingDue(order);
  const balance = getOrderBalance(order);

  const persist = async (nextCod: boolean, nextInAdvances: boolean, nextAmount: string) => {
    setSaving(true);
    const value = nextCod ? 0 : Math.max(parseFloat(nextAmount) || 0, 0);
    const nextMode = nextCod
      ? "contraentrega"
      : nextInAdvances
        ? "incluido_anticipos"
        : value > 0
          ? "por_cobrar"
          : "pendiente";
    const { error } = await supabase
      .from("orders")
      .update({
        shipping_cost: value,
        shipping_payment_mode: nextMode,
        shipping_set_at: new Date().toISOString(),
        shipping_set_by_name:
          (user?.user_metadata as { display_name?: string } | undefined)?.display_name || user?.email || null,
      } as never)
      .eq("id", order.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar el envío", { description: error.message });
      return;
    }
    setDirty(false);
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["order-detail"] });
    toast.success("Envío guardado");
  };

  const handleSave = () => persist(cod, inAdvances, amount);

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-sky-700" />
        <p className="text-xs font-semibold text-sky-900">Envío del pedido</p>
      </div>

      {canEdit ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={cod}
              onCheckedChange={(v) => {
                const next = v === true;
                setCod(next);
                if (next) setInAdvances(false);
                void persist(next, next ? false : inAdvances, next ? "" : amount);
              }}
            />
            <span>Pago contraentrega (el cliente le paga el flete a la transportadora)</span>
          </label>

          {!cod && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`ship-${order.id}`} className="text-xs">
                  Valor del envío
                </Label>
                <Input
                  id={`ship-${order.id}`}
                  type="number"
                  min={0}
                  placeholder="0"
                  className="h-8 w-full sm:w-48"
                  value={amount}
                  onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setDirty(true);
                  }}
                  onBlur={() => {
                    if (dirty) void persist(cod, inAdvances, amount);
                  }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={inAdvances}
                  onCheckedChange={(v) => {
                    const next = v === true;
                    setInAdvances(next);
                    void persist(cod, next, amount);
                  }}
                />
                <span>El valor del envío ya fue incluido en los anticipos</span>
              </label>
            </>
          )}

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Guardar envío
            </Button>
            {dirty && !saving && (
              <span className="text-[11px] font-medium text-amber-700">Cambios sin guardar</span>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">Productos pendientes</div>
          <div className="font-medium">{money(productDue)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Envío</div>
          <div className="font-medium">
            {mode === "contraentrega"
              ? "Contraentrega"
              : `${money(Number(order.shipping_cost) || 0)}${
                  mode === "incluido_anticipos" ? " (ya pagado en anticipos)" : shippingDue > 0 ? " (por cobrar)" : ""
                }`}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Saldo total</div>
          <div className={`font-medium ${balance > 0 ? "text-destructive" : "text-green-700"}`}>{money(balance)}</div>
        </div>
      </div>

      {order.shipping_set_by_name && (
        <p className="text-[11px] text-muted-foreground">Registrado por {order.shipping_set_by_name}</p>
      )}
    </div>
  );
}

export default OrderShippingPanel;
