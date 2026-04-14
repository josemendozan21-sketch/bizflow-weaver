import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STAGE_LABELS: Record<string, string> = {
  produccion_cuerpos: "Producción de Cuerpos",
  estampacion: "Estampación",
  dosificacion: "Dosificación",
  sellado: "Sellado",
  recorte: "Recorte",
  empaque: "Empaque",
  produccion_tubos: "Producción de tubos",
  ensamble_cuello: "Ensamble de cuello",
  sello_base: "Sello de base",
  refile: "Refile",
  colocacion_boquilla: "Colocación de boquilla",
  listo: "Listo",
};

/**
 * Subscribes to realtime INSERT events on production_orders
 * and shows a toast popup so the production team knows which area needs attention.
 */
export function useProductionAlerts() {
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip the first render to avoid showing toasts for existing data
    if (!mountedRef.current) {
      mountedRef.current = true;
    }

    const channel = supabase
      .channel("production-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "production_orders" },
        (payload) => {
          const order = payload.new as {
            brand: string;
            client_name: string;
            quantity: number;
            current_stage: string;
            needs_cuerpos?: boolean;
            molde?: string;
            thermo_size?: string;
          };

          const brandLabel = order.brand === "magical" ? "Magical Warmers" : "Sweatspot";
          const product = order.brand === "magical" ? order.molde : `Termo ${order.thermo_size}`;
          const stage = STAGE_LABELS[order.current_stage] || order.current_stage;

          toast.info(`🏭 Nuevo pedido — ${brandLabel}`, {
            description: `${order.client_name}: ${order.quantity} uds de ${product}. Área: ${stage}`,
            duration: 8000,
            action: order.needs_cuerpos
              ? { label: "⚠️ Requiere cuerpos", onClick: () => {} }
              : undefined,
          });

          if (order.needs_cuerpos) {
            setTimeout(() => {
              toast.warning("Inventario insuficiente de cuerpos", {
                description: `Se necesita producir cuerpos (${product}) antes de avanzar.`,
                duration: 10000,
              });
            }, 1000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
