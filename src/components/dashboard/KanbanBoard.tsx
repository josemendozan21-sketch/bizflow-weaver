import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface KanbanOrder {
  id: string;
  clientName: string;
  brand: "sweatspot" | "magical";
  quantity: number;
  status: string;
  priority: "alta" | "media" | "baja";
}

const COLUMNS = [
  { key: "pendiente", label: "Pendiente", dotColor: "bg-muted-foreground" },
  { key: "diseno", label: "Diseño", dotColor: "bg-violet-500" },
  { key: "cuerpos", label: "Producción de cuerpos", dotColor: "bg-blue-500" },
  { key: "estampacion", label: "Estampación", dotColor: "bg-amber-500" },
  { key: "dosificacion", label: "Dosificación", dotColor: "bg-emerald-500" },
  { key: "finalizado", label: "Finalizado", dotColor: "bg-primary" },
];

const priorityVariant: Record<string, string> = {
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  media: "bg-amber-100 text-amber-700 border-amber-300",
  baja: "bg-muted text-muted-foreground border-border",
};

interface KanbanBoardProps {
  orders: KanbanOrder[];
}

export function KanbanBoard({ orders }: KanbanBoardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Flujo de producción</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 divide-x divide-border">
          {COLUMNS.map((col) => {
            const colOrders = orders.filter((o) => o.status === col.key);
            return (
              <div key={col.key} className="min-h-[280px] flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50">
                  <span className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                  <span className="text-xs font-semibold text-foreground">{col.label}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                    {colOrders.length}
                  </Badge>
                </div>
                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-2">
                    {colOrders.length === 0 && (
                      <p className="text-[11px] text-muted-foreground text-center py-6">
                        Sin pedidos
                      </p>
                    )}
                    {colOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-lg border bg-card p-2.5 space-y-1.5 shadow-sm hover:shadow transition-shadow"
                      >
                        <p className="text-xs font-semibold text-foreground leading-tight">
                          {order.clientName}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              order.brand === "magical"
                                ? "border-violet-300 text-violet-700 bg-violet-50"
                                : "border-blue-300 text-blue-700 bg-blue-50"
                            }`}
                          >
                            {order.brand === "magical" ? "Magical" : "Sweatspot"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            ×{order.quantity}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${priorityVariant[order.priority]}`}
                        >
                          {order.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
