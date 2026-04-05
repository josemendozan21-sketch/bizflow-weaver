import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingCart,
  Factory,
  Stamp,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface KPI {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface KPICardsProps {
  kpis: {
    pedidosActivos: number;
    enProduccion: number;
    enEstampacion: number;
    enDosificacion: number;
    retrasados: number;
    finalizados: number;
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
      title: "En producción",
      value: kpis.enProduccion,
      icon: Factory,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "En estampación",
      value: kpis.enEstampacion,
      icon: Stamp,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
    },
    {
      title: "En dosificación",
      value: kpis.enDosificacion,
      icon: FlaskConical,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "Pedidos retrasados",
      value: kpis.retrasados,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Pedidos finalizados",
      value: kpis.finalizados,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <Card key={item.title} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${item.bgColor}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground truncate">{item.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
