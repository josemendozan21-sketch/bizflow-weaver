import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpFromLine } from "lucide-react";
import { PosProduct, useRegisterPosExit } from "@/hooks/usePuntosVenta";
import { POS_EXIT_REASONS, validatePosExit } from "@/lib/posExit";
import { toast } from "sonner";

type Props = { locationId: string; products: PosProduct[] };

export function PuntoSalidaForm({ locationId, products }: Props) {
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const exit = useRegisterPosExit(locationId);
  const product = products.find((p) => p.id === productId);
  const r = POS_EXIT_REASONS.find((x) => x.value === reason);

  const handleSubmit = async () => {
    if (!product) return toast.error("Selecciona producto");
    const err = validatePosExit({ quantity, available: Number(product.available), reason, notes });
    if (err) return toast.error(err);
    try {
      await exit.mutateAsync({ product_id: productId, quantity, reason, destination: destination || undefined, notes: notes || undefined });
      toast.success("Salida registrada");
      setProductId(""); setQuantity(0); setReason(""); setDestination(""); setNotes("");
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowUpFromLine className="h-5 w-5 text-primary" /> Registrar salida de producto
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Mercancía que sale del punto sin venderse. Descuenta el stock; no mueve dinero de caja.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Producto *</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger><SelectValue placeholder="Selecciona producto" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id} disabled={Number(p.available) <= 0}>
                  {p.name} {p.brand ? `· ${p.brand}` : ""} (stock: {p.available})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Cantidad *</Label>
            <Input type="number" min={1} max={product ? Number(product.available) : undefined}
              value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))} />
            {product && <p className="mt-1 text-xs text-muted-foreground">Disponible: {product.available}</p>}
          </div>
          <div>
            <Label>Motivo *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Selecciona motivo" /></SelectTrigger>
              <SelectContent>
                {POS_EXIT_REASONS.map((x) => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Destino / proveedor</Label>
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ej: Bodega principal, nombre del proveedor o cliente" />
        </div>
        <div>
          <Label>Notas {r?.notesRequired ? "*" : ""}</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button onClick={handleSubmit} disabled={exit.isPending} className="w-full">
          {exit.isPending ? "Registrando..." : "Registrar salida"}
        </Button>
      </CardContent>
    </Card>
  );
}
