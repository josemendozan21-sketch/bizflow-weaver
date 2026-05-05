import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, MapPin, Calendar, Truck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useFerias, useAllDispatchRequests, useFeriaInventory, useConfirmDispatch } from "@/hooks/useFerias";

export function FeriaDispatchTab() {
  const { data: ferias = [] } = useFerias();
  const { data: requests = [] } = useAllDispatchRequests();

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No hay solicitudes de feria pendientes ni despachadas.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const feria = ferias.find((f) => f.id === req.feria_id);
        if (!feria) return null;
        return <FeriaDispatchCard key={req.id} feria={feria} request={req} />;
      })}
    </div>
  );
}

function FeriaDispatchCard({ feria, request }: { feria: any; request: any }) {
  const { data: inventory = [] } = useFeriaInventory(feria.id);
  const confirm = useConfirmDispatch();
  const isDispatched = request.status === "despachado";

  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [furniture, setFurniture] = useState(request.furniture_dispatched || false);
  const [furnitureItems, setFurnitureItems] = useState((request.furniture_items || []).join(", "));
  const [notes, setNotes] = useState(request.dispatch_notes || "");

  const getQty = (it: any) => {
    if (isDispatched) return it.quantity_dispatched;
    if (quantities[it.id] !== undefined) return parseInt(quantities[it.id], 10) || 0;
    return 0; // logística debe ingresar las unidades reales
  };

  const handleConfirm = async () => {
    await confirm.mutateAsync({
      feria_id: feria.id,
      lines: inventory.map((it) => ({ id: it.id, quantity_dispatched: getQty(it) })),
      furniture_dispatched: furniture,
      furniture_items: furnitureItems
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      dispatch_notes: notes,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">{feria.name}</CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{feria.city}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />
                {format(new Date(feria.start_date), "dd MMM", { locale: es })} – {format(new Date(feria.end_date), "dd MMM", { locale: es })}
              </span>
            </div>
          </div>
          {isDispatched ? (
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Despachado
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
              <Truck className="h-3 w-3 mr-1" /> Pendiente
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isDispatched && (
          <p className="text-xs text-muted-foreground">
            Indica las unidades que realmente estás enviando para esta feria. Pueden ser menos de las solicitadas si no hay stock suficiente.
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marca</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Pedido</TableHead>
              <TableHead className="text-right w-44">Unidades reales enviadas</TableHead>
              <TableHead className="text-right">Faltante</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">Sin productos solicitados</TableCell></TableRow>
            ) : inventory.map((it) => {
              const dispatched = getQty(it);
              const missing = it.quantity_assigned - dispatched;
              return (
                <TableRow key={it.id}>
                  <TableCell><Badge variant="outline" className="capitalize">{it.brand}</Badge></TableCell>
                  <TableCell>{it.product_name}</TableCell>
                  <TableCell className="text-right">{it.quantity_assigned}</TableCell>
                  <TableCell className="text-right">
                    {isDispatched ? (
                      <span className="font-medium">{it.quantity_dispatched}</span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        max={it.quantity_assigned}
                        placeholder="0"
                        value={quantities[it.id] ?? ""}
                        onChange={(e) => setQuantities({ ...quantities, [it.id]: e.target.value })}
                        className="h-8 text-right"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {missing > 0 ? (
                      <Badge variant="destructive">{missing}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={furniture}
                onCheckedChange={(c) => setFurniture(!!c)}
                disabled={isDispatched}
              />
              <Label className="!mt-0">¿Despacha mobiliario?</Label>
            </div>
            {furniture && (
              <Input
                placeholder="mesa, silla, rack…"
                value={furnitureItems}
                onChange={(e) => setFurnitureItems(e.target.value)}
                disabled={isDispatched}
              />
            )}
          </div>
          <div>
            <Label>Notas de despacho</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isDispatched}
              rows={2}
            />
          </div>
        </div>

        {!isDispatched && (
          <div className="flex justify-end">
            <Button onClick={handleConfirm} disabled={confirm.isPending || inventory.length === 0}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar despacho
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}