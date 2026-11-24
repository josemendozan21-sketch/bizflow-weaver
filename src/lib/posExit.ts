export const POS_EXIT_REASONS = [
  { value: "devolucion_bodega", label: "Devolución a bodega", notesRequired: false },
  { value: "producto_danado", label: "Producto dañado", notesRequired: true },
  { value: "muestra_regalo", label: "Muestra o regalo", notesRequired: true },
  { value: "devolucion_proveedor", label: "Devolución a proveedor", notesRequired: false },
] as const;
export type PosExitReason = (typeof POS_EXIT_REASONS)[number]["value"];

/** Returns an error message, or null when the exit is valid. */
export function validatePosExit(input: { quantity: number; available: number; reason: string; notes?: string }): string | null {
  const r = POS_EXIT_REASONS.find((x) => x.value === input.reason);
  if (!r) return "Selecciona el motivo de la salida";
  if (!(input.quantity > 0) || !Number.isInteger(input.quantity)) return "La cantidad debe ser un número entero mayor a 0";
  if (input.quantity > input.available) return `Solo hay ${input.available} unidades disponibles`;
  if (r.notesRequired && !input.notes?.trim()) return "Escribe una nota explicando la salida";
  return null;
}
