/**
 * Facetas de inventario (de lo macro a lo micro).
 *
 * Deriva atributos navegables (categoría, tamaño, correa, logo, color, talla,
 * familia, tipo…) a partir de los datos que ya existen en `stock_items`.
 * Funciones puras: sin dependencias de React ni de la base de datos.
 */

import { normalizeText, type ReferenceItem } from "@/lib/referenceCatalog";

export interface FacetDef {
  key: string;
  label: string;
  /** Orden preferido de las opciones (las demás van alfabéticas al final). */
  order?: string[];
}

export interface FacetOption {
  value: string;
  count: number;
  units: number;
}

export interface FacetGroup extends FacetDef {
  options: FacetOption[];
}

export type FacetValues = Record<string, string | null>;
export type FacetSelection = Record<string, string | undefined>;

const titleCase = (s: string): string =>
  s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/* ------------------------------------------------------------------ */
/* Sweatspot                                                           */
/* ------------------------------------------------------------------ */

export const SWEATSPOT_FACETS: FacetDef[] = [
  { key: "categoria", label: "Categoría", order: ["Termos", "Canguros", "Accesorios", "Chalecos", "Otros"] },
  { key: "tamano", label: "Tamaño", order: ["150 ml", "250 ml", "500 ml"] },
  { key: "correa", label: "Correa", order: ["Con correa", "Sin correa"] },
  { key: "logo", label: "Logo", order: ["Con logo", "Marcable (sin logo)"] },
  { key: "origen", label: "Origen", order: ["Nacional", "Importado"] },
  { key: "color", label: "Color" },
  { key: "talla", label: "Talla", order: ["S", "M", "L", "XL"] },
];

export function sweatspotFacetValues(item: ReferenceItem): FacetValues {
  const n = normalizeText(item.name);
  const cat = normalizeText(item.sweatspotCategory || "");

  let categoria = "Otros";
  if (cat.startsWith("termos") || n.includes("termo")) categoria = "Termos";
  else if (cat.startsWith("canguro") || n.includes("canguro")) categoria = "Canguros";
  else if (cat.startsWith("accesorio")) categoria = "Accesorios";
  else if (cat.startsWith("chaleco") || n.includes("chaleco")) categoria = "Chalecos";

  let tamano: string | null = null;
  const catSize = cat.match(/termos_(\d+)/);
  const nameSize = n.match(/\b(150|250|500)\b/);
  const ml = catSize?.[1] || nameSize?.[1];
  if (ml) tamano = `${ml} ml`;

  let correa: string | null = null;
  if (categoria === "Termos") correa = n.includes("correa") ? "Con correa" : "Sin correa";

  const logo = item.logo ? "Con logo" : "Marcable (sin logo)";

  const pt = normalizeText(item.productType || "");
  const origen = pt.includes("nacional") ? "Nacional" : pt.includes("importado") ? "Importado" : null;

  const color = item.color ? titleCase(item.color) : null;

  let talla: string | null = null;
  const tallaMatch = item.name.match(/talla\s+(xl|l|m|s)\b/i) || item.name.match(/\b(XL|L|M|S)\s*$/);
  if (tallaMatch) talla = tallaMatch[1].toUpperCase();

  return { categoria, tamano, correa, logo, origen, color, talla };
}

/* ------------------------------------------------------------------ */
/* Magical Warmers                                                     */
/* ------------------------------------------------------------------ */

export const MAGICAL_FACETS: FacetDef[] = [
  { key: "familia", label: "Familia" },
  { key: "tamano", label: "Tamaño", order: ["8 cm", "12 cm", "Ojo"] },
  { key: "tipo", label: "Tipo", order: ["Frío", "Térmico"] },
];

/** "Círculo 12 cm" -> { familia: "Círculo", tamano: "12 cm" } */
export function splitMagicalName(name: string): { familia: string; tamano: string | null } {
  const clean = (name || "").trim();
  const m = clean.match(/^(.*?)\s+(\d+\s*cm|ojo)$/i);
  if (m) {
    const raw = m[2].toLowerCase();
    const size = raw === "ojo" ? "Ojo" : raw.replace(/\s*cm$/, " cm").replace(/\s+/g, " ").trim();
    return { familia: m[1].trim(), tamano: size };
  }
  return { familia: clean, tamano: null };
}

export function magicalFacetValues(item: ReferenceItem): FacetValues {
  const { familia, tamano } = splitMagicalName(item.name);
  return { familia, tamano, tipo: item.tipo };
}

/* ------------------------------------------------------------------ */
/* Motor genérico de facetas                                           */
/* ------------------------------------------------------------------ */

export function matchesSelection(
  values: FacetValues,
  selection: FacetSelection,
  ignoreKey?: string,
): boolean {
  return Object.entries(selection).every(([key, sel]) => {
    if (!sel || key === ignoreKey) return true;
    return values[key] === sel;
  });
}

function sortOptions(options: FacetOption[], order?: string[]): FacetOption[] {
  return [...options].sort((a, b) => {
    if (order) {
      const ia = order.indexOf(a.value);
      const ib = order.indexOf(b.value);
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }
    }
    return a.value.localeCompare(b.value, "es", { sensitivity: "base" });
  });
}

/**
 * Calcula las opciones disponibles de cada faceta considerando el resto de
 * filtros activos (facetas dependientes). Las opciones que quedarían en cero
 * simplemente no se muestran.
 */
export function buildFacetGroups<T>(
  items: T[],
  getValues: (item: T) => FacetValues,
  getUnits: (item: T) => number,
  defs: FacetDef[],
  selection: FacetSelection,
): FacetGroup[] {
  return defs
    .map((def) => {
      const map = new Map<string, FacetOption>();
      for (const item of items) {
        const values = getValues(item);
        if (!matchesSelection(values, selection, def.key)) continue;
        const value = values[def.key];
        if (!value) continue;
        const prev = map.get(value) || { value, count: 0, units: 0 };
        prev.count += 1;
        prev.units += getUnits(item);
        map.set(value, prev);
      }
      return { ...def, options: sortOptions([...map.values()], def.order) };
    })
    .filter((g) => g.options.length > 1 || (g.options.length === 1 && selection[g.key]));
}

/** Faceta por la que conviene agrupar: la primera (macro) que aún no se filtró. */
export function pickGroupKey(groups: FacetGroup[], selection: FacetSelection): string | null {
  const candidate = groups.find((g) => !selection[g.key] && g.options.length > 1);
  return candidate ? candidate.key : null;
}

export function countActiveFilters(selection: FacetSelection): number {
  return Object.values(selection).filter(Boolean).length;
}

/* ------------------------------------------------------------------ */
/* Filas por variante (sin redundancia)                                */
/* ------------------------------------------------------------------ */

export interface VariantRow<T> {
  key: string;
  label: string;
  values: FacetValues;
  /** Cantidad disponible por valor de la faceta de variante. */
  variants: Record<string, number>;
  items: T[];
  totalAvailable: number;
}

/**
 * Agrupa referencias que solo se diferencian por una faceta (ej. Frío/Térmico
 * o Con logo/Marcable) en una sola fila con una cantidad por variante.
 */
export function buildVariantRows<T>(
  items: T[],
  getValues: (item: T) => FacetValues,
  getLabel: (item: T) => string,
  getAvailable: (item: T) => number,
  variantKey: string,
): VariantRow<T>[] {
  const map = new Map<string, VariantRow<T>>();
  for (const item of items) {
    const values = getValues(item);
    const base: FacetValues = { ...values };
    delete base[variantKey];
    const label = getLabel(item);
    const key = [
      normalizeText(label),
      ...Object.keys(base)
        .sort()
        .map((k) => `${k}=${normalizeText(base[k] || "")}`),
    ].join("|");

    const row =
      map.get(key) ||
      ({ key, label, values: base, variants: {}, items: [], totalAvailable: 0 } as VariantRow<T>);
    const variant = values[variantKey] || "—";
    row.variants[variant] = (row.variants[variant] || 0) + getAvailable(item);
    row.totalAvailable += getAvailable(item);
    row.items.push(item);
    map.set(key, row);
  }
  return [...map.values()];
}
