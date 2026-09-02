import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LogoSearchResult {
  id: string;
  url: string;
  logoName: string;
  clientName: string;
  brand: string;
  product: string;
  status: string | null;
  createdAt: string | null;
  source: "diseno" | "pedido";
}

export function normalizeText(v: string): string {
  return (v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isUsableUrl(u: unknown): u is string {
  return typeof u === "string" && u.startsWith("http");
}

export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface Options {
  term: string;
  clientName?: string;
  brand?: string | null; // "Magical Warmers" | "Sweatspot" | null (todas)
  onlyClient?: boolean;
  enabled?: boolean;
}

/**
 * Búsqueda tolerante de logos ya trabajados.
 * Fuentes: logo_requests (Diseño) y orders (logos adjuntos por el asesor).
 */
export function useLogoSearch({ term, clientName = "", brand = null, onlyClient = false, enabled = true }: Options) {
  const debouncedTerm = useDebounced(term.trim(), 300);
  const effectiveTerm = debouncedTerm || (onlyClient ? clientName.trim() : "");

  const query = useQuery({
    queryKey: ["logo-search", effectiveTerm.toLowerCase(), brand ?? "all", onlyClient, clientName.trim().toLowerCase()],
    enabled,
    queryFn: async () => {
      const like = `%${effectiveTerm}%`;
      const results: LogoSearchResult[] = [];

      // 1) Solicitudes de diseño
      let lr = supabase
        .from("logo_requests")
        .select("id, client_name, brand, logo_name, product, status, original_logo_url, adjusted_logo_url, extra_logos, created_at")
        .order("created_at", { ascending: false })
        .limit(80);
      if (effectiveTerm) {
        lr = lr.or(
          `client_name.ilike.${like},logo_name.ilike.${like},product.ilike.${like},brand.ilike.${like}`,
        );
      }
      const { data: lrData, error: lrError } = await lr;
      if (lrError) throw lrError;

      for (const row of (lrData ?? []) as any[]) {
        const urls: string[] = [];
        if (isUsableUrl(row.adjusted_logo_url)) urls.push(row.adjusted_logo_url);
        if (isUsableUrl(row.original_logo_url)) urls.push(row.original_logo_url);
        if (isUsableUrl(row.original_logo_url_2)) urls.push(row.original_logo_url_2);
        const extras = Array.isArray(row.extra_logos) ? row.extra_logos : [];
        for (const e of extras) {
          const u = typeof e === "string" ? e : e?.url;
          if (isUsableUrl(u)) urls.push(u);
        }
        urls.forEach((url, i) => {
          results.push({
            id: `${row.id}-${i}`,
            url,
            logoName: row.logo_name || row.product || "Logo",
            clientName: row.client_name || "",
            brand: row.brand || "",
            product: row.product || "",
            status: row.status ?? null,
            createdAt: row.created_at ?? null,
            source: "diseno",
          });
        });
      }

      // 2) Logos adjuntos directamente en pedidos
      let og = supabase
        .from("orders")
        .select("id, client_name, brand, product, logo_url, logos, created_at")
        .not("logo_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(80);
      if (effectiveTerm) {
        og = og.or(`client_name.ilike.${like},product.ilike.${like},brand.ilike.${like}`);
      }
      const { data: ogData, error: ogError } = await og;
      if (ogError) throw ogError;

      for (const row of (ogData ?? []) as any[]) {
        const urls: string[] = [];
        if (isUsableUrl(row.logo_url)) urls.push(row.logo_url);
        const extra = Array.isArray(row.logos) ? row.logos : [];
        for (const e of extra) {
          const u = typeof e === "string" ? e : e?.url;
          if (isUsableUrl(u)) urls.push(u);
        }
        urls.forEach((url, i) => {
          results.push({
            id: `order-${row.id}-${i}`,
            url,
            logoName: row.product || "Logo del pedido",
            clientName: row.client_name || "",
            brand: row.brand || "",
            product: row.product || "",
            status: null,
            createdAt: row.created_at ?? null,
            source: "pedido",
          });
        });
      }

      // dedupe por URL
      const seen = new Set<string>();
      return results.filter((r) => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });
    },
  });

  const client = normalizeText(clientName);
  const brandKey = normalizeText(brand || "");

  const items = useMemo(() => {
    let list = query.data ?? [];
    if (brandKey) {
      list = list.filter((r) => {
        const b = normalizeText(r.brand);
        if (!b) return true;
        return b.includes(brandKey) || brandKey.includes(b);
      });
    }
    if (onlyClient && client) {
      list = list.filter((r) => normalizeText(r.clientName).includes(client) || client.includes(normalizeText(r.clientName)));
    }
    const score = (r: LogoSearchResult) => {
      const c = normalizeText(r.clientName);
      if (!client) return 2;
      if (c === client) return 0;
      if (c.includes(client) || client.includes(c)) return 1;
      return 2;
    };
    return [...list].sort((a, b) => {
      const s = score(a) - score(b);
      if (s !== 0) return s;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }, [query.data, brandKey, onlyClient, client]);

  return { items, isLoading: query.isLoading || query.isFetching, error: query.error };
}
