import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { PackageCheck } from "lucide-react";
import DeliveryProgressBadge from "@/components/common/DeliveryProgressBadge";
import PartialDeliveryDialog from "@/components/common/PartialDeliveryDialog";

interface PartialDeliveryControlProps {
  order: {
    id: string;
    order_code?: string | null;
    client_name?: string | null;
    product?: string | null;
    quantity: number;
    delivered_quantity?: number | null;
  };
  /** Fuerza mostrar/ocultar el botón; por defecto depende del rol */
  showButton?: boolean;
  compact?: boolean;
}

/**
 * Badge de avance + acceso al diálogo de entregas parciales.
 * Se usa en Ventas, Inventarios, Producción, Logística y Contabilidad.
 */
export default function PartialDeliveryControl({
  order,
  showButton,
  compact = true,
}: PartialDeliveryControlProps) {
  const [open, setOpen] = useState(false);
  const { role } = useAuth();
  const canManage = ["admin", "inventarios", "logistica", "produccion"].includes(role ?? "");
  const visible = showButton ?? canManage;
  const delivered = Number(order.delivered_quantity) || 0;

  return (
    <>
      <span className="inline-flex items-center gap-1">
        <DeliveryProgressBadge quantity={order.quantity} delivered={delivered} compact={compact} />
        {visible && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[11px] gap-1"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          >
            <PackageCheck className="h-3 w-3" />
            {delivered > 0 ? "Entregas" : "Entrega parcial"}
          </Button>
        )}
      </span>
      {open && (
        <PartialDeliveryDialog
          open={open}
          onOpenChange={setOpen}
          orderId={order.id}
          orderCode={order.order_code}
          clientName={order.client_name}
          product={order.product}
          quantity={Number(order.quantity) || 0}
        />
      )}
    </>
  );
}
