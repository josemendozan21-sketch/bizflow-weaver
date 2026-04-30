import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Receipt, History, Tent } from "lucide-react";
import { useFerias, useFeriaInventory, useFeriaSales, useMyPosAssignment } from "@/hooks/useFerias";
import { useAuth } from "@/contexts/AuthContext";
import { QuickSaleGrid } from "@/components/feria-pos/QuickSaleGrid";
import { DetailedSaleForm } from "@/components/feria-pos/DetailedSaleForm";
import { MySalesTab } from "@/components/feria-pos/MySalesTab";

export default function FeriaPOS() {
  const { role } = useAuth();
  const { data: ferias = [] } = useFerias();
  const { data: assignment } = useMyPosAssignment();

  // For pos users, force their assigned feria; for admin, allow choosing
  const allowSelect = role === "admin";
  const eligibleFerias = useMemo(() => {
    if (role === "feria_pos") return ferias.filter((f) => f.id === assignment?.feria_id);
    // For admin, only ferias that are dispatched or in_curso
    return ferias;
  }, [ferias, role, assignment]);

  const [feriaId, setFeriaId] = useState<string>("");

  useEffect(() => {
    if (!feriaId && eligibleFerias.length > 0) {
      setFeriaId(eligibleFerias[0].id);
    }
  }, [eligibleFerias, feriaId]);

  const feria = ferias.find((f) => f.id === feriaId);
  const { data: inventory = [] } = useFeriaInventory(feriaId || null);
  const { data: sales = [] } = useFeriaSales(feriaId || null);

  // Only show items that have been actually dispatched
  const dispatchedInventory = inventory.filter((it) => it.dispatch_status === "despachado" && it.quantity_dispatched > 0);

  if (eligibleFerias.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Tent className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          {role === "feria_pos"
            ? "Aún no tienes una feria asignada. Pídele al administrador que te asigne una."
            : "No hay ferias disponibles."}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Feria Punto de Venta</h1>
          <p className="text-sm text-muted-foreground">Vende en tiempo real durante el evento</p>
        </div>
        {allowSelect && eligibleFerias.length > 1 && (
          <Select value={feriaId} onValueChange={setFeriaId}>
            <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {eligibleFerias.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name} — {f.city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {feria && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tent className="h-5 w-5 text-primary" /> {feria.name}
              <Badge variant="outline" className="ml-2 capitalize">{feria.status.replace("_", " ")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {feria.city}{feria.venue ? ` · ${feria.venue}` : ""}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="quick">
        <TabsList>
          <TabsTrigger value="quick"><ShoppingCart className="mr-2 h-4 w-4" />Vender rápido</TabsTrigger>
          <TabsTrigger value="detailed"><Receipt className="mr-2 h-4 w-4" />Venta con detalle</TabsTrigger>
          <TabsTrigger value="mine"><History className="mr-2 h-4 w-4" />Mis ventas</TabsTrigger>
        </TabsList>

        <TabsContent value="quick">
          {feriaId && (
            <QuickSaleGrid feriaId={feriaId} inventory={dispatchedInventory} sales={sales} />
          )}
        </TabsContent>

        <TabsContent value="detailed">
          {feriaId && (
            <DetailedSaleForm feriaId={feriaId} inventory={dispatchedInventory} sales={sales} />
          )}
        </TabsContent>

        <TabsContent value="mine">
          {feriaId && <MySalesTab feriaId={feriaId} sales={sales} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}