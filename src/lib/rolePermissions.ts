import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Define which routes each role can access
const ROLE_ROUTES: Record<AppRole, string[]> = {
  admin: ["/", "/ventas", "/inventarios", "/diseno-logos", "/produccion", "/logistica", "/contabilidad", "/admin-usuarios", "/costos", "/eventos", "/ferias", "/galeria", "/feria-pos", "/presupuesto", "/puntos-venta", "/personal", "/documentos", "/clientes", "/redes"],
  asesor_comercial: ["/ventas", "/inventarios", "/diseno-logos", "/logistica", "/contabilidad", "/eventos", "/ferias", "/galeria", "/documentos", "/clientes"],
  produccion: ["/produccion", "/inventarios", "/eventos", "/ferias", "/galeria", "/personal", "/documentos"],
  contabilidad: ["/contabilidad", "/eventos", "/ferias", "/galeria", "/presupuesto", "/puntos-venta", "/personal", "/documentos", "/clientes"],
  estampacion: ["/diseno-logos", "/produccion", "/eventos", "/ferias", "/galeria", "/personal", "/documentos"],
  usuario_visual: ["/ventas", "/inventarios", "/diseno-logos", "/produccion", "/logistica", "/contabilidad", "/eventos", "/ferias", "/galeria", "/documentos"],
  disenador: ["/diseno-logos", "/eventos", "/ferias", "/galeria", "/documentos", "/redes"],
  logistica: ["/logistica", "/eventos", "/ferias", "/galeria", "/personal", "/documentos"],
  feria_pos: ["/feria-pos"],
  inventarios: ["/inventarios"],
  pos_punto: ["/puntos-venta", "/clientes"],
  community_manager: ["/redes", "/eventos"],
};

// Sections where the role can edit (create, update, delete)
const ROLE_EDIT_SECTIONS: Record<AppRole, string[]> = {
  admin: ["/", "/ventas", "/inventarios", "/diseno-logos", "/produccion", "/logistica", "/contabilidad", "/admin-usuarios", "/costos", "/eventos", "/ferias", "/presupuesto", "/puntos-venta", "/personal", "/documentos", "/clientes", "/redes"],
  asesor_comercial: ["/ventas", "/diseno-logos", "/documentos", "/clientes"],
  produccion: ["/produccion", "/inventarios", "/personal"],
  contabilidad: ["/presupuesto", "/personal", "/documentos", "/clientes"],
  estampacion: ["/produccion", "/diseno-logos", "/personal"],
  usuario_visual: [],
  disenador: ["/diseno-logos", "/redes"],
  logistica: ["/logistica", "/personal"],
  feria_pos: ["/feria-pos"],
  inventarios: ["/inventarios"],
  pos_punto: ["/puntos-venta", "/clientes"],
  community_manager: ["/redes"],
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
    community_manager: "Community Manager",
  };
  return labels[role];
}
