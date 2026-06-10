import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, DollarSign, Clock, Store } from "lucide-react";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n || 0);

interface KPI {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface KPICardsProps {
  kpis: {
    pedidosActivos: number;
    ventasDelDia: number;
    pendienteAbono: number;
    ventasMes92: number;
  };
}

export function KPICards({ kpis }: KPICardsProps) {
  const items: KPI[] = [
    {
      title: "Pedidos activos",
      value: kpis.pedidosActivos,
      icon: ShoppingCart,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Ventas del día (Punto 92)",
      value: fmtCOP(kpis.ventasDelDia),
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Pendiente abono",
      value: fmtCOP(kpis.pendienteAbono),
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "Ventas mes (Punto 92)",
      value: fmtCOP(kpis.ventasMes92),
      icon: Store,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${item.bgColor}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-foreground truncate">{item.value}</p>
                <p className="text-xs text-muted-foreground truncate">{item.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
