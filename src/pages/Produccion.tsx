import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StampingSection } from "@/components/production/StampingSection";
import { FillingSection } from "@/components/production/FillingSection";
import { BodyProductionSection } from "@/components/production/BodyProductionSection";

const Produccion = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Producción</h1>
        <p className="text-muted-foreground">Seguimiento de las etapas de producción</p>
      </div>

      <Tabs defaultValue="cuerpos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cuerpos">Cuerpos</TabsTrigger>
          <TabsTrigger value="estampacion">Estampación</TabsTrigger>
          <TabsTrigger value="llenado">Dosificación</TabsTrigger>
        </TabsList>

        <TabsContent value="cuerpos" className="mt-4">
          <BodyProductionSection />
        </TabsContent>

        <TabsContent value="estampacion" className="mt-4">
          <StampingSection />
        </TabsContent>

        <TabsContent value="llenado" className="mt-4">
          <FillingSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Produccion;
