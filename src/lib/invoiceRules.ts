type InvoiceableOrder = {
  sale_type: string | null;
  client_nit?: string | null;
  payment_method?: string | null;
  production_status?: string | null;
};

/** Contraentrega despachada se puede facturar sin esperar el cobro de la transportadora. */
export function isDispatchedCod(o: InvoiceableOrder): boolean {
  return o.payment_method === "contra_entrega" && ["despachado", "entregado"].includes(o.production_status || "");
}

export function canInvoiceOrder(o: InvoiceableOrder, fullyPaid: boolean): boolean {
  if (o.sale_type === "menor") return fullyPaid || isDispatchedCod(o);
  if (o.sale_type === "mayor") return !!o.client_nit;
  return false;
}
