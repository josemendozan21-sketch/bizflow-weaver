import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Snowflake, Thermometer, Package, Plus } from "lucide-react";
import type { ProductionOrder } from "@/hooks/useProductionOrders";
import type { SupabaseBodyStock, SupabaseStockItem } from "@/hooks/useInventory";

interface Props {
  references: string[];
  orders: ProductionOrder[];
  bodyStock: SupabaseBodyStock[];
  stockItems: SupabaseStockItem[];
  onProduce: (data: { referencia: string; tipoPlastico: "frio" | "calor"; unidadesSugeridas: number }) => void;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function detectTipoFromText(s: string): "frio" | "calor" | null {
  const t = s.toLowerCase();
  if (t.includes("calor")) return "calor";
  if (t.includes("frio") || t.includes("frío")) return "frio";
  return null;
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - now.getTime()) / 86400000);
}

interface DemandOrder {
  client: string;
  quantity: number;
  delivery: string | null;
  tipo: "frio" | "calor" | null;
}

interface RefSummary {
  referencia: string;
  available: number;
  minStock: number;
  demandTotal: number;
  demandFrio: number;
  demandCalor: number;
  earliestDelivery: string | null;
  orders: DemandOrder[];
}

export function BodyRequirementsPanel({ references, orders, bodyStock, stockItems, onProduce }: Props) {
  const [selected, setSelected] = useState<RefSummary | null>(null);

  const summaries = useMemo<RefSummary[]>(() => {
    // Dedupe references by normalized form, prefer the version with accents
    const seen = new Map<string, string>();
    for (const r of references) {
      const key = normalize(r);
      const existing = seen.get(key);
      if (!existing || /[áéíóúñ]/i.test(r)) seen.set(key, r);
    }
    const refs = Array.from(seen.values()).sort((a, b) => a.localeCompare(b));

    return refs.map((ref) => {
      const refKey = normalize(ref);

      const stock = bodyStock.find(
        (b) => normalize(b.brand) === "magical" && normalize(b.referencia) === refKey
      );
      const stockItem = stockItems.find(
        (s) =>
          normalize(s.brand) === "magical" &&
          s.category === "cuerpos_referencias" &&
          normalize(s.name) === refKey
      );

      const matchingOrders: DemandOrder[] = [];
      let demandFrio = 0;
      let demandCalor = 0;

      for (const o of orders) {
        if (o.current_stage === "listo") continue;
        const molde = (o.molde || "").trim();
        if (!molde) continue;
        const moldeNorm = normalize(molde);
        if (!moldeNorm.includes(refKey) && !refKey.includes(moldeNorm)) continue;
        // Skip if already past produccion_cuerpos
        const stages = o.stages || [];
        const cuerposIdx = stages.indexOf("produccion_cuerpos");
        const currentIdx = stages.indexOf(o.current_stage);
        if (cuerposIdx >= 0 && currentIdx > cuerposIdx) continue;
        if (!o.needs_cuerpos) continue;
        const tipo = detectTipoFromText(molde);
        matchingOrders.push({
          client: o.client_name,
          quantity: o.quantity,
          delivery: o.delivery_date ?? null,
          tipo,
        });
        if (tipo === "calor") demandCalor += o.quantity;
        else demandFrio += o.quantity;
      }

      const earliest = matchingOrders
        .map((m) => m.delivery)
        .filter(Boolean)
        .sort()[0] ?? null;

      return {
        referencia: ref,
        available: stock ? Math.max(stock.available, 0) : 0,
        minStock: stockItem?.min_stock ?? 0,
        demandTotal: demandFrio + demandCalor,
        demandFrio,
        demandCalor,
        earliestDelivery: earliest,
        orders: matchingOrders,
      };
    });
  }, [references, orders, bodyStock, stockItems]);

  // Sort: urgent (demand > available) first, then earliest delivery, then alphabetical
  const sorted = useMemo(() => {
    return [...summaries].sort((a, b) => {
      const aShort = a.demandTotal - a.available;
      const bShort = b.demandTotal - b.available;
      const aUrgent = aShort > 0;
      const bUrgent = bShort > 0;
      if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
      const da = a.earliestDelivery ?? "9999-12-31";
      const db = b.earliestDelivery ?? "9999-12-31";
      if (da !== db) return da < db ? -1 : 1;
      return a.referencia.localeCompare(b.referencia);
    });
  }, [summaries]);

  const openDetail = (r: RefSummary) => setSelected(r);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Referencias de cuerpos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Click en una referencia para ver pedidos activos y unidades recomendadas.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {sorted.map((r) => {
              const shortage = Math.max(r.demandTotal - r.available, 0);
              const isUrgent = shortage > 0;
              const lowStock = r.minStock > 0 && r.available < r.minStock;
              return (
                <button
                  key={r.referencia}
                  type="button"
                  onClick={() => openDetail(r)}
                  className={`text-left rounded-md border p-2.5 transition-colors hover:bg-accent ${
                    isUrgent
                      ? "border-destructive/40 bg-destructive/5"
                      : lowStock
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-sm font-medium text-foreground leading-tight">{r.referencia}</span>
                    {isUrgent && <Badge variant="destructive" className="text-[9px] h-4 px-1">!</Badge>}
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-2">
                    <span>
                      Stock: <span className="font-semibold text-foreground">{r.available}</span>
                    </span>
                    {r.demandTotal > 0 && (
                      <span>
                        Pedidos: <span className="font-semibold text-foreground">{r.demandTotal}</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.referencia}</DialogTitle>
            <DialogDescription>
              Resumen de inventario y pedidos activos para esta referencia.
            </DialogDescription>
          </DialogHeader>
          {selected && (() => {
            const s = selected;
            const shortage = Math.max(s.demandTotal - s.available, 0);
            const suggestedFrio = Math.max(s.demandFrio - s.available, 0);
            const suggestedCalor = Math.max(s.demandCalor - 0, 0); // calor doesn't share stock with frio in inventory? safer: independent demand
            // Default suggestion when no demand: fill to min_stock or 50
            const fallback = Math.max(s.minStock - s.available, 50);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border p-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Stock</p>
                    <p className="text-lg font-semibold">{s.available}</p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Pedidos</p>
                    <p className="text-lg font-semibold">{s.demandTotal}</p>
                  </div>
                  <div className={`rounded-md border p-2 ${shortage > 0 ? "border-destructive/40 bg-destructive/5" : ""}`}>
                    <p className="text-[10px] uppercase text-muted-foreground">Faltante</p>
                    <p className={`text-lg font-semibold ${shortage > 0 ? "text-destructive" : ""}`}>{shortage}</p>
                  </div>
                </div>

                {s.orders.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Pedidos que requieren esta referencia:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {s.orders
                        .slice()
                        .sort((a, b) => (a.delivery ?? "9999") < (b.delivery ?? "9999") ? -1 : 1)
                        .map((o, i) => {
                          const d = daysUntil(o.delivery);
                          return (
                            <div key={i} className="flex items-center justify-between text-xs rounded border px-2 py-1">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{o.client}</p>
                                <p className="text-muted-foreground text-[10px]">
                                  {o.delivery ? new Date(o.delivery).toLocaleDateString() : "Sin fecha"}
                                  {d !== null && (d < 0 ? ` (vencido ${Math.abs(d)}d)` : ` (${d}d)`)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {o.tipo === "calor" ? (
                                  <Thermometer className="h-3 w-3 text-orange-500" />
                                ) : (
                                  <Snowflake className="h-3 w-3 text-sky-500" />
                                )}
                                <Badge variant="outline" className="text-[10px]">{o.quantity} uds</Badge>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No hay pedidos activos para esta referencia. Sugerencia basada en stock mínimo.
                  </p>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Unidades recomendadas:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={suggestedFrio > 0 ? "default" : "outline"}
                      onClick={() => {
                        onProduce({
                          referencia: s.referencia,
                          tipoPlastico: "frio",
                          unidadesSugeridas: suggestedFrio > 0 ? suggestedFrio : fallback,
                        });
                        setSelected(null);
                      }}
                    >
                      <Snowflake className="h-3 w-3 mr-1" /> Frío ({suggestedFrio > 0 ? suggestedFrio : fallback})
                    </Button>
                    <Button
                      variant={suggestedCalor > 0 ? "default" : "outline"}
                      onClick={() => {
                        onProduce({
                          referencia: s.referencia,
                          tipoPlastico: "calor",
                          unidadesSugeridas: suggestedCalor > 0 ? suggestedCalor : fallback,
                        });
                        setSelected(null);
                      }}
                    >
                      <Thermometer className="h-3 w-3 mr-1" /> Calor ({suggestedCalor > 0 ? suggestedCalor : fallback})
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Se calcula como pedidos pendientes menos stock disponible. Puedes ajustar la cantidad en el formulario.
                  </p>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}