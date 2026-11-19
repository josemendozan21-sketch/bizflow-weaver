import { supabase } from "@/integrations/supabase/client";

/**
 * Un pedido con logo solo entra a Producción cuando Diseño y la asesora aprueban
 * el logo (del pedido o de otra línea del mismo envío). El sistema lo exige al
 * crear la orden de producción; estas funciones permiten avisarlo antes, sin
 * mover inventario ni dejar entregas a medias.
 */
const APPROVED = ["aprobado", "finalizado"];

export function logoPendingLabel(status: string): string {
  if (status === "pendiente_diseno") return "Logo pendiente en Diseño";
  if (status === "ajustes_solicitados") return "Diseño está ajustando el logo";
  return "Esperando que la asesora apruebe el logo";
}

export const LOGO_BLOCK_MESSAGE =
  "No se puede enviar a producción hasta que Diseño y la asesora aprueben el logo.";

/** Mapa order_id -> estado del logo que aún bloquea (solo pedidos bloqueados). */
export async function fetchLogoPendingByOrder(orderIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const ids = Array.from(new Set(orderIds.filter(Boolean)));
  if (ids.length === 0) return result;

  const groupOf = new Map<string, string>(); // order_id -> clave de grupo (envío o el propio pedido)
  const subs = new Set<string>();
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, submission_id")
      .in("id", ids.slice(i, i + 150));
    if (error) throw error;
    (data ?? []).forEach((r: { id: string; submission_id: string | null }) => {
      groupOf.set(r.id, r.submission_id || r.id);
      if (r.submission_id) subs.add(r.submission_id);
    });
  }
  const subList = Array.from(subs);
  for (let i = 0; i < subList.length; i += 100) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, submission_id")
      .in("submission_id", subList.slice(i, i + 100));
    if (error) throw error;
    (data ?? []).forEach((r: { id: string; submission_id: string | null }) => {
      if (r.submission_id) groupOf.set(r.id, r.submission_id);
    });
  }

  const pendingByGroup = new Map<string, string>();
  const all = Array.from(groupOf.keys());
  for (let i = 0; i < all.length; i += 150) {
    const { data, error } = await supabase
      .from("logo_requests")
      .select("order_id, status")
      .in("order_id", all.slice(i, i + 150))
      .not("status", "in", `(${APPROVED.join(",")})`);
    if (error) throw error;
    (data ?? []).forEach((lr: { order_id: string | null; status: string }) => {
      const g = lr.order_id ? groupOf.get(lr.order_id) : undefined;
      if (g) pendingByGroup.set(g, lr.status);
    });
  }
  ids.forEach((id) => {
    const st = pendingByGroup.get(groupOf.get(id) ?? id);
    if (st) result.set(id, st);
  });
  return result;
}

/** Lanza un error claro si el logo del pedido aún no está aprobado. Úsalo antes de mover inventario. */
export async function assertLogoApproved(orderId: string): Promise<void> {
  const map = await fetchLogoPendingByOrder([orderId]);
  const st = map.get(orderId);
  if (st) throw new Error(`${logoPendingLabel(st)}. ${LOGO_BLOCK_MESSAGE}`);
}
