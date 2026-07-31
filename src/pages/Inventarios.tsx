import { Beaker } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategorizedInventoryPanel from "@/components/inventory/CategorizedInventoryPanel";
import MateriaPrimaPanel from "@/components/inventory/MateriaPrimaPanel";
import AsesorInventoryView from "@/components/inventory/AsesorInventoryView";
import InventariosRoleView from "@/components/inventory/InventariosRoleView";
import { useAuth } from "@/contexts/AuthContext";

const FullInventoryView = () => {
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
          <TabsTrigger value="magical_warmers" className="gap-1.5">
            Magical Warmers
          </TabsTrigger>
          <TabsTrigger value="sweatspot" className="gap-1.5">
            Sweatspot
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materia_prima" className="mt-4">
          <MateriaPrimaPanel />
        </TabsContent>

        <TabsContent value="magical_warmers" className="mt-4 space-y-4">
          <CategorizedInventoryPanel initialBrand="magical_warmers" />
        </TabsContent>

        <TabsContent value="sweatspot" className="mt-4 space-y-4">
          <CategorizedInventoryPanel initialBrand="sweatspot" />
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
