import { supabase } from "@/integrations/supabase/client";

const SUFFIX_RE = /\s*\((Frío|Frio|Calor|Térmico|Termico)\)\s*$/i;

function normalizeSuffix(ref: string): string {
  return ref
    .replace(/\(\s*Frio\s*\)/i, "(Frío)")
    .replace(/\(\s*Termico\s*\)/i, "(Térmico)")
    .replace(/\(\s*Calor\s*\)/i, "(Térmico)")
    .trim();
}

export function baseRefName(ref: string): string {
  return ref.replace(SUFFIX_RE, "").trim();
}

export function hasTipoSuffix(ref: string): boolean {
  return SUFFIX_RE.test(ref);
}

/**
 * Resolve the canonical body_stock referencia for a given brand:
 * - If the input already has a (Frío)/(Térmico) suffix, normalize it and reuse.
 * - Otherwise, look up existing body_stock rows with the same base name and a suffix.
 *   If exactly one match exists, reuse that referencia (avoids duplicates).
 *   If multiple matches exist and a tipoHint is provided, pick the one matching the hint.
 *   Otherwise return the raw input.
 */
export async function resolveCanonicalBodyRef(
  brand: string,
  rawRef: string,
  tipoHint?: "frio" | "calor" | "termico" | null,
): Promise<string> {
  if (!rawRef) return rawRef;
  if (hasTipoSuffix(rawRef)) return normalizeSuffix(rawRef);

  const base = baseRefName(rawRef);
  const brandsToCheck = brand === "magical" ? ["magical", "magical_warmers"] : [brand];

  const { data } = await supabase
    .from("body_stock")
    .select("referencia")
    .in("brand", brandsToCheck);

  const candidates = (data || [])
    .map((r: any) => r.referencia as string)
    .filter((r) => hasTipoSuffix(r) && baseRefName(r).toLowerCase() === base.toLowerCase());

  if (candidates.length === 0) return rawRef;
  if (candidates.length === 1) return candidates[0];

  if (tipoHint) {
    const wantTermico = tipoHint === "calor" || tipoHint === "termico";
    const match = candidates.find((c) =>
      wantTermico ? /Térmico/i.test(c) : /Frío/i.test(c),
    );
    if (match) return match;
  }
  // Ambiguous without hint — fall back to first canonical to avoid duplicate creation
  return candidates[0];
}