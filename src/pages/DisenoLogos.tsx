import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DisenoLogos = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Diseño de Logos</h1>
        <p className="text-muted-foreground">Gestión de diseños y logos para clientes</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Diseños pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No hay diseños pendientes.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DisenoLogos;
