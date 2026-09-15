// Referencias y subreferencias de producto para los puntos de venta.
// La clasificación es automática por nombre/marca y luego editable a mano.

export type ReferenceDef = { label: string; subs: string[] };

export const POS_REFERENCES: ReferenceDef[] = [
  { label: "Termos", subs: ["500 ml", "250 ml", "150 ml", "Jugueton", "Tina", "Repuestos"] },
  { label: "Canguros", subs: ["Con cremallera", "Con botellas", "Free belt"] },
  { label: "Camisetas y tops", subs: ["Camisetas", "Camisillas", "Camibusos", "Tops y crop tops", "Busos y chaquetas"] },
  { label: "Pantalonetas y licras", subs: ["Shorts", "Licras", "Bikers", "Pantalonetas"] },
  { label: "Chalecos", subs: [] },
  { label: "Medias", subs: ["Compresión", "Antideslizantes", "Tobilleras"] },
  { label: "Gorras y viseras", subs: ["Gorras", "Viseras", "Gorros"] },
  { label: "Magical Warmers", subs: ["Calor", "Frío", "Kits"] },
  { label: "Nutrición", subs: ["Geles", "Electrolitos y sales", "Bebidas", "Gomas", "Otros"] },
  { label: "Accesorios", subs: ["Imanes", "Mangas", "Medalleros", "Correas", "Varios"] },
];

export const REFERENCE_LABELS = POS_REFERENCES.map((r) => r.label);

export function subsForReference(reference?: string | null): string[] {
  if (!reference) return [];
  return POS_REFERENCES.find((r) => r.label === reference)?.subs ?? [];
}

export const norm = (s?: string | null) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export type Classification = { reference: string | null; subReference: string | null };

export function classifyProduct(
  name: string,
  brand?: string | null,
  supplier?: string | null,
): Classification {
  const n = norm(name);
  const b = norm(brand);
  const s = norm(supplier);
  const has = (...words: string[]) => words.some((w) => n.includes(w));

  // Magical Warmers (antes que gorros/termos por sus nombres genéricos)
  if (b.includes("magical") || has("magical warmer")) {
    if (has("kit")) return { reference: "Magical Warmers", subReference: "Kits" };
    if (has("frio")) return { reference: "Magical Warmers", subReference: "Frío" };
    return { reference: "Magical Warmers", subReference: "Calor" };
  }

  // Nutrición
  const isNutrition =
    b.includes("nutric") ||
    ["sis", "escarabajos", "energy fuel", "neversecond", "226ers", "fuel precision"].includes(s) ||
    has("gatorade", "redbull", "red bull");
  if (isNutrition) {
    if (has("gel")) return { reference: "Nutrición", subReference: "Geles" };
    if (has("goma")) return { reference: "Nutrición", subReference: "Gomas" };
    if (has("electro", "saltwable", "iso ", "iso5", "iso 5", "hydra", "disco hydro", "sales"))
      return { reference: "Nutrición", subReference: "Electrolitos y sales" };
    if (has("drink", "recovery", "beta fuel", "gatorade", "redbull", "red bull", "bebida"))
      return { reference: "Nutrición", subReference: "Bebidas" };
    return { reference: "Nutrición", subReference: "Otros" };
  }

  // Termos
  if (has("termo", "jugueton", "tina", "boquilla")) {
    if (has("boquilla", "repuesto", "respuesto")) return { reference: "Termos", subReference: "Repuestos" };
    if (has("jugueton")) return { reference: "Termos", subReference: "Jugueton" };
    if (n === "tina" || has("tina")) return { reference: "Termos", subReference: "Tina" };
    if (has("500")) return { reference: "Termos", subReference: "500 ml" };
    if (has("250")) return { reference: "Termos", subReference: "250 ml" };
    if (has("150")) return { reference: "Termos", subReference: "150 ml" };
    return { reference: "Termos", subReference: null };
  }

  // Canguros
  if (has("canguro", "free belt", "freebelt")) {
    if (has("free belt", "freebelt")) return { reference: "Canguros", subReference: "Free belt" };
    if (has("botella")) return { reference: "Canguros", subReference: "Con botellas" };
    if (has("cremallera")) return { reference: "Canguros", subReference: "Con cremallera" };
    return { reference: "Canguros", subReference: null };
  }

  if (has("chaleco")) return { reference: "Chalecos", subReference: null };

  // Medias
  if (has("media", "pantorrilla", "calcet")) {
    if (has("antideslizante")) return { reference: "Medias", subReference: "Antideslizantes" };
    if (has("tobiller")) return { reference: "Medias", subReference: "Tobilleras" };
    if (has("compresion", "pantorrilla", "cana")) return { reference: "Medias", subReference: "Compresión" };
    return { reference: "Medias", subReference: null };
  }

  // Gorras, viseras y gorros
  if (has("gorra", "visera", "gorro")) {
    if (has("visera")) return { reference: "Gorras y viseras", subReference: "Viseras" };
    if (has("gorra")) return { reference: "Gorras y viseras", subReference: "Gorras" };
    return { reference: "Gorras y viseras", subReference: "Gorros" };
  }

  // Pantalonetas y licras (antes que tops por "bib short", "pant con licra")
  if (has("short", "licra", "lycra", "leggins", "legging", "pant ", "pantaloneta", "biker", "pant.")) {
    if (has("biker")) return { reference: "Pantalonetas y licras", subReference: "Bikers" };
    if (has("pantaloneta")) return { reference: "Pantalonetas y licras", subReference: "Pantalonetas" };
    if (has("licra", "lycra", "leggins", "legging")) return { reference: "Pantalonetas y licras", subReference: "Licras" };
    return { reference: "Pantalonetas y licras", subReference: "Shorts" };
  }

  // Camisetas y tops
  if (has("camibuso", "camisilla", "camiseta", "camisa", "cami ", "crop", "top", "buso", "hoddie", "hoodie", "chaqueta", "cortaviento")) {
    if (has("camibuso")) return { reference: "Camisetas y tops", subReference: "Camibusos" };
    if (has("camisilla")) return { reference: "Camisetas y tops", subReference: "Camisillas" };
    if (has("buso", "hoddie", "hoodie", "chaqueta", "cortaviento"))
      return { reference: "Camisetas y tops", subReference: "Busos y chaquetas" };
    if (has("crop", "top")) return { reference: "Camisetas y tops", subReference: "Tops y crop tops" };
    return { reference: "Camisetas y tops", subReference: "Camisetas" };
  }

  // Accesorios
  if (has("iman")) return { reference: "Accesorios", subReference: "Imanes" };
  if (has("manga", "freezii")) return { reference: "Accesorios", subReference: "Mangas" };
  if (has("medaller")) return { reference: "Accesorios", subReference: "Medalleros" };
  if (has("correa")) return { reference: "Accesorios", subReference: "Correas" };
  if (has("bib number", "desinfectante", "kit")) return { reference: "Accesorios", subReference: "Varios" };

  return { reference: null, subReference: null };
}
