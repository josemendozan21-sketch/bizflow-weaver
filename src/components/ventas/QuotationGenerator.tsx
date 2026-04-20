import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileText, TrendingUp, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { generateQuotationPDF } from "@/lib/generateQuotation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProductLine {
  id: string;
  producto: string;
  cantidad: number;
  precioUnitario: number;
}

interface ProductCostData {
  product_name: string;
  brand: string;
  total_cost: number | null;
}

const IVA_RATE = 0.19;

export default function QuotationGenerator() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [brand, setBrand] = useState<"magical" | "sweatspot">("magical");
  const [clientName, setClientName] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cedulaNit, setCedulaNit] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [tiempoProduccion, setTiempoProduccion] = useState("8 a 15 días hábiles según cantidad");
  const [condicionesPago, setCondicionesPago] = useState("50% para iniciar, 50% una vez esté listo");
  const [vigencia, setVigencia] = useState("15 días calendario");
  const [garantia, setGarantia] = useState("4 meses por imperfecciones o defectos de fabricación");
  const [products, setProducts] = useState<ProductLine[]>([
    { id: crypto.randomUUID(), producto: "", cantidad: 1, precioUnitario: 0 },
  ]);
  const [costData, setCostData] = useState<ProductCostData[]>([]);
  const [photos, setPhotos] = useState<{ id: string; dataUrl: string; name: string }[]>([]);

  useEffect(() => {
    if (isAdmin) {
      supabase.from("product_costs").select("product_name, brand, total_cost").then(({ data }) => {
        if (data) setCostData(data as ProductCostData[]);
      });
    }
  }, [isAdmin]);

  const handlePhotosSelected = (files: FileList | null) => {
    if (!files) return;
    const remaining = 8 - photos.length;
    if (remaining <= 0) {
      toast.error("Máximo 8 fotografías");
      return;
    }
    Array.from(files).slice(0, remaining).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} supera 5MB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => [...prev, { id: crypto.randomUUID(), dataUrl: reader.result as string, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (id: string) => setPhotos((p) => p.filter((x) => x.id !== id));

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
  // Per-line IVA helper
  const lineIva = (price: number) => Math.round(price * IVA_RATE);
  const linePriceWithIva = (price: number) => price + lineIva(price);
  const lineTotal = (p: { cantidad: number; precioUnitario: number }) => linePriceWithIva(p.precioUnitario) * p.cantidad;

  const quotationNumber = `COT-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  // Cost lookup for admin
  const getCostForProduct = (productName: string): number | null => {
    const match = costData.find(
      (c) => c.brand === brand && c.product_name.toLowerCase() === productName.toLowerCase()
    );
    return match?.total_cost ?? null;
  };

  const marginData = useMemo(() => {
    if (!isAdmin) return null;
    let totalCost = 0;
    let totalRevenue = 0;
    let allMatched = true;
    const lines = products.map((p) => {
      const cost = getCostForProduct(p.producto);
      const revenue = p.cantidad * p.precioUnitario;
      if (cost !== null) {
        totalCost += cost * p.cantidad;
      } else {
        allMatched = false;
      }
      totalRevenue += revenue;
      return { ...p, unitCost: cost, lineMargin: cost !== null ? ((p.precioUnitario - cost) / p.precioUnitario) * 100 : null };
    });
    const overallMargin = totalRevenue > 0 && allMatched ? ((totalRevenue - totalCost) / totalRevenue) * 100 : null;
    return { lines, totalCost, overallMargin };
  }, [products, costData, brand, isAdmin]);

  const handleGenerate = () => {
    if (!clientName.trim()) { toast.error("Nombre del cliente requerido"); return; }
    if (products.some((p) => !p.producto.trim() || p.cantidad <= 0 || p.precioUnitario <= 0)) {
      toast.error("Complete todos los productos con cantidad y precio válidos"); return;
    }

    generateQuotationPDF({
      brand, clientName, empresa, cedulaNit, ciudad, fecha, quotationNumber,
      products: products.map((p) => ({
        producto: p.producto, cantidad: p.cantidad, precioUnitario: p.precioUnitario, total: p.cantidad * p.precioUnitario,
      })),
      subtotal, iva, total, tiempoProduccion, condicionesPago, vigencia, garantia,
      photos: photos.map((p) => p.dataUrl),
    });

    toast.success("Cotización generada", { description: `${quotationNumber} exportada como PDF` });
  };

  const fmt = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" /> Generar Propuesta Comercial
        </CardTitle>
        <CardDescription>Cree una propuesta comercial profesional y expórtela como PDF</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brand */}
        <div className="space-y-1.5">
          <Label>Marca</Label>
          <Select value={brand} onValueChange={(v) => setBrand(v as "magical" | "sweatspot")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="magical">Magical Warmers</SelectItem>
              <SelectItem value="sweatspot">Sweatspot</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Client info */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-foreground mb-2">Datos del cliente</legend>
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
              <Label>Cédula / NIT</Label>
              <Input value={cedulaNit} onChange={(e) => setCedulaNit(e.target.value)} placeholder="Ej: 900793324-8" />
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
            {products.map((p, i) => {
              const lineMargin = marginData?.lines[i]?.lineMargin;
              const unitCost = marginData?.lines[i]?.unitCost;
              return (
                <div key={p.id}>
                  <div className="grid gap-2 items-end grid-cols-[1fr_70px_110px_90px_110px_110px_36px]">
                    {i === 0 && (
                      <>
                        <Label className="text-xs text-muted-foreground">Producto</Label>
                        <Label className="text-xs text-muted-foreground">Cant.</Label>
                        <Label className="text-xs text-muted-foreground">P. Unitario</Label>
                        <Label className="text-xs text-muted-foreground">IVA</Label>
                        <Label className="text-xs text-muted-foreground">P. con IVA</Label>
                        <Label className="text-xs text-muted-foreground">Total</Label>
                        <span />
                      </>
                    )}
                    <Input value={p.producto} onChange={(e) => updateProduct(p.id, "producto", e.target.value)} placeholder="Nombre del producto" />
                    <Input type="number" min={1} value={p.cantidad} onChange={(e) => updateProduct(p.id, "cantidad", parseInt(e.target.value) || 0)} />
                    <Input type="number" min={0} value={p.precioUnitario} onChange={(e) => updateProduct(p.id, "precioUnitario", parseFloat(e.target.value) || 0)} />
                    <span className="text-xs text-muted-foreground self-center">{fmt(lineIva(p.precioUnitario))}</span>
                    <span className="text-xs font-medium text-foreground self-center">{fmt(linePriceWithIva(p.precioUnitario))}</span>
                    <span className="text-sm font-medium text-foreground self-center">{fmt(lineTotal(p))}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeProduct(p.id)} disabled={products.length <= 1}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  {/* Admin-only: cost & margin per line */}
                  {isAdmin && p.producto.trim() && (
                    <div className="ml-1 mt-1 flex items-center gap-3 text-xs">
                      {unitCost !== null && unitCost !== undefined ? (
                        <>
                          <span className="text-muted-foreground">Costo: <span className="font-medium text-foreground">{fmt(unitCost)}</span></span>
                          {lineMargin !== null && lineMargin !== undefined && (
                            <Badge variant={lineMargin >= 30 ? "default" : lineMargin >= 15 ? "secondary" : "destructive"} className="text-xs">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Margen: {lineMargin.toFixed(1)}%
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground italic">Sin costo registrado</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-1.5">
              <Label>Garantía</Label>
              <Input value={garantia} onChange={(e) => setGarantia(e.target.value)} />
            </div>
          </div>
        </fieldset>

        {/* Photos (optional) */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground mb-2">
            Fotografías de referencia <span className="text-muted-foreground font-normal">(opcional)</span>
          </legend>
          <p className="text-xs text-muted-foreground">
            Agrega imágenes de productos o referencias. Aparecerán en una página adicional del PDF. Máx. 8 imágenes, 5MB c/u.
          </p>
          <div className="flex flex-wrap gap-3">
            {photos.map((ph) => (
              <div key={ph.id} className="relative group">
                <img src={ph.dataUrl} alt={ph.name} className="h-24 w-24 object-cover rounded-md border border-border" />
                <button
                  type="button"
                  onClick={() => removePhoto(ph.id)}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                  aria-label="Eliminar foto"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {photos.length < 8 && (
              <label className="h-24 w-24 rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors">
                <ImagePlus className="h-5 w-5" />
                <span className="text-xs">Agregar</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handlePhotosSelected(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
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

function DollarSignIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
