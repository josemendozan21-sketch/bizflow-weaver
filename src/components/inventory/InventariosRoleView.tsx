import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Boxes, Inbox, Factory } from "lucide-react";
import BrandSelectionCards, { type InventoryNotification } from "@/components/inventory/BrandSelectionCards";
import CategorizedInventoryPanel from "@/components/inventory/CategorizedInventoryPanel";
import SupplyReceptionPanel from "@/components/inventory/SupplyReceptionPanel";
import RequestBodyProductionDialog from "@/components/inventory/RequestBodyProductionDialog";
import type { InventoryBrand, InventoryCategory } from "@/stores/inventoryStore";

const InventariosRoleView = () => {
  const [selectedBrand, setSelectedBrand] = useState<InventoryBrand | null>(null);
  const [initialCategory, setInitialCategory] = useState<InventoryCategory>("materia_prima");
  const [highlightNames, setHighlightNames] = useState<string[]>([]);

  const handleNotificationClick = useCallback((brand: InventoryBrand, notification: InventoryNotification) => {
    if (notification.targetCategory) {
      setInitialCategory(notification.targetCategory);
      setHighlightNames(notification.targetItemNames);
      setSelectedBrand(brand);
    }
  }, []);

  const handleSelectBrand = useCallback((brand: InventoryBrand) => {
    setInitialCategory("materia_prima");
    setHighlightNames([]);
    setSelectedBrand(brand);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventarios</h1>
          <p className="text-muted-foreground">Gestiona stock, recibe pedidos de producción y solicita cuerpos.</p>
        </div>
        <RequestBodyProductionDialog />
      </div>

      <Tabs defaultValue="stock" className="w-full">
        <TabsList>
          <TabsTrigger value="stock" className="gap-1.5">
            <Boxes className="h-4 w-4" /> Inventario por marca
          </TabsTrigger>
          <TabsTrigger value="recepcion" className="gap-1.5">
            <Inbox className="h-4 w-4" /> Recepción de pedidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4 mt-4">
          {!selectedBrand ? (
            <>
              <p className="text-sm text-muted-foreground">Selecciona una marca para ver y editar su inventario:</p>
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

        <TabsContent value="recepcion" className="mt-4">
          <SupplyReceptionPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventariosRoleView;