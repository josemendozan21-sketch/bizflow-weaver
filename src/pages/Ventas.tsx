import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, AlertTriangle, CheckCircle2, FileText, ShoppingCart } from "lucide-react";
import magicalLogo from "@/assets/magical-warmers-logo.png";
import sweatspotLogo from "@/assets/sweatspot-logo.png";
import { useLogisticsStore } from "@/stores/logisticsStore";
import { useProductionStore } from "@/stores/productionStore";
import { useSweatspotProductionStore } from "@/stores/sweatspotProductionStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useAccountingStore } from "@/stores/accountingStore";
import { useDeliveryStore } from "@/stores/deliveryStore";
import { toast } from "sonner";
import QuotationGenerator from "@/components/ventas/QuotationGenerator";
import { createLogoRequestFromOrder } from "@/lib/createLogoRequestFromOrder";
import { useAuth } from "@/contexts/AuthContext";

type Brand = "sweatspot" | "magical";
type SaleType = "mayor" | "menor";

const Ventas = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [saleType, setSaleType] = useState<SaleType | null>(null);

  const handleBrandSelect = (b: Brand) => {
    setBrand(b);
    setStep(2);
  };

  const handleSaleTypeSelect = (t: SaleType) => {
    setSaleType(t);
    setStep(3);
  };

  const handleBack = () => {
    if (step === 3) {
      setSaleType(null);
      setStep(2);
    } else if (step === 2) {
      setBrand(null);
      setStep(1);
    }
  };

  const handleReset = () => {
    setBrand(null);
    setSaleType(null);
    setStep(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ventas</h1>
        <p className="text-muted-foreground">Gestión de cotizaciones y pedidos</p>
      </div>

      <Tabs defaultValue="pedidos" className="w-full">
        <TabsList>
          <TabsTrigger value="pedidos" className="gap-1.5">
            <ShoppingCart className="h-4 w-4" /> Pedidos
          </TabsTrigger>
          <TabsTrigger value="cotizaciones" className="gap-1.5">
            <FileText className="h-4 w-4" /> Cotizaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="space-y-6 mt-4">
          {/* Stepper */}
          <div className="flex items-center gap-2 text-sm">
            <StepIndicator n={1} current={step} label="Marca" />
            <div className="h-px w-6 bg-border" />
            <StepIndicator n={2} current={step} label="Tipo de venta" />
            <div className="h-px w-6 bg-border" />
            <StepIndicator n={3} current={step} label="Pedido" />
          </div>

          {step > 1 && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
              <BrandCard icon={<img src={sweatspotLogo} alt="Sweatspot" className="h-16 w-auto object-contain" />} onClick={() => handleBrandSelect("sweatspot")} />
              <BrandCard icon={<img src={magicalLogo} alt="Magical Warmers" className="h-16 w-auto object-contain" />} onClick={() => handleBrandSelect("magical")} />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
              <SaleTypeCard title="Al por mayor" description="Pedidos en volumen con abono inicial" onClick={() => handleSaleTypeSelect("mayor")} />
              <SaleTypeCard title="Al por menor" description="Venta unitaria al consumidor final" onClick={() => handleSaleTypeSelect("menor")} />
            </div>
          )}

          {step === 3 && brand && saleType && (
            <OrderForm brand={brand} saleType={saleType} onReset={handleReset} />
          )}
        </TabsContent>

        <TabsContent value="cotizaciones" className="mt-4">
          <QuotationGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ---- Sub-components ---- */

function StepIndicator({ n, current, label }: { n: number; current: number; label: string }) {
  const active = current >= n;
  return (
    <div className="flex items-center gap-1.5">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {n}
      </span>
      <span className={active ? "text-foreground font-medium" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function BrandCard({ icon, name, onClick }: { icon: React.ReactNode; name?: string; onClick: () => void }) {
  return (
    <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md" onClick={onClick}>
      <CardContent className="flex flex-col items-center gap-3 p-8">
        <div className="text-primary">{icon}</div>
        {name && <span className="text-lg font-semibold text-foreground">{name}</span>}
      </CardContent>
    </Card>
  );
}

function SaleTypeCard({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md" onClick={onClick}>
      <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
        <span className="text-lg font-semibold text-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </CardContent>
    </Card>
  );
}

/* ---- Order Form ---- */

function OrderForm({ brand, saleType, onReset }: { brand: Brand; saleType: SaleType; onReset: () => void }) {
  if (brand === "magical" && saleType === "mayor") {
    return <MagicalMayorForm onReset={onReset} />;
  }
  if (brand === "sweatspot" && saleType === "mayor") {
    return <SweatspotMayorForm onReset={onReset} />;
  }
  return <GenericForm brand={brand} saleType={saleType} onReset={onReset} />;
}

/* ---- Magical Warmers – Al por mayor ---- */

function MagicalMayorForm({ onReset }: { onReset: () => void }) {
  const { user } = useAuth();
  const [dobleTinta, setDobleTinta] = useState(false);
  const [escarcha, setEscarcha] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [units, setUnits] = useState("");

  const materialConfigs = useInventoryStore((s) => s.materialConfigs);
  const stockItems = useInventoryStore((s) => s.stockItems);

  // Unique product names
  const productNames = useMemo(() => {
    const names = [...new Set(materialConfigs.map((c) => c.productName))];
    return names.sort();
  }, [materialConfigs]);

  // Types available for selected product
  const availableTypes = useMemo(() => {
    if (!selectedProduct) return [];
    return materialConfigs
      .filter((c) => c.productName === selectedProduct)
      .map((c) => c.productType);
  }, [materialConfigs, selectedProduct]);

  // Matched config
  const matchedConfig = useMemo(() => {
    if (!selectedProduct || !selectedType) return null;
    return materialConfigs.find(
      (c) => c.productName === selectedProduct && c.productType === selectedType
    ) || null;
  }, [materialConfigs, selectedProduct, selectedType]);

  // Gel consumption calculation
  const gelCalc = useMemo(() => {
    const qty = parseInt(units, 10) || 0;
    if (!matchedConfig || qty <= 0) return null;
    const totalGrams = qty * matchedConfig.gramsPerUnit;
    const totalKg = totalGrams / 1000;
    const gelItem = stockItems.find((s) => s.category === "materia_prima" && s.name.toLowerCase() === "gel");
    const available = gelItem?.available || 0;
    const difference = available - totalGrams;
    return { totalGrams, totalKg, available, difference, sufficient: difference >= 0, gramsPerUnit: matchedConfig.gramsPerUnit };
  }, [matchedConfig, units, stockItems]);

  const handleProductChange = (value: string) => {
    setSelectedProduct(value);
    setSelectedType("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const clientName = fd.get("mw_nombre") as string;
    const quantity = parseInt(units, 10);
    const inkColor = fd.get("mw_colorTinta") as string;
    const gelColor = fd.get("mw_colorGel") as string;
    const referencia = `${selectedProduct} (${selectedType})`;
    const rutFile = fd.get("mw_rut") as File;
    const totalAmount = parseFloat(fd.get("mw_valorTotal") as string) || 0;
    const abono = parseFloat(fd.get("mw_abono") as string) || 0;

    if (!selectedProduct || !selectedType) {
      toast.error("Producto requerido", { description: "Seleccione un producto y tipo." });
      return;
    }

    if (!rutFile || !rutFile.name) {
      toast.error("RUT requerido", {
        description: "Para ventas al por mayor debe adjuntar el RUT de la empresa.",
      });
      return;
    }

    // Wholesale: check cuerpos/referencias stock
    const bodyResult = useInventoryStore.getState().reserveBodyStock(referencia, quantity, "magical");

    // Calculate gel consumption for Magical Warmers
    const gelResult = useInventoryStore.getState().discountGelForMagical(selectedProduct, quantity);

    // Wholesale: goes to production, NOT logistics
    useProductionStore.getState().addStampingTask({
      brand: "magical",
      clientName,
      quantity,
      inkColor,
      gelColor: gelColor || "",
      glitter: escarcha,
      doubleInk: dobleTinta,
      observations: (fd.get("mw_observaciones") as string) || undefined,
    });

    // Send to accounting as "Cliente empresa"
    useAccountingStore.getState().addOrder({
      clientName,
      brand: "magical",
      product: referencia,
      quantity,
      saleType: "mayor",
      clientType: "Cliente empresa",
      totalAmount,
      abono,
      hasRut: true,
      email: (fd.get("mw_email") as string)?.trim() || undefined,
      direccion: (fd.get("mw_direccion") as string)?.trim() || undefined,
      ciudad: (fd.get("mw_ciudad") as string)?.trim() || undefined,
      observaciones: (fd.get("mw_observaciones") as string)?.trim() || undefined,
    });

    // Create delivery calendar entry if fecha requerida is provided
    const fechaRequerida = fd.get("mw_fechaRequerida") as string;
    if (fechaRequerida) {
      useDeliveryStore.getState().addEntry({
        clientName,
        brand: "magical",
        product: referencia,
        quantity,
        saleType: "mayor",
        deliveryDate: fechaRequerida,
        status: "en_produccion",
      });
    }

    toast.success("Pedido al por mayor creado", {
      description: `${clientName} — ${quantity} uds de ${referencia}. Enviado a Producción y Contabilidad.`,
    });

    // Inventory feedback
    if (!bodyResult.available) {
      toast.warning("Requerimiento de producción generado", { description: bodyResult.message });
    } else if (bodyResult.discounted < quantity) {
      toast.warning("Stock parcial de cuerpos", { description: bodyResult.message });
    } else {
      toast.info("Inventario actualizado", { description: bodyResult.message });
    }

    toast.info("Consumo de gel", { description: gelResult.message });

    // Auto-create design request if logo was uploaded
    const logoFile = fd.get("mw_logo") as File;
    const personalizacion = (fd.get("mw_personalizacion") as string) || "";
    if (logoFile && logoFile.size > 0 && user) {
      createLogoRequestFromOrder({
        brand: "Magical Warmers",
        clientName,
        product: referencia,
        advisorId: user.id,
        advisorName: user.email || "Asesor",
        logoFile,
        clientComments: (fd.get("mw_observaciones") as string) || undefined,
        additionalInstructions: personalizacion || undefined,
      }).then((result) => {
        if (result.success) {
          toast.success("Diseño de logo", { description: result.message });
        } else {
          toast.error("Diseño de logo", { description: result.message });
        }
      });
    }

    onReset();
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Nuevo pedido — Magical Warmers</CardTitle>
        <CardDescription>Venta al por mayor</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Información del cliente</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre del cliente" name="mw_nombre" required />
              <Field label="Cédula o NIT" name="mw_cedulaNit" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Número de contacto" name="mw_contacto" type="tel" required />
              <Field label="Correo electrónico" name="mw_email" type="email" />
            </div>
            <Field label="Dirección del cliente" name="mw_direccion" required />
            <Field label="Ciudad" name="mw_ciudad" required />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Información del pedido</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Producto / Referencia</Label>
                <Select value={selectedProduct} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={selectedType} onValueChange={setSelectedType} disabled={!selectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Color de gel" name="mw_colorGel" required />
              <Field label="Color de tinta" name="mw_colorTinta" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="mw_unidades">Unidades</Label>
                <Input id="mw_unidades" name="mw_unidades" type="number" required value={units} onChange={(e) => setUnits(e.target.value)} />
              </div>
              <Field label="Valor unitario" name="mw_valorUnitario" type="number" required />
              <Field label="Valor total del pedido" name="mw_valorTotal" type="number" required />
            </div>
            <Field label="Abono del total del pedido" name="mw_abono" type="number" />
            <Field label="Fecha requerida de entrega" name="mw_fechaRequerida" type="date" />
          </fieldset>

          {/* Gel consumption panel */}
          {gelCalc && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-foreground mb-2">Consumo de materia prima (Gel)</legend>
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Producto:</span>
                  <span className="font-medium text-foreground">{selectedProduct} ({selectedType})</span>
                  <span className="text-muted-foreground">Gramos por unidad:</span>
                  <span className="font-medium text-foreground">{gelCalc.gramsPerUnit.toLocaleString()} g</span>
                  <span className="text-muted-foreground">Unidades solicitadas:</span>
                  <span className="font-medium text-foreground">{parseInt(units, 10).toLocaleString()}</span>
                  <span className="text-muted-foreground">Consumo total requerido:</span>
                  <span className="font-semibold text-foreground">{gelCalc.totalGrams.toLocaleString()} g ({gelCalc.totalKg.toFixed(2)} kg)</span>
                  <span className="text-muted-foreground">Inventario disponible (Gel):</span>
                  <span className="font-medium text-foreground">{gelCalc.available.toLocaleString()} g</span>
                  <span className="text-muted-foreground">Diferencia:</span>
                  <span className={`font-semibold ${gelCalc.sufficient ? "text-green-600" : "text-destructive"}`}>
                    {gelCalc.difference >= 0 ? "+" : ""}{gelCalc.difference.toLocaleString()} g
                  </span>
                </div>

                {!gelCalc.sufficient && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Materia prima insuficiente</AlertTitle>
                    <AlertDescription>
                      Faltan {Math.abs(gelCalc.difference).toLocaleString()} g de gel para completar este pedido.
                      El pedido se procesará pero el inventario quedará en negativo.
                    </AlertDescription>
                  </Alert>
                )}

                {gelCalc.sufficient && (
                  <Alert className="mt-2 border-green-200 bg-green-50 text-green-800 [&>svg]:text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Materia prima suficiente</AlertTitle>
                    <AlertDescription>
                      Hay stock disponible para cubrir este pedido. Quedarán {gelCalc.difference.toLocaleString()} g después del descuento.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </fieldset>
          )}

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Opciones adicionales</legend>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border border-input p-3">
                <Label htmlFor="mw_dobleTinta" className="cursor-pointer">Doble tinta</Label>
                <Switch id="mw_dobleTinta" checked={dobleTinta} onCheckedChange={setDobleTinta} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-input p-3">
                <Label htmlFor="mw_escarcha" className="cursor-pointer">Escarcha</Label>
                <Switch id="mw_escarcha" checked={escarcha} onCheckedChange={setEscarcha} />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Archivos adjuntos</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <FileField label="Adjuntar logo" name="mw_logo" />
              <FileField label="Adjuntar RUT de la empresa" name="mw_rut" />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Personalización</legend>
            <div className="space-y-1.5">
              <Label htmlFor="mw_personalizacion">Modificaciones o adiciones al logo</Label>
              <Textarea id="mw_personalizacion" name="mw_personalizacion" placeholder="Describa qué desea adicionar o modificar en el logo..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mw_observaciones">Observaciones generales del pedido</Label>
              <Textarea id="mw_observaciones" name="mw_observaciones" placeholder="Notas u observaciones adicionales..." />
            </div>
          </fieldset>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Crear pedido</Button>
            <Button type="button" variant="outline" onClick={onReset}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ---- Sweatspot – Al por mayor ---- */

function SweatspotMayorForm({ onReset }: { onReset: () => void }) {
  const { user } = useAuth();
  const tamanos = ["150 ml", "250 ml", "250 ml juguetón", "500 ml"] as const;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const clientName = fd.get("ss_nombre") as string;
    const quantity = parseInt(fd.get("ss_unidades") as string, 10);
    const inkColor = fd.get("ss_colorTinta") as string;
    const thermoSize = fd.get("ss_tamano") as "150 ml" | "250 ml" | "250 ml juguetón" | "500 ml";
    const siliconeColor = fd.get("ss_colorSilicona") as string;
    const referencia = fd.get("ss_referencia") as string;
    const tipoLogo = fd.get("ss_tipoLogo") as string;
    const rutFile = fd.get("ss_rut") as File;
    const totalAmount = parseFloat(fd.get("ss_valorTotal") as string) || 0;
    const abono = parseFloat(fd.get("ss_abono") as string) || 0;

    if (!rutFile || !rutFile.name) {
      toast.error("RUT requerido", {
        description: "Para ventas al por mayor debe adjuntar el RUT de la empresa.",
      });
      return;
    }

    // Wholesale: check cuerpos/referencias stock
    const bodyResult = useInventoryStore.getState().reserveBodyStock(referencia, quantity, "sweatspot");
    const hasStock = bodyResult.available;

    // Determine logo type for production workflow
    const logoType = tipoLogo === "Impresión básica" ? "impresion_basica" as const : "impresion_full" as const;

    // Send to Sweatspot production workflow (replaces old stamping task)
    useSweatspotProductionStore.getState().addOrder({
      clientName,
      quantity,
      thermoSize,
      siliconeColor,
      inkColor,
      logoType,
      logoFile: (fd.get("ss_logo") as File)?.name || undefined,
      hasStock,
      currentStage: "estampacion",
      observations: (fd.get("ss_observaciones") as string) || undefined,
    });

    // Send to accounting as "Cliente empresa"
    useAccountingStore.getState().addOrder({
      clientName,
      brand: "sweatspot",
      product: referencia,
      quantity,
      saleType: "mayor",
      clientType: "Cliente empresa",
      totalAmount,
      abono,
      hasRut: true,
      email: (fd.get("ss_email") as string)?.trim() || undefined,
      direccion: (fd.get("ss_direccion") as string)?.trim() || undefined,
      ciudad: (fd.get("ss_ciudad") as string)?.trim() || undefined,
      observaciones: (fd.get("ss_observaciones") as string)?.trim() || undefined,
    });

    // Create delivery calendar entry if fecha requerida is provided
    const fechaRequerida = fd.get("ss_fechaRequerida") as string;
    if (fechaRequerida) {
      useDeliveryStore.getState().addEntry({
        clientName,
        brand: "sweatspot",
        product: referencia,
        quantity,
        saleType: "mayor",
        deliveryDate: fechaRequerida,
        status: "en_produccion",
      });
    }

    toast.success("Pedido al por mayor creado", {
      description: `${clientName} — ${quantity} uds (${tipoLogo}). Enviado a Producción y Contabilidad.`,
    });

    // Inventory feedback
    if (!bodyResult.available) {
      toast.warning("Requerimiento de producción generado", { description: bodyResult.message });
    } else if (bodyResult.discounted < quantity) {
      toast.warning("Stock parcial de cuerpos", { description: bodyResult.message });
    } else {
      toast.info("Inventario actualizado", { description: bodyResult.message });
    }

    // Auto-create design request if logo was uploaded
    const logoFile = fd.get("ss_logo") as File;
    const personalizacion = (document.getElementById("ss_personalizacion") as HTMLTextAreaElement)?.value || "";
    if (logoFile && logoFile.size > 0 && user) {
      createLogoRequestFromOrder({
        brand: "Sweatspot",
        clientName,
        product: referencia,
        advisorId: user.id,
        advisorName: user.email || "Asesor",
        logoFile,
        clientComments: (fd.get("ss_observaciones") as string) || undefined,
        additionalInstructions: personalizacion || undefined,
      }).then((result) => {
        if (result.success) {
          toast.success("Diseño de logo", { description: result.message });
        } else {
          toast.error("Diseño de logo", { description: result.message });
        }
      });
    }

    onReset();
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Nuevo pedido — Sweatspot</CardTitle>
        <CardDescription>Venta al por mayor</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Información del cliente</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre del cliente" name="ss_nombre" required />
              <Field label="Cédula o NIT" name="ss_cedulaNit" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Número de contacto" name="ss_contacto" type="tel" required />
              <Field label="Correo electrónico" name="ss_email" type="email" />
            </div>
            <Field label="Dirección del cliente" name="ss_direccion" required />
            <Field label="Ciudad" name="ss_ciudad" required />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Información del pedido</legend>
            <Field label="Referencia o molde" name="ss_referencia" required />
            <div className="space-y-1.5">
              <Label>Tamaño</Label>
              <div className="grid grid-cols-2 gap-2">
                {tamanos.map((t) => (
                  <label key={t} className="flex items-center gap-2 rounded-md border border-input p-3 cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input type="radio" name="ss_tamano" value={t} required className="accent-primary h-4 w-4" />
                    <span className="text-sm text-foreground">{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de logo</Label>
              <div className="grid grid-cols-2 gap-2">
                {["Impresión full", "Impresión básica"].map((tipo) => (
                  <label key={tipo} className="flex items-center gap-2 rounded-md border border-input p-3 cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input type="radio" name="ss_tipoLogo" value={tipo} required className="accent-primary h-4 w-4" />
                    <span className="text-sm text-foreground">{tipo}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Color de silicona" name="ss_colorSilicona" required />
              <Field label="Color de tinta" name="ss_colorTinta" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Unidades" name="ss_unidades" type="number" required />
              <Field label="Valor unitario" name="ss_valorUnitario" type="number" required />
              <Field label="Valor total del pedido" name="ss_valorTotal" type="number" required />
            </div>
            <Field label="Abono del total del pedido" name="ss_abono" type="number" />
            <Field label="Fecha requerida de entrega" name="ss_fechaRequerida" type="date" />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Archivos adjuntos</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <FileField label="Adjuntar logo" name="ss_logo" />
              <FileField label="Adjuntar RUT de la empresa" name="ss_rut" />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Personalización</legend>
            <div className="space-y-1.5">
              <Label htmlFor="ss_personalizacion">Modificaciones o adiciones al logo</Label>
              <Textarea id="ss_personalizacion" name="ss_personalizacion" placeholder="Describa qué desea adicionar o modificar en el logo..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss_observaciones">Observaciones generales del pedido</Label>
              <Textarea id="ss_observaciones" name="ss_observaciones" placeholder="Notas u observaciones adicionales..." />
            </div>
          </fieldset>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Crear pedido</Button>
            <Button type="button" variant="outline" onClick={onReset}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ---- Generic form (retail / al por menor) ---- */

function GenericForm({ brand, saleType, onReset }: { brand: Brand; saleType: SaleType; onReset: () => void }) {
  const brandLabel = brand === "sweatspot" ? "Sweatspot" : "Magical Warmers";
  const isMayor = saleType === "mayor";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const clientName = (fd.get("nombre") as string)?.trim() || "";
    const quantity = parseInt(fd.get("cantidad") as string, 10);
    const referencia = fd.get("referencia") as string;
    const totalAmount = parseFloat(fd.get("precioTotal") as string) || 0;

    if (saleType === "menor") {
      // Determine if key client data is missing → "Venta mostrador"
      const telefono = (fd.get("telefono") as string)?.trim() || "";
      const ciudad = (fd.get("ciudad") as string)?.trim() || "";
      const direccion = (fd.get("direccion") as string)?.trim() || "";
      const isVentaMostrador = !clientName || !telefono || !ciudad || !direccion;
      const displayName = isVentaMostrador ? (clientName || "Venta mostrador") : clientName;

      // Retail: discount from finished products
      const discountResult = useInventoryStore.getState().discountFinishedProduct(referencia, quantity);
      if (!discountResult.success) {
        toast.error("Sin stock suficiente", { description: discountResult.message });
        return;
      }

      // For Magical Warmers retail, also project gel consumption
      if (brand === "magical") {
        const gelResult = useInventoryStore.getState().discountGelForMagical(referencia, quantity);
        toast.info("Consumo de gel", { description: gelResult.message });
      }

      // Retail: send immediately to logistics
      useLogisticsStore.getState().addOrder({
        clientName: displayName,
        brand,
        product: referencia,
        quantity,
        saleType: "menor",
        readyDate: new Date().toISOString().slice(0, 10),
        status: "listo",
      });

      const email = (fd.get("email") as string)?.trim() || undefined;
      const cedula = (fd.get("cedula") as string)?.trim() || undefined;
      const observaciones = (fd.get("notas") as string)?.trim() || undefined;

      // Send to accounting
      useAccountingStore.getState().addOrder({
        clientName: displayName,
        brand,
        product: referencia,
        quantity,
        saleType: "menor",
        clientType: isVentaMostrador ? "Venta mostrador" : "Cliente empresa",
        totalAmount,
        hasRut: false,
        email,
        cedula,
        direccion: direccion || undefined,
        ciudad: ciudad || undefined,
        observaciones,
      });

      toast.success("Pedido al por menor creado", {
        description: `${displayName} — ${quantity} uds. Inventario actualizado. ${discountResult.message}`,
      });
    }

    onReset();
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Nuevo pedido — {brandLabel}</CardTitle>
        <CardDescription>{isMayor ? "Venta al por mayor" : "Venta al por menor"}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
           <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Datos del cliente</legend>
            {!isMayor && (
              <p className="text-xs text-muted-foreground">Si faltan datos del cliente, se clasificará como "Venta mostrador".</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre completo" name="nombre" required={isMayor} />
              <Field label="Teléfono" name="telefono" type="tel" required={isMayor} />
            </div>
            {!isMayor && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cédula" name="cedula" />
                <Field label="Correo electrónico" name="email" type="email" />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ciudad" name="ciudad" required={isMayor} />
              <Field label="Departamento" name="departamento" required={isMayor} />
            </div>
            <Field label="Dirección de envío" name="direccion" required={isMayor} />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Detalles del producto</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Referencia / Producto" name="referencia" required />
              <Field label="Cantidad" name="cantidad" type="number" required />
            </div>
            {isMayor && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Color de gel" name="colorGel" required />
                <Field label="Color de tinta" name="colorTinta" required />
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Valores</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Precio de venta total" name="precioTotal" type="number" required />
              {isMayor && <Field label="Abono inicial (50%)" name="abono" type="number" />}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas adicionales</Label>
            <Textarea id="notas" name="notas" placeholder="Observaciones del pedido..." />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Crear pedido</Button>
            <Button type="button" variant="outline" onClick={onReset}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ---- Shared helpers ---- */

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}

function FileField({ label, name }: { label: string; name: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input id={name} name={name} type="file" className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary" />
      </div>
    </div>
  );
}

export default Ventas;
