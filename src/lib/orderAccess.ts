import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

/** Alcance de la información que un rol puede ver de un pedido. */
export type OrderViewScope = "full" | "design" | "none";

/** Roles con acceso completo a la ficha de cualquier pedido */
const FULL_ROLES: AppRole[] = [
  "admin",
  "contabilidad",
  "produccion",
  "estampacion",
  "logistica",
  "inventarios",
  "asesor_comercial", // ve ficha completa, pero solo de SUS pedidos (filtrado en useOrders)
];

/** Roles que solo ven la información relacionada con diseño */
const DESIGN_ROLES: AppRole[] = ["disenador"];

export function getOrderViewScope(role?: AppRole | null): OrderViewScope {
  if (!role) return "none";
  if (FULL_ROLES.includes(role)) return "full";
  if (DESIGN_ROLES.includes(role)) return "design";
  return "none";
}

/** ¿Puede el rol usar el buscador global de pedidos? */
export function canSearchOrders(role?: AppRole | null): boolean {
  return getOrderViewScope(role) !== "none";
}

/** ¿Puede el rol ver montos, pagos, facturación y despacho? */
export function canSeeOrderFinancials(role?: AppRole | null): boolean {
  return getOrderViewScope(role) === "full";
}

/** Campos del historial de cambios visibles para diseño */
const DESIGN_LOG_FIELDS = new Set([
  "production_status",
  "logo_url",
  "logo_name",
  "logo_url_2",
  "logo_name_2",
  "logo_status",
  "ink_color",
  "ink_color_2",
  "ink_color_3",
  "glitter_color",
  "gel_color",
  "silicone_color",
  "personalization",
  "product",
  "quantity",
  "observations",
]);

export function isFieldVisibleForScope(field: string, scope: OrderViewScope): boolean {
  if (scope === "full") return true;
  if (scope === "design") return DESIGN_LOG_FIELDS.has(field);
  return false;
}
