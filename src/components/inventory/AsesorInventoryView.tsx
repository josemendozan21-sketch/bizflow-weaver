import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import type { InventoryBrand } from "@/stores/inventoryStore";

const StockIndicator = ({ available }: { available: number }) => {
  if (available === 0) return <Badge variant="destructive">Sin stock</Badge>;
  if (available <= 10) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Bajo</Badge>;
  return <Badge className="bg-green-500 hover:bg-green-600 text-white">Disponible</Badge>;
};

const classifyType = (referencia: string): string => {
  const lower = referencia.toLowerCase();
  if (lower.includes("frio") || lower.includes("frío") || lower.includes("cold")) return "Frío";
  return "Térmico";
};

export default function AsesorInventoryView() {
  const [selectedBrand, setSelectedBrand] = useState<InventoryBrand | null>(null);
  const { bodyStock, stockItems, isLoading } = useInventory();

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
                <p className="text-sm text-muted-foreground">
                  Ver disponibilidad de productos
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => setSelectedBrand(null)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Volver a marcas
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedBrand === "magical_warmers" ? "Magical Warmers — Cuerpos" : "Sweatspot — Productos"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Cargando...</p>
              ) : selectedBrand === "magical_warmers" ? (
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
                    {bodyStock
                      .filter((b) => b.brand.toLowerCase() === "magical")
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.referencia}</TableCell>
                          <TableCell>{classifyType(item.referencia)}</TableCell>
                          <TableCell className="text-right">{item.available}</TableCell>
                          <TableCell><StockIndicator available={item.available} /></TableCell>
                        </TableRow>
                      ))}
                    {bodyStock.filter((b) => b.brand.toLowerCase() === "magical").length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No hay registros de cuerpos
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Disponible</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockItems
                      .filter((s) => s.brand.toLowerCase() === "sweatspot" && s.category !== "materia_prima")
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className="text-right">{item.available} {item.unit}</TableCell>
                          <TableCell><StockIndicator available={item.available} /></TableCell>
                        </TableRow>
                      ))}
                    {stockItems.filter((s) => s.brand.toLowerCase() === "sweatspot" && s.category !== "materia_prima").length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No hay productos registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
