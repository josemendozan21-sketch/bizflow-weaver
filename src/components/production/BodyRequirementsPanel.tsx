import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Snowflake, Thermometer, AlertTriangle, Package, Plus } from "lucide-react";
import type { ProductionOrder } from "@/hooks/useProductionOrders";
import type { SupabaseBodyStock } from "@/hooks/useInventory";

interface Props {
  orders: ProductionOrder[];
  bodyStock: SupabaseBodyStock[];
  isProducible: (ref: string) => boolean;
  onProduce: (data: { referencia: string; tipoPlastico: "frio" | "calor"; unidadesSugeridas: number }) => void;
}

interface Aggregate {
  key: string;
  referencia: string;
  tipoPlastico: "frio" | "calor";
  required: number;
  available: number;
  missing: number;
  earliestDelivery: string | null;
  clients: string[];
  ordersCount: number;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function detectTipo(molde: string): "frio" | "calor" {
  return molde.toLowerCase().includes("calor") ? "calor" : "frio";
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - now.getTime()) / 86400000);
}

function urgencyColor(days: number | null): { variant: "destructive" | "default" | "secondary"; label: string } {
  if (days === null) return { variant: "secondary", label: "Sin fecha" };
  if (days < 0) return { variant: "destructive", label: `Vencido ${Math.abs(days)}d` };
  if (days <= 3) return { variant: "destructive", label: `${days}d restantes` };
  if (days <= 7) return { variant: "default", label: `${days}d restantes` };
  return { variant: "secondary", label: `${days}d restantes` };
}

export function BodyRequirementsPanel({ orders, bodyStock, isProducible, onProduce }: Props) {
  const aggregates = useMemo<Aggregate[]>(() => {
    const map = new Map<string, Aggregate>();

    for (const o of orders) {
      if (o.current_stage === "listo") continue;
      if (!o.needs_cuerpos) continue;
      const ref = (o.molde || "").trim();
      if (!ref) continue;
      if (!isProducible(ref)) continue;

      // Skip if order has already passed the produccion_cuerpos stage
      const stages = o.stages || [];
      const cuerposIdx = stages.indexOf("produccion_cuerpos");
      const currentIdx = stages.indexOf(o.current_stage);
      if (cuerposIdx >= 0 && currentIdx > cuerposIdx) continue;

      const tipo = detectTipo(ref);
      const key = `${normalize(ref)}|${tipo}`;
      const existing = map.get(key);
      if (existing) {
        existing.required += o.quantity;
        existing.ordersCount += 1;
        if (!existing.clients.includes(o.client_name)) existing.clients.push(o.client_name);
        if (o.delivery_date) {
          if (!existing.earliestDelivery || o.delivery_date < existing.earliestDelivery) {
            existing.earliestDelivery = o.delivery_date;
          }
        }
      } else {
        map.set(key, {
          key,
          referencia: ref,
          tipoPlastico: tipo,
          required: o.quantity,
          available: 0,
          missing: 0,
          earliestDelivery: o.delivery_date ?? null,
          clients: [o.client_name],
          ordersCount: 1,
        });
      }
    }

    // Attach available stock & compute missing
    for (const agg of map.values()) {
      const stock = bodyStock.find(
        (b) => normalize(b.brand) === "magical" && normalize(b.referencia) === normalize(agg.referencia)
      );
      agg.available = stock ? Math.max(stock.available, 0) : 0;
      agg.missing = Math.max(agg.required - agg.available, 0);
    }

    return Array.from(map.values()).sort((a, b) => {
      // Missing > 0 first
      if ((a.missing > 0) !== (b.missing > 0)) return a.missing > 0 ? -1 : 1;
      // Earlier delivery first
      const da = a.earliestDelivery ?? "9999-12-31";
      const db = b.earliestDelivery ?? "9999-12-31";
      if (da !== db) return da < db ? -1 : 1;
      // Larger missing first
      return b.missing - a.missing;
    });
  }, [orders, bodyStock, isProducible]);

  if (aggregates.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No hay pedidos activos que requieran producción de cuerpos.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          Cuerpos requeridos por pedidos activos
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Agrupado por referencia. Ordenado por urgencia (faltante + fecha de entrega).
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {aggregates.map((a) => {
          const days = daysUntil(a.earliestDelivery);
          const urgency = urgencyColor(days);
          const TipoIcon = a.tipoPlastico === "frio" ? Snowflake : Thermometer;
          const hasMissing = a.missing > 0;
          return (
            <div
              key={a.key}
              className={`rounded-md border p-3 ${hasMissing ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TipoIcon className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-semibold text-sm text-foreground">{a.referencia}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {a.tipoPlastico === "frio" ? "Frío" : "Calor"}
                    </Badge>
                    <Badge variant={urgency.variant} className="text-[10px]">
                      {urgency.label}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>
                      <Package className="inline h-3 w-3 mr-0.5" />
                      Requerido: <span className="font-medium text-foreground">{a.required}</span>
                    </span>
                    <span>
                      Disponible: <span className="font-medium text-foreground">{a.available}</span>
                    </span>
                    <span>
                      Faltante:{" "}
                      <span className={`font-semibold ${hasMissing ? "text-destructive" : "text-foreground"}`}>
                        {a.missing}
                      </span>
                    </span>
                    <span>
                      {a.ordersCount} pedido{a.ordersCount === 1 ? "" : "s"}
                    </span>
                    {a.earliestDelivery && (
                      <span>
                        Entrega:{" "}
                        <span className="font-medium text-foreground">
                          {new Date(a.earliestDelivery).toLocaleDateString()}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    Clientes: {a.clients.slice(0, 3).join(", ")}
                    {a.clients.length > 3 ? ` +${a.clients.length - 3}` : ""}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={hasMissing ? "default" : "outline"}
                  onClick={() =>
                    onProduce({
                      referencia: a.referencia,
                      tipoPlastico: a.tipoPlastico,
                      unidadesSugeridas: hasMissing ? a.missing : a.required,
                    })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Producir
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}