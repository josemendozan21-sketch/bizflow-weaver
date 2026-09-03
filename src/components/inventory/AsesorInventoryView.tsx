import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, ChevronRight, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReferenceCatalog } from "@/hooks/useReferenceCatalog";
import PageHeader from "@/components/common/PageHeader";
import FacetFilterBar from "@/components/inventory/FacetFilterBar";
import GroupedInventoryTable, {
  type InventoryColumn,
  type InventoryGroup,
} from "@/components/inventory/GroupedInventoryTable";
import { cn } from "@/lib/utils";
import { cleanReferenceName, normalizeText, type ReferenceItem } from "@/lib/referenceCatalog";
import {
  MAGICAL_FACETS,
  SWEATSPOT_FACETS,
  buildFacetGroups,
  buildVariantRows,
  magicalFacetValues,
  matchesSelection,
  pickGroupKey,
  sweatspotFacetValues,
  type FacetSelection,
  type VariantRow,
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

type Row = VariantRow<ReferenceItem>;

interface VariantColumnDef {
  value: string;
  header: string;
}

interface FacetedSectionProps {
  items: ReferenceItem[];
  getValues: (item: ReferenceItem) => Record<string, string | null>;
  defs: typeof SWEATSPOT_FACETS;
  primaryKeys: string[];
  /** Faceta que se despliega como columnas (ej. tipo o logo). */
  variantKey: string;
  variantColumns: VariantColumnDef[];
  firstHeader: string;
  metaParts: (row: Row) => (string | null | undefined)[];
  searchPlaceholder: string;
  searchFields: (item: ReferenceItem) => string;
}

/** Sección de inventario con facetas macro → micro (idéntica en ambas marcas). */
function FacetedInventorySection({
  items,
  getValues,
  defs,
  primaryKeys,
  variantKey,
  variantColumns,
  firstHeader,
  metaParts,
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
    () => base.filter((i) => matchesSelection(getValues(i), selection)),
    [base, selection, getValues],
  );

  const rows = useMemo(
    () =>
      buildVariantRows(
        filtered,
        getValues,
        (i) => cleanReferenceName(i.name),
        (i) => i.available,
        variantKey,
      ).sort((a, b) =>
        sortDir === "asc"
          ? a.label.localeCompare(b.label, "es", { sensitivity: "base" })
          : b.label.localeCompare(a.label, "es", { sensitivity: "base" }),
      ),
    [filtered, getValues, variantKey, sortDir],
  );

  // Al filtrar por una variante solo se muestra esa columna.
  const activeVariant = selection[variantKey];
  const shownVariants = activeVariant
    ? variantColumns.filter((v) => v.value === activeVariant)
    : variantColumns;

  const columns: InventoryColumn<Row>[] = useMemo(
    () => [
      { key: "name", header: firstHeader, render: (row) => row.label, className: "font-medium" },
      { key: "meta", header: "Detalle", render: (row) => <MetaLine parts={metaParts(row)} /> },
      ...shownVariants.map((v) => ({
        key: `v-${v.value}`,
        header: v.header,
        align: "right" as const,
        render: (row: Row) =>
          row.variants[v.value] === undefined ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="tabular-nums">{row.variants[v.value].toLocaleString("es-CO")}</span>
          ),
      })),
      {
        key: "estado",
        header: "Estado",
        align: "right",
        render: (row) => <StockDot available={row.totalAvailable} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firstHeader, metaParts, JSON.stringify(shownVariants)],
  );

  const groupKey = pickGroupKey(
    groupsDef.filter((g) => g.key !== variantKey),
    selection,
  );

  const grouped: InventoryGroup<Row>[] = useMemo(() => {
    if (!groupKey) {
      return [
        {
          key: "__all__",
          label: "Resultados",
          items: rows,
          units: rows.reduce((s, r) => s + r.totalAvailable, 0),
        },
      ];
    }
    const map = new Map<string, InventoryGroup<Row>>();
    for (const row of rows) {
      const value = row.values[groupKey] || "Sin especificar";
      const g = map.get(value) || { key: value, label: value, items: [], units: 0 };
      g.items.push(row);
      g.units += row.totalAvailable;
      map.set(value, g);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  }, [rows, groupKey]);

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
        resultCount={rows.length}
        totalCount={items.length}
        sortDir={sortDir}
        onToggleSort={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
        onlyAvailable={onlyAvailable}
        onOnlyAvailableChange={setOnlyAvailable}
      />
      <GroupedInventoryTable groups={grouped} columns={columns} getRowKey={(row) => row.key} />
    </>
  );
}

const MAGICAL_VARIANTS: VariantColumnDef[] = [
  { value: "Frío", header: "❄️ Frío" },
  { value: "Térmico", header: "🔥 Térmico" },
];

const SWEATSPOT_VARIANTS: VariantColumnDef[] = [
  { value: "Con logo", header: "Con logo" },
  { value: "Marcable (sin logo)", header: "Marcable" },
];

const magicalMeta = (row: Row) => [row.values.tamano];
const sweatspotMeta = (row: Row) => [row.values.color, row.values.origen];

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
      <PageHeader title="Inventarios" description="Disponibilidad de productos por marca" />

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
                      variantKey="tipo"
                      variantColumns={MAGICAL_VARIANTS}
                      firstHeader="Referencia"
                      metaParts={magicalMeta}
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
                      variantKey="tipo"
                      variantColumns={MAGICAL_VARIANTS}
                      firstHeader="Producto"
                      metaParts={magicalMeta}
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
                  variantKey="logo"
                  variantColumns={SWEATSPOT_VARIANTS}
                  firstHeader="Producto"
                  metaParts={sweatspotMeta}
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
