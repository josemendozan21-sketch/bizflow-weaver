import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownToLine } from "lucide-react";
import { PosProduct, useRegisterPosEntry } from "@/hooks/usePuntosVenta";
import { toast } from "sonner";

type Props = { locationId: string; products: PosProduct[] };

export function PuntoEntradaForm({ locationId, products }: Props) {
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const entry = useRegisterPosEntry(locationId);

  const handleSubmit = async () => {
    if (!productId || quantity <= 0) {
      toast.error("Selecciona producto y cantidad");
      return;
    }
    try {
      await entry.mutateAsync({
        product_id: productId,
        quantity,
        unit_cost: unitCost,
        supplier: supplier || undefined,
        notes: notes || undefined,
      });
      toast.success("Entrada registrada");
      setProductId("");
      setQuantity(0);
      setUnitCost(0);
      setSupplier("");
      setNotes("");
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowDownToLine className="h-5 w-5 text-primary" /> Registrar entrada de producto
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Compra a proveedor externo. El costo promedio se recalculará automáticamente.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Producto *</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger><SelectValue placeholder="Selecciona producto" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} {p.brand ? `· ${p.brand}` : ""} (stock: {p.available})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Cantidad *</Label>
            <Input type="number" value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div>
            <Label>Costo unitario</Label>
            <Input type="number" value={unitCost || ""} onChange={(e) => setUnitCost(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <Label>Proveedor</Label>
          <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Nombre del proveedor" />
        </div>
        <div>
          <Label>Notas</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button onClick={handleSubmit} disabled={entry.isPending} className="w-full">
          {entry.isPending ? "Registrando..." : "Registrar entrada"}
        </Button>
      </CardContent>
    </Card>
  );
}
