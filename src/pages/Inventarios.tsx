import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BrandSelectionCards, { type InventoryNotification } from "@/components/inventory/BrandSelectionCards";
import CategorizedInventoryPanel from "@/components/inventory/CategorizedInventoryPanel";
import type { InventoryBrand, InventoryCategory } from "@/stores/inventoryStore";

const Inventarios = () => {
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventarios</h1>
        <p className="text-muted-foreground">Gestión y control de inventarios por marca</p>
      </div>

      {!selectedBrand ? (
        <>
          <p className="text-sm text-muted-foreground">Selecciona una marca para ver el inventario detallado:</p>
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
    </div>
  );
};

export default Inventarios;
