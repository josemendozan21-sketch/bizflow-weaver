/**
 * Frío / Térmico of an inventory movement. Entradas carry it in the name
 * ("Pocket (Frío)"); salidas and reservas store only the base name, so the
 * linked stock item's product_type is used instead.
 */
export type MovementTipo = "Frío" | "Térmico";

export const TIPO_SUFFIX = /\s*\((Frío|Frio|Térmico|Termico|Calor)\)\s*/i;

const normalize = (raw: string): MovementTipo | null => {
  const t = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (t === "frio") return "Frío";
  if (t === "termico" || t === "calor") return "Térmico";
  return null;
};

export function movementTipo(m: {
  item_name: string;
  stock_item?: { product_type: string | null } | null;
}): MovementTipo | null {
  const fromName = m.item_name.match(TIPO_SUFFIX);
  if (fromName) return normalize(fromName[1]);
  return normalize(m.stock_item?.product_type || "");
}

/** Item name without the "(Frío)" / "(Térmico)" suffix, for showing the tipo apart. */
export function stripTipoSuffix(name: string): string {
  return name.replace(TIPO_SUFFIX, " ").trim();
}
