import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProductionBrandSelector, { type ProductionBrand } from "@/components/production/ProductionBrandSelector";
import { MagicalWarmersWorkflow } from "@/components/production/MagicalWarmersWorkflow";
import { SweatspotWorkflow } from "@/components/production/SweatspotWorkflow";
import { EstampacionProductionView } from "@/components/production/EstampacionProductionView";
import { RollCutsView } from "@/components/production/RollCutsView";
import ProductionMovementHistory from "@/components/production/ProductionMovementHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProductionAlerts } from "@/hooks/useProductionAlerts";

const Produccion = () => {
  const { role } = useAuth();
  const isReadOnly = role === "asesor_comercial" || role === "usuario_visual";
  const isEstampacion = role === "estampacion";
  const [selectedBrand, setSelectedBrand] = useState<ProductionBrand | null>(null);
  const [topTab, setTopTab] = useState<"marcas" | "rollos" | "historial">("marcas");

  // Show toast popups when new production orders arrive
  useProductionAlerts();

  // Estampacion role sees a dedicated view
  if (isEstampacion) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Estampación</h1>
            <p className="text-muted-foreground">Órdenes en etapa de estampación</p>
          </div>
        </div>
        <EstampacionProductionView />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          {selectedBrand && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedBrand(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Producción</h1>
              {isReadOnly && (
                <Badge variant="secondary" className="gap-1">
                  <Eye className="h-3 w-3" /> Solo lectura
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {selectedBrand
                ? `Gestión de producción — ${selectedBrand === "magical_warmers" ? "Magical Warmers" : "Sweatspot"}`
                : "Selecciona una marca para gestionar su producción"}
            </p>
          </div>
        </div>
      </div>

      {selectedBrand ? (
        selectedBrand === "magical_warmers" ? <MagicalWarmersWorkflow /> : <SweatspotWorkflow />
      ) : (
        <Tabs value={topTab} onValueChange={(v) => setTopTab(v as any)}>
          <TabsList>
            <TabsTrigger value="marcas">Marcas</TabsTrigger>
            <TabsTrigger value="rollos">Corte de Rollos</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
            <TabsTrigger value="cambios">Historial de cambios</TabsTrigger>
          </TabsList>
          <TabsContent value="marcas" className="mt-4">
            <ProductionBrandSelector selectedBrand={selectedBrand} onSelectBrand={setSelectedBrand} />
          </TabsContent>
          <TabsContent value="rollos" className="mt-4">
            <RollCutsView />
          </TabsContent>
          <TabsContent value="historial" className="mt-4">
            <ProductionMovementHistory />
          </TabsContent>
          <TabsContent value="cambios" className="mt-4">
            <ProcessChangeLogPanel area="produccion" />
          </TabsContent>
        </Tabs>

      )}
    </div>
  );
};

export default Produccion;
