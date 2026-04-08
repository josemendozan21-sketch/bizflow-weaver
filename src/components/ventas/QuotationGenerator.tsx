import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { generateQuotationPDF } from "@/lib/generateQuotation";

interface ProductLine {
  id: string;
  producto: string;
  cantidad: number;
  precioUnitario: number;
}

const IVA_RATE = 0.19;

export default function QuotationGenerator() {
  const [brand, setBrand] = useState<"magical" | "sweatspot">("magical");
  const [clientName, setClientName] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [tiempoProduccion, setTiempoProduccion] = useState("15 días hábiles");
  const [condicionesPago, setCondicionesPago] = useState("50% anticipo, 50% contra entrega");
  const [vigencia, setVigencia] = useState("30 días calendario");
  const [products, setProducts] = useState<ProductLine[]>([
    { id: crypto.randomUUID(), producto: "", cantidad: 1, precioUnitario: 0 },
  ]);

  const addProduct = () => {
    setProducts((p) => [...p, { id: crypto.randomUUID(), producto: "", cantidad: 1, precioUnitario: 0 }]);
  };

  const removeProduct = (id: string) => {
    if (products.length <= 1) return;
    setProducts((p) => p.filter((x) => x.id !== id));
  };

  const updateProduct = (id: string, field: keyof ProductLine, value: string | number) => {
    setProducts((p) => p.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  };

  const subtotal = products.reduce((sum, p) => sum + p.cantidad * p.precioUnitario, 0);
  const iva = Math.round(subtotal * IVA_RATE);
  const total = subtotal + iva;

  // Auto quotation number
  const quotationNumber = `COT-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const handleGenerate = () => {
    if (!clientName.trim()) {
      toast.error("Nombre del cliente requerido");
      return;
    }
    if (products.some((p) => !p.producto.trim() || p.cantidad <= 0 || p.precioUnitario <= 0)) {
      toast.error("Complete todos los productos con cantidad y precio válidos");
      return;
    }

    generateQuotationPDF({
      brand,
      clientName,
      empresa,
      ciudad,
      fecha,
      quotationNumber,
      products: products.map((p) => ({
        producto: p.producto,
        cantidad: p.cantidad,
        precioUnitario: p.precioUnitario,
        total: p.cantidad * p.precioUnitario,
      })),
      subtotal,
      iva,
      total,
      tiempoProduccion,
      condicionesPago,
      vigencia,
    });

    toast.success("Cotización generada", { description: `${quotationNumber} exportada como PDF` });
  };

  const fmt = (n: number) =>
    n.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" /> Generar Cotización
        </CardTitle>
        <CardDescription>Cree una cotización profesional y expórtela como PDF</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brand */}
        <div className="space-y-1.5">
          <Label>Marca</Label>
          <Select value={brand} onValueChange={(v) => setBrand(v as "magical" | "sweatspot")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="magical">Magical Warmers</SelectItem>
              <SelectItem value="sweatspot">Sweatspot</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Client info */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-foreground mb-2">Información del cliente</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nombre del cliente *</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Empresa (si aplica)</Label>
              <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>N° Cotización</Label>
            <Input value={quotationNumber} disabled className="bg-muted" />
          </div>
        </fieldset>

        {/* Products table */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-foreground mb-2">Productos</legend>
          <div className="space-y-3">
            {products.map((p, i) => (
              <div key={p.id} className="grid grid-cols-[1fr_80px_120px_120px_40px] gap-2 items-end">
                {i === 0 && (
                  <>
                    <Label className="text-xs text-muted-foreground">Producto</Label>
                    <Label className="text-xs text-muted-foreground">Cant.</Label>
                    <Label className="text-xs text-muted-foreground">P. Unitario</Label>
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <span />
                  </>
                )}
                <Input
                  value={p.producto}
                  onChange={(e) => updateProduct(p.id, "producto", e.target.value)}
                  placeholder="Nombre del producto"
                />
                <Input
                  type="number"
                  min={1}
                  value={p.cantidad}
                  onChange={(e) => updateProduct(p.id, "cantidad", parseInt(e.target.value) || 0)}
                />
                <Input
                  type="number"
                  min={0}
                  value={p.precioUnitario}
                  onChange={(e) => updateProduct(p.id, "precioUnitario", parseFloat(e.target.value) || 0)}
                />
                <span className="text-sm font-medium text-foreground self-center">
                  {fmt(p.cantidad * p.precioUnitario)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => removeProduct(p.id)}
                  disabled={products.length <= 1}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addProduct} className="gap-1">
            <Plus className="h-4 w-4" /> Agregar producto
          </Button>
        </fieldset>

        {/* Totals */}
        <div className="rounded-lg border border-border p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA (19%)</span>
            <span className="font-medium text-foreground">{fmt(iva)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
            <span className="text-foreground">Total</span>
            <span className="text-primary">{fmt(total)}</span>
          </div>
        </div>

        {/* Notes */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-foreground mb-2">Notas y condiciones</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Tiempo de producción</Label>
              <Input value={tiempoProduccion} onChange={(e) => setTiempoProduccion(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Condiciones de pago</Label>
              <Input value={condicionesPago} onChange={(e) => setCondicionesPago(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vigencia de la cotización</Label>
              <Input value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
            </div>
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleGenerate} className="gap-2">
            <FileText className="h-4 w-4" /> Generar PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
