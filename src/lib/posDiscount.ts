/** Precio con descuento por producto (% sobre el precio normal), al peso. */
export function discountedUnit(price: number, pct: number): number {
  const p = Math.min(100, Math.max(0, Number(pct) || 0));
  return p > 0 ? Math.round(Number(price) * (1 - p / 100)) : Number(price);
}

/**
 * Total de la venta. Si hay precios rebajados por producto, el descuento ya
 * está en las líneas y no se vuelve a restar. Siempre al peso.
 */
export function saleTotal(lines: { unit: number; qty: number }[], discount = 0, perProduct = false): number {
  const subtotal = lines.reduce((a, l) => a + l.unit * l.qty, 0);
  return Math.max(0, Math.round(perProduct ? subtotal : subtotal - Math.max(0, discount)));
}
