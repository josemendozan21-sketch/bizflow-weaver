import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PartialDeliveryControl from "@/components/common/PartialDeliveryControl";

interface Props {
  /** id del pedido de ventas asociado a la orden de producción */
  orderId?: string | null;
  orderCode?: string | null;
  clientName?: string | null;
  product?: string | null;
  /** cantidad de la orden de producción (respaldo si no se encuentra el pedido) */
  quantity: number;
}

/**
 * Avance de entregas + entrega parcial dentro de los tableros de producción
 * (Magical Warmers y Sweatspot). Comparte una sola consulta entre todas las tarjetas.
 */
export default function ProductionDeliveryControl({
  orderId,
  orderCode,
  clientName,
  product,
  quantity,
}: Props) {
  const { data: progress } = useQuery({
    queryKey: ["orders-delivery-progress"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, quantity, delivered_quantity")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      const map = new Map<string, { quantity: number; delivered: number }>();
      (data ?? []).forEach((o: any) => {
        map.set(o.id, { quantity: Number(o.quantity) || 0, delivered: Number(o.delivered_quantity) || 0 });
      });
      return map;
    },
  });

  if (!orderId) return null;
  const row = progress?.get(orderId);

  return (
    <PartialDeliveryControl
      order={{
        id: orderId,
        order_code: orderCode,
        client_name: clientName,
        product,
        quantity: row?.quantity ?? quantity,
        delivered_quantity: row?.delivered ?? 0,
      }}
    />
  );
}
