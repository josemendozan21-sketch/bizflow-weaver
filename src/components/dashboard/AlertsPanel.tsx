import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Flame, PenTool } from "lucide-react";

export interface DashboardAlert {
  id: string;
  type: "inventario" | "atrasado" | "urgente" | "diseno";
  message: string;
}

const alertConfig: Record<
  DashboardAlert["type"],
  { icon: React.ElementType; label: string; color: string }
> = {
  inventario: { icon: AlertTriangle, label: "Bajo inventario", color: "text-amber-600" },
  atrasado: { icon: Clock, label: "Atrasado", color: "text-destructive" },
  urgente: { icon: Flame, label: "Urgente", color: "text-red-600" },
  diseno: { icon: PenTool, label: "Diseño pendiente", color: "text-violet-600" },
};

interface AlertsPanelProps {
  alerts: DashboardAlert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay alertas activas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Alertas
          <Badge variant="destructive" className="text-[10px]">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => {
          const cfg = alertConfig[alert.type];
          return (
            <div
              key={alert.id}
              className="flex items-start gap-2 rounded-md border p-2.5 bg-muted/30"
            >
              <cfg.icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
              <div className="min-w-0">
                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                <p className="text-xs text-foreground leading-snug">{alert.message}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
