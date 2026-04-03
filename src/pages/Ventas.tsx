import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Ventas = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ventas</h1>
        <p className="text-muted-foreground">Gestión de pedidos al detal y al por mayor</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pedidos recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aún no hay pedidos registrados.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Ventas;
