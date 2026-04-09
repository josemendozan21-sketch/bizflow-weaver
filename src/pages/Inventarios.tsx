import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BrandSelectionCards from "@/components/inventory/BrandSelectionCards";
import CategorizedInventoryPanel from "@/components/inventory/CategorizedInventoryPanel";
import type { InventoryBrand } from "@/stores/inventoryStore";

const Inventarios = () => {
  const [selectedBrand, setSelectedBrand] = useState<InventoryBrand | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventarios</h1>
        <p className="text-muted-foreground">Gestión y control de inventarios por marca</p>
      </div>

      {!selectedBrand ? (
        <>
          <p className="text-sm text-muted-foreground">Selecciona una marca para ver el inventario detallado:</p>
          <BrandSelectionCards selectedBrand={null} onSelectBrand={setSelectedBrand} />
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => setSelectedBrand(null)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Volver a marcas
          </Button>
          <CategorizedInventoryPanel initialBrand={selectedBrand} />
        </>
      )}
    </div>
  );
};

export default Inventarios;
