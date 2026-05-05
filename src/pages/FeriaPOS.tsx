import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Receipt, History, Tent, Package, DollarSign, CreditCard, Smartphone, Banknote } from "lucide-react";
import { useFerias, useFeriaInventory, useFeriaSales, useMyPosAssignment } from "@/hooks/useFerias";
import { useAuth } from "@/contexts/AuthContext";
import { QuickSaleGrid } from "@/components/feria-pos/QuickSaleGrid";
import { DetailedSaleForm } from "@/components/feria-pos/DetailedSaleForm";
import { MySalesTab } from "@/components/feria-pos/MySalesTab";
import { FeriaInventoryStatus } from "@/components/feria-pos/FeriaInventoryStatus";

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

  const totals = useMemo(() => {
    const sumBy = (m: string) =>
      sales.filter((s) => (s.payment_method || "").toLowerCase() === m)
        .reduce((a, b) => a + Number(b.total_amount), 0);
    return {
      total: sales.reduce((a, b) => a + Number(b.total_amount), 0),
      units: sales.reduce((a, b) => a + b.quantity, 0),
      efectivo: sumBy("efectivo"),
      tarjeta: sumBy("tarjeta") + sumBy("datafono"),
      nequi: sumBy("nequi"),
      otros: sumBy("transferencia") + sumBy("otro"),
    };
  }, [sales]);

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

      {feriaId && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><DollarSign className="h-4 w-4" /> Ventas totales</div>
            <p className="text-lg font-bold mt-1">${totals.total.toLocaleString()}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Package className="h-4 w-4" /> Unidades</div>
            <p className="text-lg font-bold mt-1">{totals.units}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Banknote className="h-4 w-4" /> Efectivo</div>
            <p className="text-lg font-bold mt-1">${totals.efectivo.toLocaleString()}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><CreditCard className="h-4 w-4" /> Tarjeta</div>
            <p className="text-lg font-bold mt-1">${totals.tarjeta.toLocaleString()}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Smartphone className="h-4 w-4" /> Nequi</div>
            <p className="text-lg font-bold mt-1">${totals.nequi.toLocaleString()}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">Transf./Otro</div>
            <p className="text-lg font-bold mt-1">${totals.otros.toLocaleString()}</p>
          </Card>
        </div>
      )}

      <Tabs defaultValue="quick">
        <TabsList>
          <TabsTrigger value="quick"><ShoppingCart className="mr-2 h-4 w-4" />Vender rápido</TabsTrigger>
          <TabsTrigger value="detailed"><Receipt className="mr-2 h-4 w-4" />Venta con detalle</TabsTrigger>
          <TabsTrigger value="inventory"><Package className="mr-2 h-4 w-4" />Inventario</TabsTrigger>
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

        <TabsContent value="inventory">
          {feriaId && <FeriaInventoryStatus inventory={dispatchedInventory} sales={sales} />}
        </TabsContent>

        <TabsContent value="mine">
          {feriaId && <MySalesTab feriaId={feriaId} sales={sales} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}