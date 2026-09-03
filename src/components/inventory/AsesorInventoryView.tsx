import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReferenceCatalog } from "@/hooks/useReferenceCatalog";
import ReferenceLabel from "@/components/inventory/ReferenceLabel";
import FacetFilterBar from "@/components/inventory/FacetFilterBar";
import GroupedInventoryTable, {
  type InventoryColumn,
  type InventoryGroup,
} from "@/components/inventory/GroupedInventoryTable";
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

const StockIndicator = ({ available }: { available: number }) => {
  if (available <= 0) return <Badge variant="destructive">Sin stock</Badge>;
  if (available <= 10) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Bajo</Badge>;
  return <Badge className="bg-green-500 hover:bg-green-600 text-white">Disponible</Badge>;
};

const TypeBadge = ({ tipo }: { tipo: string | null }) => {
  if (tipo === "Frío")
    return <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">❄️ Frío</Badge>;
  if (tipo === "Térmico")
    return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200">🔥 Térmico</Badge>;
  return <span className="text-muted-foreground">—</span>;
};

type SortDir = "asc" | "desc";

interface FacetedSectionProps {
  items: ReferenceItem[];
  getValues: (item: ReferenceItem) => Record<string, string | null>;
  defs: typeof SWEATSPOT_FACETS;
  columns: InventoryColumn<ReferenceItem>[];
  searchPlaceholder: string;
  searchFields: (item: ReferenceItem) => string;
  getRowClassName?: (item: ReferenceItem) => string;
}

/** Sección de inventario con facetas macro → micro (idéntica en ambas marcas). */
function FacetedInventorySection({
  items,
  getValues,
  defs,
  columns,
  searchPlaceholder,
  searchFields,
  getRowClassName,
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
        selection={selection}
        onSelect={(key, value) => setSelection((s) => ({ ...s, [key]: value }))}
        onClear={() => setSelection({})}
        resultCount={filtered.length}
        sortDir={sortDir}
        onToggleSort={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
        onlyAvailable={onlyAvailable}
        onOnlyAvailableChange={setOnlyAvailable}
      />
      <GroupedInventoryTable
        groups={grouped}
        columns={columns}
        getRowKey={(i) => i.id}
        getRowClassName={getRowClassName}
      />
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
  { key: "tipo", header: "Tipo", render: (item) => <TypeBadge tipo={item.tipo} /> },
  { key: "available", header: "Disponible", align: "right", render: (item) => item.available },
  { key: "unit", header: "Unidad", render: (item) => item.unit },
  { key: "estado", header: "Estado", render: (item) => <StockIndicator available={item.available} /> },
];

const sweatspotColumns: InventoryColumn<ReferenceItem>[] = [
  { key: "name", header: "Producto", render: (item) => item.name, className: "font-medium" },
  { key: "color", header: "Color", render: (item) => item.color || "—" },
  {
    key: "logo",
    header: "Logo",
    render: (item) =>
      item.logo ? (
        <Badge variant="secondary" className="text-[10px]">CON LOGO</Badge>
      ) : (
        <Badge className="text-[10px] bg-blue-600 hover:bg-blue-700">MARCABLE</Badge>
      ),
  },
  { key: "origen", header: "Origen", render: (item) => item.productType || "—", className: "text-xs text-muted-foreground" },
  { key: "available", header: "Disponible", align: "right", render: (item) => item.available },
  { key: "unit", header: "Unidad", render: (item) => item.unit },
  { key: "estado", header: "Estado", render: (item) => <StockIndicator available={item.available} /> },
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

      <Alert className="border-blue-200 bg-blue-50">
        <Package className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          📦 Vista de disponibilidad — Solo lectura. Para modificar el inventario contacta al administrador.
        </AlertDescription>
      </Alert>

      {!selectedBrand ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(["magical_warmers", "sweatspot"] as InventoryBrand[]).map((brand) => (
            <Card
              key={brand}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedBrand(brand)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {brand === "magical_warmers" ? "Magical Warmers" : "Sweatspot"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Ver disponibilidad de productos</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => setSelectedBrand(null)} className="gap-1.5">
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
                <Card>
                  <CardHeader><CardTitle>Cuerpos disponibles</CardTitle></CardHeader>
                  <CardContent>
                    <FacetedInventorySection
                      items={magicalBodies}
                      getValues={magicalFacetValues}
                      defs={MAGICAL_FACETS}
                      columns={magicalColumns("Referencia")}
                      searchPlaceholder="Buscar cuerpo (ej. círculo 8 cm frío)..."
                      searchFields={magicalSearchFields}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="terminado">
                <Card>
                  <CardHeader><CardTitle>Producto terminado</CardTitle></CardHeader>
                  <CardContent>
                    <FacetedInventorySection
                      items={magicalFinished}
                      getValues={magicalFacetValues}
                      defs={MAGICAL_FACETS}
                      columns={magicalColumns("Producto")}
                      searchPlaceholder="Buscar producto (ej. corazón térmico)..."
                      searchFields={magicalSearchFields}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardHeader><CardTitle>Producto terminado</CardTitle></CardHeader>
              <CardContent>
                <FacetedInventorySection
                  items={sweatspotFinished}
                  getValues={sweatspotFacetValues}
                  defs={SWEATSPOT_FACETS}
                  columns={sweatspotColumns}
                  searchPlaceholder="Buscar producto (ej. termo 500 azul con correa)..."
                  searchFields={sweatspotSearchFields}
                  getRowClassName={(item) => (!item.logo ? "bg-blue-50/40" : "")}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
