export type ExchangeLine = { quantity: number; unit_price: number };

/** Mirrors register_pos_exchange: difference = new − returned, rounded to the peso. */
export function exchangeSummary(returned: ExchangeLine[], newItems: ExchangeLine[]) {
  const returnedValue = returned.reduce((a, l) => a + l.quantity * l.unit_price, 0);
  const newValue = newItems.reduce((a, l) => a + l.quantity * Math.round(l.unit_price), 0);
  const difference = Math.round(newValue - returnedValue);
  const kind: "cobro" | "sin_diferencia" | "a_favor" =
    difference > 0 ? "cobro" : difference === 0 ? "sin_diferencia" : "a_favor";
  return { returnedValue, newValue, difference, kind };
}

/** Units still exchangeable: sold minus already returned in previous exchanges. */
export function returnableQty(sold: number, previouslyReturned: number) {
  return Math.max(0, sold - previouslyReturned);
}
