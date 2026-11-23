/**
 * Lo "enviado" a una feria es solo lo que salió de verdad con una salida
 * confirmada (quantity_dispatched). Lo asignado/planeado (quantity_assigned)
 * nunca cuenta como enviado.
 */
export interface FeriaStockInput {
  quantity_assigned?: number | null;
  quantity_dispatched?: number | null;
  quantity_returned?: number | null;
}

export function feriaSent(p: FeriaStockInput): number {
  return Math.max(Number(p.quantity_dispatched || 0), 0);
}

export function feriaStockRow(p: FeriaStockInput, sold: number) {
  const sent = feriaSent(p);
  const returned = Number(p.quantity_returned || 0);
  return {
    sent,
    sold,
    returned,
    available: Math.max(sent - sold - returned, 0),
    /** Tiene salidas, ventas o retornos reales (si no, solo está planeado). */
    hasMovement: sent > 0 || sold > 0 || returned > 0,
  };
}
