import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProductionBrandSelector, { type ProductionBrand } from "@/components/production/ProductionBrandSelector";
import { MagicalWarmersWorkflow } from "@/components/production/MagicalWarmersWorkflow";
import { SweatspotWorkflow } from "@/components/production/SweatspotWorkflow";

const Produccion = () => {
  const { role } = useAuth();
  const isReadOnly = role === "asesor_comercial";
  const [selectedBrand, setSelectedBrand] = useState<ProductionBrand | null>(null);

  return (
    <div className="space-y-6">
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

      {!selectedBrand ? (
        <ProductionBrandSelector selectedBrand={selectedBrand} onSelectBrand={setSelectedBrand} />
      ) : selectedBrand === "magical_warmers" ? (
        <MagicalWarmersWorkflow />
      ) : (
        <SweatspotWorkflow />
      )}
    </div>
  );
};

export default Produccion;
