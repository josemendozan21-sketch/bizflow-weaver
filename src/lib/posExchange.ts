export type ExchangeLine = { quantity: number; unit_price: number };

/** Mirrors register_pos_exchange: difference = new − returned, rounded to the peso.
 *  "falta" means the customer still has to pick more products: money is never refunded. */
export function exchangeSummary(returned: ExchangeLine[], newItems: ExchangeLine[]) {
  const returnedValue = returned.reduce((a, l) => a + l.quantity * l.unit_price, 0);
  const newValue = newItems.reduce((a, l) => a + l.quantity * Math.round(l.unit_price), 0);
  const difference = Math.round(newValue - returnedValue);
  const kind: "cobro" | "sin_diferencia" | "falta" =
    difference > 0 ? "cobro" : difference === 0 ? "sin_diferencia" : "falta";
  return { returnedValue, newValue, difference, kind };
}

/** Units still exchangeable: sold minus already returned in previous exchanges. */
export function returnableQty(sold: number, previouslyReturned: number) {
  return Math.max(0, sold - previouslyReturned);
}

const bogotaMonth = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit" }).format(d);

/** Mirrors register_pos_exchange: exchanges are allowed until the end of the sale's month (Bogotá time). */
export function isWithinExchangeWindow(saleDate: string | Date, now: Date = new Date()) {
  return bogotaMonth(new Date(saleDate)) === bogotaMonth(now);
}
