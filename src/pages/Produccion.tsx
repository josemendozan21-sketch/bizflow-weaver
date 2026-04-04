import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StampingSection } from "@/components/production/StampingSection";

const Produccion = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Producción</h1>
        <p className="text-muted-foreground">Seguimiento de las etapas de producción</p>
      </div>

      <Tabs defaultValue="cuerpos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cuerpos">Cuerpos / Referencias</TabsTrigger>
          <TabsTrigger value="estampacion">Estampación / Serigrafía</TabsTrigger>
          <TabsTrigger value="llenado">Llenado / Dosificación</TabsTrigger>
        </TabsList>

        <TabsContent value="cuerpos">
          <Card>
            <CardHeader>
              <CardTitle>Producción de cuerpos o referencias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No hay órdenes de producción de cuerpos activas.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estampacion">
          <Card>
            <CardHeader>
              <CardTitle>Producción de estampación o serigrafía</CardTitle>
            </CardHeader>
            <CardContent>
              <StampingSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llenado">
          <Card>
            <CardHeader>
              <CardTitle>Producción de llenado o dosificación</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No hay órdenes de llenado activas.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Produccion;
