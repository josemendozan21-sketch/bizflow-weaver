/** Compone la dirección completa: dirección base + complemento (oficina, apto, etc.). */
export function formatAddress(
  address?: string | null,
  complement?: string | null,
): string {
  const base = (address ?? "").trim();
  const comp = (complement ?? "").trim();
  if (!base) return comp;
  if (!comp) return base;
  return `${base} — ${comp}`;
}
