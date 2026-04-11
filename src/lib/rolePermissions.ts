import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Define which routes each role can access
const ROLE_ROUTES: Record<AppRole, string[]> = {
  admin: ["/", "/ventas", "/inventarios", "/diseno-logos", "/produccion", "/logistica", "/contabilidad", "/admin-usuarios", "/costos", "/eventos"],
  asesor_comercial: ["/ventas", "/inventarios", "/diseno-logos", "/logistica", "/contabilidad", "/eventos"],
  produccion: ["/produccion", "/inventarios"],
  contabilidad: ["/contabilidad"],
  estampacion: ["/diseno-logos", "/produccion"],
  usuario_visual: ["/ventas", "/inventarios", "/diseno-logos", "/produccion", "/logistica", "/contabilidad", "/eventos"],
  disenador: ["/diseno-logos"],
  logistica: ["/logistica"],
};

// Sections where the role can edit (create, update, delete)
const ROLE_EDIT_SECTIONS: Record<AppRole, string[]> = {
  admin: ["/", "/ventas", "/inventarios", "/diseno-logos", "/produccion", "/logistica", "/contabilidad", "/admin-usuarios", "/costos", "/eventos"],
  asesor_comercial: ["/ventas", "/diseno-logos"],
  produccion: ["/produccion", "/inventarios"],
  contabilidad: [],
  estampacion: ["/produccion", "/diseno-logos"],
  usuario_visual: [],
  disenador: ["/diseno-logos"],
  logistica: ["/logistica"],
};

export function canAccessRoute(role: AppRole | null, path: string): boolean {
  if (!role) return false;
  return ROLE_ROUTES[role].includes(path);
}

export function canEditSection(role: AppRole | null, path: string): boolean {
  if (!role) return false;
  return ROLE_EDIT_SECTIONS[role].includes(path);
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
    contabilidad: "Contabilidad",
    estampacion: "Estampación",
    usuario_visual: "Usuario Visual",
    disenador: "Diseñador",
    logistica: "Logística",
  };
  return labels[role];
}
