/**
 * IVA para ventas al por mayor (Magical Warmers y Sweatspot).
 *
 * La base del IVA es únicamente el valor de los productos. Envío, cobro de
 * logo, molde y costos adicionales son conceptos independientes y NO entran
 * en la base.
 */
export const IVA_RATE = 19;

/** IVA sobre la base de productos. Devuelve 0 si el precio ya incluye IVA. */
export function computeIva(productBase: number, priceIncludesTax: boolean): number {
  if (priceIncludesTax) return 0;
  const base = Number(productBase) || 0;
  if (base <= 0) return 0;
  return Math.round((base * IVA_RATE) / 100);
}

/**
 * Reparte el IVA total entre líneas proporcionalmente a su base, dejando el
 * residuo en la última línea con valor para que la suma cuadre exactamente.
 */
export function prorateIva(bases: number[], totalIva: number): number[] {
  const result = bases.map(() => 0);
  const sum = bases.reduce((s, v) => s + (Number(v) || 0), 0);
  if (sum <= 0 || totalIva <= 0) return result;
  let lastIdx = -1;
  for (let i = 0; i < bases.length; i++) if ((Number(bases[i]) || 0) > 0) lastIdx = i;
  let assigned = 0;
  for (let i = 0; i < bases.length; i++) {
    const base = Number(bases[i]) || 0;
    if (base <= 0) continue;
    if (i === lastIdx) {
      result[i] = Math.max(totalIva - assigned, 0);
    } else {
      result[i] = Math.round((totalIva * base) / sum);
      assigned += result[i];
    }
  }
  return result;
}
