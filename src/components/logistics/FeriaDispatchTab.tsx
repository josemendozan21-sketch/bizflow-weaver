import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, MapPin, Calendar, Truck, Pencil, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useFerias, useAllDispatchRequests, useFeriaInventory, useConfirmDispatch } from "@/hooks/useFerias";

const MONTAJE_SUGERIDOS = [
  "Mesa",
  "Silla",
  "Rack",
  "Mantel",
  "Exhibidor",
  "Banner",
  "Iluminación",
  "Caja registradora",
];

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

  // Ordenar por fecha de montaje (fallback fecha inicio) ascendente,
  // pendientes primero para atacar las próximas ferias.
  const sorted = [...requests].sort((a, b) => {
    const fa = ferias.find((f) => f.id === a.feria_id);
    const fb = ferias.find((f) => f.id === b.feria_id);
    if (!fa || !fb) return 0;
    const aPend = a.status !== "despachado";
    const bPend = b.status !== "despachado";
    if (aPend !== bPend) return aPend ? -1 : 1;
    const aKey = fa.setup_date || fa.start_date;
    const bKey = fb.setup_date || fb.start_date;
    return aKey.localeCompare(bKey);
  });

  return (
    <div className="space-y-3">
      {sorted.map((req) => {
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
  const [editing, setEditing] = useState(false);
  const isDispatched = request.status === "despachado" && !editing;

  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [furniture, setFurniture] = useState(request.furniture_dispatched || false);
  const initialItems: string[] = request.furniture_items || [];
  const [selectedItems, setSelectedItems] = useState<string[]>(initialItems);
  const [extraItem, setExtraItem] = useState("");
  const [notes, setNotes] = useState(request.dispatch_notes || "");

  // Items personalizados que ya estaban guardados pero no son sugeridos
  const customItems = selectedItems.filter((i) => !MONTAJE_SUGERIDOS.includes(i));

  const toggleItem = (name: string) => {
    setSelectedItems((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  const addExtra = () => {
    const v = extraItem.trim();
    if (!v) return;
    if (!selectedItems.includes(v)) setSelectedItems([...selectedItems, v]);
    setExtraItem("");
  };

  const getQty = (it: any) => {
    if (isDispatched) return it.quantity_dispatched;
    if (quantities[it.id] !== undefined) return parseInt(quantities[it.id], 10) || 0;
    if (editing) return it.quantity_dispatched;
    return 0; // logística debe ingresar las unidades reales
  };

  const handleConfirm = async () => {
    await confirm.mutateAsync({
      feria_id: feria.id,
      lines: inventory.map((it) => ({ id: it.id, quantity_dispatched: getQty(it) })),
      furniture_dispatched: furniture,
      furniture_items: selectedItems,
      dispatch_notes: notes,
    });
    setEditing(false);
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
          <div className="flex items-center gap-2">
            {request.status === "despachado" && !editing ? (
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Despachado
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                <Truck className="h-3 w-3 mr-1" /> {editing ? "Editando" : "Pendiente"}
              </Badge>
            )}
            {request.status === "despachado" && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Modificar despacho
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Stand</p>
            <p>N°: <span className="text-muted-foreground">{feria.stand_number || "a definir"}</span></p>
            <p>Tamaño: <span className="text-muted-foreground">{feria.stand_size || "—"}</span></p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Materiales requeridos</p>
            <div className="flex flex-wrap gap-1">
              {(feria.materials_needed || []).length === 0 ? (
                <span className="text-muted-foreground text-xs">Sin materiales solicitados</span>
              ) : (
                feria.materials_needed.map((m: string, i: number) => (
                  <Badge key={i} variant="outline">{m}</Badge>
                ))
              )}
            </div>
          </div>
          {feria.notes && (
            <div className="md:col-span-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notas del asesor</p>
              <p className="text-muted-foreground whitespace-pre-wrap text-sm">{feria.notes}</p>
            </div>
          )}
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={furniture}
                onCheckedChange={(c) => setFurniture(!!c)}
                disabled={isDispatched}
              />
              <Label className="!mt-0">¿Despacha items de montaje?</Label>
            </div>
            {furniture && (
              <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Marca los items de montaje que estás enviando con este despacho.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {MONTAJE_SUGERIDOS.map((item) => (
                      <label key={item} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={selectedItems.includes(item)}
                          onCheckedChange={() => toggleItem(item)}
                          disabled={isDispatched}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {customItems.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Items adicionales</p>
                    <div className="flex flex-wrap gap-1.5">
                      {customItems.map((item) => (
                        <Badge key={item} variant="secondary" className="gap-1">
                          {item}
                          {!isDispatched && (
                            <button
                              type="button"
                              onClick={() => toggleItem(item)}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {!isDispatched && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Agregar otro item adicional…"
                      value={extraItem}
                      onChange={(e) => setExtraItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addExtra();
                        }
                      }}
                      className="h-8"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={addExtra}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
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

        <div className="flex justify-end gap-2">
          {editing && (
            <Button variant="ghost" onClick={() => { setEditing(false); setQuantities({}); }}>
              Cancelar
            </Button>
          )}
          {!isDispatched && (
            <Button onClick={handleConfirm} disabled={confirm.isPending || inventory.length === 0}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> {editing ? "Guardar cambios" : "Confirmar despacho"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}