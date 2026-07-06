import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchOrders from "./tools/search-orders";
import getInventory from "./tools/get-inventory";
import getProductionTasks from "./tools/get-production-tasks";
import getAdvisorSummary from "./tools/get-advisor-summary";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "bionovations-mcp",
  title: "Bionovations MCP",
  version: "0.1.0",
  instructions:
    "Herramientas internas de Bionovations SAS (Magical Warmers y Sweatspot). Consulta pedidos, inventario, tareas de producción y resúmenes por asesor. Los resultados respetan los permisos del usuario autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchOrders, getInventory, getProductionTasks, getAdvisorSummary],
});
