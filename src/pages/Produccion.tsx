import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Produccion = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Producción</h1>
        <p className="text-muted-foreground">Seguimiento de etapas de producción</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cola de producción</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No hay pedidos en producción.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Produccion;
