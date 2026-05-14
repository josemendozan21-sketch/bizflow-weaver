import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Define which routes each role can access
const ROLE_ROUTES: Record<AppRole, string[]> = {
  admin: ["/", "/ventas", "/inventarios", "/diseno-logos", "/produccion", "/logistica", "/contabilidad", "/admin-usuarios", "/costos", "/eventos", "/ferias", "/galeria", "/feria-pos", "/presupuesto"],
  // Note: admin always sees all routes; "/puntos-venta" added below in mapping just in case
  asesor_comercial: ["/ventas", "/inventarios", "/diseno-logos", "/logistica", "/contabilidad", "/eventos", "/ferias", "/galeria"],
  produccion: ["/produccion", "/inventarios", "/eventos", "/ferias", "/galeria"],
  contabilidad: ["/contabilidad", "/eventos", "/ferias", "/galeria", "/presupuesto", "/puntos-venta"],
  estampacion: ["/diseno-logos", "/produccion", "/eventos", "/ferias", "/galeria"],
  usuario_visual: ["/ventas", "/inventarios", "/diseno-logos", "/produccion", "/logistica", "/contabilidad", "/eventos", "/ferias", "/galeria"],
  disenador: ["/diseno-logos", "/eventos", "/ferias", "/galeria"],
  logistica: ["/logistica", "/eventos", "/ferias", "/galeria"],
  feria_pos: ["/feria-pos"],
  inventarios: ["/inventarios"],
  pos_punto: ["/puntos-venta"],
};

// Sections where the role can edit (create, update, delete)
const ROLE_EDIT_SECTIONS: Record<AppRole, string[]> = {
  admin: ["/", "/ventas", "/inventarios", "/diseno-logos", "/produccion", "/logistica", "/contabilidad", "/admin-usuarios", "/costos", "/eventos", "/ferias", "/presupuesto", "/puntos-venta"],
  asesor_comercial: ["/ventas", "/diseno-logos"],
  produccion: ["/produccion", "/inventarios"],
  contabilidad: ["/presupuesto"],
  estampacion: ["/produccion", "/diseno-logos"],
  usuario_visual: [],
  disenador: ["/diseno-logos"],
  logistica: ["/logistica"],
  feria_pos: ["/feria-pos"],
  inventarios: ["/inventarios"],
  pos_punto: ["/puntos-venta"],
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
    feria_pos: "Feria Punto de Venta",
    inventarios: "Inventarios",
    pos_punto: "Asesor Punto de Venta",
  };
  return labels[role];
}
