import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Calendar, Users, Package } from "lucide-react";
import { type Feria, useFeriaSales } from "@/hooks/useFerias";
import { FeriaInventoryTab } from "./FeriaInventoryTab";
import { FeriaSalesTab } from "./FeriaSalesTab";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_COLOR: Record<string, string> = {
  planificada: "bg-blue-500/15 text-blue-700",
  en_curso: "bg-emerald-500/15 text-emerald-700",
  finalizada: "bg-slate-500/15 text-slate-700",
  cancelada: "bg-red-500/15 text-red-700",
};

export function FeriaDetail({ feria, onBack }: { feria: Feria; onBack: () => void }) {
  const { data: sales = [] } = useFeriaSales(feria.id);

  const totalCosts = (feria.stand_cost || 0) + (feria.transport_cost || 0) + (feria.lodging_cost || 0) + (feria.other_costs || 0);
  const totalRevenue = useMemo(() => sales.reduce((s, x) => s + Number(x.total_amount), 0), [sales]);
  const profit = totalRevenue - totalCosts;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Volver</Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{feria.name}</h2>
            <Badge className={STATUS_COLOR[feria.status] || ""}>{feria.status.replace("_", " ")}</Badge>
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
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Costos totales</div>
          <p className="text-lg font-semibold text-red-600">${totalCosts.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Ingresos</div>
          <p className="text-lg font-semibold text-emerald-600">${totalRevenue.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Utilidad</div>
          <p className={`text-lg font-semibold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>${profit.toLocaleString()}</p>
        </Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
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
              <h4 className="font-semibold mb-2">Costos</h4>
              <p className="text-sm">Stand: ${feria.stand_cost.toLocaleString()}</p>
              <p className="text-sm">Transporte: ${feria.transport_cost.toLocaleString()}</p>
              <p className="text-sm">Hospedaje: ${feria.lodging_cost.toLocaleString()}</p>
              <p className="text-sm">Otros: ${feria.other_costs.toLocaleString()}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-1"><Users className="h-4 w-4" />Personal</h4>
              <div className="flex flex-wrap gap-1">
                {(feria.assigned_staff || []).length === 0 ? <span className="text-sm text-muted-foreground">Sin asignar</span> :
                  feria.assigned_staff!.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}
              </div>
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

        <TabsContent value="inventario"><FeriaInventoryTab feriaId={feria.id} /></TabsContent>
        <TabsContent value="ventas"><FeriaSalesTab feriaId={feria.id} /></TabsContent>
      </Tabs>
    </div>
  );
}
