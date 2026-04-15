import { useState, useMemo, useEffect } from "react";
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
  "Azul", "Rosado", "Morado", "Negro", "Blanco", "Transparente",
  "Aguamarina", "Azul claro", "Verde lima", "Verde militar",
];

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
}

function createEmptyLine(): OrderLine {
  return {
    id: crypto.randomUUID(),
    product: "",
    type: "",
    gelColor: "",
    gelCustom: "",
    inkColor: "",
    inkCustom: "",
    units: "",
    valorUnitario: "",
    valorTotal: "",
    autoCalc: true,
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
      <Select value={value} onValueChange={onValueChange}>
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
  const [dobleTinta, setDobleTinta] = useState(false);
  const [escarcha, setEscarcha] = useState(false);
  const [isRecompra, setIsRecompra] = useState(false);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([createEmptyLine()]);
  const [abono, setAbono] = useState("");
  const [estadoPago, setEstadoPago] = useState<"abono_inicial" | "pago_total" | "pendiente">("abono_inicial");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);

  const materialConfigs = useInventoryStore((s) => s.materialConfigs);
  const { reserveBodyStock: reserveBodyStockDB, discountStock: discountStockDB, stockItems: inventoryStockItems } = useInventory();

  // Unique product names
  const productNames = useMemo(() => {
    const names = [...new Set(materialConfigs.map((c) => c.productName))];
    return names.sort();
  }, [materialConfigs]);

  // Grand total across all lines
  const grandTotal = useMemo(() => {
    return orderLines.reduce((sum, line) => sum + (parseFloat(line.valorTotal) || 0), 0);
  }, [orderLines]);

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
  const removeLine = (id: string) => setOrderLines((prev) => prev.filter((l) => l.id !== id));

  const getAvailableTypes = (productName: string) => {
    if (!productName) return [];
    return materialConfigs.filter((c) => c.productName === productName).map((c) => c.productType);
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

    if (!rutFile || !rutFile.name) {
      toast.error("RUT requerido", { description: "Para ventas al por mayor debe adjuntar el RUT de la empresa." });
      setIsSubmitting(false);
      return;
    }

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

    // Upload logo once if provided (skip design request for recompra)
    let logoUrl: string | null = null;
    if (logoFile && logoFile.size > 0 && user && !isRecompra) {
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
        logoUrl = "logo-uploaded";
      } else {
        toast.error("Diseño de logo", { description: result.message });
      }
    } else if (logoFile && logoFile.size > 0 && isRecompra) {
      logoUrl = "recompra-logo";
    }

    const magicalStages = ["produccion_cuerpos", "estampacion", "dosificacion", "sellado", "recorte", "empaque", "listo"];

    // Process each line as a separate order
    for (const line of orderLines) {
      const quantity = parseInt(line.units, 10) || 0;
      const referencia = `${line.product} (${line.type})`;
      const gelColor = resolveColor(line.gelColor, line.gelCustom);
      const inkColor = resolveColor(line.inkColor, line.inkCustom);
      const lineTotal = parseFloat(line.valorTotal) || 0;
      const abonoAmount = estadoPago === "pago_total" ? lineTotal : (parseFloat(abono) || 0);
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
        hasRut: true,
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
          observations: observaciones || null,
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
      const initialStage = needsCuerpos ? "produccion_cuerpos" : "estampacion";

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
          logo_file: logoFile?.name || null,
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

    const lineCount = orderLines.length;
    toast.success(`${lineCount > 1 ? lineCount + " pedidos creados" : "Pedido creado"}`, {
      description: `${clientName} — ${lineCount > 1 ? lineCount + " líneas" : orderLines[0].units + " uds de " + orderLines[0].product}. Enviado a Producción y Contabilidad.`,
    });

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
              <Field label="Correo electrónico" name="mw_email" type="email" />
            </div>
            <Field label="Dirección del cliente" name="mw_direccion" required />
            <Field label="Ciudad" name="mw_ciudad" required />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Productos del pedido</legend>
            {orderLines.map((line, idx) => (
              <div key={line.id} className="rounded-lg border border-border p-4 space-y-4 relative">
                {orderLines.length > 1 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Producto {idx + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(line.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Producto / Referencia</Label>
                    <Select value={line.product} onValueChange={(v) => updateLine(line.id, { product: v, type: "" })}>
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
                    <Select value={line.type} onValueChange={(v) => updateLine(line.id, { type: v })} disabled={!line.product}>
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
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addLine}>
              <Plus className="h-4 w-4" /> Agregar otro producto
            </Button>
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
            <div className="grid gap-6 sm:grid-cols-3">
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
            </div>
            {isRecompra && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                ✓ Recompra: El logo ya existe, no se generará solicitud de diseño automática.
              </p>
            )}
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

function SweatspotMayorForm({ onReset }: { onReset: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { reserveBodyStock: reserveBodyStockDB } = useInventory();
  const [ssUnits, setSsUnits] = useState("");
  const [ssValorUnitario, setSsValorUnitario] = useState("");
  const [ssValorTotal, setSsValorTotal] = useState("");
  const [ssAutoCalc, setSsAutoCalc] = useState(true);
  const [ssAbono, setSsAbono] = useState("");
  const [ssEstadoPago, setSsEstadoPago] = useState<"abono_inicial" | "pago_total" | "pendiente">("abono_inicial");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ssIsRecompra, setSsIsRecompra] = useState(false);
  const [ssPaymentProofFile, setSsPaymentProofFile] = useState<File | null>(null);
  const tamanos = ["150 ml", "250 ml", "250 ml juguetón", "500 ml"] as const;

  // Auto-calculate total
  useEffect(() => {
    if (!ssAutoCalc) return;
    const qty = parseInt(ssUnits, 10) || 0;
    const unitP = parseFloat(ssValorUnitario) || 0;
    if (qty > 0 && unitP > 0) {
      setSsValorTotal(String(qty * unitP));
    }
  }, [ssUnits, ssValorUnitario, ssAutoCalc]);

  // Auto-fill abono when pago_total
  useEffect(() => {
    if (ssEstadoPago === "pago_total") {
      setSsAbono(ssValorTotal);
    }
  }, [ssEstadoPago, ssValorTotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const clientName = fd.get("ss_nombre") as string;
    const quantity = parseInt(ssUnits, 10);
    const inkColor = fd.get("ss_colorTinta") as string;
    const thermoSize = fd.get("ss_tamano") as "150 ml" | "250 ml" | "250 ml juguetón" | "500 ml";
    const siliconeColor = fd.get("ss_colorSilicona") as string;
    const referencia = fd.get("ss_referencia") as string;
    const tipoLogo = fd.get("ss_tipoLogo") as string;
    const rutFile = fd.get("ss_rut") as File;
    const totalAmount = parseFloat(ssValorTotal) || 0;
    const abonoAmount = ssEstadoPago === "pago_total" ? totalAmount : (parseFloat(ssAbono) || 0);
    const personalizacion = (fd.get("ss_personalizacion") as string) || "";
    const observaciones = (fd.get("ss_observaciones") as string) || "";
    const logoFile = fd.get("ss_logo") as File;

    if (!rutFile || !rutFile.name) {
      toast.error("RUT requerido", {
        description: "Para ventas al por mayor debe adjuntar el RUT de la empresa.",
      });
      setIsSubmitting(false);
      return;
    }

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

    // Auto-create design request if logo was uploaded (skip for recompra)
    let logoUrl: string | null = null;
    if (logoFile && logoFile.size > 0 && user && !ssIsRecompra) {
      const result = await createLogoRequestFromOrder({
        brand: "Sweatspot",
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
        logoUrl = "logo-uploaded";
      } else {
        toast.error("Diseño de logo", { description: result.message });
      }
    } else if (logoFile && logoFile.size > 0 && ssIsRecompra) {
      logoUrl = "recompra-logo";
    }

    // Determine logo type for production workflow
    const logoType = tipoLogo === "Impresión básica" ? "impresion_basica" as const : "impresion_full" as const;

    // Production order will be created after persisting to DB (see below)
    useAccountingStore.getState().addOrder({
      clientName,
      brand: "sweatspot",
      product: referencia,
      quantity,
      saleType: "mayor",
      clientType: "Cliente empresa",
      totalAmount,
      abono: abonoAmount,
      paymentStatus: ssEstadoPago,
      canDispatch: ssEstadoPago === "pago_total",
      hasRut: true,
      email: (fd.get("ss_email") as string)?.trim() || undefined,
      direccion: (fd.get("ss_direccion") as string)?.trim() || undefined,
      ciudad: (fd.get("ss_ciudad") as string)?.trim() || undefined,
      observaciones: observaciones?.trim() || undefined,
    });

    const fechaRequerida = fd.get("ss_fechaRequerida") as string;

    // Persist order to database FIRST
    const ssShortStages = ["estampacion", "colocacion_boquilla", "listo"];
    const ssFullStages = ["estampacion", "produccion_tubos", "ensamble_cuello", "sello_base", "refile", "colocacion_boquilla", "listo"];

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
        unit_price: parseFloat(ssValorUnitario) || 0,
        total_amount: totalAmount,
        abono: abonoAmount,
        ink_color: inkColor,
        silicone_color: siliconeColor,
        logo_url: logoUrl,
        observations: observaciones || null,
        personalization: personalizacion || null,
        advisor_id: user?.id || "",
        advisor_name: user?.email || "Asesor",
        production_status: "pendiente",
        is_recompra: ssIsRecompra,
        payment_proof_url: ssPaymentProofUrl,
        payment_complete: ssEstadoPago === "pago_total",
        delivery_date: fechaRequerida || null,
      }).select("id").single();
      orderData = data;
    } catch (err: any) {
      console.error("Error saving order:", err);
      toast.error("Error al crear el pedido", {
        description: "No se pudo guardar el pedido ni enviar a producción. Intenta de nuevo o contacta soporte.",
      });
      setIsSubmitting(false);
      return;
    }

    if (!orderData) {
      toast.error("Error al crear el pedido", {
        description: "No se recibió confirmación de la base de datos. Intenta de nuevo.",
      });
      setIsSubmitting(false);
      return;
    }

    // Reserve body stock AFTER successful order creation
    const bodyResult = await reserveBodyStockDB("sweatspot", referencia, quantity, {
      clientName,
      requestedBy: user?.id || undefined,
    });
    const needsCuerpos = !bodyResult.available || bodyResult.discounted < quantity;
    const hasStock = bodyResult.available && bodyResult.discounted >= quantity;

    const workflowType = (logoType === "impresion_basica" && hasStock) ? "short" : "full";
    const ssStages = workflowType === "short" ? ssShortStages : ssFullStages;
    const initialStage = needsCuerpos ? "produccion_cuerpos" : "estampacion";

    // Update the order with the correct production_status
    await supabase.from("orders")
      .update({ production_status: initialStage })
      .eq("id", orderData.id);

    // Create production order
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
        logo_file: logoFile?.name || null,
        has_stock: hasStock,
        needs_cuerpos: !hasStock,
        observations: observaciones || null,
        advisor_id: user?.id || null,
      });
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err: any) {
      console.error("Error creating production order:", err);
    }

    // Send notifications to all roles
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

    toast.success("Pedido al por mayor creado", {
      description: `${clientName} — ${quantity} uds (${tipoLogo}). Enviado a Producción y Contabilidad.`,
    });

    const saldoFinal = ssEstadoPago === "pago_total"
      ? 0
      : (parseFloat(ssValorTotal) || 0) - (parseFloat(ssAbono) || 0);
    if (saldoFinal > 0) {
      toast.warning("Saldo pendiente registrado", {
        description: `Falta $${saldoFinal.toLocaleString("es-CO")} para completar el pago. Contabilidad fue notificada.`,
      });
    }

    // Inventory feedback
    if (!bodyResult.available) {
      toast.warning("Requerimiento de producción generado", { description: bodyResult.message });
    } else if (bodyResult.discounted < quantity) {
      toast.warning("Stock parcial de cuerpos", { description: bodyResult.message });
    } else {
      toast.info("Inventario actualizado", { description: bodyResult.message });
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
              setInput("ss_colorSilicona", data.color_silicona);
              setInput("ss_colorTinta", data.productos?.[0]?.color_tinta);
              setInput("ss_referencia", data.referencia);

              if (data.productos?.[0]?.unidades) setSsUnits(String(data.productos[0].unidades));
              if (data.productos?.[0]?.valor_unitario) setSsValorUnitario(String(data.productos[0].valor_unitario));
              if (data.productos?.[0]?.valor_total) {
                setSsValorTotal(String(data.productos[0].valor_total));
                setSsAutoCalc(false);
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
              <div className="space-y-1.5">
                <Label htmlFor="ss_unidades">Unidades</Label>
                <Input id="ss_unidades" name="ss_unidades" type="number" required value={ssUnits} onChange={(e) => setSsUnits(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ss_valorUnitario">Valor unitario</Label>
                <Input id="ss_valorUnitario" name="ss_valorUnitario" type="number" required value={ssValorUnitario} onChange={(e) => { setSsValorUnitario(e.target.value); setSsAutoCalc(true); }} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ss_valorTotal">Valor total del pedido</Label>
                <Input id="ss_valorTotal" name="ss_valorTotal" type="number" required value={ssValorTotal} onChange={(e) => { setSsValorTotal(e.target.value); setSsAutoCalc(false); }} />
                {ssAutoCalc && parseInt(ssUnits, 10) > 0 && parseFloat(ssValorUnitario) > 0 && (
                  <p className="text-xs text-muted-foreground">Calculado automáticamente</p>
                )}
              </div>
            </div>
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
            <div className="flex items-center justify-between rounded-md border border-input p-3 max-w-xs">
              <Label htmlFor="ss_recompra" className="cursor-pointer">Recompra</Label>
              <Switch id="ss_recompra" checked={ssIsRecompra} onCheckedChange={setSsIsRecompra} />
            </div>
            {ssIsRecompra && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                ✓ Recompra: El logo ya existe, no se generará solicitud de diseño automática.
              </p>
            )}
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

          <PaymentSummary
            totalAmount={parseFloat(ssValorTotal) || 0}
            abono={ssEstadoPago === "pago_total" ? (parseFloat(ssValorTotal) || 0) : (parseFloat(ssAbono) || 0)}
            estadoPago={ssEstadoPago}
          />

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const brandLabel = brand === "sweatspot" ? "Sweatspot" : "Magical Warmers";
  const isMayor = saleType === "mayor";
  const [paymentMethod, setPaymentMethod] = useState<"contra_entrega" | "pagado">("contra_entrega");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRef, setSelectedRef] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const { stockItems } = useInventory();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const clientName = (fd.get("nombre") as string)?.trim() || "";
    const quantity = parseInt(fd.get("cantidad") as string, 10);
    const referencia = fd.get("referencia") as string;
    const totalAmount = parseFloat(retailPrice) || 0;
    const shippingAmount = parseFloat(shippingCost) || 0;

    if (!referencia) {
      toast.error("Producto requerido", { description: "Seleccione un producto de la lista." });
      setIsSubmitting(false);
      return;
    }

    if (saleType === "menor") {
      const telefono = (fd.get("telefono") as string)?.trim() || "";
      const ciudad = (fd.get("ciudad") as string)?.trim() || "";
      const direccion = (fd.get("direccion") as string)?.trim() || "";
      const isVentaMostrador = !clientName || !telefono || !ciudad || !direccion;
      const displayName = isVentaMostrador ? (clientName || "Venta mostrador") : clientName;

      // Retail: discount from finished products in Supabase
      // referencia may be "Lumbar (Térmico)" — split into name + product_type
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

      if (!matchedItem) {
        toast.error("Sin stock suficiente", { description: `Producto terminado "${referencia}" no encontrado en inventario.` });
        setIsSubmitting(false);
        return;
      }
      if (matchedItem.available < quantity) {
        toast.error("Sin stock suficiente", { description: `Stock insuficiente de "${referencia}". Disponible: ${matchedItem.available}, requerido: ${quantity}.` });
        setIsSubmitting(false);
        return;
      }
      const newAvailable = matchedItem.available - quantity;
      const { error: stockError } = await supabase
        .from("stock_items")
        .update({ available: newAvailable })
        .eq("id", matchedItem.id);
      if (stockError) {
        toast.error("Error de inventario", { description: stockError.message });
        setIsSubmitting(false);
        return;
      }

      if (brand === "magical") {
        const gelResult = useInventoryStore.getState().discountGelForMagical(referencia, quantity);
        toast.info("Consumo de gel", { description: gelResult.message });
      }

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

      // Persist retail order to DB
      try {
        await supabase.from("orders").insert({
          brand,
          sale_type: "menor",
          client_name: displayName,
          client_nit: (fd.get("cedula") as string)?.trim() || null,
          client_phone: telefono || null,
          client_email: (fd.get("email") as string)?.trim() || null,
          client_address: direccion || null,
          client_city: ciudad || null,
          product: referencia,
          quantity,
          total_amount: totalAmount,
          advisor_id: user?.id || "",
          advisor_name: user?.email || "Asesor",
          production_status: "listo",
          payment_method: paymentMethod,
          payment_proof_url: paymentProofUrl,
          payment_complete: paymentMethod === "pagado",
          observations: (fd.get("notas") as string)?.trim() || null,
          shipping_cost: shippingAmount,
        } as any);
        queryClient.invalidateQueries({ queryKey: ["orders"] });
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
        email: (fd.get("email") as string)?.trim() || undefined,
        cedula: (fd.get("cedula") as string)?.trim() || undefined,
        direccion: direccion || undefined,
        ciudad: ciudad || undefined,
        observaciones: (fd.get("notas") as string)?.trim() || undefined,
      });

      toast.success("Pedido al por menor creado", {
        description: `${displayName} — ${quantity} uds. Inventario actualizado. Nuevo stock de "${refName}": ${newAvailable}.`,
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
              <div className="space-y-1.5">
                <Label>Referencia / Producto</Label>
                <Select value={selectedRef} onValueChange={setSelectedRef}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {finishedRefs.map((ref) => (
                      <SelectItem key={ref} value={ref}>{ref}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Hidden input for form data */}
                <input type="hidden" name="referencia" value={selectedRef} />
              </div>
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
              <div className="space-y-1.5">
                <Label htmlFor="precioTotal">Precio de venta total</Label>
                <Input id="precioTotal" name="precioTotal" type="number" required value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} />
              </div>
              {isMayor && <Field label="Abono inicial (50%)" name="abono" type="number" />}
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
                    ${((parseFloat(retailPrice) || 0) + (parseFloat(shippingCost) || 0)).toLocaleString("es-CO")}
                  </p>
                  <p className="text-xs text-muted-foreground">Incluye precio del producto + costo de envío</p>
                </div>
              )}

              <FileField label="Adjuntar soporte de pago (si aplica)" name="payment_proof" />
            </fieldset>
          )}

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
