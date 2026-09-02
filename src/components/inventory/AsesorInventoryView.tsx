import { useState, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Search, ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useReferenceCatalog } from "@/hooks/useReferenceCatalog";
import ReferenceLabel from "@/components/inventory/ReferenceLabel";
import { normalizeText } from "@/lib/referenceCatalog";
import type { InventoryBrand } from "@/stores/inventoryStore";


const StockIndicator = ({ available, minStock }: { available: number; minStock?: number }) => {
  if (minStock !== undefined) {
    if (available < minStock) return <Badge variant="destructive">Crítico</Badge>;
    if (available < minStock * 1.5) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Bajo</Badge>;
    return <Badge className="bg-green-500 hover:bg-green-600 text-white">OK</Badge>;
  }
  if (available === 0) return <Badge variant="destructive">Sin stock</Badge>;
  if (available <= 10) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Bajo</Badge>;
  return <Badge className="bg-green-500 hover:bg-green-600 text-white">Disponible</Badge>;
};

const EmptyMessage = () => (
  <p className="text-sm text-muted-foreground py-4 text-center">No hay registros en esta categoría.</p>
);

const TypeBadge = ({ tipo }: { tipo: string | null }) => {
  if (tipo === "Frío")
    return <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">❄️ Frío</Badge>;
  if (tipo === "Térmico")
    return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200">🔥 Térmico</Badge>;
  return <span className="text-muted-foreground">—</span>;
};

const normalize = normalizeText;



type TypeFilter = "todos" | "termico" | "frio";
type SortDir = "asc" | "desc";

interface FiltersBarProps {
  search: string;
  setSearch: (v: string) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (v: TypeFilter) => void;
  sortDir: SortDir;
  setSortDir: (v: SortDir) => void;
  showTypeFilter?: boolean;
  resultCount?: number;
}

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "frio", label: "❄️ Frío" },
  { value: "termico", label: "🔥 Térmico" },
];

const FiltersBar = ({
  search, setSearch, typeFilter, setTypeFilter, sortDir, setSortDir, showTypeFilter = true, resultCount,
}: FiltersBarProps) => (
  <div className="flex flex-wrap items-center gap-2 mb-4">
    <div className="relative flex-1 min-w-[180px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar producto o tipo (ej. pocket frío)..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-8 h-9"
      />
    </div>
    {showTypeFilter && (
      <div className="inline-flex rounded-md border p-0.5 gap-0.5">
        {TYPE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant={typeFilter === opt.value ? "default" : "ghost"}
            className="h-8 px-3"
            onClick={() => setTypeFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    )}
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 gap-1.5"
      onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
    >
      {sortDir === "asc" ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
      {sortDir === "asc" ? "A-Z" : "Z-A"}
    </Button>
    {resultCount !== undefined && (
      <span className="text-xs text-muted-foreground ml-auto">
        {resultCount} resultado{resultCount === 1 ? "" : "s"}
      </span>
    )}
  </div>
);


export default function AsesorInventoryView() {
  const [selectedBrand, setSelectedBrand] = useState<InventoryBrand | null>(null);
  const { catalog, isLoading } = useReferenceCatalog();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todos");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [onlySinLogo, setOnlySinLogo] = useState(false);

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

  const q = normalize(search.trim());

  const filteredMagicalBodies = useMemo(() => {
    return magicalBodies
      .filter((b) => {
        if (q && !normalize(`${b.name} ${b.tipo || ""}`).includes(q)) return false;
        if (typeFilter === "termico") return b.tipo === "Térmico";
        if (typeFilter === "frio") return b.tipo === "Frío";
        return true;
      })
      .sort((a, b) =>
        sortDir === "asc"
          ? a.name.localeCompare(b.name, "es", { sensitivity: "base" })
          : b.name.localeCompare(a.name, "es", { sensitivity: "base" })
      );
  }, [magicalBodies, q, typeFilter, sortDir]);

  const filteredMagicalFinished = useMemo(() => {
    return magicalFinished
      .filter((i) => {
        if (q && !normalize(`${i.name} ${i.tipo || ""}`).includes(q)) return false;
        if (typeFilter === "termico") return i.tipo === "Térmico";
        if (typeFilter === "frio") return i.tipo === "Frío";
        return true;
      })
      .sort((a, b) =>
        sortDir === "asc"
          ? a.name.localeCompare(b.name, "es", { sensitivity: "base" })
          : b.name.localeCompare(a.name, "es", { sensitivity: "base" })
      );
  }, [magicalFinished, q, typeFilter, sortDir]);


  const filteredSweatspotFinished = useMemo(() => {
    return sweatspotFinished
      .filter((i) => (q ? normalize(i.name).includes(q) : true))
      .filter((i) => (onlySinLogo ? !i.logo : true))
      .sort((a, b) =>
        sortDir === "asc"
          ? a.name.localeCompare(b.name, "es", { sensitivity: "base" })
          : b.name.localeCompare(a.name, "es", { sensitivity: "base" })
      );
  }, [sweatspotFinished, q, sortDir, onlySinLogo]);

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("todos");
    setSortDir("asc");
  };

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
              onClick={() => { resetFilters(); setSelectedBrand(brand); }}
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
          <Button variant="ghost" size="sm" onClick={() => { setSelectedBrand(null); resetFilters(); }} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Volver a marcas
          </Button>

          {isLoading ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : selectedBrand === "magical_warmers" ? (
            <Tabs defaultValue="cuerpos" onValueChange={() => resetFilters()} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="cuerpos">Cuerpos ({magicalBodies.length})</TabsTrigger>
                <TabsTrigger value="terminado">Producto Terminado ({magicalFinished.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="cuerpos">
                <Card>
                  <CardHeader><CardTitle>Cuerpos disponibles</CardTitle></CardHeader>
                  <CardContent>
                    <FiltersBar
                      search={search} setSearch={setSearch}
                      typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                      sortDir={sortDir} setSortDir={setSortDir}
                      resultCount={filteredMagicalBodies.length}
                    />
                    {filteredMagicalBodies.length === 0 ? <EmptyMessage /> : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Referencia</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Disponible</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMagicalBodies.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium"><ReferenceLabel name={item.name} /></TableCell>
                              <TableCell><TypeBadge tipo={item.tipo} /></TableCell>


                              <TableCell className="text-right">{item.available}</TableCell>
                              <TableCell><StockIndicator available={item.available} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="terminado">
                <Card>
                  <CardHeader><CardTitle>Producto terminado</CardTitle></CardHeader>
                  <CardContent>
                    <FiltersBar
                      search={search} setSearch={setSearch}
                      typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                      sortDir={sortDir} setSortDir={setSortDir}
                      resultCount={filteredMagicalFinished.length}
                    />
                    {filteredMagicalFinished.length === 0 ? <EmptyMessage /> : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Disponible</TableHead>
                            <TableHead>Unidad</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMagicalFinished.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium"><ReferenceLabel name={item.name} /></TableCell>
                              <TableCell><TypeBadge tipo={item.tipo} /></TableCell>
                              <TableCell className="text-right">{item.available}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell><StockIndicator available={item.available} /></TableCell>
                            </TableRow>
                          ))}

                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-6">
              {/* Sweatspot — Producto terminado */}
              <Card>
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle>Producto terminado</CardTitle>
                    <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5">
                      <Label htmlFor="asesor-only-sin-logo" className="text-xs text-blue-900 cursor-pointer">
                        Solo SIN LOGO (mayoristas con marcación)
                      </Label>
                      <Switch id="asesor-only-sin-logo" checked={onlySinLogo} onCheckedChange={setOnlySinLogo} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <FiltersBar
                    search={search} setSearch={setSearch}
                    typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                    sortDir={sortDir} setSortDir={setSortDir}
                    showTypeFilter={false}
                  />
                  {filteredSweatspotFinished.length === 0 ? <EmptyMessage /> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Color</TableHead>
                          <TableHead>Logo</TableHead>
                          <TableHead>Origen</TableHead>
                          <TableHead className="text-right">Disponible</TableHead>
                          <TableHead>Unidad</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSweatspotFinished.map((item) => (
                          <TableRow key={item.id} className={!item.logo ? "bg-blue-50/40" : ""}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.color || "—"}</TableCell>
                            <TableCell>
                              {item.logo ? (
                                <Badge variant="secondary" className="text-[10px]">CON LOGO</Badge>
                              ) : (
                                <Badge className="text-[10px] bg-blue-600 hover:bg-blue-700">MARCABLE</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.productType || "—"}</TableCell>
                            <TableCell className="text-right">{item.available}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell><StockIndicator available={item.available} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
