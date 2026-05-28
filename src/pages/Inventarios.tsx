import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Beaker, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BrandSelectionCards, { type InventoryNotification } from "@/components/inventory/BrandSelectionCards";
import CategorizedInventoryPanel from "@/components/inventory/CategorizedInventoryPanel";
import MateriaPrimaPanel from "@/components/inventory/MateriaPrimaPanel";
import AsesorInventoryView from "@/components/inventory/AsesorInventoryView";
import InventariosRoleView from "@/components/inventory/InventariosRoleView";
import type { InventoryBrand, InventoryCategory } from "@/stores/inventoryStore";
import { useAuth } from "@/contexts/AuthContext";

const FullInventoryView = () => {
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
        <p className="text-muted-foreground">Gestión y control de inventarios por marca</p>
      </div>

      <Tabs defaultValue="materia_prima" className="w-full">
        <TabsList>
          <TabsTrigger value="materia_prima" className="gap-1.5">
            <Beaker className="h-4 w-4" /> Materia Prima
          </TabsTrigger>
          <TabsTrigger value="por_marca" className="gap-1.5">
            <Tag className="h-4 w-4" /> Por marca
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materia_prima" className="mt-4">
          <MateriaPrimaPanel />
        </TabsContent>

        <TabsContent value="por_marca" className="mt-4 space-y-4">
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
