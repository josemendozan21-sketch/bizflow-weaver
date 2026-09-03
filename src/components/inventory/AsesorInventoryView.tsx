import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, ChevronRight, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReferenceCatalog } from "@/hooks/useReferenceCatalog";
import ReferenceLabel from "@/components/inventory/ReferenceLabel";
import FacetFilterBar from "@/components/inventory/FacetFilterBar";
import GroupedInventoryTable, {
  type InventoryColumn,
  type InventoryGroup,
} from "@/components/inventory/GroupedInventoryTable";
import { cn } from "@/lib/utils";
import { normalizeText, type ReferenceItem } from "@/lib/referenceCatalog";
import {
  MAGICAL_FACETS,
  SWEATSPOT_FACETS,
  buildFacetGroups,
  magicalFacetValues,
  matchesSelection,
  pickGroupKey,
  sweatspotFacetValues,
  type FacetSelection,
} from "@/lib/inventoryFacets";
import type { InventoryBrand } from "@/stores/inventoryStore";

/** Estado de stock como punto de color discreto. */
const StockDot = ({ available }: { available: number }) => {
  const state =
    available <= 0
      ? { label: "Sin stock", cls: "bg-destructive" }
      : available <= 10
        ? { label: "Stock bajo", cls: "bg-amber-500" }
        : { label: "Disponible", cls: "bg-emerald-500" };
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-end gap-2 tabular-nums">
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", state.cls)} aria-hidden />
            <span className="sr-only">{state.label}</span>
            {available.toLocaleString("es-CO")}
          </span>
        </TooltipTrigger>
        <TooltipContent>{state.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/** Metadatos de una fila en texto tenue separado por puntos. */
const MetaLine = ({ parts }: { parts: (string | null | undefined)[] }) => {
  const clean = parts.filter(Boolean) as string[];
  if (clean.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="text-xs text-muted-foreground">
      {clean.map((p, i) => (
        <span key={p + i}>
          {i > 0 && <span className="mx-1.5 opacity-50">·</span>}
          {p}
        </span>
      ))}
    </span>
  );
};

type SortDir = "asc" | "desc";

interface FacetedSectionProps {
  items: ReferenceItem[];
  getValues: (item: ReferenceItem) => Record<string, string | null>;
  defs: typeof SWEATSPOT_FACETS;
  primaryKeys: string[];
  columns: InventoryColumn<ReferenceItem>[];
  searchPlaceholder: string;
  searchFields: (item: ReferenceItem) => string;
}

/** Sección de inventario con facetas macro → micro (idéntica en ambas marcas). */
function FacetedInventorySection({
  items,
  getValues,
  defs,
  primaryKeys,
  columns,
  searchPlaceholder,
  searchFields,
}: FacetedSectionProps) {
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<FacetSelection>({});
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const q = normalizeText(search.trim());

  // Base: búsqueda de texto y disponibilidad (las facetas se calculan sobre esta base).
  const base = useMemo(
    () =>
      items
        .filter((i) => (onlyAvailable ? i.available > 0 : true))
        .filter((i) => (q ? normalizeText(searchFields(i)).includes(q) : true)),
    [items, q, onlyAvailable, searchFields],
  );

  const groupsDef = useMemo(
    () => buildFacetGroups(base, getValues, (i) => i.available, defs, selection),
    [base, getValues, defs, selection],
  );

  const filtered = useMemo(
    () =>
      base
        .filter((i) => matchesSelection(getValues(i), selection))
        .sort((a, b) =>
          sortDir === "asc"
            ? a.name.localeCompare(b.name, "es", { sensitivity: "base" })
            : b.name.localeCompare(a.name, "es", { sensitivity: "base" }),
        ),
    [base, selection, sortDir, getValues],
  );

  const groupKey = pickGroupKey(groupsDef, selection);

  const grouped: InventoryGroup<ReferenceItem>[] = useMemo(() => {
    if (!groupKey) {
      return [
        {
          key: "__all__",
          label: "Resultados",
          items: filtered,
          units: filtered.reduce((s, i) => s + i.available, 0),
        },
      ];
    }
    const map = new Map<string, InventoryGroup<ReferenceItem>>();
    for (const item of filtered) {
      const value = getValues(item)[groupKey] || "Sin especificar";
      const g = map.get(value) || { key: value, label: value, items: [], units: 0 };
      g.items.push(item);
      g.units += item.available;
      map.set(value, g);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  }, [filtered, groupKey, getValues]);

  return (
    <>
      <FacetFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={searchPlaceholder}
        groups={groupsDef}
        primaryKeys={primaryKeys}
        selection={selection}
        onSelect={(key, value) => setSelection((s) => ({ ...s, [key]: value }))}
        onClear={() => {
          setSelection({});
          setOnlyAvailable(false);
        }}
        resultCount={filtered.length}
        totalCount={items.length}
        sortDir={sortDir}
        onToggleSort={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
        onlyAvailable={onlyAvailable}
        onOnlyAvailableChange={setOnlyAvailable}
      />
      <GroupedInventoryTable groups={grouped} columns={columns} getRowKey={(i) => i.id} />
    </>
  );
}

const magicalColumns = (firstHeader: string): InventoryColumn<ReferenceItem>[] => [
  {
    key: "name",
    header: firstHeader,
    render: (item) => <ReferenceLabel name={item.name} />,
    className: "font-medium",
  },
  {
    key: "meta",
    header: "Detalle",
    render: (item) => <MetaLine parts={[item.tipo, item.unit]} />,
  },
  {
    key: "available",
    header: "Disponible",
    align: "right",
    render: (item) => <StockDot available={item.available} />,
  },
];

const sweatspotColumns: InventoryColumn<ReferenceItem>[] = [
  { key: "name", header: "Producto", render: (item) => item.name, className: "font-medium" },
  {
    key: "meta",
    header: "Detalle",
    render: (item) => (
      <MetaLine
        parts={[item.color, item.logo ? "con logo" : "marcable", item.productType, item.unit]}
      />
    ),
  },
  {
    key: "available",
    header: "Disponible",
    align: "right",
    render: (item) => <StockDot available={item.available} />,
  },
];

const magicalSearchFields = (i: ReferenceItem) => `${i.name} ${i.tipo || ""}`;
const sweatspotSearchFields = (i: ReferenceItem) =>
  `${i.name} ${i.color || ""} ${i.productType || ""} ${i.logo ? "con logo" : "sin logo marcable"}`;

export default function AsesorInventoryView() {
  const [selectedBrand, setSelectedBrand] = useState<InventoryBrand | null>(null);
  const { catalog, isLoading } = useReferenceCatalog();

  const magicalBodies = useMemo(
    () => catalog.filter((i) => i.brandKey === "magical" && i.category === "cuerpos_referencias"),
    [catalog],
  );
  const magicalFinished = useMemo(
    () => catalog.filter((i) => i.brandKey === "magical" && i.category === "producto_terminado"),
    [catalog],
  );
  const sweatspotFinished = useMemo(
    () => catalog.filter((i) => i.brandKey === "sweatspot" && i.category === "producto_terminado"),
    [catalog],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventarios</h1>
        <p className="text-muted-foreground">Disponibilidad de productos por marca</p>
      </div>

      <Alert>
        <Package className="h-4 w-4" />
        <AlertDescription className="text-muted-foreground">
          Vista de disponibilidad — solo lectura. Para modificar el inventario contacta al administrador.
        </AlertDescription>
      </Alert>

      {!selectedBrand ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(["magical_warmers", "sweatspot"] as InventoryBrand[]).map((brand) => (
            <Card
              key={brand}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => setSelectedBrand(brand)}
            >
              <CardContent className="flex items-center justify-between py-5">
                <div>
                  <p className="font-medium">
                    {brand === "magical_warmers" ? "Magical Warmers" : "Sweatspot"}
                  </p>
                  <p className="text-sm text-muted-foreground">Ver disponibilidad de productos</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => setSelectedBrand(null)} className="gap-1.5 -ml-2">
            <ArrowLeft className="h-4 w-4" /> Volver a marcas
          </Button>

          {isLoading ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : selectedBrand === "magical_warmers" ? (
            <Tabs defaultValue="cuerpos" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="cuerpos">Cuerpos ({magicalBodies.length})</TabsTrigger>
                <TabsTrigger value="terminado">Producto Terminado ({magicalFinished.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="cuerpos">
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0">
                    <FacetedInventorySection
                      items={magicalBodies}
                      getValues={magicalFacetValues}
                      defs={MAGICAL_FACETS}
                      primaryKeys={["familia", "tipo"]}
                      columns={magicalColumns("Referencia")}
                      searchPlaceholder="Buscar cuerpo (ej. círculo 8 cm frío)..."
                      searchFields={magicalSearchFields}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="terminado">
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0">
                    <FacetedInventorySection
                      items={magicalFinished}
                      getValues={magicalFacetValues}
                      defs={MAGICAL_FACETS}
                      primaryKeys={["familia", "tipo"]}
                      columns={magicalColumns("Producto")}
                      searchPlaceholder="Buscar producto (ej. corazón térmico)..."
                      searchFields={magicalSearchFields}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pt-0 pb-2">
                <CardTitle className="text-base font-medium">Producto terminado</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <FacetedInventorySection
                  items={sweatspotFinished}
                  getValues={sweatspotFacetValues}
                  defs={SWEATSPOT_FACETS}
                  primaryKeys={["categoria", "tamano"]}
                  columns={sweatspotColumns}
                  searchPlaceholder="Buscar producto (ej. termo 500 azul con correa)..."
                  searchFields={sweatspotSearchFields}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
