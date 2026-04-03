import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Factory, Truck, Calculator } from "lucide-react";

const stats = [
  { title: "Pedidos hoy", value: "12", icon: ShoppingCart, description: "Ventas activas" },
  { title: "En producción", value: "8", icon: Factory, description: "Pedidos en proceso" },
  { title: "Por despachar", value: "5", icon: Truck, description: "Listos para envío" },
  { title: "Facturados", value: "23", icon: Calculator, description: "Este mes" },
];

const Index = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inicio</h1>
        <p className="text-muted-foreground">Resumen general de operaciones</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Index;
