import CategorizedInventoryPanel from "@/components/inventory/CategorizedInventoryPanel";

const Inventarios = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventarios</h1>
        <p className="text-muted-foreground">Gestión y control de inventarios por marca</p>
      </div>

      <CategorizedInventoryPanel />
    </div>
  );
};

export default Inventarios;
