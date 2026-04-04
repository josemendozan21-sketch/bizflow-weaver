import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Inventarios = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventarios</h1>
        <p className="text-muted-foreground">Gestión y control de inventarios</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Inventario general</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No hay productos registrados en el inventario.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventarios;
