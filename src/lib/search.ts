/**
 * Utilidades de búsqueda unificadas para toda la plataforma.
 * Ignoran mayúsculas/minúsculas, tildes, diéresis y signos de puntuación,
 * y permiten buscar por varias palabras en cualquier orden.
 */

/** "Ángela MENDOZA" -> "angela mendoza" */
export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "SW-VM-01155" / "sw vm 1155" -> "swvm01155" / "swvm1155" */
export function normalizeCode(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * ¿Los campos dados coinciden con la búsqueda?
 * Cada término debe aparecer en alguno de los campos (texto normalizado
 * o código sin guiones), en cualquier orden.
 */
export function matchesQuery(fields: unknown[], query: string): boolean {
  const q = String(query ?? "").trim();
  if (!q) return true;

  const haystackText = fields.map((f) => normalizeText(f)).filter(Boolean).join(" | ");
  const haystackCode = fields.map((f) => normalizeCode(f)).filter(Boolean).join(" | ");

  const terms = normalizeText(q).split(" ").filter(Boolean);
  if (terms.length === 0) return true;

  // Si la búsqueda completa parece un código ("sw vm 1155"), también se prueba junta.
  const joinedCode = normalizeCode(q);
  if (joinedCode && haystackCode.includes(joinedCode)) return true;

  return terms.every((t) => haystackText.includes(t) || haystackCode.includes(normalizeCode(t)));
}
