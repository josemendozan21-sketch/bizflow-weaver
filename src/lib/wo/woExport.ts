/**
 * Exportación de ventas a la plantilla oficial de World Office (Factura de Venta).
 * Lógica pura: arma las filas de las hojas Encabezados, Movimientos de Inventarios
 * y Detalles del Pago, y detecta datos faltantes antes de exportar.
 */
import woProducts from "./products.json";
import woTerceros from "./terceros.json";

export interface WoSettings {
  empresa: string;
  prefijo: string;
  bodega: string;
  credito_name: string;
  contado_name: string;
  transfer_payment_name: string;
  cash_payment_name: string;
}

export interface WoOrder {
  id: string;
  order_code: string | null;
  group_number?: number | null;
  created_at: string;
  client_name: string | null;
  client_nit: string | null;
  product: string | null;
  quantity: number | null;
  unit_price: number | null;
  subtotal_amount?: number | null;
  total_amount: number | null;
  shipping_cost?: number | null;
  price_includes_tax?: boolean | null;
  tax_rate?: number | null;
  paid_amount: number; // monto pagado según la app (abono / pago completo)
  payment_method: string | null;
  payment_methods?: string[]; // métodos de pagos registrados
  advisor_id: string | null;
  advisor_name: string | null;
  delivery_date: string | null;
}

export interface WoProduct { code: string; name: string; unit: string; iva: number }

const PRODUCTS = woProducts as WoProduct[];
const TERCEROS = new Set(woTerceros as string[]);

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Fecha calendario en Bogotá (yyyy-mm-dd) para un timestamp. */
export function bogotaDate(ts: string): string {
  return new Date(new Date(ts).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Identificación sin puntos ni dígito de verificación. */
export function normalizeId(raw: string | null | undefined): string {
  if (!raw) return "";
  const main = String(raw).split("-")[0];
  return main.replace(/\D/g, "");
}

export function clientExistsInWo(id: string): boolean {
  return TERCEROS.has(id);
}

/** Busca el código WO para un producto de la app ("Muela (Frío)", "Shoulder (Térmico)"). */
export function matchWoProduct(appProduct: string | null, overrides: Record<string, string> = {}): WoProduct | null {
  if (!appProduct) return null;
  const ov = overrides[appProduct];
  if (ov) return PRODUCTS.find((p) => p.code === ov) ?? { code: ov, name: appProduct, unit: "und", iva: 19 };
  const m = appProduct.match(/^(.*?)\s*\((fr[ií]o|t[ée]rmico)\)/i);
  if (!m) return null;
  const base = norm(m[1]);
  const thermal = /t/i.test(m[2][0]);
  const target = thermal ? `magical warmers ${base}` : `frio ${base}`;
  const mw = PRODUCTS.filter((p) => p.code.startsWith("MW"));
  return mw.find((p) => norm(p.name) === target) ?? null;
}

export type WoPaymentKind = "transfer" | "cash" | "unknown";
export function classifyPayment(methods: (string | null | undefined)[]): WoPaymentKind {
  const text = methods.filter(Boolean).join(" ").toLowerCase();
  if (/mercado ?pago|nequi|daviplata|tarjeta|wompi|addi|contra/.test(text)) return "unknown";
  if (/efectivo|cash/.test(text)) return "cash";
  return "transfer"; // abonos de asesores: transferencia a Bancolombia
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface WoInvoice {
  key: string;
  orders: WoOrder[];
  link: number;
  date: string;
  dueDate: string | null;
  vendorId: string | null;
  clientId: string;
  concept: string;
  headerPayment: string;
  total: number;
  paid: number;
  lines: { code: string | null; unit: string; qty: number; iva: number; unitValue: number; note: string }[];
  payments: { name: string; value: number }[];
  missing: string[];
  warnings: string[];
}

/** Agrupa pedidos (varias líneas del mismo pedido van en una sola factura) y valida. */
export function buildInvoices(
  orders: WoOrder[],
  settings: WoSettings,
  vendorIds: Record<string, string>,
  productOverrides: Record<string, string> = {},
): WoInvoice[] {
  const groups = new Map<string, WoOrder[]>();
  for (const o of orders) {
    const k = o.group_number ? `g${o.group_number}` : o.id;
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  let link = 0;
  return [...groups.entries()].map(([key, os]) => {
    link += 1;
    const first = os[0];
    const missing: string[] = [];
    const warnings: string[] = [];
    const clientId = normalizeId(first.client_nit);
    if (!clientId) missing.push("Documento del cliente");
    else if (!clientExistsInWo(clientId)) missing.push(`Cliente ${clientId} no está creado en WO`);
    const vendorId = first.advisor_id ? vendorIds[first.advisor_id] ?? null : null;
    if (!vendorId) missing.push(`Cédula WO del asesor (${first.advisor_name ?? "sin asesor"})`);

    const lines = os.map((o) => {
      const p = matchWoProduct(o.product, productOverrides);
      if (!p) missing.push(`Código WO del producto "${o.product}"`);
      const qty = Number(o.quantity) || 0;
      const iva = p?.iva ?? 19;
      const productTotal = Number(o.subtotal_amount) || (Number(o.unit_price) || 0) * qty || Number(o.total_amount) || 0;
      const gross = qty > 0 ? productTotal / qty : 0;
      const taxIncluded = o.price_includes_tax !== false;
      const unitValue = round2(taxIncluded ? gross / (1 + iva / 100) : gross);
      if (Number(o.shipping_cost) > 0) warnings.push(`Envío de ${o.order_code} ($${Number(o.shipping_cost).toLocaleString("es-CO")}) no va en la factura`);
      return { code: p?.code ?? null, unit: p?.unit ?? "und", qty, iva, unitValue, note: o.order_code ?? "" };
    });
    const total = round2(lines.reduce((s, l) => s + l.qty * l.unitValue * (1 + l.iva / 100), 0));
    const paid = Math.min(round2(os.reduce((s, o) => s + (Number(o.paid_amount) || 0), 0)), total);
    const isCredit = paid < total - 1;
    const date = bogotaDate(first.created_at);
    const dueDate = isCredit ? first.delivery_date : date;
    if (isCredit && !dueDate) missing.push("Fecha programada de despacho (vencimiento del crédito)");

    const payments: WoInvoice["payments"] = [];
    if (paid > 0) {
      const kind = classifyPayment([...os.map((o) => o.payment_method), ...os.flatMap((o) => o.payment_methods ?? [])]);
      if (kind === "unknown") missing.push("Medio de pago sin equivalencia en WO (solo Bancolombia o efectivo)");
      payments.push({ name: kind === "cash" ? settings.cash_payment_name : settings.transfer_payment_name, value: paid });
    }
    const codes = os.map((o) => o.order_code).filter(Boolean).join(", ");
    return {
      key, orders: os, link, date, dueDate, vendorId, clientId,
      concept: `Pedido ${codes} - ${first.client_name ?? ""}`.slice(0, 500),
      headerPayment: isCredit ? settings.credito_name : settings.contado_name,
      total, paid, lines, payments, missing: [...new Set(missing)], warnings,
    };
  });
}

const toDate = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };

/** Filas en el orden exacto de cada hoja de la plantilla oficial. */
export function invoiceRows(invs: WoInvoice[], s: WoSettings) {
  const headers = invs.map((i) => [
    s.empresa, s.prefijo, i.link, toDate(i.date), i.vendorId, i.clientId, i.concept, i.headerPayment,
    toDate(i.dueDate ?? i.date), i.orders[0].delivery_date ? toDate(i.orders[0].delivery_date) : null,
    null, null, null, null, null, null,
  ]);
  const items = invs.flatMap((i) => i.lines.map((l) => [
    s.empresa, s.prefijo, i.link, l.code, s.bodega, l.unit, l.qty, l.iva, l.unitValue, 0, l.note,
  ]));
  const payments = invs.flatMap((i) => i.payments.map((p) => [s.empresa, s.prefijo, i.link, p.name, p.value]));
  return { headers, items, payments };
}

/** Texto separado por tabulaciones para pegar en la plantilla original. */
export function toTsv(rows: unknown[][]): string {
  return rows.map((r) => r.map((v) => {
    if (v instanceof Date) return `${String(v.getUTCDate()).padStart(2, "0")}/${String(v.getUTCMonth() + 1).padStart(2, "0")}/${v.getUTCFullYear()}`;
    return v == null ? "" : String(v);
  }).join("\t")).join("\n");
}
