import { useMemo } from "react";
import ChangeLogPanel, { type ChangeLogRow } from "@/components/shared/ChangeLogPanel";
import { usePosProductAuditLog } from "@/hooks/usePosProductAuditLog";

const FIELD_LABEL: Record<string, string> = {
  name: "Nombre",
  brand: "Marca",
  category: "Categoría",
  sale_price: "Precio de venta",
  available: "Existencias",
  min_stock: "Stock mínimo",
  unit: "Unidad",
  active: "Activo",
};

const VALUE_FMT: Record<string, (v: string) => string> = {
  sale_price: (v) => `$${Math.round(Number(v) || 0).toLocaleString("es-CO")}`,
  active: (v) => (v === "true" ? "SÍ" : "NO"),
};

const fmtValue = (field: string | null, v: string | null) => {
  if (v === null || v === "") return null;
  const f = field ? VALUE_FMT[field] : undefined;
  return f ? f(v) : v;
};

const BASE_ACTIONS = new Set(["creacion", "edicion", "eliminacion"]);

export default function PosProductChangeLogPanel({ locationId }: { locationId: string }) {
  const { data: entries = [], isLoading } = usePosProductAuditLog(locationId);

  const rows: ChangeLogRow[] = useMemo(
    () =>
      entries.map((e) => ({
        id: e.id,
        changed_at: e.changed_at,
        changed_by_email: e.changed_by_email,
        action: BASE_ACTIONS.has(e.action) ? e.action : "edicion",
        entity: e.product_name || "—",
        entity_note: e.source === "excel" ? "desde Excel" : null,
        context: `${e.brand || "Sin marca"} · ${e.category || "Sin categoría"}`,
        field: e.field,
        old_value: fmtValue(e.field, e.old_value),
        new_value: fmtValue(e.field, e.new_value),
      })),
    [entries],
  );

  const filters = useMemo(() => {
    const brands: Record<string, string> = {};
    for (const e of entries) {
      const b = (e.brand || "Sin marca").trim();
      brands[b.toLowerCase()] = b;
    }
    return [
      {
        label: "Marca",
        options: brands,
        get: (r: ChangeLogRow) => (r.context || "").split(" · ")[0]?.toLowerCase(),
      },
    ];
  }, [entries]);

  return (
    <ChangeLogPanel
      title="Historial de cambios del catálogo"
      rows={rows}
      isLoading={isLoading}
      fieldLabels={FIELD_LABEL}
      entityHeader="Producto"
      contextHeader="Marca · Categoría"
      filters={filters}
      exportFileName="historial_catalogo_punto"
      searchPlaceholder="Buscar producto o usuario…"
    />
  );
}
