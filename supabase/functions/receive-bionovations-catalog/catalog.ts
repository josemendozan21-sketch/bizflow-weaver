export interface CatalogStock {
  name: string;
  brand: string;
  category: string;
  product_type: string | null;
  color?: string | null;
}

type ProductType = "Frío" | "Térmico";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const suffix = /\s*\((Frío|Frio|Calor|Térmico|Termico)\)\s*$/i;
const tipo = (value: string): ProductType | null => {
  const text = normalize(value);
  if (text.includes("frio") || text.includes("cold")) return "Frío";
  if (text.includes("termico") || text.includes("calor") || text.includes("hot")) return "Térmico";
  return null;
};

export function buildWebCatalog(items: CatalogStock[]) {
  const materials = items.filter((item) => item.category === "materia_prima");
  const colors = (prefix: RegExp, strip: RegExp) => [...new Set(materials
    .filter((item) => prefix.test(item.name))
    .map((item) => item.name.replace(strip, "").trim() || item.name))]
    .sort((a, b) => a.localeCompare(b, "es"));
  const references = new Map<string, Set<ProductType>>();
  for (const item of items) {
    if (!normalize(item.brand).startsWith("magical")) continue;
    if (!["producto_terminado", "cuerpos_referencias"].includes(item.category)) continue;
    const name = item.name.replace(suffix, "").trim();
    if (!name) continue;
    const types = references.get(name) ?? new Set<ProductType>();
    const productType = tipo(item.product_type ?? "") ?? tipo(item.name.match(suffix)?.[1] ?? "");
    if (productType) types.add(productType);
    references.set(name, types);
  }
  return {
    inks: colors(/^tinta\b/i, /^tinta\s*(pvc)?\s*/i),
    gels: colors(/^colorante\b/i, /^colorante\s*/i),
    glitters: colors(/^escarcha\b/i, /^escarcha\s*/i),
    silicones: [...new Set(materials.filter((item) => /^silicona\b/i.test(item.name))
      .map((item) => item.color?.trim() || item.name.replace(/^silicona\s*/i, "").replace(/\s*\d+\s*ml\b.*$/i, "").trim())
      .filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    sweatspot_references: [...new Set(items
      .filter((item) => normalize(item.brand).startsWith("sweat") && ["producto_terminado", "cuerpos_referencias"].includes(item.category))
      .map((item) => item.name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    references: [...references].sort(([a], [b]) => a.localeCompare(b, "es", { sensitivity: "base" }))
      .map(([name, types]) => ({ name, types: (["Frío", "Térmico"] as ProductType[]).filter((type) => types.has(type)) })),
  };
}

export function createCatalogHandler(options: {
  token: string;
  headers: Record<string, string>;
  readStock: () => Promise<CatalogStock[]>;
}) {
  return async (req: Request) => {
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
      status, headers: { ...options.headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
    if (req.method === "OPTIONS") return new Response("ok", { headers: options.headers });
    if (!options.token || req.headers.get("x-webhook-token") !== options.token) return json({ error: "Unauthorized" }, 401);
    if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
    try {
      return json(buildWebCatalog(await options.readStock()));
    } catch {
      return json({ error: "No se pudo consultar el catálogo" }, 500);
    }
  };
}