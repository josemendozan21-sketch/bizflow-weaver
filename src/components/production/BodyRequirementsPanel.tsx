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
import { Snowflake, Thermometer, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  const t = normalize(s);
  if (t.includes("calor") || t.includes("termico")) return "calor";
  if (t.includes("frio")) return "frio";
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
  const [selectedTipo, setSelectedTipo] = useState<"frio" | "calor">("frio");
  const [openFrio, setOpenFrio] = useState(false);
  const [openCalor, setOpenCalor] = useState(false);

  const summaries = useMemo<RefSummary[]>(() => {
    // Strip qualifiers like "(Frío)", "Térmico", "FRIO" to get base ref name
    const QUALIFIER_RE = /\s*\(?\s*(fr[ií]o|t[eé]rmico|calor)\s*\)?\s*/gi;
    const baseOf = (s: string) =>
      s
        .replace(/\s*\([^)]*\)/g, "")
        .replace(QUALIFIER_RE, " ")
        .replace(/\s+/g, " ")
        .trim();
    const baseKey = (s: string) => normalize(baseOf(s));

    // Dedupe references by BASE name, prefer the cleanest label (no parens, with accents)
    const seen = new Map<string, string>();
    for (const r of references) {
      const key = baseKey(r);
      if (!key) continue;
      const base = baseOf(r);
      const existing = seen.get(key);
      const preferred =
        !existing ||
        // Prefer label without parens
        (/\(/.test(existing) && !/\(/.test(base)) ||
        // Prefer label with accents when both are similar
        (!/\(/.test(existing) === !/\(/.test(base) && /[áéíóúñ]/i.test(base));
      if (preferred) seen.set(key, base);
    }
    const refs = Array.from(seen.values()).sort((a, b) => a.localeCompare(b));

    return refs.map((ref) => {
      const refKey = normalize(ref);

      // Sum stock across all body_stock entries whose base name matches this ref
      const available = bodyStock
        .filter((b) => normalize(b.brand) === "magical" && baseKey(b.referencia) === refKey)
        .reduce((sum, b) => sum + Math.max(b.available, 0), 0);

      const stockItem = stockItems.find(
        (s) =>
          normalize(s.brand) === "magical" &&
          s.category === "cuerpos_referencias" &&
          baseKey(s.name) === refKey
      );

      const matchingOrders: DemandOrder[] = [];
      let demandFrio = 0;
      let demandCalor = 0;

      for (const o of orders) {
        if (o.current_stage === "listo") continue;
        const molde = (o.molde || "").trim();
        if (!molde) continue;
        const moldeNorm = normalize(molde);
        // Strip parenthetical qualifiers like "(Frío)" to compare base name
        const moldeBase = moldeNorm.replace(/\s*\([^)]*\)/g, "").trim();
        if (!moldeBase.includes(refKey) && !refKey.includes(moldeBase)) continue;
        // Skip if already past produccion_cuerpos
        const stages = o.stages || [];
        const cuerposIdx = stages.indexOf("produccion_cuerpos");
        const currentIdx = stages.indexOf(o.current_stage);
        if (cuerposIdx >= 0 && currentIdx > cuerposIdx) continue;
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
        available,
        minStock: stockItem?.min_stock ?? 0,
        demandTotal: demandFrio + demandCalor,
        demandFrio,
        demandCalor,
        earliestDelivery: earliest,
        orders: matchingOrders,
      };
    });
  }, [references, orders, bodyStock, stockItems]);

  // Sort: urgent (tipo demand > available) first, then earliest delivery, then alphabetical
  const sortFor = (tipo: "frio" | "calor") =>
    summaries
      // Only show refs that have demand for this tipo
      .filter((r) => (tipo === "frio" ? r.demandFrio : r.demandCalor) > 0)
      .slice()
      .sort((a, b) => {
      const ad = tipo === "frio" ? a.demandFrio : a.demandCalor;
      const bd = tipo === "frio" ? b.demandFrio : b.demandCalor;
      const aUrgent = ad > a.available;
      const bUrgent = bd > b.available;
      if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
      const da = a.earliestDelivery ?? "9999-12-31";
      const db = b.earliestDelivery ?? "9999-12-31";
      if (da !== db) return da < db ? -1 : 1;
      return a.referencia.localeCompare(b.referencia);
    });

  const frioSorted = useMemo(() => sortFor("frio"), [summaries]);
  const calorSorted = useMemo(() => sortFor("calor"), [summaries]);

  const openDetail = (r: RefSummary, tipo: "frio" | "calor") => {
    setSelectedTipo(tipo);
    setSelected(r);
  };

  const urgentCount = (list: RefSummary[], tipo: "frio" | "calor") =>
    list.filter((r) => (tipo === "frio" ? r.demandFrio : r.demandCalor) > r.available).length;

  const renderGrid = (list: RefSummary[], tipo: "frio" | "calor") => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {list.map((r) => {
        const demand = tipo === "frio" ? r.demandFrio : r.demandCalor;
        const shortage = Math.max(demand - r.available, 0);
        const isUrgent = shortage > 0;
        const lowStock = r.minStock > 0 && r.available < r.minStock;
        return (
          <button
            key={r.referencia}
            type="button"
            onClick={() => openDetail(r, tipo)}
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
              {demand > 0 && (
                <span>
                  Pedidos: <span className="font-semibold text-foreground">{demand}</span>
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Referencias de cuerpos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Selecciona el tipo de plástico para ver las referencias y sus pedidos activos.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Collapsible open={openFrio} onOpenChange={setOpenFrio}>
            <CollapsibleTrigger className="w-full flex items-center justify-between rounded-md border border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 px-3 py-2.5 transition-colors">
              <div className="flex items-center gap-2">
                <Snowflake className="h-4 w-4 text-sky-500" />
                <span className="text-sm font-semibold">Productos fríos</span>
                <Badge variant="outline" className="text-[10px]">{frioSorted.length}</Badge>
                {urgentCount(frioSorted, "frio") > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {urgentCount(frioSorted, "frio")} urgente(s)
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openFrio ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              {renderGrid(frioSorted, "frio")}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openCalor} onOpenChange={setOpenCalor}>
            <CollapsibleTrigger className="w-full flex items-center justify-between rounded-md border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 px-3 py-2.5 transition-colors">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-semibold">Productos térmicos</span>
                <Badge variant="outline" className="text-[10px]">{calorSorted.length}</Badge>
                {urgentCount(calorSorted, "calor") > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {urgentCount(calorSorted, "calor")} urgente(s)
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${openCalor ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              {renderGrid(calorSorted, "calor")}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTipo === "frio" ? (
                <Snowflake className="h-4 w-4 text-sky-500" />
              ) : (
                <Thermometer className="h-4 w-4 text-orange-500" />
              )}
              {selected?.referencia}
              <Badge variant="outline" className="text-[10px]">
                {selectedTipo === "frio" ? "Frío" : "Térmico"}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Resumen de inventario y pedidos activos para esta referencia.
            </DialogDescription>
          </DialogHeader>
          {selected && (() => {
            const s = selected;
            const demand = selectedTipo === "frio" ? s.demandFrio : s.demandCalor;
            const shortage = Math.max(demand - s.available, 0);
            // Default suggestion when no demand: fill to min_stock or 50
            const fallback = Math.max(s.minStock - s.available, 50);
            const suggested = shortage > 0 ? shortage : fallback;
            const filteredOrders = s.orders.filter((o) =>
              selectedTipo === "calor" ? o.tipo === "calor" : o.tipo !== "calor"
            );
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border p-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Stock</p>
                    <p className="text-lg font-semibold">{s.available}</p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Pedidos</p>
                    <p className="text-lg font-semibold">{demand}</p>
                  </div>
                  <div className={`rounded-md border p-2 ${shortage > 0 ? "border-destructive/40 bg-destructive/5" : ""}`}>
                    <p className="text-[10px] uppercase text-muted-foreground">Faltante</p>
                    <p className={`text-lg font-semibold ${shortage > 0 ? "text-destructive" : ""}`}>{shortage}</p>
                  </div>
                </div>

                {filteredOrders.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Pedidos que requieren esta referencia:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {filteredOrders
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
                  <Button
                    className="w-full"
                    onClick={() => {
                      onProduce({
                        referencia: s.referencia,
                        tipoPlastico: selectedTipo,
                        unidadesSugeridas: suggested,
                      });
                      setSelected(null);
                    }}
                  >
                    {selectedTipo === "frio" ? (
                      <Snowflake className="h-3 w-3 mr-1" />
                    ) : (
                      <Thermometer className="h-3 w-3 mr-1" />
                    )}
                    Producir {selectedTipo === "frio" ? "frío" : "calor"} ({suggested})
                  </Button>
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