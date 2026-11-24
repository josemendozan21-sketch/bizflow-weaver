export const POS_EXIT_REASONS = [
  { value: "devolucion_bodega", label: "Devolución a bodega", notesRequired: false },
  { value: "producto_danado", label: "Producto dañado", notesRequired: true },
  { value: "muestra_regalo", label: "Muestra o regalo", notesRequired: true },
  { value: "devolucion_proveedor", label: "Devolución a proveedor", notesRequired: false },
  { value: "entrega_jose_mendoza", label: "José Mendoza", notesRequired: false },
] as const;
export type PosExitReason = (typeof POS_EXIT_REASONS)[number]["value"];

/** One product line of an exit (may repeat a product; quantities are summed). */
export type PosExitLine = { product_id: string; quantity: number };

/** Returns an error message, or null when the exit is valid. */
export function validatePosExit(input: { quantity: number; available: number; reason: string; notes?: string }): string | null {
  const r = POS_EXIT_REASONS.find((x) => x.value === input.reason);
  if (!r) return "Selecciona el motivo de la salida";
  if (!(input.quantity > 0) || !Number.isInteger(input.quantity)) return "La cantidad debe ser un número entero mayor a 0";
  if (input.quantity > input.available) return `Solo hay ${input.available} unidades disponibles`;
  if (r.notesRequired && !input.notes?.trim()) return "Escribe una nota explicando la salida";
  return null;
}

/**
 * Validates several exit lines registered as one operation: one motivo, one nota,
 * one destination for all of them. Repeated products are checked against the
 * remaining stock so the same product can't be taken out twice beyond what exists.
 */
export function validatePosExitBatch(input: {
  lines: PosExitLine[];
  availableById: Record<string, number>;
  nameById?: Record<string, string>;
  reason: string;
  notes?: string;
}): string | null {
  const r = POS_EXIT_REASONS.find((x) => x.value === input.reason);
  if (!r) return "Selecciona el motivo de la salida";
  if (r.notesRequired && !input.notes?.trim()) return "Escribe una nota explicando la salida";
  if (!input.lines.length) return "Agrega al menos un producto";

  const remaining: Record<string, number> = { ...input.availableById };
  for (const line of input.lines) {
    const raw = input.nameById?.[line.product_id] ?? "";
    const name = raw.trim() || "el producto";
    if (!line.product_id || remaining[line.product_id] === undefined) {
      return "Selecciona un producto válido en todas las filas";
    }
    const err = validatePosExit({
      quantity: line.quantity,
      available: remaining[line.product_id],
      reason: input.reason,
      notes: input.notes,
    });
    if (err) return input.lines.length > 1 ? `${name}: ${err}` : err;
    remaining[line.product_id] -= line.quantity;
  }
  return null;
}
