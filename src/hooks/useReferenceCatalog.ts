import { useMemo } from "react";
import { useInventory } from "@/hooks/useInventory";
import {
  buildReferenceCatalog,
  filterReferences,
  tiposForReference,
  uniqueReferenceNames,
  type ReferenceFilter,
  type ReferenceItem,
} from "@/lib/referenceCatalog";

/**
 * Catálogo unificado de referencias para todas las áreas
 * (ventas, inventarios, producción, estampación, exportaciones).
 *
 * Siempre parte de `stock_items` — nunca de `body_stock`.
 */
export function useReferenceCatalog(filter?: ReferenceFilter) {
  const { stockItems, isLoading, refetch } = useInventory() as any;

  const catalog: ReferenceItem[] = useMemo(
    () => buildReferenceCatalog(stockItems || []),
    [stockItems],
  );

  const items = useMemo(
    () => (filter ? filterReferences(catalog, filter) : catalog),
    [catalog, filter?.brand, filter?.categories?.join("|"), filter?.tipo, filter?.search, filter?.onlyUnmarked],
  );

  const names = useMemo(() => uniqueReferenceNames(items), [items]);

  return {
    catalog,
    items,
    names,
    isLoading,
    refetch,
    tiposFor: (name: string) => tiposForReference(catalog, name),
  };
}
