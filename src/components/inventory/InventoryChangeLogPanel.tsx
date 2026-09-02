import { useMemo } from "react";
import ChangeLogPanel, { type ChangeLogRow } from "@/components/shared/ChangeLogPanel";
import { useInventoryAuditLog, type InventoryAuditEntry } from "@/hooks/useInventoryAuditLog";

const FIELD_LABEL: Record<string, string> = {
  available: "Cantidad disponible",
  in_process: "En proceso",
  name: "Nombre",
  referencia: "Referencia",
  brand: "Marca",
  category: "Categoría",
  product_type: "Tipo",
  min_stock: "Stock mínimo",
  unit: "Unidad",
  color: "Color",
  logo: "Marcación (logo)",
  sweatspot_category: "Categoría Sweatspot",
};

const CATEGORY_LABEL: Record<string, string> = {
  materia_prima: "Materia prima",
  cuerpos_referencias: "Cuerpos",
  producto_terminado: "Producto terminado",
  importados: "Importados",
};

const BRAND_LABEL: Record<string, string> = {
  magical_warmers: "Magical Warmers",
  magical: "Magical Warmers",
  sweatspot: "Sweatspot",
  ambas: "Ambas",
};

const label = (map: Record<string, string>, v?: string | null) =>
  (v && (map[v] ?? map[v.toLowerCase()])) || v || "—";

export default function InventoryChangeLogPanel({ category }: { category?: string } = {}) {
  const { data: allEntries = [], isLoading } = useInventoryAuditLog();
  const entries = useMemo(
    () => (category ? allEntries.filter((e) => e.category === category) : allEntries),
    [allEntries, category],
  );


  // Una misma edición de cuerpos Magical se registra dos veces (stock_items y su
  // espejo body_stock). Colapsamos esos pares en una sola línea.
  const deduped = useMemo(() => {
    const map = new Map<string, InventoryAuditEntry>();
    for (const e of entries) {
      const key = [e.changed_at, e.changed_by_email ?? "", (e.brand ?? "").toLowerCase(), e.action, e.field, e.old_value ?? "", e.new_value ?? ""].join("|");
      const prev = map.get(key);
      if (!prev) { map.set(key, e); continue; }
      if (prev.table_name !== "stock_items" && e.table_name === "stock_items") map.set(key, e);
    }
    return Array.from(map.values());
  }, [entries]);

  const byId = useMemo(() => new Map(deduped.map((e) => [e.id, e])), [deduped]);

  const rows: ChangeLogRow[] = useMemo(
    () =>
      deduped.map((e) => ({
        id: e.id,
        changed_at: e.changed_at,
        changed_by_email: e.changed_by_email,
        action: e.action,
        entity: e.item_name || "—",
        entity_note: e.product_type,
        context: `${label(BRAND_LABEL, e.brand)} · ${label(CATEGORY_LABEL, e.category)}`,
        field: e.field,
        old_value: e.old_value,
        new_value: e.new_value,
      })),
    [deduped],
  );

  const filters = useMemo(
    () => [
      {
        label: "Marca",
        options: { magical_warmers: "Magical Warmers", sweatspot: "Sweatspot", ambas: "Ambas" },
        get: (r: ChangeLogRow) => {
          const b = (byId.get(r.id)?.brand ?? "").toLowerCase();
          return b === "magical" ? "magical_warmers" : b;
        },
      },
      {
        label: "Categoría",
        options: CATEGORY_LABEL,
        get: (r: ChangeLogRow) => byId.get(r.id)?.category,
      },
    ],
    [byId],
  );

  return (
    <ChangeLogPanel
      rows={rows}
      isLoading={isLoading}
      fieldLabels={FIELD_LABEL}
      entityHeader="Producto"
      contextHeader="Marca / Categoría"
      filters={filters}
      exportFileName="historial_cambios_inventario"
      searchPlaceholder="Ej: Gafas, inventarios1..."
    />
  );
}
