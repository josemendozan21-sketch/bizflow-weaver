import CategorizedInventoryPanel from "@/components/inventory/CategorizedInventoryPanel";
import ProductionRequirementsPanel from "@/components/inventory/ProductionRequirementsPanel";
import MaterialConfigSection from "@/components/inventory/MaterialConfigSection";

const Inventarios = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventarios</h1>
        <p className="text-muted-foreground">Gestión y control de inventarios por marca</p>
      </div>

      <CategorizedInventoryPanel />
      <ProductionRequirementsPanel />
      <MaterialConfigSection />
    </div>
  );
};

export default Inventarios;
