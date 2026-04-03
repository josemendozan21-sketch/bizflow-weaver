import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Contabilidad = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contabilidad</h1>
        <p className="text-muted-foreground">Facturación y control de costos</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Resumen de facturación</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No hay facturas registradas.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Contabilidad;
