/**
 * Catálogo unificado de referencias.
 *
 * Fuente única de verdad: `stock_items` (nombre limpio + product_type separado).
 * `body_stock` queda como espejo interno de producción y NUNCA debe usarse
 * como origen de lo que se muestra o se elige en la interfaz.
 */

export type ReferenceTipo = "Frío" | "Térmico" | null;

export interface ReferenceItem {
  id: string;
  brand: string;
  /** Marca normalizada: "magical" | "sweatspot" | "ambas" */
  brandKey: string;
  category: string;
  /** Nombre limpio, sin sufijo (Frío)/(Térmico) */
  name: string;
  tipo: ReferenceTipo;
  color: string | null;
  logo: string | null;
  /** true = viene marcado (con logo); false = sin marcar */
  marcado: boolean;
  available: number;
  minStock: number;
  unit: string;
  sweatspotCategory: string | null;
}

const SUFFIX_RE = /\s*\((Frío|Frio|Calor|Térmico|Termico)\)\s*$/i;

/** Quita acentos/diacríticos y pasa a minúsculas (para búsquedas y comparaciones) */
export const normalizeText = (s: string): string =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Nombre limpio: "Antifaz (Frío)" -> "Antifaz" */
export const cleanReferenceName = (ref: string): string =>
  (ref || "").replace(SUFFIX_RE, "").trim();

/** Tipo canónico a partir de cualquier variante escrita */
export function canonicalTipo(value?: string | null): ReferenceTipo {
  const v = normalizeText(value || "");
  if (!v) return null;
  if (v.includes("frio") || v.includes("cold")) return "Frío";
  if (v.includes("termico") || v.includes("calor") || v.includes("hot")) return "Térmico";
  return null;
}

/** Extrae el tipo del sufijo del nombre, si lo tiene */
export function tipoFromName(ref: string): ReferenceTipo {
  const m = (ref || "").match(SUFFIX_RE);
  return m ? canonicalTipo(m[1]) : null;
}

/** Marca normalizada: magical / magical_warmers -> "magical" */
export function brandKey(brand?: string | null): string {
  const b = normalizeText(brand || "");
  if (b.startsWith("magical")) return "magical";
  if (b.startsWith("sweat")) return "sweatspot";
  if (b === "ambas") return "ambas";
  return b;
}

/** Clave canónica de una referencia: marca|nombre|tipo|logo */
export function referenceKey(item: {
  brand?: string | null;
  name: string;
  tipo?: ReferenceTipo | string | null;
  logo?: string | null;
}): string {
  return [
    brandKey(item.brand),
    normalizeText(cleanReferenceName(item.name)),
    canonicalTipo(typeof item.tipo === "string" ? item.tipo : item.tipo || "") || "",
    item.logo ? "marcado" : "sin_marcar",
  ].join("|");
}

/** Etiqueta legible: "Antifaz · Frío" */
export function referenceLabel(name: string, tipo?: ReferenceTipo | string | null): string {
  const t = canonicalTipo(typeof tipo === "string" ? tipo : tipo || "");
  const base = cleanReferenceName(name);
  return t ? `${base} · ${t}` : base;
}

export interface RawStockItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  available: number;
  unit: string;
  min_stock: number;
  product_type: string | null;
  color: string | null;
  logo: string | null;
  sweatspot_category: string | null;
}

/**
 * Convierte filas de `stock_items` en el catálogo canónico:
 * nombres limpios, tipo separado y duplicados fusionados (suma de disponibles).
 */
export function buildReferenceCatalog(items: RawStockItem[]): ReferenceItem[] {
  const map = new Map<string, ReferenceItem>();

  for (const raw of items) {
    const name = cleanReferenceName(raw.name);
    if (!name) continue;
    const tipo = canonicalTipo(raw.product_type) ?? tipoFromName(raw.name);
    const key = `${raw.category}|${referenceKey({ brand: raw.brand, name, tipo, logo: raw.logo })}`;
    const existing = map.get(key);
    if (existing) {
      existing.available += Number(raw.available || 0);
      continue;
    }
    map.set(key, {
      id: raw.id,
      brand: raw.brand,
      brandKey: brandKey(raw.brand),
      category: raw.category,
      name,
      tipo,
      color: raw.color,
      logo: raw.logo,
      marcado: Boolean(raw.logo),
      available: Number(raw.available || 0),
      minStock: Number(raw.min_stock || 0),
      unit: raw.unit,
      sweatspotCategory: raw.sweatspot_category,
    });
  }

  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
  );
}

export interface ReferenceFilter {
  brand?: string;
  categories?: string[];
  tipo?: ReferenceTipo | "todos";
  search?: string;
  onlyUnmarked?: boolean;
}

export function filterReferences(items: ReferenceItem[], f: ReferenceFilter): ReferenceItem[] {
  const q = normalizeText(f.search || "");
  const wantBrand = f.brand ? brandKey(f.brand) : null;
  return items.filter((i) => {
    if (wantBrand && i.brandKey !== wantBrand && i.brandKey !== "ambas") return false;
    if (f.categories && !f.categories.includes(i.category)) return false;
    if (f.tipo && f.tipo !== "todos" && i.tipo !== f.tipo) return false;
    if (f.onlyUnmarked && i.marcado) return false;
    if (q && !normalizeText(`${i.name} ${i.tipo || ""} ${i.color || ""}`).includes(q)) return false;
    return true;
  });
}

/** Nombres únicos (sin tipo) del catálogo, ordenados */
export function uniqueReferenceNames(items: ReferenceItem[]): string[] {
  return [...new Set(items.map((i) => i.name))].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );
}

/** Tipos disponibles para una referencia dada */
export function tiposForReference(items: ReferenceItem[], name: string): ReferenceTipo[] {
  const target = normalizeText(cleanReferenceName(name));
  const tipos = items
    .filter((i) => normalizeText(i.name) === target && i.tipo)
    .map((i) => i.tipo as ReferenceTipo);
  return [...new Set(tipos)];
}
