import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Boxes, ShoppingBag, Zap, Beaker, Sparkles } from "lucide-react";
import CategorizedInventoryPanel from "@/components/inventory/CategorizedInventoryPanel";
import MateriaPrimaPanel from "@/components/inventory/MateriaPrimaPanel";
import WholesaleOrdersInbox from "@/components/inventory/WholesaleOrdersInbox";
import QuickMovementForm from "@/components/inventory/QuickMovementForm";
import MovementHistoryTable from "@/components/inventory/MovementHistoryTable";
import WeeklyInventoryExport from "@/components/inventory/WeeklyInventoryExport";

const InventariosRoleView = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventarios</h1>
        <p className="text-muted-foreground">Gestiona stock, recibe pedidos de producción y registra movimientos.</p>
      </div>

      <Tabs defaultValue="bandeja" className="w-full">
        <TabsList>
          <TabsTrigger value="bandeja" className="gap-1.5">
            <ShoppingBag className="h-4 w-4" /> Bandeja de pedidos
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="gap-1.5">
            <Zap className="h-4 w-4" /> Movimientos rápidos
          </TabsTrigger>
          <TabsTrigger value="materia_prima" className="gap-1.5">
            <Beaker className="h-4 w-4" /> Materia Prima
          </TabsTrigger>
          <TabsTrigger value="magical_warmers" className="gap-1.5">
            <Sparkles className="h-4 w-4" /> Magical Warmers
          </TabsTrigger>
          <TabsTrigger value="sweatspot" className="gap-1.5">
            <Boxes className="h-4 w-4" /> Sweatspot
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bandeja" className="mt-4">
          <WholesaleOrdersInbox />
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <QuickMovementForm />
            <WeeklyInventoryExport />
          </div>
          <MovementHistoryTable />
        </TabsContent>

        <TabsContent value="materia_prima" className="mt-4">
          <MateriaPrimaPanel />
        </TabsContent>

        <TabsContent value="magical_warmers" className="mt-4">
          <CategorizedInventoryPanel initialBrand="magical_warmers" initialCategory="cuerpos_referencias" />
        </TabsContent>

        <TabsContent value="sweatspot" className="mt-4">
          <CategorizedInventoryPanel initialBrand="sweatspot" initialCategory="cuerpos_referencias" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventariosRoleView;