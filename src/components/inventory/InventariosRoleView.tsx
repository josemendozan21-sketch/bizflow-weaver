import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Boxes, ShoppingBag, History, Beaker, Sparkles, Warehouse, Store, Tent, PackageSearch, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import CategorizedInventoryPanel from "@/components/inventory/CategorizedInventoryPanel";
import MateriaPrimaPanel from "@/components/inventory/MateriaPrimaPanel";
import WholesaleOrdersInbox from "@/components/inventory/WholesaleOrdersInbox";
import QuickMovementForm from "@/components/inventory/QuickMovementForm";
import InventoryChangeLogPanel from "@/components/inventory/InventoryChangeLogPanel";
import MovementHistoryTable from "@/components/inventory/MovementHistoryTable";
import ProductionMovementHistory from "@/components/production/ProductionMovementHistory";
import WeeklyInventoryExport from "@/components/inventory/WeeklyInventoryExport";
import InventoryDashboardSummary from "@/components/inventory/InventoryDashboardSummary";
import Punto92WarehousePanel from "@/components/inventory/Punto92WarehousePanel";
import FeriasWarehousePanel from "@/components/inventory/FeriasWarehousePanel";
import InventoryTraceabilityPanel from "@/components/inventory/InventoryTraceabilityPanel";

type WarehouseKey = "principal" | "punto92" | "ferias";

const WAREHOUSES: { key: WarehouseKey; label: string; icon: typeof Boxes }[] = [
  { key: "principal", label: "Bodega principal", icon: Warehouse },
  { key: "punto92", label: "Punto de la 92", icon: Store },
  { key: "ferias", label: "Ferias", icon: Tent },
];

const InventariosRoleView = () => {
  const [warehouse, setWarehouse] = useState<WarehouseKey>("principal");
  const [catalogBrand, setCatalogBrand] = useState<"magical_warmers" | "sweatspot">("magical_warmers");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventarios</h1>
        <p className="text-muted-foreground">Gestiona stock, recibe pedidos de producción y registra movimientos.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {WAREHOUSES.map((w) => {
          const Icon = w.icon;
          return (
            <Button
              key={w.key}
              variant={warehouse === w.key ? "default" : "outline"}
              size="sm"
              onClick={() => setWarehouse(w.key)}
            >
              <Icon className="h-4 w-4 mr-1" /> {w.label}
            </Button>
          );
        })}
      </div>

      {warehouse === "punto92" && <Punto92WarehousePanel />}
      {warehouse === "ferias" && <FeriasWarehousePanel />}

      {warehouse === "principal" && (
      <>
      <InventoryDashboardSummary />

      <Tabs defaultValue="catalogo" className="w-full">
        <TabsList className="flex h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="catalogo" className="gap-1.5 whitespace-nowrap">
            <PackageSearch className="h-4 w-4" /> Productos y referencias
          </TabsTrigger>
          <TabsTrigger value="bandeja" className="gap-1.5">
            <ShoppingBag className="h-4 w-4" /> Bandeja de pedidos
          </TabsTrigger>
          <TabsTrigger value="abastecimiento" className="gap-1.5 whitespace-nowrap">
            <PackageCheck className="h-4 w-4" /> Abastecimiento
          </TabsTrigger>

          <TabsTrigger value="trazabilidad" className="gap-1.5 whitespace-nowrap">
            <Route className="h-4 w-4" /> Trazabilidad
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="gap-1.5">
            <Boxes className="h-4 w-4" /> Entradas y Salidas
          </TabsTrigger>
          <TabsTrigger value="historial_cambios" className="gap-1.5 whitespace-nowrap">
            <History className="h-4 w-4" /> Historial de cambios
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-1.5">
            <History className="h-4 w-4" /> Historial de movimientos
          </TabsTrigger>
          <TabsTrigger value="materia_prima" className="gap-1.5">
            <Beaker className="h-4 w-4" /> Materia Prima
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <PackageSearch className="h-5 w-5 text-primary" />
                Productos y referencias
              </h2>
              <p className="text-sm text-muted-foreground">Crea, edita o elimina las referencias disponibles para Ventas y Producción.</p>
            </div>
            <div className="flex gap-2" aria-label="Seleccionar marca del catálogo">
              <Button
                type="button"
                size="sm"
                variant={catalogBrand === "magical_warmers" ? "default" : "outline"}
                onClick={() => setCatalogBrand("magical_warmers")}
              >
                <Sparkles className="mr-1 h-4 w-4" /> Magical Warmers
              </Button>
              <Button
                type="button"
                size="sm"
                variant={catalogBrand === "sweatspot" ? "default" : "outline"}
                onClick={() => setCatalogBrand("sweatspot")}
              >
                <Boxes className="mr-1 h-4 w-4" /> Sweatspot
              </Button>
            </div>
          </div>
          <CategorizedInventoryPanel
            key={catalogBrand}
            initialBrand={catalogBrand}
            initialCategory={catalogBrand === "magical_warmers" ? "cuerpos_referencias" : "producto_terminado"}
          />
        </TabsContent>

        <TabsContent value="bandeja" className="mt-4">
          <WholesaleOrdersInbox />
        </TabsContent>

        <TabsContent value="trazabilidad" className="mt-4">
          <InventoryTraceabilityPanel />
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <QuickMovementForm />
            <WeeklyInventoryExport />
          </div>
        </TabsContent>

        <TabsContent value="historial_cambios" className="mt-4">
          <InventoryChangeLogPanel />
        </TabsContent>

        <TabsContent value="historial" className="mt-4 space-y-4">
          <MovementHistoryTable />
          <ProductionMovementHistory />
        </TabsContent>

        <TabsContent value="materia_prima" className="mt-4">
          <MateriaPrimaPanel />
        </TabsContent>

      </Tabs>
      </>
      )}
    </div>
  );
};

export default InventariosRoleView;