import { useState } from "react";
import { Beaker, Warehouse, Store, Tent, Route, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategorizedInventoryPanel from "@/components/inventory/CategorizedInventoryPanel";
import MateriaPrimaPanel from "@/components/inventory/MateriaPrimaPanel";
import AsesorInventoryView from "@/components/inventory/AsesorInventoryView";
import InventariosRoleView from "@/components/inventory/InventariosRoleView";
import Punto92WarehousePanel from "@/components/inventory/Punto92WarehousePanel";
import FeriasWarehousePanel from "@/components/inventory/FeriasWarehousePanel";
import InventoryTraceabilityPanel from "@/components/inventory/InventoryTraceabilityPanel";
import InventoryChangeLogPanel from "@/components/inventory/InventoryChangeLogPanel";
import OrderRequirementsPanel from "@/components/inventory/OrderRequirementsPanel";
import BatchReceptionPanel from "@/components/inventory/BatchReceptionPanel";
import ProductionBatchesPanel from "@/components/production/ProductionBatchesPanel";

import { useAuth } from "@/contexts/AuthContext";

type WarehouseKey = "principal" | "punto92" | "ferias";

const WAREHOUSES: { key: WarehouseKey; label: string; icon: typeof Beaker }[] = [
  { key: "principal", label: "Bodega principal", icon: Warehouse },
  { key: "punto92", label: "Punto de la 92", icon: Store },
  { key: "ferias", label: "Ferias", icon: Tent },
];

const FullInventoryView = () => {
  const [warehouse, setWarehouse] = useState<WarehouseKey>("principal");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventarios</h1>
        <p className="text-muted-foreground">Gestión y control de inventarios por marca</p>
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
      <Tabs defaultValue="materia_prima" className="w-full">
        <TabsList>
          <TabsTrigger value="materia_prima" className="gap-1.5">
            <Beaker className="h-4 w-4" /> Materia Prima
          </TabsTrigger>
          <TabsTrigger value="trazabilidad" className="gap-1.5">
            <Route className="h-4 w-4" /> Trazabilidad
          </TabsTrigger>
          <TabsTrigger value="historial_cambios" className="gap-1.5">
            <History className="h-4 w-4" /> Historial de cambios
          </TabsTrigger>
          <TabsTrigger value="magical_warmers" className="gap-1.5">
            Magical Warmers
          </TabsTrigger>
          <TabsTrigger value="sweatspot" className="gap-1.5">
            Sweatspot
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materia_prima" className="mt-4">
          <MateriaPrimaPanel />
        </TabsContent>

        <TabsContent value="trazabilidad" className="mt-4">
          <InventoryTraceabilityPanel />
        </TabsContent>

        <TabsContent value="historial_cambios" className="mt-4">
          <InventoryChangeLogPanel />
        </TabsContent>

        <TabsContent value="magical_warmers" className="mt-4 space-y-4">
          <CategorizedInventoryPanel initialBrand="magical_warmers" />
        </TabsContent>

        <TabsContent value="sweatspot" className="mt-4 space-y-4">
          <CategorizedInventoryPanel initialBrand="sweatspot" />
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
};

const Inventarios = () => {
  const { role, loading } = useAuth();

  if (loading || !role) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Cargando inventario…</div>
    );
  }

  if (role === "asesor_comercial") {
    return <AsesorInventoryView />;
  }

  if (role === "inventarios") {
    return <InventariosRoleView />;
  }

  return <FullInventoryView />;
};

export default Inventarios;
