import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Calendar, Package, Hammer } from "lucide-react";
import { type Feria, useFeriaSales, calcFeriaTotalCost } from "@/hooks/useFerias";
import { FeriaInventoryTab } from "./FeriaInventoryTab";
import { FeriaSalesTab } from "./FeriaSalesTab";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_COLOR: Record<string, string> = {
  planificada: "bg-primary/15 text-primary border-primary/30",
  en_curso: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  finalizada: "bg-muted text-muted-foreground border-border",
  cancelada: "bg-destructive/15 text-destructive border-destructive/30",
};

const COST_BREAKDOWN: Array<{ key: keyof Feria; label: string }> = [
  { key: "stand_cost", label: "Costo Feria" },
  { key: "shipping_cost", label: "Envío Mercancía" },
  { key: "tickets_cost", label: "Tiquetes" },
  { key: "advertising_cost", label: "Publicidad" },
  { key: "merchandise_cost", label: "Costo de Mercancía" },
  { key: "employees_cost", label: "Empleados" },
  { key: "lodging_cost", label: "Hospedaje" },
  { key: "transport_cost", label: "Transporte" },
  { key: "food_cost", label: "Alimentación" },
  { key: "other_costs", label: "Otros" },
];

export function FeriaDetail({ feria, onBack }: { feria: Feria; onBack: () => void }) {
  const { data: sales = [] } = useFeriaSales(feria.id);

  const totalCosts = calcFeriaTotalCost(feria);
  const totalRevenue = useMemo(() => sales.reduce((s, x) => s + Number(x.total_amount), 0), [sales]);
  const profit = totalRevenue - totalCosts;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{feria.name}</h2>
            <Badge variant="outline" className={STATUS_COLOR[feria.status] || ""}>{feria.status.replace("_", " ")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {feria.city}{feria.venue ? ` · ${feria.venue}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Calendar className="h-3 w-3" />Fechas</div>
          <p className="text-sm font-medium mt-1">{format(new Date(feria.start_date), "dd MMM", { locale: es })} – {format(new Date(feria.end_date), "dd MMM yyyy", { locale: es })}</p>
          {feria.setup_date && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Hammer className="h-3 w-3" /> Montaje: {format(new Date(feria.setup_date), "dd MMM", { locale: es })}
            </p>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Costo Total</div>
          <p className="text-lg font-semibold text-destructive">${totalCosts.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Ingreso Total</div>
          <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">${totalRevenue.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Utilidad</div>
          <p className={`text-lg font-semibold ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
            ${profit.toLocaleString()}
          </p>
          {totalRevenue > 0 && <p className="text-xs text-muted-foreground">{margin.toFixed(1)}% margen</p>}
        </Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="costos">Desglose de costos</TabsTrigger>
          <TabsTrigger value="inventario"><Package className="mr-2 h-4 w-4" />Inventario asignado</TabsTrigger>
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-3">
          <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Stand</h4>
              <p className="text-sm">N°: <span className="text-muted-foreground">{feria.stand_number || "—"}</span></p>
              <p className="text-sm">Tamaño: <span className="text-muted-foreground">{feria.stand_size || "—"}</span></p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Materiales</h4>
              <div className="flex flex-wrap gap-1">
                {(feria.materials_needed || []).length === 0 ? <span className="text-sm text-muted-foreground">Sin materiales</span> :
                  feria.materials_needed!.map((s, i) => <Badge key={i} variant="outline">{s}</Badge>)}
              </div>
            </div>
            {feria.notes && (
              <div className="md:col-span-2">
                <h4 className="font-semibold mb-2">Notas</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feria.notes}</p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="costos">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Desglose de costos</h3>
            <div className="space-y-2">
              {COST_BREAKDOWN.map((c) => {
                const value = Number(feria[c.key] || 0);
                return (
                  <div key={c.key as string} className="flex justify-between py-2 border-b last:border-0">
                    <span className="text-sm">{c.label}</span>
                    <span className="text-sm font-medium">${value.toLocaleString()}</span>
                  </div>
                );
              })}
              <div className="flex justify-between pt-3 border-t-2 font-bold">
                <span>Costo Total</span>
                <span className="text-destructive">${totalCosts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Ingreso Total</span>
                <span className="text-emerald-600 dark:text-emerald-400">${totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-bold text-lg bg-emerald-500/10 px-3 py-2 rounded">
                <span>Utilidad</span>
                <span className={profit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
                  ${profit.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="inventario"><FeriaInventoryTab feriaId={feria.id} /></TabsContent>
        <TabsContent value="ventas"><FeriaSalesTab feriaId={feria.id} /></TabsContent>
      </Tabs>
    </div>
  );
}
