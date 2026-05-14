import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Store, ShoppingCart, Package, ArrowDownToLine, BarChart3, Receipt } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePosLocations,
  useMyPosLocation,
  usePosProducts,
  usePosSales,
  usePosMovements,
} from "@/hooks/usePuntosVenta";
import { PuntoInventario } from "@/components/puntos-venta/PuntoInventario";
import { PuntoEntradaForm } from "@/components/puntos-venta/PuntoEntradaForm";
import { PuntoVentaPOS } from "@/components/puntos-venta/PuntoVentaPOS";
import { PuntoVentaDetalle } from "@/components/puntos-venta/PuntoVentaDetalle";
import { PuntoReportes } from "@/components/puntos-venta/PuntoReportes";

export default function PuntosVenta() {
  const { role } = useAuth();
  const { data: locations = [] } = usePosLocations();
  const { data: myLocationId } = useMyPosLocation();

  const isAdmin = role === "admin";
  const isContabilidad = role === "contabilidad";
  const isPos = role === "pos_punto";
  const canEdit = isAdmin || isPos;
  const readOnly = isContabilidad;

  const eligible = useMemo(() => {
    if (isPos) return locations.filter((l) => l.id === myLocationId);
    return locations;
  }, [locations, isPos, myLocationId]);

  const [locationId, setLocationId] = useState<string>("");
  useEffect(() => {
    if (!locationId && eligible.length > 0) setLocationId(eligible[0].id);
  }, [eligible, locationId]);

  const { data: products = [] } = usePosProducts(locationId || null);
  const { data: sales = [] } = usePosSales(locationId || null);
  const { data: movements = [] } = usePosMovements(locationId || null);

  const location = locations.find((l) => l.id === locationId);

  if (eligible.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Store className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          {isPos
            ? "Aún no tienes un punto asignado. Pídele al administrador que te asigne uno."
            : "No hay puntos de venta creados."}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Puntos de Venta</h1>
          <p className="text-sm text-muted-foreground">
            Tiendas físicas con inventario y ventas independientes de casa matriz
          </p>
        </div>
        {!isPos && eligible.length > 1 && (
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {eligible.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name} — {l.city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {location && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-5 w-5 text-primary" /> {location.name}
              <Badge variant="outline" className="ml-2 capitalize">{location.status}</Badge>
              {readOnly && <Badge variant="secondary" className="ml-1">Solo lectura</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {location.city}{location.address ? ` · ${location.address}` : ""}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={readOnly ? "reportes" : "vender"}>
        <TabsList>
          {!readOnly && (
            <TabsTrigger value="vender"><ShoppingCart className="h-4 w-4 mr-1" /> Vender</TabsTrigger>
          )}
          <TabsTrigger value="inventario"><Package className="h-4 w-4 mr-1" /> Inventario</TabsTrigger>
          {!readOnly && (
            <TabsTrigger value="entradas"><ArrowDownToLine className="h-4 w-4 mr-1" /> Entradas</TabsTrigger>
          )}
          <TabsTrigger value="reportes"><BarChart3 className="h-4 w-4 mr-1" /> Reportes</TabsTrigger>
        </TabsList>

        {!readOnly && (
          <TabsContent value="vender">
            {locationId && (
              <Tabs defaultValue="rapido" className="space-y-3">
                <TabsList>
                  <TabsTrigger value="rapido"><ShoppingCart className="h-4 w-4 mr-1" /> Venta rápida</TabsTrigger>
                  <TabsTrigger value="detalle"><Receipt className="h-4 w-4 mr-1" /> Venta con detalle</TabsTrigger>
                </TabsList>
                <TabsContent value="rapido">
                  <PuntoVentaPOS locationId={locationId} products={products} />
                </TabsContent>
                <TabsContent value="detalle">
                  <PuntoVentaDetalle locationId={locationId} products={products} />
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
        )}

        <TabsContent value="inventario">
          {locationId && <PuntoInventario locationId={locationId} products={products} canEdit={canEdit} />}
        </TabsContent>

        {!readOnly && (
          <TabsContent value="entradas">
            {locationId && <PuntoEntradaForm locationId={locationId} products={products} />}
          </TabsContent>
        )}

        <TabsContent value="reportes">
          {locationId && location && (
            <PuntoReportes
              sales={sales}
              movements={movements}
              products={products}
              locationId={locationId}
              location={{ name: location.name, city: location.city, address: location.address }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
