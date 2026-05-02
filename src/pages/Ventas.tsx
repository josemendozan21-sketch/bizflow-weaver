import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, CheckCircle2, FileText, ShoppingCart, ClipboardList, Plus, Trash2, BarChart3 } from "lucide-react";
import { useLogisticsStore } from "@/stores/logisticsStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useInventory } from "@/hooks/useInventory";
import { useAccountingStore } from "@/stores/accountingStore";

import { toast } from "sonner";
import QuotationGenerator from "@/components/ventas/QuotationGenerator";
import { MisPedidos } from "@/components/ventas/MisPedidos";
import { AdvisorSummary } from "@/components/ventas/AdvisorSummary";
import { createLogoRequestFromOrder } from "@/lib/createLogoRequestFromOrder";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { createOrderNotifications } from "@/hooks/useNotifications";
import SmartPasteField, { type ParsedOrderData } from "@/components/ventas/SmartPasteField";
import { useFormDraft, clearFormDraft, usePersistedState } from "@/hooks/useFormDraft";
type Brand = "sweatspot" | "magical";
type SaleType = "mayor" | "menor";

const Ventas = () => {
  const [step, setStep] = usePersistedState<1 | 2 | 3>("ventas:step", 1);
  const [brand, setBrand] = usePersistedState<Brand | null>("ventas:brand", null);
  const [saleType, setSaleType] = usePersistedState<SaleType | null>("ventas:saleType", null);

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
            <ShoppingCart className="h-4 w-4" /> Nuevo Pedido
          </TabsTrigger>
          <TabsTrigger value="mis-pedidos" className="gap-1.5">
            <ClipboardList className="h-4 w-4" /> Mis Pedidos
          </TabsTrigger>
          <TabsTrigger value="cotizaciones" className="gap-1.5">
            <FileText className="h-4 w-4" /> Cotizaciones
          </TabsTrigger>
          <TabsTrigger value="resumen" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Resumen
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
              <BrandCard icon={<span className="text-xl font-bold">Sweatspot</span>} onClick={() => handleBrandSelect("sweatspot")} />
              <BrandCard icon={<span className="text-xl font-bold">Magical Warmers</span>} onClick={() => handleBrandSelect("magical")} />
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

        <TabsContent value="mis-pedidos" className="space-y-6 mt-4">
          <MisPedidos />
        </TabsContent>

        <TabsContent value="cotizaciones" className="mt-4">
          <QuotationGenerator />
        </TabsContent>

        <TabsContent value="resumen" className="mt-4">
          <AdvisorSummary />
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

const PREDEFINED_COLORS = [
  "No aplica",
  "Azul", "Rosado", "Morado", "Negro", "Blanco", "Transparente",
  "Aguamarina", "Azul claro", "Verde lima", "Verde militar",
];

const TIROIDES_TYPES = ["Frío", "Térmico"] as const;
const TIROIDES_OPTION_PREFIX = "Tiroides__";
const HERBOLOGY_TYPES = ["Frío", "Térmico"] as const;
const HERBOLOGY_OPTION_PREFIX = "Herbology__";

interface OrderLine {
  id: string;
  product: string;
  type: string;
  gelColor: string;
  gelCustom: string;
  inkColor: string;
  inkCustom: string;
  units: string;
  valorUnitario: string;
  valorTotal: string;
  autoCalc: boolean;
  isGift: boolean;
}

function createEmptyLine(isGift = false): OrderLine {
  return {
    id: crypto.randomUUID(),
    product: "",
    type: "",
    gelColor: "",
    gelCustom: "",
    inkColor: "",
    inkCustom: "",
    units: isGift ? "1" : "",
    valorUnitario: isGift ? "0" : "",
    valorTotal: isGift ? "0" : "",
    autoCalc: true,
    isGift,
  };
}

function ColorSelect({
  label,
  value,
  customValue,
  onValueChange,
  onCustomChange,
}: {
  label: string;
  value: string;
  customValue: string;
  onValueChange: (v: string) => void;
  onCustomChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar color" />
        </SelectTrigger>
        <SelectContent>
          {PREDEFINED_COLORS.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
          <SelectItem value="otro">Otro (escribir)</SelectItem>
        </SelectContent>
      </Select>
      {value === "otro" && (
        <Input
          placeholder="Escriba el color..."
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          required
        />
      )}
    </div>
  );
}

function MagicalMayorForm({ onReset }: { onReset: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dobleTinta, setDobleTinta] = usePersistedState("ventas:mw:dobleTinta", false);
  const [escarcha, setEscarcha] = usePersistedState("ventas:mw:escarcha", false);
  const [isRecompra, setIsRecompra] = usePersistedState("ventas:mw:isRecompra", false);
  const [noLogo, setNoLogo] = usePersistedState("ventas:mw:noLogo", false);
  const [needsLogoAdjustment, setNeedsLogoAdjustment] = usePersistedState("ventas:mw:needsLogoAdjustment", false);
  const [orderLines, setOrderLines] = usePersistedState<OrderLine[]>("ventas:mw:lines", [createEmptyLine()]);
  const [abono, setAbono] = usePersistedState("ventas:mw:abono", "");
  const [estadoPago, setEstadoPago] = usePersistedState<"abono_inicial" | "pago_total" | "pendiente">("ventas:mw:estadoPago", "abono_inicial");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [costoAdicional, setCostoAdicional] = usePersistedState("ventas:mw:costoAdicional", "");
  const formRef = useRef<HTMLFormElement>(null);
  useFormDraft(formRef, "ventas:mw:fields");

  // Reset costo adicional si se desactivan ambas opciones
  useEffect(() => {
    if (!dobleTinta && !escarcha) setCostoAdicional("");
  }, [dobleTinta, escarcha]);

  const materialConfigs = useInventoryStore((s) => s.materialConfigs);
  const { reserveBodyStock: reserveBodyStockDB, discountStock: discountStockDB, stockItems: inventoryStockItems } = useInventory();

  // Unique product names — combine local material configs with Magical products from DB
  // so newly-added references (e.g. "Tiroides") show up for all advisors.
  const productNames = useMemo(() => {
    const fromConfig = materialConfigs.map((c) => c.productName);
    const fromDB = inventoryStockItems
      .filter(
        (s) =>
          s.brand === "magical" &&
          (s.category === "producto_terminado" || s.category === "cuerpos_referencias")
      )
      .map((s) => s.name);
    // Hardcoded fallback to guarantee key references always show up
    // even if the database fetch hasn't completed or is filtered out.
    const fallback = ["Tiroides", "Herbology"];
    const names = [...new Set([...fromConfig, ...fromDB, ...fallback])];
    return names.sort((a, b) => a.localeCompare(b, "es"));
  }, [materialConfigs, inventoryStockItems]);

  const productOptions = useMemo(() => {
    const tiroidesDirectOptions = TIROIDES_TYPES.map((type) => ({
      value: `${TIROIDES_OPTION_PREFIX}${type}`,
      label: `Tiroides (${type})`,
      product: "Tiroides",
      type,
    }));
    const herbologyDirectOptions = HERBOLOGY_TYPES.map((type) => ({
      value: `${HERBOLOGY_OPTION_PREFIX}${type}`,
      label: `Herbology (${type})`,
      product: "Herbology",
      type,
    }));
    const regularOptions = productNames
      .filter((name) => name !== "Tiroides" && name !== "Herbology")
      .map((name) => ({ value: name, label: name, product: name, type: "" }));
    return [
      ...tiroidesDirectOptions,
      { value: "Tiroides", label: "Tiroides", product: "Tiroides", type: "" },
      ...herbologyDirectOptions,
      { value: "Herbology", label: "Herbology", product: "Herbology", type: "" },
      ...regularOptions,
    ];
  }, [productNames]);

  const getProductSelectValue = (line: OrderLine) => {
    if (line.product === "Tiroides" && TIROIDES_TYPES.includes(line.type as (typeof TIROIDES_TYPES)[number])) {
      return `${TIROIDES_OPTION_PREFIX}${line.type}`;
    }
    if (line.product === "Herbology" && HERBOLOGY_TYPES.includes(line.type as (typeof HERBOLOGY_TYPES)[number])) {
      return `${HERBOLOGY_OPTION_PREFIX}${line.type}`;
    }
    return line.product;
  };

  const handleProductSelect = (lineId: string, value: string) => {
    const selectedOption = productOptions.find((option) => option.value === value);
    if (selectedOption) {
      updateLine(lineId, { product: selectedOption.product, type: selectedOption.type });
      return;
    }
    updateLine(lineId, { product: value, type: "" });
  };

  // Grand total across all lines
  const grandTotal = useMemo(() => {
    const linesSum = orderLines.reduce((sum, line) => line.isGift ? sum : sum + (parseFloat(line.valorTotal) || 0), 0);
    const extra = (dobleTinta || escarcha) ? (parseFloat(costoAdicional) || 0) : 0;
    return linesSum + extra;
  }, [orderLines, costoAdicional, dobleTinta, escarcha]);

  // Auto-fill abono when pago_total
  useEffect(() => {
    if (estadoPago === "pago_total") {
      setAbono(String(grandTotal));
    }
  }, [estadoPago, grandTotal]);

  const updateLine = (id: string, updates: Partial<OrderLine>) => {
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, ...updates };
        // Auto-calc total for this line
        if (updated.autoCalc) {
          const qty = parseInt(updated.units, 10) || 0;
          const unitP = parseFloat(updated.valorUnitario) || 0;
          if (qty > 0 && unitP > 0) {
            updated.valorTotal = String(qty * unitP);
          }
        }
        return updated;
      })
    );
  };

  const addLine = () => setOrderLines((prev) => [...prev, createEmptyLine()]);
  const addGiftLine = () => setOrderLines((prev) => [...prev, createEmptyLine(true)]);
  const removeLine = (id: string) => setOrderLines((prev) => prev.filter((l) => l.id !== id));

  const getAvailableTypes = (productName: string) => {
    if (!productName) return [];
    const fromConfig = materialConfigs
      .filter((c) => c.productName === productName)
      .map((c) => c.productType);
    const fromDB = inventoryStockItems
      .filter(
        (s) =>
          s.brand === "magical" &&
          (s.category === "producto_terminado" || s.category === "cuerpos_referencias") &&
          s.name === productName &&
          s.product_type
      )
      .map((s) => s.product_type as string);
    const merged = [...new Set([...fromConfig, ...fromDB])];
    // Reliable fallback for known references without local config (e.g. Tiroides)
    if (productName === "Tiroides") {
      return [...new Set([...TIROIDES_TYPES, ...merged])];
    }
    if (productName === "Herbology") {
      return [...new Set([...HERBOLOGY_TYPES, ...merged])];
    }
    return merged;
  };

  const getMatchedConfig = (productName: string, productType: string) => {
    if (!productName || !productType) return null;
    return materialConfigs.find((c) => c.productName === productName && c.productType === productType) || null;
  };

  const resolveColor = (selected: string, custom: string) => {
    return selected === "otro" ? custom : selected;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const clientName = fd.get("mw_nombre") as string;
    const rutFile = fd.get("mw_rut") as File;
    const personalizacion = (fd.get("mw_personalizacion") as string) || "";
    const observaciones = (fd.get("mw_observaciones") as string) || "";
    const logoFile = fd.get("mw_logo") as File;
    const logoNombre = ((fd.get("mw_logo_nombre") as string) || "").trim();
    const fechaRequerida = fd.get("mw_fechaRequerida") as string;

    // Validate all lines
    for (const line of orderLines) {
      if (!line.product || !line.type) {
        toast.error("Producto requerido", { description: "Seleccione producto y tipo en todas las líneas." });
        setIsSubmitting(false);
        return;
      }
      const gelFinal = resolveColor(line.gelColor, line.gelCustom);
      const inkFinal = resolveColor(line.inkColor, line.inkCustom);
      if (!gelFinal) {
        toast.error("Color de gel requerido", { description: "Seleccione un color de gel en todas las líneas." });
        setIsSubmitting(false);
        return;
      }
      if (!inkFinal) {
        toast.error("Color de tinta requerido", { description: "Seleccione un color de tinta en todas las líneas." });
        setIsSubmitting(false);
        return;
      }
    }

    // RUT es opcional en ventas al por mayor

    // Upload initial payment proof if provided
    let paymentProofUrl: string | null = null;
    if (paymentProofFile && paymentProofFile.size > 0) {
      const ext = paymentProofFile.name.split(".").pop();
      const path = `initial_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("payment-proofs").upload(path, paymentProofFile);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
        paymentProofUrl = urlData.publicUrl;
      }
    }

    // Upload logo once if provided. En recompras NO se crea solicitud
    // de diseño automática (el logo ya existe y fue aprobado antes).
    let logoUrl: string | null = null;
    if (logoFile && logoFile.size > 0 && user && !isRecompra && !noLogo) {
      const firstLine = orderLines[0];
      const referencia = `${firstLine.product} (${firstLine.type})`;
      const result = await createLogoRequestFromOrder({
        brand: "Magical Warmers",
        clientName,
        product: referencia,
        advisorId: user.id,
        advisorName: user.email || "Asesor",
        logoFile,
        clientComments: observaciones || undefined,
        additionalInstructions: personalizacion || undefined,
      });
      if (result.success) {
        toast.success("Diseño de logo", { description: result.message });
        logoUrl = result.logoUrl || "logo-uploaded";
      } else {
        toast.error("Diseño de logo", { description: result.message });
        if (result.logoUrl) logoUrl = result.logoUrl;
      }
    } else if (logoFile && logoFile.size > 0 && isRecompra) {
      // Recompra: subir el logo directamente para conservar la URL real.
      const ext = logoFile.name.split(".").pop();
      const path = `originals/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("logo-files").upload(path, logoFile);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("logo-files").getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      } else {
        logoUrl = "logo-uploaded";
      }
    }

    const magicalStages = noLogo
      ? ["produccion_cuerpos", "dosificacion", "sellado", "recorte", "empaque", "listo"]
      : ["produccion_cuerpos", "estampacion", "dosificacion", "sellado", "recorte", "empaque", "listo"];

    // Process each line as a separate order
    const extraCost = (dobleTinta || escarcha) ? (parseFloat(costoAdicional) || 0) : 0;
    const extraNoteParts: string[] = [];
    if (dobleTinta) extraNoteParts.push("doble tinta");
    if (escarcha) extraNoteParts.push("escarcha");
    const extraNote = extraCost > 0
      ? `Costo adicional ${extraNoteParts.join(" y ")}: $${extraCost.toLocaleString("es-CO")}`
      : "";

    // Calcular totales del pedido completo para prorratear el abono entre líneas.
    // El abono ingresado por el asesor es por el TOTAL del pedido, no por cada línea.
    const lineTotalsForProration = orderLines.map((line, idx) => {
      if (line.isGift) return 0;
      const base = parseFloat(line.valorTotal) || 0;
      return idx === 0 ? base + extraCost : base;
    });
    const orderGrandTotal = lineTotalsForProration.reduce((s, v) => s + v, 0);
    const totalAbonoPedido = estadoPago === "pago_total"
      ? orderGrandTotal
      : (parseFloat(abono) || 0);
    let abonoAsignado = 0;

    for (let lineIdx = 0; lineIdx < orderLines.length; lineIdx++) {
      const line = orderLines[lineIdx];
      const isFirstLine = lineIdx === 0;
      const quantity = parseInt(line.units, 10) || 0;
      const referencia = `${line.product} (${line.type})`;
      const gelColor = resolveColor(line.gelColor, line.gelCustom);
      const inkColor = resolveColor(line.inkColor, line.inkCustom);
      const baseLineTotal = line.isGift ? 0 : (parseFloat(line.valorTotal) || 0);
      // Sumar el costo adicional sólo a la primera línea (no a obsequios)
      const lineTotal = (isFirstLine && !line.isGift) ? baseLineTotal + extraCost : baseLineTotal;
      // Prorratear el abono total proporcionalmente al peso de la línea sobre el total.
      // La última línea no-obsequio recibe el residuo para evitar errores de redondeo.
      let abonoAmount = 0;
      if (!line.isGift && orderGrandTotal > 0) {
        const remainingLines = lineTotalsForProration
          .slice(lineIdx + 1)
          .some((v) => v > 0);
        if (remainingLines) {
          abonoAmount = Math.round((totalAbonoPedido * lineTotal) / orderGrandTotal);
          abonoAsignado += abonoAmount;
        } else {
          // Última línea con valor: asignar el residuo
          abonoAmount = Math.max(totalAbonoPedido - abonoAsignado, 0);
          abonoAsignado += abonoAmount;
        }
      }
      const matchedConfig = getMatchedConfig(line.product, line.type);

      // Discount gel
      const gelResult = await discountStockDB("gel", quantity * (matchedConfig?.gramsPerUnit || 60));
      if (gelResult.success) {
        console.log("[Ventas] Gel discount:", gelResult.message);
      } else {
        toast.warning("Inventario de gel", { description: gelResult.message });
      }

      // Accounting store
      useAccountingStore.getState().addOrder({
        clientName,
        brand: "magical",
        product: referencia,
        quantity,
        saleType: "mayor",
        clientType: "Cliente empresa",
        totalAmount: lineTotal,
        abono: abonoAmount,
        paymentStatus: estadoPago,
        canDispatch: estadoPago === "pago_total",
        hasRut: !!(rutFile && rutFile.name),
        email: (fd.get("mw_email") as string)?.trim() || undefined,
        direccion: (fd.get("mw_direccion") as string)?.trim() || undefined,
        ciudad: (fd.get("mw_ciudad") as string)?.trim() || undefined,
        observaciones: observaciones?.trim() || undefined,
      });


      // Insert order to DB
      let orderData: { id: string } | null = null;
      try {
        const { data } = await supabase.from("orders").insert({
          brand: "magical",
          sale_type: "mayor",
          client_name: clientName,
          client_nit: (fd.get("mw_cedulaNit") as string) || null,
          client_phone: (fd.get("mw_contacto") as string) || null,
          client_email: (fd.get("mw_email") as string) || null,
          client_address: (fd.get("mw_direccion") as string) || null,
          client_city: (fd.get("mw_ciudad") as string) || null,
          product: referencia,
          quantity,
          unit_price: parseFloat(line.valorUnitario) || 0,
          total_amount: lineTotal,
          abono: abonoAmount,
          ink_color: inkColor,
          gel_color: gelColor,
          logo_url: logoUrl,
          observations: [observaciones, line.isGift ? "🎁 OBSEQUIO" : "", isFirstLine ? extraNote : ""].filter(Boolean).join(" | ") || null,
          personalization: personalizacion || null,
          advisor_id: user?.id || "",
          advisor_name: user?.email || "Asesor",
          production_status: "pendiente",
          is_recompra: isRecompra,
          payment_proof_url: paymentProofUrl,
          payment_complete: estadoPago === "pago_total",
          delivery_date: fechaRequerida || null,
        }).select("id").single();
        orderData = data;
      } catch (err: any) {
        console.error("Error saving order:", err);
        toast.error("Error al crear el pedido", { description: "No se pudo guardar. Intenta de nuevo." });
        setIsSubmitting(false);
        return;
      }

      if (!orderData) {
        toast.error("Error al crear el pedido", { description: "No se recibió confirmación de la base de datos." });
        setIsSubmitting(false);
        return;
      }

      // Reserve body stock
      const bodyResult = await reserveBodyStockDB("magical", referencia, quantity, {
        clientName,
        requestedBy: user?.id || undefined,
      });

      const needsCuerpos = !bodyResult.available || bodyResult.discounted < quantity;
      const initialStage = needsCuerpos
        ? "produccion_cuerpos"
        : (noLogo ? "dosificacion" : "estampacion");

      await supabase.from("orders").update({ production_status: initialStage }).eq("id", orderData.id);

      try {
        await supabase.from("production_orders").insert({
          order_id: orderData.id,
          brand: "magical",
          client_name: clientName,
          quantity,
          current_stage: initialStage,
          stage_status: "pendiente",
          workflow_type: "full",
          stages: magicalStages,
          gel_color: gelColor,
          ink_color: inkColor,
          logo_file: logoNombre || logoFile?.name || null,
          needs_cuerpos: needsCuerpos,
          has_stock: bodyResult.available,
          molde: referencia,
          observations: observaciones || null,
          advisor_id: user?.id || null,
        });
      } catch (err: any) {
        console.error("Error creating production order:", err);
      }

      await createOrderNotifications({
        orderId: orderData.id,
        brand: "magical",
        product: referencia,
        quantity,
        clientName,
        needsCuerpos,
        shortage: needsCuerpos ? quantity - bodyResult.discounted : 0,
        hasLogo: !!logoFile,
        advisorId: user?.id || "",
      });
    }

    queryClient.invalidateQueries({ queryKey: ["production-orders"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });

    const giftCount = orderLines.filter((l) => l.isGift).length;
    const productCount = orderLines.filter((l) => !l.isGift).length;
    const summary = [
      `${productCount} producto(s)`,
      giftCount > 0 ? `${giftCount} obsequio(s)` : "",
    ].filter(Boolean).join(" + ");
    toast.success("Pedido creado", {
      description: `${clientName} — ${summary}. Enviado a Producción y Contabilidad.`,
    });

    [
      "ventas:mw:lines","ventas:mw:abono","ventas:mw:estadoPago",
      "ventas:mw:dobleTinta","ventas:mw:escarcha","ventas:mw:isRecompra",
      "ventas:mw:noLogo","ventas:mw:needsLogoAdjustment","ventas:mw:costoAdicional",
      "ventas:mw:fields",
    ].forEach(clearFormDraft);
    onReset();
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Nuevo pedido — Magical Warmers</CardTitle>
        <CardDescription>Venta al por mayor</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <SmartPasteField
            brand="magical"
            onDataParsed={(data) => {
              // Fill client fields
              const form = document.querySelector("form") as HTMLFormElement;
              if (!form) return;
              const setInput = (name: string, value: string | undefined | null) => {
                const el = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
                if (el && value) { el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); }
              };
              setInput("mw_nombre", data.cliente?.nombre);
              setInput("mw_cedulaNit", data.cliente?.cedula_nit);
              setInput("mw_contacto", data.cliente?.telefono);
              setInput("mw_email", data.cliente?.email);
              setInput("mw_direccion", data.cliente?.direccion);
              setInput("mw_ciudad", data.cliente?.ciudad);

              // Fill product lines
              if (data.productos && data.productos.length > 0) {
                const newLines = data.productos.map((p) => ({
                  id: crypto.randomUUID(),
                  product: p.producto || "",
                  type: p.tipo || "",
                  gelColor: p.color_gel || "",
                  gelCustom: "",
                  inkColor: p.color_tinta || "",
                  inkCustom: "",
                  units: String(p.unidades || ""),
                  valorUnitario: String(p.valor_unitario || ""),
                  valorTotal: String(p.valor_total || ""),
                  autoCalc: !p.valor_total,
                  isGift: false,
                }));
                setOrderLines(newLines);
              }

              if (data.abono) setAbono(String(data.abono));
              if (data.es_recompra) setIsRecompra(true);
              if (data.observaciones) {
                const obs = form.querySelector('[name="mw_observaciones"]') as HTMLTextAreaElement;
                if (obs) obs.value = data.observaciones;
              }
              if (data.personalizacion) {
                const pers = form.querySelector('[name="mw_personalizacion"]') as HTMLTextAreaElement;
                if (pers) pers.value = data.personalizacion;
              }
            }}
          />

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Información del cliente</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre del cliente" name="mw_nombre" required />
              <Field label="Cédula o NIT" name="mw_cedulaNit" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Número de contacto" name="mw_contacto" type="tel" required />
              <Field label="Correo electrónico" name="mw_email" type="email" required />
            </div>
            <Field label="Dirección de envío" name="mw_direccion" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ciudad" name="mw_ciudad" required />
              <Field label="Departamento" name="mw_departamento" required />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Productos del pedido</legend>
            {orderLines.map((line, idx) => (
              <div key={line.id} className={`rounded-lg border p-4 space-y-4 relative ${line.isGift ? "border-amber-300 bg-amber-50/50" : "border-border"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {line.isGift ? "🎁 Obsequio" : `Producto ${idx + 1}`}
                    </span>
                    {line.isGift && (
                      <Badge variant="outline" className="border-amber-400 text-amber-700 text-xs">Gratis</Badge>
                    )}
                  </div>
                  {orderLines.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(line.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Producto / Referencia</Label>
                     <Select value={getProductSelectValue(line) || undefined} onValueChange={(v) => handleProductSelect(line.id, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {productOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select value={line.type || undefined} onValueChange={(v) => updateLine(line.id, { type: v })} disabled={!line.product}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableTypes(line.product).map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorSelect
                    label="Color de gel"
                    value={line.gelColor}
                    customValue={line.gelCustom}
                    onValueChange={(v) => updateLine(line.id, { gelColor: v })}
                    onCustomChange={(v) => updateLine(line.id, { gelCustom: v })}
                  />
                  <ColorSelect
                    label="Color de tinta"
                    value={line.inkColor}
                    customValue={line.inkCustom}
                    onValueChange={(v) => updateLine(line.id, { inkColor: v })}
                    onCustomChange={(v) => updateLine(line.id, { inkCustom: v })}
                  />
                </div>
                {!line.isGift && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Unidades</Label>
                    <Input type="number" required value={line.units} onChange={(e) => updateLine(line.id, { units: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor unitario</Label>
                    <Input type="number" required value={line.valorUnitario} onChange={(e) => updateLine(line.id, { valorUnitario: e.target.value, autoCalc: true })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor total línea</Label>
                    <Input type="number" required value={line.valorTotal} onChange={(e) => updateLine(line.id, { valorTotal: e.target.value, autoCalc: false })} />
                    {line.autoCalc && parseInt(line.units, 10) > 0 && parseFloat(line.valorUnitario) > 0 && (
                      <p className="text-xs text-muted-foreground">Calculado automáticamente</p>
                    )}
                  </div>
                </div>
                )}
                {line.isGift && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Unidades</Label>
                    <Input type="number" required value={line.units} onChange={(e) => updateLine(line.id, { units: e.target.value })} />
                  </div>
                </div>
                )}
              </div>
            ))}
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addLine}>
                <Plus className="h-4 w-4" /> Agregar otro producto
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addGiftLine} className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50">
                🎁 Adicionar obsequio
              </Button>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Pago</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {estadoPago !== "pago_total" && (
                <div className="space-y-1.5">
                  <Label htmlFor="mw_abono">Abono del total del pedido</Label>
                  <Input id="mw_abono" name="mw_abono" type="number" value={abono} onChange={(e) => setAbono(e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Estado del pago</Label>
                <Select value={estadoPago} onValueChange={(v) => setEstadoPago(v as typeof estadoPago)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abono_inicial">Abono inicial recibido</SelectItem>
                    <SelectItem value="pago_total">Pago total recibido</SelectItem>
                    <SelectItem value="pendiente">Pago pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Soporte de pago inicial</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)} className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary" />
              <p className="text-xs text-muted-foreground">Adjunte el comprobante del abono inicial para revisión en contabilidad</p>
            </div>
            <Field label="Fecha requerida de entrega" name="mw_fechaRequerida" type="date" />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Opciones adicionales</legend>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center justify-between rounded-md border border-input p-3">
                <Label htmlFor="mw_recompra" className="cursor-pointer">Recompra</Label>
                <Switch id="mw_recompra" checked={isRecompra} onCheckedChange={setIsRecompra} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-input p-3">
                <Label htmlFor="mw_dobleTinta" className="cursor-pointer">Doble tinta</Label>
                <Switch id="mw_dobleTinta" checked={dobleTinta} onCheckedChange={setDobleTinta} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-input p-3">
                <Label htmlFor="mw_escarcha" className="cursor-pointer">Escarcha</Label>
                <Switch id="mw_escarcha" checked={escarcha} onCheckedChange={setEscarcha} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-input p-3">
                <Label htmlFor="mw_noLogo" className="cursor-pointer">No requiere logo</Label>
                <Switch id="mw_noLogo" checked={noLogo} onCheckedChange={setNoLogo} />
              </div>
            </div>
            {isRecompra && (
              <p className="text-xs text-muted-foreground rounded-md border border-input bg-muted/30 p-3">
                ✓ Recompra: El logo ya existe, no se generará solicitud de diseño automática.
              </p>
            )}
            {noLogo && (
              <p className="text-xs text-muted-foreground rounded-md border border-input bg-muted/30 p-3">
                ✓ Sin logo: El pedido omitirá la etapa de estampación y pasará directo a producción.
              </p>
            )}
            {(dobleTinta || escarcha) && (
              <div className="space-y-1.5 rounded-md border border-input bg-muted/30 p-3">
                <Label htmlFor="mw_costoAdicional">
                  Costo adicional ({[dobleTinta && "doble tinta", escarcha && "escarcha"].filter(Boolean).join(" y ")})
                </Label>
                <Input
                  id="mw_costoAdicional"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="Ej: 15000"
                  value={costoAdicional}
                  onChange={(e) => setCostoAdicional(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Este valor se sumará al total del pedido y será cobrado al cliente.
                </p>
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Archivos adjuntos</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <FileField label="Adjuntar logo" name="mw_logo" />
              <FileField label="Adjuntar RUT de la empresa (opcional)" name="mw_rut" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mw_logo_nombre">Nombre o referencia del logo</Label>
              <Input
                id="mw_logo_nombre"
                name="mw_logo_nombre"
                placeholder="Ej: Logo Coca-Cola v2, Escudo Colegio San José..."
              />
              <p className="text-xs text-muted-foreground">
                Escriba un nombre claro para que producción identifique fácilmente este logo.
              </p>
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

          <PaymentSummary
            totalAmount={grandTotal}
            abono={estadoPago === "pago_total" ? grandTotal : (parseFloat(abono) || 0)}
            estadoPago={estadoPago}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>Crear pedido</Button>
            <Button type="button" variant="outline" onClick={onReset}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ---- Sweatspot – Al por mayor ---- */

interface SweatspotOrderLine {
  id: string;
  referencia: string;
  tamano: "150 ml" | "250 ml" | "250 ml juguetón" | "500 ml" | "";
  tipoLogo: "Impresión full" | "Impresión básica" | "";
  colorSilicona: string;
  colorTinta: string;
  units: string;
  valorUnitario: string;
  valorTotal: string;
  autoCalc: boolean;
}

function createEmptySSLine(): SweatspotOrderLine {
  return {
    id: crypto.randomUUID(),
    referencia: "",
    tamano: "",
    tipoLogo: "",
    colorSilicona: "",
    colorTinta: "",
    units: "",
    valorUnitario: "",
    valorTotal: "",
    autoCalc: true,
  };
}

function SweatspotMayorForm({ onReset }: { onReset: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { reserveBodyStock: reserveBodyStockDB } = useInventory();
  const [ssLines, setSsLines] = usePersistedState<SweatspotOrderLine[]>("ventas:ss:lines", [createEmptySSLine()]);
  const [ssAbono, setSsAbono] = usePersistedState("ventas:ss:abono", "");
  const [ssEstadoPago, setSsEstadoPago] = usePersistedState<"abono_inicial" | "pago_total" | "pendiente">("ventas:ss:estadoPago", "abono_inicial");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ssIsRecompra, setSsIsRecompra] = usePersistedState("ventas:ss:isRecompra", false);
  const [ssNoLogo, setSsNoLogo] = usePersistedState("ventas:ss:noLogo", false);
  const [ssNeedsLogoAdjustment, setSsNeedsLogoAdjustment] = usePersistedState("ventas:ss:needsLogoAdjustment", false);
  const [ssPaymentProofFile, setSsPaymentProofFile] = useState<File | null>(null);
  const ssFormRef = useRef<HTMLFormElement>(null);
  useFormDraft(ssFormRef, "ventas:ss:fields");
  const tamanos = ["150 ml", "250 ml", "250 ml juguetón", "500 ml"] as const;

  // Grand total across all lines
  const grandTotal = useMemo(() => {
    return ssLines.reduce((sum, line) => sum + (parseFloat(line.valorTotal) || 0), 0);
  }, [ssLines]);

  // Auto-fill abono when pago_total
  useEffect(() => {
    if (ssEstadoPago === "pago_total") {
      setSsAbono(String(grandTotal));
    }
  }, [ssEstadoPago, grandTotal]);

  const updateSSLine = (id: string, updates: Partial<SweatspotOrderLine>) => {
    setSsLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, ...updates };
        if (updated.autoCalc) {
          const qty = parseInt(updated.units, 10) || 0;
          const unitP = parseFloat(updated.valorUnitario) || 0;
          if (qty > 0 && unitP > 0) {
            updated.valorTotal = String(qty * unitP);
          }
        }
        return updated;
      })
    );
  };

  const addSSLine = () => setSsLines((prev) => [...prev, createEmptySSLine()]);
  const removeSSLine = (id: string) => setSsLines((prev) => prev.filter((l) => l.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const clientName = fd.get("ss_nombre") as string;
    const rutFile = fd.get("ss_rut") as File;
    const personalizacion = (fd.get("ss_personalizacion") as string) || "";
    const observaciones = (fd.get("ss_observaciones") as string) || "";
    const logoFile = fd.get("ss_logo") as File;
    const logoNombre = ((fd.get("ss_logo_nombre") as string) || "").trim();
    const fechaRequerida = fd.get("ss_fechaRequerida") as string;

    // Validate all lines
    for (const line of ssLines) {
      if (!line.referencia || !line.tamano || !line.colorSilicona || !line.colorTinta || !line.units) {
        toast.error("Datos incompletos", { description: "Complete todos los campos en cada producto." });
        setIsSubmitting(false);
        return;
      }
      if (!ssNoLogo && !line.tipoLogo) {
        toast.error("Tipo de logo requerido", { description: "Seleccione el tipo de logo o marque 'No requiere logo'." });
        setIsSubmitting(false);
        return;
      }
    }

    // RUT es opcional en ventas al por mayor

    // Upload initial payment proof if provided
    let ssPaymentProofUrl: string | null = null;
    if (ssPaymentProofFile && ssPaymentProofFile.size > 0) {
      const ext = ssPaymentProofFile.name.split(".").pop();
      const path = `initial_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("payment-proofs").upload(path, ssPaymentProofFile);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
        ssPaymentProofUrl = urlData.publicUrl;
      }
    }

    // Auto-create design request once if logo was uploaded.
    // En recompras NO se crea solicitud de diseño automática.
    let logoUrl: string | null = null;
    if (logoFile && logoFile.size > 0 && user && !ssIsRecompra && !ssNoLogo) {
      const firstRef = ssLines[0].referencia;
      const result = await createLogoRequestFromOrder({
        brand: "Sweatspot",
        clientName,
        product: firstRef,
        advisorId: user.id,
        advisorName: user.email || "Asesor",
        logoFile,
        clientComments: observaciones || undefined,
        additionalInstructions: personalizacion || undefined,
      });
      if (result.success) {
        toast.success("Diseño de logo", { description: result.message });
        logoUrl = result.logoUrl || "logo-uploaded";
      } else {
        toast.error("Diseño de logo", { description: result.message });
        if (result.logoUrl) logoUrl = result.logoUrl;
      }
    }

    const ssShortStages = ssNoLogo
      ? ["produccion_cuerpos", "colocacion_boquilla", "listo"]
      : ["produccion_cuerpos", "estampacion", "colocacion_boquilla", "listo"];
    const ssFullStages = ssNoLogo
      ? ["produccion_cuerpos", "produccion_tubos", "ensamble_cuello", "sello_base", "refile", "colocacion_boquilla", "listo"]
      : ["produccion_cuerpos", "estampacion", "produccion_tubos", "ensamble_cuello", "sello_base", "refile", "colocacion_boquilla", "listo"];

    // Process each line as a separate order
    // Calcular totales para prorratear el abono entre líneas (el abono es por el TOTAL del pedido).
    const ssLineTotals = ssLines.map((line) => parseFloat(line.valorTotal) || 0);
    const ssGrandTotal = ssLineTotals.reduce((s, v) => s + v, 0);
    const totalAbonoPedidoSs = ssEstadoPago === "pago_total"
      ? ssGrandTotal
      : (parseFloat(ssAbono) || 0);
    let abonoAsignadoSs = 0;

    for (let lineIdx = 0; lineIdx < ssLines.length; lineIdx++) {
      const line = ssLines[lineIdx];
      const quantity = parseInt(line.units, 10) || 0;
      const referencia = line.referencia;
      const inkColor = line.colorTinta;
      const siliconeColor = line.colorSilicona;
      const thermoSize = line.tamano as "150 ml" | "250 ml" | "250 ml juguetón" | "500 ml";
      const tipoLogo = line.tipoLogo;
      const lineTotal = parseFloat(line.valorTotal) || 0;
      // Prorratear el abono según el peso de la línea sobre el total del pedido.
      let abonoAmount = 0;
      if (ssGrandTotal > 0) {
        const isLast = lineIdx === ssLines.length - 1;
        if (!isLast) {
          abonoAmount = Math.round((totalAbonoPedidoSs * lineTotal) / ssGrandTotal);
          abonoAsignadoSs += abonoAmount;
        } else {
          abonoAmount = Math.max(totalAbonoPedidoSs - abonoAsignadoSs, 0);
          abonoAsignadoSs += abonoAmount;
        }
      }
      const logoType = tipoLogo === "Impresión básica" ? "impresion_basica" as const : "impresion_full" as const;

      // Sweatspot solo produce termos (150/250/500 ml). El resto (canguros, chalecos,
      // imanes, etc.) son productos importados/finalizados y van directo a Logística.
      const isImportedProduct = !/termo/i.test(referencia);

      useAccountingStore.getState().addOrder({
        clientName,
        brand: "sweatspot",
        product: referencia,
        quantity,
        saleType: "mayor",
        clientType: "Cliente empresa",
        totalAmount: lineTotal,
        abono: abonoAmount,
        paymentStatus: ssEstadoPago,
        canDispatch: ssEstadoPago === "pago_total",
        hasRut: !!(rutFile && rutFile.name),
        email: (fd.get("ss_email") as string)?.trim() || undefined,
        direccion: (fd.get("ss_direccion") as string)?.trim() || undefined,
        ciudad: (fd.get("ss_ciudad") as string)?.trim() || undefined,
        observaciones: observaciones?.trim() || undefined,
      });

      let orderData: { id: string } | null = null;
      try {
        const { data } = await supabase.from("orders").insert({
          brand: "sweatspot",
          sale_type: "mayor",
          client_name: clientName,
          client_nit: (fd.get("ss_cedulaNit") as string) || null,
          client_phone: (fd.get("ss_contacto") as string) || null,
          client_email: (fd.get("ss_email") as string) || null,
          client_address: (fd.get("ss_direccion") as string) || null,
          client_city: (fd.get("ss_ciudad") as string) || null,
          product: referencia,
          quantity,
          unit_price: parseFloat(line.valorUnitario) || 0,
          total_amount: lineTotal,
          abono: abonoAmount,
          ink_color: inkColor,
          silicone_color: siliconeColor,
          logo_url: logoUrl,
          observations: observaciones || null,
          personalization: personalizacion || null,
          advisor_id: user?.id || "",
          advisor_name: user?.email || "Asesor",
          production_status: isImportedProduct ? "listo" : "pendiente",
          is_recompra: ssIsRecompra,
          payment_proof_url: ssPaymentProofUrl,
          payment_complete: ssEstadoPago === "pago_total",
          delivery_date: fechaRequerida || null,
        }).select("id").single();
        orderData = data;
      } catch (err: any) {
        console.error("Error saving order:", err);
        toast.error("Error al crear el pedido", {
          description: "No se pudo guardar el pedido. Intenta de nuevo.",
        });
        setIsSubmitting(false);
        return;
      }

      if (!orderData) {
        toast.error("Error al crear el pedido", {
          description: "No se recibió confirmación de la base de datos.",
        });
        setIsSubmitting(false);
        return;
      }

      // Productos importados: saltan producción y van directo a logística
      if (isImportedProduct) {
        await createOrderNotifications({
          orderId: orderData.id,
          brand: "sweatspot",
          product: referencia,
          quantity,
          clientName,
          needsCuerpos: false,
          shortage: 0,
          hasLogo: false,
          advisorId: user?.id || "",
        });
        continue;
      }

      const bodyResult = await reserveBodyStockDB("sweatspot", referencia, quantity, {
        clientName,
        requestedBy: user?.id || undefined,
      });
      const needsCuerpos = !bodyResult.available || bodyResult.discounted < quantity;
      const hasStock = bodyResult.available && bodyResult.discounted >= quantity;

      const workflowType = ((ssNoLogo || logoType === "impresion_basica") && hasStock) ? "short" : "full";
      const ssStages = workflowType === "short" ? ssShortStages : ssFullStages;
      const initialStage = needsCuerpos
        ? "produccion_cuerpos"
        : (ssNoLogo ? (workflowType === "short" ? "colocacion_boquilla" : "produccion_tubos") : "estampacion");

      await supabase.from("orders")
        .update({ production_status: initialStage })
        .eq("id", orderData.id);

      try {
        await supabase.from("production_orders").insert({
          order_id: orderData.id,
          brand: "sweatspot",
          client_name: clientName,
          quantity,
          current_stage: initialStage,
          stage_status: "pendiente",
          workflow_type: workflowType,
          stages: ssStages,
          ink_color: inkColor,
          thermo_size: thermoSize,
          silicone_color: siliconeColor,
          logo_type: logoType,
          logo_file: logoNombre || logoFile?.name || null,
          has_stock: hasStock,
          needs_cuerpos: !hasStock,
          observations: observaciones || null,
          advisor_id: user?.id || null,
        });
      } catch (err: any) {
        console.error("Error creating production order:", err);
      }

      await createOrderNotifications({
        orderId: orderData.id,
        brand: "sweatspot",
        product: referencia,
        quantity,
        clientName,
        needsCuerpos,
        shortage: needsCuerpos ? quantity - bodyResult.discounted : 0,
        hasLogo: !!logoFile,
        advisorId: user?.id || "",
      });
    }

    queryClient.invalidateQueries({ queryKey: ["production-orders"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });

    const lineCount = ssLines.length;
    toast.success(`${lineCount > 1 ? lineCount + " pedidos creados" : "Pedido al por mayor creado"}`, {
      description: `${clientName} — ${lineCount > 1 ? lineCount + " líneas" : ssLines[0].units + " uds"}. Enviado a Producción y Contabilidad.`,
    });

    const saldoFinal = ssEstadoPago === "pago_total"
      ? 0
      : grandTotal - (parseFloat(ssAbono) || 0);
    if (saldoFinal > 0) {
      toast.warning("Saldo pendiente registrado", {
        description: `Falta $${saldoFinal.toLocaleString("es-CO")} para completar el pago. Contabilidad fue notificada.`,
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
        <form ref={ssFormRef} onSubmit={handleSubmit} className="space-y-6">
          <SmartPasteField
            brand="sweatspot"
            onDataParsed={(data) => {
              const form = document.querySelectorAll("form")[0] as HTMLFormElement;
              if (!form) return;
              const setInput = (name: string, value: string | undefined | null) => {
                const el = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
                if (el && value) { el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); }
              };
              setInput("ss_nombre", data.cliente?.nombre);
              setInput("ss_cedulaNit", data.cliente?.cedula_nit);
              setInput("ss_contacto", data.cliente?.telefono);
              setInput("ss_email", data.cliente?.email);
              setInput("ss_direccion", data.cliente?.direccion);
              setInput("ss_ciudad", data.cliente?.ciudad);

              // Fill product lines
              if (data.productos && data.productos.length > 0) {
                const newLines: SweatspotOrderLine[] = data.productos.map((p: any) => ({
                  id: crypto.randomUUID(),
                  referencia: data.referencia || p.producto || "",
                  tamano: "",
                  tipoLogo: "",
                  colorSilicona: data.color_silicona || "",
                  colorTinta: p.color_tinta || "",
                  units: String(p.unidades || ""),
                  valorUnitario: String(p.valor_unitario || ""),
                  valorTotal: String(p.valor_total || ""),
                  autoCalc: !p.valor_total,
                }));
                setSsLines(newLines);
              }

              if (data.abono) setSsAbono(String(data.abono));
              if (data.es_recompra) setSsIsRecompra(true);
              if (data.observaciones) {
                const obs = form.querySelector('[name="ss_observaciones"]') as HTMLTextAreaElement;
                if (obs) obs.value = data.observaciones;
              }
              if (data.personalizacion) {
                const pers = form.querySelector('[name="ss_personalizacion"]') as HTMLTextAreaElement;
                if (pers) pers.value = data.personalizacion;
              }
            }}
          />

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Información del cliente</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre del cliente" name="ss_nombre" required />
              <Field label="Cédula o NIT" name="ss_cedulaNit" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Número de contacto" name="ss_contacto" type="tel" required />
              <Field label="Correo electrónico" name="ss_email" type="email" required />
            </div>
            <Field label="Dirección de envío" name="ss_direccion" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ciudad" name="ss_ciudad" required />
              <Field label="Departamento" name="ss_departamento" required />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Productos del pedido</legend>
            {ssLines.map((line, idx) => (
              <div key={line.id} className="rounded-lg border border-border p-4 space-y-4 relative">
                {ssLines.length > 1 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Producto {idx + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSSLine(line.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Referencia o molde</Label>
                  <Input value={line.referencia} onChange={(e) => updateSSLine(line.id, { referencia: e.target.value })} required />
                  {line.referencia && !/termo/i.test(line.referencia) && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                      ℹ️ Producto importado (no es termo): pasará directo a Logística sin producción.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Tamaño</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {tamanos.map((t) => (
                      <label key={t} className="flex items-center gap-2 rounded-md border border-input p-3 cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input type="radio" name={`ss_tamano_${line.id}`} value={t} checked={line.tamano === t} onChange={() => updateSSLine(line.id, { tamano: t })} className="accent-primary h-4 w-4" />
                        <span className="text-sm text-foreground">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de logo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["Impresión full", "Impresión básica"] as const).map((tipo) => (
                      <label key={tipo} className="flex items-center gap-2 rounded-md border border-input p-3 cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input type="radio" name={`ss_tipoLogo_${line.id}`} value={tipo} checked={line.tipoLogo === tipo} onChange={() => updateSSLine(line.id, { tipoLogo: tipo })} className="accent-primary h-4 w-4" />
                        <span className="text-sm text-foreground">{tipo}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Color de silicona</Label>
                    <Input value={line.colorSilicona} onChange={(e) => updateSSLine(line.id, { colorSilicona: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Color de tinta</Label>
                    <Input value={line.colorTinta} onChange={(e) => updateSSLine(line.id, { colorTinta: e.target.value })} required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Unidades</Label>
                    <Input type="number" value={line.units} onChange={(e) => updateSSLine(line.id, { units: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor unitario</Label>
                    <Input type="number" value={line.valorUnitario} onChange={(e) => updateSSLine(line.id, { valorUnitario: e.target.value, autoCalc: true })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor total</Label>
                    <Input type="number" value={line.valorTotal} onChange={(e) => updateSSLine(line.id, { valorTotal: e.target.value, autoCalc: false })} required />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addSSLine}>
              <Plus className="h-4 w-4" /> Agregar otro producto
            </Button>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Pago</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {ssEstadoPago !== "pago_total" && (
                <div className="space-y-1.5">
                  <Label htmlFor="ss_abono">Abono del total del pedido</Label>
                  <Input id="ss_abono" name="ss_abono" type="number" value={ssAbono} onChange={(e) => setSsAbono(e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Estado del pago</Label>
                <Select value={ssEstadoPago} onValueChange={(v) => setSsEstadoPago(v as typeof ssEstadoPago)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abono_inicial">Abono inicial recibido</SelectItem>
                    <SelectItem value="pago_total">Pago total recibido</SelectItem>
                    <SelectItem value="pendiente">Pago pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Soporte de pago inicial</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setSsPaymentProofFile(e.target.files?.[0] || null)} className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary" />
              <p className="text-xs text-muted-foreground">Adjunte el comprobante del abono inicial para revisión en contabilidad</p>
            </div>
            <Field label="Fecha requerida de entrega" name="ss_fechaRequerida" type="date" />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Opciones adicionales</legend>
            <div className="grid gap-6 sm:grid-cols-2 max-w-xl">
              <div className="flex items-center justify-between rounded-md border border-input p-3">
                <Label htmlFor="ss_recompra" className="cursor-pointer">Recompra</Label>
                <Switch id="ss_recompra" checked={ssIsRecompra} onCheckedChange={setSsIsRecompra} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-input p-3">
                <Label htmlFor="ss_noLogo" className="cursor-pointer">No requiere logo</Label>
                <Switch id="ss_noLogo" checked={ssNoLogo} onCheckedChange={setSsNoLogo} />
              </div>
            </div>
            {ssIsRecompra && (
              <p className="text-xs text-muted-foreground rounded-md border border-input bg-muted/30 p-3 max-w-md">
                ✓ Recompra: El logo ya existe, no se generará solicitud de diseño automática.
              </p>
            )}
            {ssNoLogo && (
              <p className="text-xs text-muted-foreground rounded-md border border-input bg-muted/30 p-3 max-w-md">
                ✓ Sin logo: El pedido omitirá la etapa de estampación y pasará directo a producción.
              </p>
            )}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Archivos adjuntos</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <FileField label="Adjuntar logo" name="ss_logo" />
              <FileField label="Adjuntar RUT de la empresa (opcional)" name="ss_rut" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss_logo_nombre">Nombre o referencia del logo</Label>
              <Input
                id="ss_logo_nombre"
                name="ss_logo_nombre"
                placeholder="Ej: Logo Coca-Cola v2, Escudo Colegio San José..."
              />
              <p className="text-xs text-muted-foreground">
                Escriba un nombre claro para que producción identifique fácilmente este logo.
              </p>
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

          <PaymentSummary
            totalAmount={grandTotal}
            abono={ssEstadoPago === "pago_total" ? grandTotal : (parseFloat(ssAbono) || 0)}
            estadoPago={ssEstadoPago}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creando..." : "Crear pedido"}</Button>
            <Button type="button" variant="outline" onClick={onReset}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ---- Generic form (retail / al por menor) ---- */

interface RetailProductLine {
  id: string;
  selectedRef: string;
  cantidad: string;
  retailPrice: string;
  colorProducto: string;
  isGift: boolean;
}

function createEmptyRetailLine(isGift = false): RetailProductLine {
  return {
    id: crypto.randomUUID(),
    selectedRef: "",
    cantidad: "1",
    retailPrice: isGift ? "0" : "",
    colorProducto: "",
    isGift,
  };
}

function GenericForm({ brand, saleType, onReset }: { brand: Brand; saleType: SaleType; onReset: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const brandLabel = brand === "sweatspot" ? "Sweatspot" : "Magical Warmers";
  const isMayor = saleType === "mayor";
  const [paymentMethod, setPaymentMethod] = useState<"contra_entrega" | "pagado">("contra_entrega");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingCost, setShippingCost] = useState("");
  const { stockItems } = useInventory();

  // Multi-product lines
  const [productLines, setProductLines] = useState<RetailProductLine[]>([createEmptyRetailLine()]);

  // Controlled fields for SmartPaste
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cedula, setCedula] = useState("");
  const [email, setEmail] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");

  const handleSmartPaste = (data: ParsedOrderData) => {
    if (data.cliente?.nombre) setNombre(data.cliente.nombre);
    if (data.cliente?.telefono) setTelefono(data.cliente.telefono);
    if (data.cliente?.cedula_nit) setCedula(data.cliente.cedula_nit);
    if (data.cliente?.email) setEmail(data.cliente.email);
    if (data.cliente?.ciudad) setCiudad(data.cliente.ciudad);
    if (data.cliente?.direccion) setDireccion(data.cliente.direccion);
    if (data.observaciones) setNotas(data.observaciones);
    if (data.productos?.[0]) {
      const p = data.productos[0];
      const firstLine = productLines[0];
      if (firstLine) {
        const updates: Partial<RetailProductLine> = {};
        if (p.unidades) updates.cantidad = String(p.unidades);
        if (p.valor_total) updates.retailPrice = String(p.valor_total);
        if (p.producto) {
          const match = finishedRefs.find((r) => r.toLowerCase().includes(p.producto!.toLowerCase()));
          if (match) updates.selectedRef = match;
        }
        updateProductLine(firstLine.id, updates);
      }
    }
  };

  const updateProductLine = (id: string, updates: Partial<RetailProductLine>) => {
    setProductLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...updates } : line))
    );
  };

  const addProductLine = () => setProductLines((prev) => [...prev, createEmptyRetailLine()]);
  const addGiftLine = () => setProductLines((prev) => [...prev, createEmptyRetailLine(true)]);
  const removeProductLine = (id: string) => {
    setProductLines((prev) => prev.length > 1 ? prev.filter((l) => l.id !== id) : prev);
  };

  // Build predefined references from finished products in DB
  const finishedRefs = useMemo(() => {
    const dbBrand = brand === "magical" ? "magical" : "sweatspot";
    const items = stockItems.filter(
      (s) => s.brand === dbBrand && s.category === "producto_terminado"
    );
    const refs = items.map((s) =>
      s.product_type ? `${s.name} (${s.product_type})` : s.name
    );
    return [...new Set(refs)].sort();
  }, [stockItems, brand]);

  // Grand total across all non-gift lines
  const grandTotal = useMemo(() => {
    return productLines.reduce((sum, line) => {
      if (line.isGift) return sum;
      return sum + (parseFloat(line.retailPrice) || 0);
    }, 0);
  }, [productLines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const clientName = nombre.trim();
    const shippingAmount = parseFloat(shippingCost) || 0;

    // Validate all lines have product selected
    for (const line of productLines) {
      if (!line.selectedRef) {
        toast.error("Producto requerido", { description: "Seleccione un producto en todas las líneas." });
        setIsSubmitting(false);
        return;
      }
    }

    if (saleType === "menor") {
      const tel = telefono.trim();
      const ciu = ciudad.trim();
      const dir = direccion.trim();
      const isVentaMostrador = !clientName || !tel || !ciu || !dir;
      const displayName = isVentaMostrador ? (clientName || "Venta mostrador") : clientName;

      // Upload payment proof if provided
      let paymentProofUrl: string | null = null;
      const paymentProofFile = fd.get("payment_proof") as File;
      if (paymentProofFile && paymentProofFile.size > 0) {
        const ext = paymentProofFile.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, paymentProofFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
          paymentProofUrl = urlData.publicUrl;
        }
      }

      // Process each product line as a separate order
      for (const line of productLines) {
        const referencia = line.selectedRef;
        const quantity = parseInt(line.cantidad, 10) || 1;
        const totalAmount = line.isGift ? 0 : (parseFloat(line.retailPrice) || 0);

        // Discount stock
        let refName = referencia;
        let refType: string | null = null;
        const typeMatch = referencia.match(/^(.+?)\s*\((.+?)\)$/);
        if (typeMatch) {
          refName = typeMatch[1].trim();
          refType = typeMatch[2].trim();
        }

        const dbBrand = brand === "magical" ? "magical" : "sweatspot";
        let query = supabase
          .from("stock_items")
          .select("*")
          .eq("brand", dbBrand)
          .eq("category", "producto_terminado")
          .ilike("name", refName);
        if (refType) {
          query = query.eq("product_type", refType);
        }
        const { data: matchedItems } = await query.limit(1);
        const matchedItem = matchedItems?.[0];

        if (matchedItem) {
          const newAvailable = matchedItem.available - quantity;
          await supabase
            .from("stock_items")
            .update({ available: newAvailable })
            .eq("id", matchedItem.id);
          if (newAvailable < 0) {
            toast.warning("Stock negativo", { description: `"${referencia}" quedó con stock negativo (${newAvailable}). Reabastecer.` });
          }
        } else {
          toast.warning("Sin registro de inventario", { description: `"${referencia}" no encontrado en inventario.` });
        }

        if (brand === "magical") {
          const gelResult = useInventoryStore.getState().discountGelForMagical(referencia, quantity);
          toast.info("Consumo de gel", { description: gelResult.message });
        }

        // Build observations for this line
        const lineObs = [
          notas.trim(),
          line.isGift ? "🎁 OBSEQUIO" : "",
        ].filter(Boolean).join(" | ");

        // Persist order to DB
        try {
          await supabase.from("orders").insert({
            brand,
            sale_type: "menor",
            client_name: displayName,
            client_nit: cedula.trim() || null,
            client_phone: tel || null,
            client_email: email.trim() || null,
            client_address: dir || null,
            client_city: ciu || null,
            product: referencia,
            quantity,
            total_amount: totalAmount,
            advisor_id: user?.id || "",
            advisor_name: user?.email || "Asesor",
            production_status: "listo",
            payment_method: line.isGift ? "obsequio" : paymentMethod,
            payment_proof_url: paymentProofUrl,
            payment_complete: line.isGift || paymentMethod === "pagado",
            observations: lineObs || null,
            shipping_cost: line.isGift ? 0 : shippingAmount,
            silicone_color: brand === "sweatspot" && line.colorProducto ? line.colorProducto : null,
          } as any);
        } catch (err: any) {
          console.error("Error saving retail order:", err);
        }

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
          email: email.trim() || undefined,
          cedula: cedula.trim() || undefined,
          direccion: dir || undefined,
          ciudad: ciu || undefined,
          observaciones: lineObs || undefined,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["orders"] });

      const giftCount = productLines.filter((l) => l.isGift).length;
      const productCount = productLines.filter((l) => !l.isGift).length;
      const summary = [
        `${productCount} producto(s)`,
        giftCount > 0 ? `${giftCount} obsequio(s)` : "",
      ].filter(Boolean).join(" + ");

      toast.success("Pedido al por menor creado", {
        description: `${displayName} — ${summary}`,
      });
    }

    setIsSubmitting(false);
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
          <SmartPasteField brand={brand} onDataParsed={handleSmartPaste} />

           <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Datos del cliente</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input id="nombre" name="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" name="telefono" type="tel" required value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cedula">Cédula o NIT</Label>
                <Input id="cedula" name="cedula" required value={cedula} onChange={(e) => setCedula(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input id="ciudad" name="ciudad" required value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="departamento">Departamento</Label>
                <Input id="departamento" name="departamento" required value={departamento} onChange={(e) => setDepartamento(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="direccion">Dirección de envío</Label>
              <Input id="direccion" name="direccion" required value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Productos</legend>
            {productLines.map((line, idx) => (
              <div key={line.id} className={`rounded-lg border p-4 space-y-3 ${line.isGift ? "border-amber-300 bg-amber-50/50" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {line.isGift ? "🎁 Obsequio" : `Producto ${idx + 1}`}
                    </span>
                    {line.isGift && (
                      <Badge variant="outline" className="border-amber-400 text-amber-700 text-xs">Gratis</Badge>
                    )}
                  </div>
                  {productLines.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeProductLine(line.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Referencia / Producto</Label>
                    <Select value={line.selectedRef || undefined} onValueChange={(v) => updateProductLine(line.id, { selectedRef: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {finishedRefs.map((ref) => (
                          <SelectItem key={ref} value={ref}>{ref}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cantidad</Label>
                    <Input type="number" min="1" required value={line.cantidad} onChange={(e) => updateProductLine(line.id, { cantidad: e.target.value })} />
                  </div>
                </div>
                {!line.isGift && (
                  <div className="space-y-1.5">
                    <Label>Precio de venta</Label>
                    <Input type="number" required value={line.retailPrice} onChange={(e) => updateProductLine(line.id, { retailPrice: e.target.value })} />
                  </div>
                )}
                {brand === "sweatspot" && (
                  <div className="space-y-1.5">
                    <Label>Color del producto</Label>
                    <Input placeholder="Ej: Negro, Blanco, Rosado..." value={line.colorProducto} onChange={(e) => updateProductLine(line.id, { colorProducto: e.target.value })} />
                  </div>
                )}
              </div>
            ))}
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={addProductLine} className="gap-1.5">
                <Plus className="h-4 w-4" /> Agregar otro producto
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addGiftLine} className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50">
                🎁 Adicionar obsequio
              </Button>
            </div>
          </fieldset>

          {!isMayor && (
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-foreground mb-2">Método de pago y envío</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "contra_entrega", label: "Contra entrega" },
                  { value: "pagado", label: "Ya pagado" },
                ] as const).map((opt) => (
                  <label key={opt.value} className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors ${paymentMethod === opt.value ? "border-primary bg-primary/5" : "border-input hover:bg-accent"}`}>
                    <input type="radio" name="payment_method_radio" value={opt.value} checked={paymentMethod === opt.value} onChange={() => setPaymentMethod(opt.value)} className="accent-primary h-4 w-4" />
                    <span className="text-sm text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shipping_cost">Costo de envío / transporte</Label>
                <Input id="shipping_cost" name="shipping_cost" type="number" placeholder="0" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
              </div>

              {paymentMethod === "contra_entrega" && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Valor a cobrar contra entrega</h4>
                  <p className="text-2xl font-bold text-foreground">
                    ${(grandTotal + (parseFloat(shippingCost) || 0)).toLocaleString("es-CO")}
                  </p>
                  <p className="text-xs text-muted-foreground">Incluye precio del producto + costo de envío</p>
                </div>
              )}

              <FileField label="Adjuntar soporte de pago (si aplica)" name="payment_proof" />
            </fieldset>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas adicionales</Label>
            <Textarea id="notas" name="notas" placeholder="Observaciones del pedido..." value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creando..." : "Crear pedido"}</Button>
            <Button type="button" variant="outline" onClick={onReset}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ---- Payment Summary ---- */

function PaymentSummary({ totalAmount, abono, estadoPago }: { totalAmount: number; abono: number; estadoPago: "abono_inicial" | "pago_total" | "pendiente" }) {
  const saldo = totalAmount - abono;
  const badgeConfig = {
    pago_total: { label: "Pago total", variant: "default" as const, className: "bg-green-600 hover:bg-green-700" },
    abono_inicial: { label: "Abono inicial", variant: "default" as const, className: "bg-yellow-500 hover:bg-yellow-600 text-foreground" },
    pendiente: { label: "Pendiente", variant: "destructive" as const, className: "" },
  };
  const cfg = badgeConfig[estadoPago];

  if (totalAmount <= 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Resumen de pago</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">Total del pedido:</span>
        <span className="font-semibold text-foreground text-right">${totalAmount.toLocaleString("es-CO")}</span>
        <span className="text-muted-foreground">Abono recibido:</span>
        <span className="font-semibold text-foreground text-right">${abono.toLocaleString("es-CO")}</span>
        <span className="text-muted-foreground">Estado:</span>
        <span className="text-right">
          <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
        </span>
      </div>

      {saldo > 0 && (
        <Alert className="border-orange-300 bg-orange-50 text-orange-800 [&>svg]:text-orange-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Saldo pendiente</AlertTitle>
          <AlertDescription>
            ${saldo.toLocaleString("es-CO")} — El pedido no podrá despacharse hasta completar el pago.
          </AlertDescription>
        </Alert>
      )}

      {saldo === 0 && totalAmount > 0 && (
        <Alert className="border-green-300 bg-green-50 text-green-800 [&>svg]:text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Pago completo</AlertTitle>
          <AlertDescription>
            El pedido puede despacharse una vez esté listo en producción.
          </AlertDescription>
        </Alert>
      )}
    </div>
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
