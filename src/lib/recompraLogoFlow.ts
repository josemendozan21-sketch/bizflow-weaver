import { supabase } from "@/integrations/supabase/client";
import { logOrderChange } from "@/hooks/useOrderChangeLog";

export type LogoSource = "reutilizado" | "nuevo" | "sin_logo";

export const LOGO_SOURCE_LABEL: Record<LogoSource, string> = {
  reutilizado: "Logo reutilizado",
  nuevo: "Logo NUEVO",
  sin_logo: "Sin logo",
};

interface NotifyArgs {
  orderId: string;
  orderCode?: string | null;
  clientName: string;
  brandLabel: string;
  product: string;
  logoUrl?: string | null;
  logoSource: LogoSource;
  isRecompra: boolean;
  userId?: string | null;
  userName?: string | null;
}

/**
 * Notifica a Diseño/Estampación cuando un pedido (especialmente una recompra)
 * trae un logo nuevo o reutiliza uno anterior, y deja el registro de
 * trazabilidad en el historial de cambios del pedido.
 */
export async function notifyLogoFlow(args: NotifyArgs) {
  const {
    orderId, orderCode, clientName, brandLabel, product,
    logoUrl, logoSource, isRecompra, userId, userName,
  } = args;

  if (logoSource === "sin_logo") return;

  const codeLabel = orderCode ? `Pedido ${orderCode}` : "Nuevo pedido";
  const base = `${codeLabel} — ${clientName} · ${product} (${brandLabel})`;
  const notifications: Array<Record<string, unknown>> = [];

  if (logoSource === "nuevo") {
    if (isRecompra) {
      notifications.push({
        target_role: "disenador",
        title: "Recompra con logo actualizado",
        message: `${base}. El cliente envió un LOGO NUEVO: revise la solicitud de diseño.`,
        type: "diseno_logo",
        reference_id: orderId,
      });
    }
    notifications.push({
      target_role: "estampacion",
      title: isRecompra ? "Recompra con logo NUEVO" : "Pedido con logo nuevo",
      message:
        `${base}. Hay un archivo de logo NUEVO adjunto al pedido` +
        (isRecompra ? " — no use el archivo anterior del cliente." : "."),
      type: "diseno_logo",
      reference_id: orderId,
    });
  } else {
    notifications.push({
      target_role: "estampacion",
      title: "Recompra con el mismo logo",
      message: `${base}. Se reutiliza el logo ya aprobado; el archivo está disponible en el pedido.`,
      type: "nuevo_pedido",
      reference_id: orderId,
    });
  }

  const { error } = await supabase.from("notifications").insert(notifications as never);
  if (error) console.warn("No se pudieron crear las notificaciones de logo:", error.message);

  await logOrderChange({
    order_id: orderId,
    order_code: orderCode ?? null,
    field: "logo_source",
    old_value: null,
    new_value: `${LOGO_SOURCE_LABEL[logoSource]}${logoUrl ? ` — ${logoUrl}` : ""}`,
    changed_by: userId ?? null,
    changed_by_name: userName ?? null,
    reason: isRecompra ? "Recompra" : "Pedido nuevo",
  });
}
