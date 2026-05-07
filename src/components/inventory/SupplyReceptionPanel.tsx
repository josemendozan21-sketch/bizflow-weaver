import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PackagePlus, Inbox, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SupplyOrder {
  id: string;
  brand: string;
  item_name: string;
  item_type: string;
  quantity_requested: number;
  unit: string;
  status: string;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "materia_prima", label: "Materia prima" },
  { value: "cuerpos_referencias", label: "Cuerpos / Importados" },
  { value: "producto_terminado", label: "Producto terminado" },
];

const SupplyReceptionPanel = () => {
  const { user } = useAuth();
  const { stockItems, addStock, reserveBodyStock, refetch } = useInventory();
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual entry form
  const [brand, setBrand] = useState<string>("magical");
  const [category, setCategory] = useState<string>("materia_prima");
  const [itemName, setItemName] = useState<string>("");
  const [qty, setQty] = useState<string>("");
  const [unit, setUnit] = useState<string>("unidades");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("production_supply_orders")
      .select("*")
      .in("status", ["pendiente", "en_proceso"])
      .order("created_at", { ascending: false });
    setOrders((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const channel = supabase
      .channel("supply-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "production_supply_orders" }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const markReceived = async (order: SupplyOrder) => {
    // Increment stock
    const category = order.item_type === "cuerpos" ? "cuerpos_referencias" : "materia_prima";
    const result = await addStock(order.item_name, Number(order.quantity_requested), category, order.brand, order.unit || "unidades");
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    const { error } = await supabase
      .from("production_supply_orders")
      .update({ status: "completado", completed_at: new Date().toISOString(), completed_by: user?.id } as any)
      .eq("id", order.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pedido recibido y stock actualizado");
    fetchOrders();
    refetch();
  };

  const handleManualAdd = async () => {
    if (!itemName || !qty || Number(qty) <= 0) {
      toast.error("Completa nombre y cantidad");
      return;
    }
    const result = await addStock(itemName, Number(qty), category, brand, unit);
    if (result.success) {
      toast.success(result.message);
      setItemName("");
      setQty("");
      refetch();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" /> Pedidos pendientes desde producción
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay pedidos pendientes.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca</TableHead>
                  <TableHead>Ítem</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="capitalize">{o.brand}</TableCell>
                    <TableCell className="font-medium">{o.item_name}</TableCell>
                    <TableCell>{o.item_type === "cuerpos" ? "Cuerpos" : "Materia prima"}</TableCell>
                    <TableCell className="text-right">{o.quantity_requested} {o.unit}</TableCell>
                    <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{o.notes}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => markReceived(o)} className="gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Recibir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" /> Ingresar stock manualmente
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Marca</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="magical">Magical Warmers</SelectItem>
                <SelectItem value="sweatspot">Sweatspot</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nombre del ítem</Label>
            <Input
              list="existing-items"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Ej. Plástico frío, Termo 500ml..."
            />
            <datalist id="existing-items">
              {stockItems
                .filter((i) => i.brand === brand && i.category === category)
                .map((i) => <option key={i.id} value={i.name} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Cantidad</Label>
              <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div>
              <Label>Unidad</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidades">unidades</SelectItem>
                  <SelectItem value="gramos">gramos</SelectItem>
                  <SelectItem value="kilos">kilos</SelectItem>
                  <SelectItem value="tarros">tarros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleManualAdd} className="w-full gap-2">
              <PackagePlus className="h-4 w-4" /> Ingresar al inventario
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplyReceptionPanel;