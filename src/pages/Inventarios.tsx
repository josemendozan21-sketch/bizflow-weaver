import MaterialConfigSection from "@/components/inventory/MaterialConfigSection";
import ProductionRequirementsView from "@/components/inventory/ProductionRequirementsView";

const Inventarios = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventarios</h1>
        <p className="text-muted-foreground">Gestión y control de inventarios</p>
      </div>

      <ProductionRequirementsView />
      <MaterialConfigSection />
    </div>
  );
};

export default Inventarios;
