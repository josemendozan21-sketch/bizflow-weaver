import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Boxes, ShoppingBag, Zap, Beaker } from "lucide-react";
import BrandSelectionCards, { type InventoryNotification } from "@/components/inventory/BrandSelectionCards";
import CategorizedInventoryPanel from "@/components/inventory/CategorizedInventoryPanel";
import MateriaPrimaPanel from "@/components/inventory/MateriaPrimaPanel";
import WholesaleOrdersInbox from "@/components/inventory/WholesaleOrdersInbox";
import QuickMovementForm from "@/components/inventory/QuickMovementForm";
import MovementHistoryTable from "@/components/inventory/MovementHistoryTable";
import WeeklyInventoryExport from "@/components/inventory/WeeklyInventoryExport";
import type { InventoryBrand, InventoryCategory } from "@/stores/inventoryStore";

const InventariosRoleView = () => {
  const [selectedBrand, setSelectedBrand] = useState<InventoryBrand | null>(null);
  const [initialCategory, setInitialCategory] = useState<InventoryCategory>("cuerpos_referencias");
  const [highlightNames, setHighlightNames] = useState<string[]>([]);

  const handleNotificationClick = useCallback((brand: InventoryBrand, notification: InventoryNotification) => {
    if (notification.targetCategory) {
      setInitialCategory(notification.targetCategory === "materia_prima" ? "cuerpos_referencias" : notification.targetCategory);
      setHighlightNames(notification.targetItemNames);
      setSelectedBrand(brand);
    }
  }, []);

  const handleSelectBrand = useCallback((brand: InventoryBrand) => {
    setInitialCategory("cuerpos_referencias");
    setHighlightNames([]);
    setSelectedBrand(brand);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventarios</h1>
        <p className="text-muted-foreground">Gestiona stock, recibe pedidos de producción y registra movimientos.</p>
      </div>

      <Tabs defaultValue="bandeja" className="w-full">
        <TabsList>
          <TabsTrigger value="bandeja" className="gap-1.5">
            <ShoppingBag className="h-4 w-4" /> Bandeja de pedidos
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="gap-1.5">
            <Zap className="h-4 w-4" /> Movimientos rápidos
          </TabsTrigger>
          <TabsTrigger value="materia_prima" className="gap-1.5">
            <Beaker className="h-4 w-4" /> Materia Prima
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-1.5">
            <Boxes className="h-4 w-4" /> Por marca
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bandeja" className="mt-4">
          <WholesaleOrdersInbox />
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <QuickMovementForm />
            <WeeklyInventoryExport />
          </div>
          <MovementHistoryTable />
        </TabsContent>

        <TabsContent value="materia_prima" className="mt-4">
          <MateriaPrimaPanel />
        </TabsContent>

        <TabsContent value="stock" className="space-y-4 mt-4">
          {!selectedBrand ? (
            <>
              <p className="text-sm text-muted-foreground">Selecciona una marca para ver cuerpos, producto terminado e importados:</p>
              <BrandSelectionCards
                selectedBrand={null}
                onSelectBrand={handleSelectBrand}
                onNotificationClick={handleNotificationClick}
              />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedBrand(null); setHighlightNames([]); }} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Volver a marcas
              </Button>
              <CategorizedInventoryPanel
                key={`${selectedBrand}-${initialCategory}-${highlightNames.join(",")}`}
                initialBrand={selectedBrand}
                initialCategory={initialCategory}
                highlightItemNames={highlightNames}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventariosRoleView;