import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Boxes, ShoppingBag, History, Beaker, Sparkles, Warehouse, Store, Tent, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import CategorizedInventoryPanel from "@/components/inventory/CategorizedInventoryPanel";
import MateriaPrimaPanel from "@/components/inventory/MateriaPrimaPanel";
import WholesaleOrdersInbox from "@/components/inventory/WholesaleOrdersInbox";
import QuickMovementForm from "@/components/inventory/QuickMovementForm";
import MovementHistoryTable from "@/components/inventory/MovementHistoryTable";
import ProductionMovementHistory from "@/components/production/ProductionMovementHistory";
import WeeklyInventoryExport from "@/components/inventory/WeeklyInventoryExport";
import InventoryDashboardSummary from "@/components/inventory/InventoryDashboardSummary";
import Punto92WarehousePanel from "@/components/inventory/Punto92WarehousePanel";
import FeriasWarehousePanel from "@/components/inventory/FeriasWarehousePanel";
import ReservationsPanel from "@/components/inventory/ReservationsPanel";

type WarehouseKey = "principal" | "punto92" | "ferias";

const WAREHOUSES: { key: WarehouseKey; label: string; icon: typeof Boxes }[] = [
  { key: "principal", label: "Bodega principal", icon: Warehouse },
  { key: "punto92", label: "Punto de la 92", icon: Store },
  { key: "ferias", label: "Ferias", icon: Tent },
];

const InventariosRoleView = () => {
  const [warehouse, setWarehouse] = useState<WarehouseKey>("principal");

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

      <Tabs defaultValue="bandeja" className="w-full">
        <TabsList>
          <TabsTrigger value="bandeja" className="gap-1.5">
            <ShoppingBag className="h-4 w-4" /> Bandeja de pedidos
          </TabsTrigger>
          <TabsTrigger value="reservas" className="gap-1.5">
            <BookmarkCheck className="h-4 w-4" /> Reservas
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="gap-1.5">
            <Boxes className="h-4 w-4" /> Entradas y Salidas
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-1.5">
            <History className="h-4 w-4" /> Historial de movimientos
          </TabsTrigger>
          <TabsTrigger value="materia_prima" className="gap-1.5">
            <Beaker className="h-4 w-4" /> Materia Prima
          </TabsTrigger>
          <TabsTrigger value="magical_warmers" className="gap-1.5">
            <Sparkles className="h-4 w-4" /> Magical Warmers
          </TabsTrigger>
          <TabsTrigger value="sweatspot" className="gap-1.5">
            <Boxes className="h-4 w-4" /> Sweatspot
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bandeja" className="mt-4">
          <WholesaleOrdersInbox />
        </TabsContent>

        <TabsContent value="reservas" className="mt-4">
          <ReservationsPanel />
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <QuickMovementForm />
            <WeeklyInventoryExport />
          </div>
        </TabsContent>

        <TabsContent value="historial" className="mt-4 space-y-4">
          <MovementHistoryTable />
          <ProductionMovementHistory />
        </TabsContent>

        <TabsContent value="materia_prima" className="mt-4">
          <MateriaPrimaPanel />
        </TabsContent>

        <TabsContent value="magical_warmers" className="mt-4">
          <CategorizedInventoryPanel initialBrand="magical_warmers" initialCategory="cuerpos_referencias" />
        </TabsContent>

        <TabsContent value="sweatspot" className="mt-4">
          <CategorizedInventoryPanel initialBrand="sweatspot" initialCategory="cuerpos_referencias" />
        </TabsContent>
      </Tabs>
      </>
      )}
    </div>
  );
};

export default InventariosRoleView;