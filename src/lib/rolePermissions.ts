import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Define which routes each role can access
const ROLE_ROUTES: Record<AppRole, string[]> = {
  admin: ["/", "/ventas", "/inventarios", "/diseno-logos", "/produccion", "/logistica", "/contabilidad"],
  asesor_comercial: ["/", "/ventas", "/diseno-logos"],
  produccion: ["/", "/produccion", "/inventarios"],
};

export function canAccessRoute(role: AppRole | null, path: string): boolean {
  if (!role) return false;
  return ROLE_ROUTES[role].includes(path);
}

export function getAllowedRoutes(role: AppRole | null): string[] {
  if (!role) return [];
  return ROLE_ROUTES[role];
}

export function getRoleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    admin: "Administrador",
    asesor_comercial: "Asesor Comercial",
    produccion: "Producción",
  };
  return labels[role];
}
