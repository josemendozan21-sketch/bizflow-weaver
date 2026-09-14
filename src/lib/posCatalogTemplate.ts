import * as XLSX from "xlsx";

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  supplier: string | null;
  sale_price: number;
  available: number;
  unit: string | null;
  active: boolean;
  photo_url: string | null;
}

export const CATALOG_HEADERS = [
  "Producto",
  "Marca",
  "Categoría",
  "Proveedor",
  "Precio de venta",
  "Existencias",
  "Unidad",
  "Activo",
  "Tiene foto",
  "Foto nueva (nombre del archivo)",
] as const;


export const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const productKey = (name: string, brand: string | null | undefined) =>
  `${norm(name)}|${norm(brand)}`;

const parseNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const clean = String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
};

const parseBool = (v: unknown): boolean => {
  const s = norm(v);
  return !(s === "no" || s === "false" || s === "0" || s === "inactivo");
};

export function downloadCatalogTemplate(products: CatalogProduct[], locationName: string) {
  const rows = products.map((p) => ({
    Producto: p.name,
    Marca: p.brand ?? "",
    "Categoría": p.category ?? "",
    Proveedor: p.supplier ?? "",
    "Precio de venta": Number(p.sale_price) || 0,
    Existencias: Number(p.available) || 0,
    Unidad: p.unit ?? "unidades",
    Activo: p.active ? "SÍ" : "NO",
    "Tiene foto": p.photo_url ? "SÍ" : "NO",
    "Foto nueva (nombre del archivo)": "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { header: CATALOG_HEADERS as unknown as string[] });
  ws["!cols"] = [
    { wch: 46 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 16 },
    { wch: 13 }, { wch: 12 }, { wch: 9 }, { wch: 11 }, { wch: 32 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Catálogo");

  const marcas = Array.from(new Set(products.map((p) => (p.brand ?? "").trim()).filter(Boolean))).sort();
  const sinFoto = products.filter((p) => !p.photo_url).length;
  const instrucciones = [
    ["INSTRUCCIONES PARA ACTUALIZAR EL CATÁLOGO"],
    [""],
    ["1. No cambies los títulos de las columnas ni el nombre de la hoja 'Catálogo'."],
    ["2. Una fila por producto. El producto se reconoce por Producto + Marca."],
    ["3. Si cambias la marca o el nombre, el sistema lo tomará como un producto NUEVO."],
    ["   Para corregir un duplicado: deja la fila correcta y pon NO en 'Activo' en la fila sobrante."],
    ["4. Precio de venta y Existencias: solo números, sin puntos ni el signo $."],
    ["5. Existencias no puede ser negativa: escribe el conteo físico real del producto."],
    ["6. Activo: escribe SÍ para que se pueda vender, NO para ocultarlo (no se borra su historial)."],
    ["7. Proveedor: quién surte el producto. Puedes corregirlo desde aquí."],
    [`8. 'Tiene foto' es informativo (hoy hay ${sinFoto} productos sin foto). No lo edites.`],
    ["9. 'Foto nueva': escribe el nombre del archivo de la imagen (ej. termo-azul.jpg) y adjunta"],
    ["   las imágenes al subir el Excel. También puedes adjuntarlas todas juntas en un .zip."],
    ["10. Antes de guardar verás en pantalla un resumen de todo lo que va a cambiar."],
    [""],
    ["Marcas que ya existen en el punto:"],
    ...marcas.map((m) => [m]),
  ];
  const wsi = XLSX.utils.aoa_to_sheet(instrucciones);
  wsi["!cols"] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, wsi, "Instrucciones");


  const safe = locationName.replace(/\s+/g, "_").toLowerCase();
  XLSX.writeFile(wb, `catalogo_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export interface ParsedRow {
  row: number;
  name: string;
  brand: string | null;
  category: string | null;
  supplier: string | null;
  sale_price: number;
  available: number;
  unit: string;
  active: boolean;
  photo_file: string | null;
}


export interface CatalogDiffChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

export interface CatalogDiffEntry {
  row: number;
  name: string;
  brand: string | null;
  product?: CatalogProduct;
  parsed: ParsedRow;
  changes: CatalogDiffChange[];
}

export interface CatalogDiff {
  updates: CatalogDiffEntry[];
  creates: CatalogDiffEntry[];
  deactivations: CatalogDiffEntry[];
  errors: { row: number; message: string }[];
  unchanged: number;
}

export function parseCatalogFile(buffer: ArrayBuffer): { rows: ParsedRow[]; errors: { row: number; message: string }[] } {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames.find((n) => norm(n).startsWith("cat")) ?? wb.SheetNames[0];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: "" });

  const rows: ParsedRow[] = [];
  const errors: { row: number; message: string }[] = [];

  raw.forEach((r, i) => {
    const rowNo = i + 2;
    const name = String(r["Producto"] ?? "").trim();
    if (!name) {
      const anyValue = Object.values(r).some((v) => String(v ?? "").trim() !== "");
      if (anyValue) errors.push({ row: rowNo, message: "Falta el nombre del producto" });
      return;
    }
    const price = parseNumber(r["Precio de venta"]);
    if (price === null || price < 0) {
      errors.push({ row: rowNo, message: `"${name}": el precio de venta no es un número válido` });
      return;
    }
    const available = parseNumber(r["Existencias"]);
    if (available === null || available < 0) {
      errors.push({ row: rowNo, message: `"${name}": las existencias deben ser un número igual o mayor a cero` });
      return;
    }
    const brand = String(r["Marca"] ?? "").trim();
    rows.push({
      row: rowNo,
      name,
      brand: brand || null,
      category: String(r["Categoría"] ?? "").trim() || null,
      supplier: String(r["Proveedor"] ?? "").trim() || null,
      sale_price: price,
      available,
      unit: String(r["Unidad"] ?? "").trim() || "unidades",
      active: parseBool(r["Activo"]),
      photo_file: String(r["Foto nueva (nombre del archivo)"] ?? r["Foto nueva"] ?? "").trim() || null,
    });
  });


  const seen = new Map<string, number>();
  for (const r of rows) {
    const k = productKey(r.name, r.brand);
    const prev = seen.get(k);
    if (prev) errors.push({ row: r.row, message: `"${r.name}" está repetido con la misma marca (ver fila ${prev})` });
    else seen.set(k, r.row);
  }

  return { rows, errors };
}

const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

export function buildCatalogDiff(parsed: ParsedRow[], errors: { row: number; message: string }[], products: CatalogProduct[]): CatalogDiff {
  const byKey = new Map(products.map((p) => [productKey(p.name, p.brand), p]));
  const diff: CatalogDiff = { updates: [], creates: [], deactivations: [], errors: [...errors], unchanged: 0 };
  const dupRows = new Set(errors.map((e) => e.row));

  for (const r of parsed) {
    if (dupRows.has(r.row)) continue;
    const existing = byKey.get(productKey(r.name, r.brand));
    if (!existing) {
      diff.creates.push({ row: r.row, name: r.name, brand: r.brand, parsed: r, changes: [] });
      continue;
    }
    const changes: CatalogDiffChange[] = [];
    if ((existing.category ?? "") !== (r.category ?? ""))
      changes.push({ field: "category", label: "Categoría", from: existing.category || "—", to: r.category || "—" });
    if (Number(existing.sale_price) !== r.sale_price)
      changes.push({ field: "sale_price", label: "Precio de venta", from: money(Number(existing.sale_price)), to: money(r.sale_price) });
    if (Number(existing.available) !== r.available)
      changes.push({ field: "available", label: "Existencias", from: String(Number(existing.available)), to: String(r.available) });
    if ((existing.unit ?? "unidades") !== r.unit)
      changes.push({ field: "unit", label: "Unidad", from: existing.unit || "—", to: r.unit });
    if ((existing.supplier ?? "") !== (r.supplier ?? ""))
      changes.push({ field: "supplier", label: "Proveedor", from: existing.supplier || "—", to: r.supplier || "—" });
    if (Boolean(existing.active) !== r.active)
      changes.push({ field: "active", label: "Activo", from: existing.active ? "SÍ" : "NO", to: r.active ? "SÍ" : "NO" });
    if (r.photo_file)
      changes.push({ field: "photo_url", label: "Foto", from: existing.photo_url ? "foto actual" : "sin foto", to: r.photo_file });


    if (changes.length === 0) {
      diff.unchanged++;
      continue;
    }
    const entry: CatalogDiffEntry = { row: r.row, name: r.name, brand: r.brand, product: existing, parsed: r, changes };
    if (changes.length === 1 && changes[0].field === "active" && !r.active) diff.deactivations.push(entry);
    else diff.updates.push(entry);
  }

  return diff;
}
