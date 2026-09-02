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
import { ArrowLeft, AlertTriangle, CheckCircle2, FileText, ShoppingCart, ClipboardList, Plus, Trash2, BarChart3, CalendarDays, Percent } from "lucide-react";
import { useLogisticsStore } from "@/stores/logisticsStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { buildReferenceCatalog, tiposForReference, uniqueReferenceNames } from "@/lib/referenceCatalog";
import { useInventory } from "@/hooks/useInventory";
import { useAccountingStore } from "@/stores/accountingStore";

import { toast } from "sonner";
import QuotationGenerator from "@/components/ventas/QuotationGenerator";
import { MisPedidos } from "@/components/ventas/MisPedidos";
import { AdvisorSummary } from "@/components/ventas/AdvisorSummary";
import MisComisiones from "@/components/ventas/MisComisiones";
import { SalesCalendar } from "@/components/ventas/SalesCalendar";
import { createLogoRequestFromOrder } from "@/lib/createLogoRequestFromOrder";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createOrderNotifications } from "@/hooks/useNotifications";
import SmartPasteField, { type ParsedOrderData } from "@/components/ventas/SmartPasteField";
import ClientNameAutocomplete from "@/components/ventas/ClientNameAutocomplete";
import { useFormDraft, clearFormDraft, usePersistedState } from "@/hooks/useFormDraft";
import { OrderConfirmationDialog, type OrderSummary } from "@/components/ventas/OrderConfirmationDialog";
type Brand = "sweatspot" | "magical";
type SaleType = "mayor" | "menor";

const EXCLUDED_COMMISSION_EMAILS = ["ilianghernandez@gmail.com"];

const Ventas = () => {
  const { user: authUser } = useAuth();
  const showCommissions = !EXCLUDED_COMMISSION_EMAILS.includes(
    (authUser?.email || "").toLowerCase()
  );
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
          {showCommissions && (
            <TabsTrigger value="comisiones" className="gap-1.5">
              <Percent className="h-4 w-4" /> Comisiones
            </TabsTrigger>
          )}
          <TabsTrigger value="calendario" className="gap-1.5">
            <CalendarDays className="h-4 w-4" /> Calendario
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

        {showCommissions && (
          <TabsContent value="comisiones" className="mt-4">
            <MisComisiones />
          </TabsContent>
        )}

        <TabsContent value="calendario" className="mt-4">
          <SalesCalendar />
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


interface OrderLine {
  id: string;
  product: string;
  type: string;
  gelColor: string;
  gelCustom: string;
  inkColor: string;
  inkCustom: string;
  inkCount?: number;
  inkColor2?: string;
  inkCustom2?: string;
  inkColor3?: string;
  inkCustom3?: string;
  glitterColor?: string;
  glitterCustom?: string;
  units: string;
  valorUnitario: string;
  valorTotal: string;
  autoCalc: boolean;
  isGift: boolean;
}

function consolidateMagicalLines(lines: OrderLine[]): OrderLine[] {
  const consolidated = new Map<string, OrderLine>();
  for (const line of lines) {
    const key = [
      line.product, line.type, line.gelColor, line.gelCustom,
      line.inkColor, line.inkCustom, line.inkCount ?? 1,
      line.inkColor2, line.inkCustom2, line.inkColor3, line.inkCustom3,
      line.glitterColor, line.glitterCustom,
      line.valorUnitario, line.isGift,
    ].join("|");
    const existing = consolidated.get(key);
    if (!existing) {
      consolidated.set(key, { ...line });
      continue;
    }
    existing.units = String((parseInt(existing.units, 10) || 0) + (parseInt(line.units, 10) || 0));
    existing.valorTotal = String((parseFloat(existing.valorTotal) || 0) + (parseFloat(line.valorTotal) || 0));
  }
  return Array.from(consolidated.values());
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
    inkCount: 1,
    inkColor2: "",
    inkCustom2: "",
    inkColor3: "",
    inkCustom3: "",
    glitterColor: "",
    glitterCustom: "",
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
  options,
  placeholder = "Seleccionar color",
  allowCustom = true,
  hint,
}: {
  label: string;
  value: string;
  customValue: string;
  onValueChange: (v: string) => void;
  onCustomChange: (v: string) => void;
  options?: string[];
  placeholder?: string;
  allowCustom?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {(options ?? PREDEFINED_COLORS).map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
          {allowCustom && <SelectItem value="otro">Otro (escribir)</SelectItem>}
        </SelectContent>
      </Select>
      {allowCustom && value === "otro" && (
        <Input
          placeholder="Escriba el color..."
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          required
        />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ---- Helpers para resumen de pedido ---- */

const formatMoney = (n: number) =>
  `$${(Math.round(n) || 0).toLocaleString("es-CO")}`;

const resolveColorVal = (selected: string, custom: string) =>
  selected === "otro" ? custom : selected;

const getFieldVal = (form: HTMLFormElement | null, name: string): string => {
  if (!form) return "";
  const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
  return el?.value?.trim() || "";
};

const getFileName = (form: HTMLFormElement | null, name: string): string => {
  if (!form) return "";
  const el = form.elements.namedItem(name) as HTMLInputElement | null;
  const f = el?.files?.[0];
  return f ? f.name : "";
};

function buildMagicalMayorSummary(args: {
  form: HTMLFormElement | null;
  orderLines: OrderLine[];
  grandTotal: number;
  abono: string;
  estadoPago: "abono_inicial" | "pago_total" | "pendiente";
  isRecompra: boolean;
  noLogo: boolean;
  dobleTinta: boolean;
  escarcha: boolean;
  costoAdicional: string;
  paymentProofFile: File | null;
  cobroLogo?: boolean;
  costoLogo?: string;
  moldeNuevo?: boolean;
  moldeNombre?: string;
  moldeCosto?: string;
  moldeModo?: "con_pedido" | "separado" | "solo_molde";
}): OrderSummary {
  const { form, orderLines, grandTotal, abono, estadoPago, isRecompra, noLogo, dobleTinta, escarcha, costoAdicional, paymentProofFile, cobroLogo, costoLogo, moldeNuevo, moldeNombre, moldeCosto, moldeModo } = args;
  const abonoNum = estadoPago === "pago_total" ? grandTotal : (parseFloat(abono) || 0);
  const saldo = Math.max(grandTotal - abonoNum, 0);
  const estadoPagoLabel =
    estadoPago === "pago_total" ? "Pago total recibido"
    : estadoPago === "abono_inicial" ? "Abono inicial recibido"
    : "Pago pendiente";

  const opciones: Array<{ label: string; value: string }> = [];
  if (isRecompra) opciones.push({ label: "Recompra", value: "Sí" });
  if (noLogo) opciones.push({ label: "Sin logo", value: "Sí" });
  if (dobleTinta) opciones.push({ label: "Doble tinta", value: "Sí" });
  if (escarcha) opciones.push({ label: "Escarcha", value: "Sí" });
  if ((dobleTinta || escarcha) && parseFloat(costoAdicional) > 0) {
    opciones.push({ label: "Costo adicional", value: formatMoney(parseFloat(costoAdicional)) });
  }
  if (cobroLogo) {
    opciones.push({ label: "Cobro de logo", value: formatMoney(parseFloat(costoLogo || "0")) });
  }
  if (moldeNuevo) {
    opciones.push({ label: "Molde nuevo", value: moldeNombre || "—" });
    opciones.push({ label: "Costo del molde", value: formatMoney(parseFloat(moldeCosto || "0")) });
    opciones.push({
      label: "Forma de cobro del molde",
      value: moldeModo === "solo_molde"
        ? "Solo molde (sin productos)"
        : moldeModo === "separado"
          ? "Pagado por separado"
          : "Cobrado con este pedido",
    });
  }

  return {
    brandLabel: "Magical Warmers",
    saleTypeLabel: "Al por mayor",
    cliente: [
      { label: "Nombre", value: getFieldVal(form, "mw_nombre") },
      { label: "Cédula/NIT", value: getFieldVal(form, "mw_cedulaNit") },
      { label: "Contacto", value: getFieldVal(form, "mw_contacto") },
      { label: "Email", value: getFieldVal(form, "mw_email") },
      { label: "Dirección", value: getFieldVal(form, "mw_direccion") },
      { label: "Ciudad", value: getFieldVal(form, "mw_ciudad") },
      { label: "Departamento", value: getFieldVal(form, "mw_departamento") },
    ],
    productos: orderLines.map((line, idx) => {
      const gel = resolveColorVal(line.gelColor, line.gelCustom);
      const tinta = resolveColorVal(line.inkColor, line.inkCustom);
      const tinta2 = resolveColorVal(line.inkColor2 || "", line.inkCustom2 || "");
      const tinta3 = resolveColorVal(line.inkColor3 || "", line.inkCustom3 || "");
      const escarcha = resolveColorVal(line.glitterColor || "", line.glitterCustom || "");
      const nTintas = line.inkCount ?? 1;
      const qty = parseInt(line.units, 10) || 0;
      const total = parseFloat(line.valorTotal) || 0;
      const unit = parseFloat(line.valorUnitario) || 0;
      return {
        title: line.isGift ? `Obsequio: ${line.product || "—"} ${line.type ? `(${line.type})` : ""}` : `Producto ${idx + 1}: ${line.product || "—"} ${line.type ? `(${line.type})` : ""}`,
        isGift: line.isGift,
        details: [
          { label: "Unidades", value: qty ? String(qty) : "—" },
          { label: "Color gel", value: gel || "—" },
          { label: "N° de tintas", value: String(nTintas) },
          { label: nTintas > 1 ? "Color tinta 1" : "Color tinta", value: tinta || "—" },
          ...(nTintas >= 2 ? [{ label: "Color tinta 2", value: tinta2 || "—" }] : []),
          ...(nTintas >= 3 ? [{ label: "Color tinta 3", value: tinta3 || "—" }] : []),
          ...(escarcha ? [{ label: "Color escarcha", value: escarcha }] : []),
          ...(line.isGift ? [] : [
            { label: "Valor unitario", value: unit ? formatMoney(unit) : "—" },
            { label: "Valor total", value: total ? formatMoney(total) : "—" },
          ]),
        ],
      };
    }),
    pago: [
      { label: "Estado del pago", value: estadoPagoLabel },
      { label: "Abono", value: formatMoney(abonoNum) },
      { label: "Saldo pendiente", value: formatMoney(saldo) },
      { label: "Soporte de pago", value: paymentProofFile ? paymentProofFile.name : "No adjuntado" },
      { label: "Fecha requerida", value: getFieldVal(form, "mw_fechaRequerida") || "Sin definir" },
    ],
    opciones,
    archivos: [
      { label: "Logo", value: getFileName(form, "mw_logo") || (noLogo ? "No requiere" : "No adjuntado") },
      { label: "Nombre del logo", value: getFieldVal(form, "mw_logo_nombre") || "—" },
      { label: "RUT", value: getFileName(form, "mw_rut") || "No adjuntado" },
    ],
    observaciones: [getFieldVal(form, "mw_personalizacion"), getFieldVal(form, "mw_observaciones")].filter(Boolean).join("\n\n"),
    totalLabel: "Total del pedido",
    totalValue: formatMoney(grandTotal),
  };
}

function buildSweatspotMayorSummary(args: {
  form: HTMLFormElement | null;
  ssLines: SweatspotOrderLine[];
  grandTotal: number;
  ssAbono: string;
  ssEstadoPago: "abono_inicial" | "pago_total" | "pendiente";
  ssIsRecompra: boolean;
  ssNoLogo: boolean;
  ssPaymentProofFile: File | null;
  ssCobroLogo?: boolean;
  ssCostoLogo?: string;
}): OrderSummary {
  const { form, ssLines, grandTotal, ssAbono, ssEstadoPago, ssIsRecompra, ssNoLogo, ssPaymentProofFile, ssCobroLogo, ssCostoLogo } = args;
  const abonoNum = ssEstadoPago === "pago_total" ? grandTotal : (parseFloat(ssAbono) || 0);
  const saldo = Math.max(grandTotal - abonoNum, 0);
  const estadoPagoLabel =
    ssEstadoPago === "pago_total" ? "Pago total recibido"
    : ssEstadoPago === "abono_inicial" ? "Abono inicial recibido"
    : "Pago pendiente";

  const opciones: Array<{ label: string; value: string }> = [];
  if (ssIsRecompra) opciones.push({ label: "Recompra", value: "Sí" });
  if (ssNoLogo) opciones.push({ label: "Sin logo", value: "Sí" });
  if (ssCobroLogo) {
    opciones.push({ label: "Cobro de logo", value: formatMoney(parseFloat(ssCostoLogo || "0")) });
  }

  return {
    brandLabel: "Sweatspot",
    saleTypeLabel: "Al por mayor",
    cliente: [
      { label: "Nombre", value: getFieldVal(form, "ss_nombre") },
      { label: "Cédula/NIT", value: getFieldVal(form, "ss_cedulaNit") },
      { label: "Contacto", value: getFieldVal(form, "ss_contacto") },
      { label: "Email", value: getFieldVal(form, "ss_email") },
      { label: "Dirección", value: getFieldVal(form, "ss_direccion") },
      { label: "Ciudad", value: getFieldVal(form, "ss_ciudad") },
      { label: "Departamento", value: getFieldVal(form, "ss_departamento") },
    ],
    productos: ssLines.map((line, idx) => {
      const qty = parseInt(line.units, 10) || 0;
      const total = parseFloat(line.valorTotal) || 0;
      const unit = parseFloat(line.valorUnitario) || 0;
      return {
        title: `Producto ${idx + 1}: ${line.referencia || "—"} ${line.tamano ? `· ${line.tamano}` : ""}`,
        details: [
          { label: "Unidades", value: qty ? String(qty) : "—" },
          { label: "Tipo de logo", value: line.tipoLogo || (ssNoLogo ? "No requiere" : "—") },
          { label: "Color silicona", value: line.colorSilicona || "—" },
          { label: "Color tinta", value: line.colorTinta || "—" },
          { label: "Valor unitario", value: unit ? formatMoney(unit) : "—" },
          { label: "Valor total", value: total ? formatMoney(total) : "—" },
        ],
      };
    }),
    pago: [
      { label: "Estado del pago", value: estadoPagoLabel },
      { label: "Abono", value: formatMoney(abonoNum) },
      { label: "Saldo pendiente", value: formatMoney(saldo) },
      { label: "Soporte de pago", value: ssPaymentProofFile ? ssPaymentProofFile.name : "No adjuntado" },
      { label: "Fecha requerida", value: getFieldVal(form, "ss_fechaRequerida") || "Sin definir" },
    ],
    opciones,
    archivos: [
      { label: "Logo", value: getFileName(form, "ss_logo") || (ssNoLogo ? "No requiere" : "No adjuntado") },
      { label: "Nombre del logo", value: getFieldVal(form, "ss_logo_nombre") || "—" },
      { label: "RUT", value: getFileName(form, "ss_rut") || "No adjuntado" },
    ],
    observaciones: [getFieldVal(form, "ss_personalizacion"), getFieldVal(form, "ss_observaciones")].filter(Boolean).join("\n\n"),
    totalLabel: "Total del pedido",
    totalValue: formatMoney(grandTotal),
  };
}

function buildGenericRetailSummary(args: {
  brandLabel: string;
  isMayor: boolean;
  cliente: { nombre: string; telefono: string; cedula: string; email: string; ciudad: string; departamento: string; direccion: string };
  productLines: RetailProductLine[];
  grandTotal: number;
  shippingCost: string;
  paymentMethod: "contra_entrega" | "pagado";
  notas: string;
  brand: Brand;
}): OrderSummary {
  const { brandLabel, isMayor, cliente, productLines, grandTotal, shippingCost, paymentMethod, notas, brand } = args;
  const envio = parseFloat(shippingCost) || 0;
  const total = grandTotal + envio;
  const pagoLabel = paymentMethod === "pagado" ? "Ya pagado" : "Contra entrega";

  return {
    brandLabel,
    saleTypeLabel: isMayor ? "Al por mayor" : "Al por menor",
    cliente: [
      { label: "Nombre", value: cliente.nombre },
      { label: "Cédula/NIT", value: cliente.cedula },
      { label: "Teléfono", value: cliente.telefono },
      { label: "Email", value: cliente.email },
      { label: "Dirección", value: cliente.direccion },
      { label: "Ciudad", value: cliente.ciudad },
      { label: "Departamento", value: cliente.departamento },
    ],
    productos: productLines.map((line, idx) => {
      const qty = parseInt(line.cantidad, 10) || 0;
      const price = parseFloat(line.retailPrice) || 0;
      return {
        title: line.isGift ? `Obsequio: ${line.selectedRef || "—"}` : `Producto ${idx + 1}: ${line.selectedRef || "—"}`,
        isGift: line.isGift,
        details: [
          ...(line.tipo ? [{ label: "Tipo", value: line.tipo }] : []),
          { label: "Cantidad", value: qty ? String(qty) : "—" },
          ...(brand === "sweatspot" ? [{ label: "Color", value: line.colorProducto || "—" }] : []),
          ...(line.isGift ? [] : [{ label: "Precio venta", value: price ? formatMoney(price) : "—" }]),
        ],
      };
    }),
    pago: !isMayor ? [
      { label: "Método de pago", value: pagoLabel },
      { label: "Costo de envío", value: formatMoney(envio) },
      { label: "Total productos", value: formatMoney(grandTotal) },
      ...(paymentMethod === "contra_entrega" ? [{ label: "A cobrar contra entrega", value: formatMoney(total) }] : []),
    ] : [
      { label: "Total", value: formatMoney(grandTotal) },
    ],
    observaciones: notas || undefined,
    totalLabel: !isMayor && paymentMethod === "contra_entrega" ? "Total a cobrar (con envío)" : "Total del pedido",
    totalValue: formatMoney(!isMayor ? total : grandTotal),
  };
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
  const [paymentChannel, setPaymentChannel] = usePersistedState<string>("ventas:mw:paymentChannel", "");
  const [paymentDate, setPaymentDate] = usePersistedState<string>("ventas:mw:paymentDate", new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [costoAdicional, setCostoAdicional] = usePersistedState("ventas:mw:costoAdicional", "");
  const [cobroLogo, setCobroLogo] = usePersistedState("ventas:mw:cobroLogo", false);
  const [costoLogo, setCostoLogo] = usePersistedState("ventas:mw:costoLogo", "");
  const [logoFileState, setLogoFileState] = useState<File | null>(null);
  const [logoFile2State, setLogoFile2State] = useState<File | null>(null);
  const [logoCount, setLogoCount] = usePersistedState<number>("ventas:mw:logoCount", 1);
  const [clientName, setClientName] = usePersistedState<string>("ventas:mw:clientName", "");
  const [recompraLogoUrl, setRecompraLogoUrl] = usePersistedState<string>("ventas:mw:recompraLogoUrl", "");
  const [rutFileState, setRutFileState] = useState<File | null>(null);
  // Molde nuevo (sólo Magical)
  const [moldeNuevo, setMoldeNuevo] = usePersistedState("ventas:mw:moldeNuevo", false);
  const [moldeNombre, setMoldeNombre] = usePersistedState("ventas:mw:moldeNombre", "");
  const [moldeCosto, setMoldeCosto] = usePersistedState("ventas:mw:moldeCosto", "");
  const [moldeModo, setMoldeModo] = usePersistedState<"con_pedido" | "separado" | "solo_molde">("ventas:mw:moldeModo", "con_pedido");
  const formRef = useRef<HTMLFormElement>(null);
  useFormDraft(formRef, "ventas:mw:fields");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reset costo adicional si se desactivan ambas opciones
  useEffect(() => {
    if (!dobleTinta && !escarcha) setCostoAdicional("");
  }, [dobleTinta, escarcha]);

  // Reset costo logo si se desactiva la opción
  useEffect(() => {
    if (!cobroLogo) setCostoLogo("");
  }, [cobroLogo]);

  // Logos ya trabajados para este cliente (para recompras: el logo no se pierde)
  const previousLogosQuery = useQuery({
    queryKey: ["previous-logos", clientName.trim().toLowerCase()],
    enabled: clientName.trim().length >= 3,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logo_requests")
        .select("id, logo_name, product, status, original_logo_url, adjusted_logo_url, created_at")
        .ilike("client_name", `%${clientName.trim()}%`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const previousLogos = (previousLogosQuery.data ?? []).filter(
    (l: any) => (l.adjusted_logo_url || l.original_logo_url || "").startsWith("http"),
  );

  const materialConfigs = useInventoryStore((s) => s.materialConfigs);
  const { reserveBodyStock: reserveBodyStockDB, discountStock: discountStockDB, stockItems: inventoryStockItems } = useInventory();

  // Catálogo unificado de referencias (misma fuente que Inventarios)
  const magicalCatalog = useMemo(
    () => buildReferenceCatalog(inventoryStockItems as any).filter((i) => i.brandKey === "magical"),
    [inventoryStockItems],
  );

  // Unique product names — combine local material configs with Magical products from DB
  // so newly-added references (e.g. "Tiroides") show up for all advisors.
  // Fuente única de verdad: el catálogo de referencias de Inventarios.
  // El asesor solo puede elegir de esta lista; Inventarios la administra.
  const productNames = useMemo(
    () =>
      uniqueReferenceNames(
        magicalCatalog.filter(
          (i) => i.category === "producto_terminado" || i.category === "cuerpos_referencias",
        ),
      ),
    [magicalCatalog],
  );

  // Una sola opción por referencia: el tipo (Frío/Térmico) se elige en el campo "Tipo".
  const productOptions = useMemo(
    () => productNames.map((name) => ({ value: name, label: name, product: name, type: "" })),
    [productNames],
  );

  // Colores de escarcha administrados desde Inventarios (materia prima "Escarcha ...")
  const glitterOptions = useMemo(() => {
    const names = inventoryStockItems
      .filter((s) => /^escarcha\b/i.test(s.name || ""))
      .map((s) => s.name.replace(/^escarcha\s*/i, "").trim() || s.name);
    return ["No aplica", ...[...new Set(names)].sort((a, b) => a.localeCompare(b, "es"))];
  }, [inventoryStockItems]);

  // Tintas y gel también salen de Inventarios (materia prima)
  const inkOptions = useMemo(() => {
    const names = inventoryStockItems
      .filter((s) => /^tinta\b/i.test(s.name || ""))
      .map((s) => s.name.replace(/^tinta\s*(pvc)?\s*/i, "").trim() || s.name);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, "es"));
  }, [inventoryStockItems]);

  const gelOptions = useMemo(() => {
    const names = inventoryStockItems
      .filter((s) => /^colorante\b/i.test(s.name || ""))
      .map((s) => s.name.replace(/^colorante\s*/i, "").trim() || s.name);
    return ["No aplica", "Transparente", ...[...new Set(names)].sort((a, b) => a.localeCompare(b, "es"))];
  }, [inventoryStockItems]);

  const getProductSelectValue = (line: OrderLine) => line.product;

  const handleProductSelect = (lineId: string, value: string) => {
    const selectedOption = productOptions.find((option) => option.value === value);
    if (selectedOption) {
      let resolvedType = selectedOption.type;
      if (!resolvedType) {
        const availableTypes = getAvailableTypes(selectedOption.product);
        if (availableTypes.length === 1) {
          resolvedType = availableTypes[0];
        }
      }
      updateLine(lineId, { product: selectedOption.product, type: resolvedType });
      return;
    }
    const availableTypes = getAvailableTypes(value);
    updateLine(lineId, { product: value, type: availableTypes.length === 1 ? availableTypes[0] : "" });
  };

  // Grand total across all lines
  const grandTotal = useMemo(() => {
    const linesSum = orderLines.reduce((sum, line) => line.isGift ? sum : sum + (parseFloat(line.valorTotal) || 0), 0);
    const extra = (dobleTinta || escarcha) ? (parseFloat(costoAdicional) || 0) : 0;
    const logoExtra = cobroLogo ? (parseFloat(costoLogo) || 0) : 0;
    const moldeExtra = (moldeNuevo && moldeModo !== "separado") ? (parseFloat(moldeCosto) || 0) : 0;
    return linesSum + extra + logoExtra + moldeExtra;
  }, [orderLines, costoAdicional, dobleTinta, escarcha, cobroLogo, costoLogo, moldeNuevo, moldeCosto, moldeModo]);

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
    const fromCatalog = tiposForReference(
      magicalCatalog.filter(
        (i) => i.category === "producto_terminado" || i.category === "cuerpos_referencias",
      ),
      productName,
    ).filter(Boolean) as string[];
    return [...new Set([...fromConfig, ...fromCatalog])];
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
    const clientNameValue = (clientName || (fd.get("mw_nombre") as string) || "").trim();
    // Identifica todas las líneas creadas en un mismo envío del formulario,
    // para que la validación anti-duplicados no bloquee líneas iguales.
    const submissionId = crypto.randomUUID();
    const personalizacion = (fd.get("mw_personalizacion") as string) || "";
    const observacionesRaw = (fd.get("mw_observaciones") as string) || "";
    const observaciones = paymentChannel
      ? `Medio de pago: ${paymentChannel}${observacionesRaw ? ` | ${observacionesRaw}` : ""}`
      : observacionesRaw;
    const rutFile = rutFileState;
    const logoFile = logoFileState;
    const logoFile2 = logoFile2State;
    const logoNombre = ((fd.get("mw_logo_nombre") as string) || "").trim();
    const logoNombre2 = ((fd.get("mw_logo_nombre_2") as string) || "").trim();
    const logosCount = noLogo ? 0 : logoCount;
    const fechaRequerida = fd.get("mw_fechaRequerida") as string;

    // Segundo logo: archivo y nombre obligatorios
    if (logosCount >= 2 && (!logoFile2 || logoFile2.size === 0 || !logoNombre2)) {
      toast.error("Segundo logo incompleto", {
        description: "Adjunte el archivo del logo 2 y escriba su nombre de referencia.",
      });
      setIsSubmitting(false);
      return;
    }

    // Recompra: el logo debe quedar registrado (archivo nuevo o logo anterior)
    if (isRecompra && !noLogo && !(logoFile && logoFile.size > 0) && !recompraLogoUrl) {
      toast.error("Logo de la recompra requerido", {
        description: "Seleccione un logo anterior del cliente o adjunte el archivo del logo.",
      });
      setIsSubmitting(false);
      return;
    }

    // Nombre/referencia del logo OBLIGATORIO para pedidos mayor con logo
    if (!noLogo && !logoNombre) {
      toast.error("Referencia del logo requerida", {
        description: "Escriba un nombre claro para identificar el logo (ej: Logo Coca-Cola v2).",
      });
      setIsSubmitting(false);
      return;
    }

    // Validar molde nuevo si está activo
    if (moldeNuevo) {
      if (!moldeNombre.trim()) {
        toast.error("Nombre del molde requerido", { description: "Indica el nombre del molde nuevo." });
        setIsSubmitting(false);
        return;
      }
      if (!moldeCosto || parseFloat(moldeCosto) <= 0) {
        toast.error("Costo del molde requerido", { description: "Indica el costo del molde nuevo." });
        setIsSubmitting(false);
        return;
      }
    }

    const isSoloMolde = moldeNuevo && moldeModo === "solo_molde";

    // En modo "solo molde" no validamos líneas de producto
    if (!isSoloMolde) {
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
      const nTintas = line.inkCount ?? 1;
      if (nTintas >= 2 && !resolveColor(line.inkColor2 || "", line.inkCustom2 || "")) {
        toast.error("Color de tinta 2 requerido", { description: "Seleccione el color de la tinta 2." });
        setIsSubmitting(false);
        return;
      }
      if (nTintas >= 3 && !resolveColor(line.inkColor3 || "", line.inkCustom3 || "")) {
        toast.error("Color de tinta 3 requerido", { description: "Seleccione el color de la tinta 3." });
        setIsSubmitting(false);
        return;
      }
    }
    }

    // RUT es opcional en ventas al por mayor

    // Upload initial payment proof if provided
    let paymentProofUrl: string | null = null;
    if (paymentProofFile && paymentProofFile.size > 0) {
      const ext = paymentProofFile.name.split(".").pop();
      const path = `initial_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("payment-proofs").upload(path, paymentProofFile);
      if (uploadErr) {
        console.error("[Ventas magical] Error subiendo soporte de pago:", uploadErr);
        toast.error("No se pudo subir el soporte de pago", {
          description: (uploadErr.message || "Error desconocido") + ". El pedido no fue creado. Intente de nuevo.",
        });
        setIsSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
      paymentProofUrl = urlData.publicUrl;
    }

    // Upload logo once if provided. En recompras NO se crea solicitud
    // de diseño automática (el logo ya existe y fue aprobado antes).
    let logoUrl: string | null = null;
    let logoUrl2: string | null = null;
    let logoRequestId: string | null = null;
    let firstOrderIdForLogo: string | null = null;
    const hasLogoFile = !!(logoFile && logoFile.size > 0);
    const hasPersonalization = !!(personalizacion && personalizacion.trim());
    if ((hasLogoFile || hasPersonalization) && user && !isRecompra && !noLogo) {
      const firstLine = orderLines[0];
      const referencia = `${firstLine.product} (${firstLine.type})`;
      const result = await createLogoRequestFromOrder({
        brand: "Magical Warmers",
        clientName: clientNameValue,
        logoName: logoNombre,
        product: referencia,
        advisorId: user.id,
        advisorName: user.email || "Asesor",
        logoFile: hasLogoFile ? logoFile : null,
        logoFile2: logosCount >= 2 ? logoFile2 : null,
        logoName2: logosCount >= 2 ? logoNombre2 : undefined,
        clientComments: observaciones || undefined,
        additionalInstructions: personalizacion || undefined,
      });
      if (result.success) {
        toast.success("Diseño de logo", { description: result.message });
        logoUrl = result.logoUrl || "logo-uploaded";
        logoUrl2 = result.logoUrl2 || null;
        logoRequestId = result.requestId || null;
      } else {
        toast.error("Diseño de logo", { description: result.message });
        if (result.logoUrl) logoUrl = result.logoUrl;
        if (result.logoUrl2) logoUrl2 = result.logoUrl2;
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
      if (logosCount >= 2 && logoFile2 && logoFile2.size > 0) {
        const ext2 = logoFile2.name.split(".").pop();
        const path2 = `originals/${crypto.randomUUID()}.${ext2}`;
        const { error: upErr2 } = await supabase.storage.from("logo-files").upload(path2, logoFile2);
        if (!upErr2) {
          const { data: urlData2 } = supabase.storage.from("logo-files").getPublicUrl(path2);
          logoUrl2 = urlData2.publicUrl;
        }
      }
    } else if (isRecompra && !noLogo && recompraLogoUrl) {
      // Recompra sin archivo nuevo: se reutiliza el logo aprobado anteriormente.
      logoUrl = recompraLogoUrl;
    }
    if (isRecompra && !logoUrl && recompraLogoUrl) logoUrl = recompraLogoUrl;

    const buildMagicalStages = (isThermic: boolean) => {
      const base = noLogo
        ? ["produccion_cuerpos", "dosificacion", "sellado", "recorte", "empaque", "listo"]
        : ["produccion_cuerpos", "estampacion", "dosificacion", "sellado", "recorte", "empaque", "listo"];
      if (!isThermic) return base;
      // Insert "descristalizacion" between "sellado" and "recorte"
      const idx = base.indexOf("sellado");
      return [...base.slice(0, idx + 1), "descristalizacion", ...base.slice(idx + 1)];
    };

    // ----- Caso especial: SOLO MOLDE (sin productos) -----
    if (isSoloMolde) {
      const moldeCostoNum = parseFloat(moldeCosto) || 0;
      const moldeAbono = estadoPago === "pago_total" ? moldeCostoNum : (parseFloat(abono) || 0);
      const moldeObs = [
        `Compra de molde nuevo: "${moldeNombre}" — $${moldeCostoNum.toLocaleString("es-CO")}`,
        observaciones,
      ].filter(Boolean).join(" | ");
      try {
        const { data } = await supabase.from("orders").insert({
          brand: "magical",
          sale_type: "mayor",
          client_name: clientNameValue,
          client_nit: (fd.get("mw_cedulaNit") as string) || null,
          client_phone: (fd.get("mw_contacto") as string) || null,
          client_email: (fd.get("mw_email") as string) || null,
          client_address: (fd.get("mw_direccion") as string) || null,
          client_city: (fd.get("mw_ciudad") as string) || null,
          product: `Molde: ${moldeNombre}`,
          quantity: 1,
          submission_id: submissionId,
          unit_price: moldeCostoNum,
          total_amount: moldeCostoNum,
          abono: moldeAbono,
          observations: moldeObs || null,
          advisor_id: user?.id || "",
          advisor_name: user?.email || "Asesor",
          production_status: "pendiente",
          is_recompra: false,
          payment_proof_url: paymentProofUrl,
          payment_complete: estadoPago === "pago_total",
          delivery_date: fechaRequerida || null,
          payment_date: paymentDate || new Date().toISOString().slice(0, 10),
        }).select("id, order_code").single();
        if (data) {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          toast.success("Compra de molde registrada", { description: `${clientNameValue} — Molde "${moldeNombre}"` });
          [
            "ventas:mw:lines","ventas:mw:abono","ventas:mw:estadoPago",
            "ventas:mw:dobleTinta","ventas:mw:escarcha","ventas:mw:isRecompra",
            "ventas:mw:noLogo","ventas:mw:needsLogoAdjustment","ventas:mw:costoAdicional",
            "ventas:mw:cobroLogo","ventas:mw:costoLogo",
            "ventas:mw:moldeNuevo","ventas:mw:moldeNombre","ventas:mw:moldeCosto","ventas:mw:moldeModo",
            "ventas:mw:fields",
          ].forEach(clearFormDraft);
          setLogoFileState(null);
          setRutFileState(null);
          setPaymentProofFile(null);
          setMoldeNuevo(false);
          setMoldeNombre("");
          setMoldeCosto("");
          onReset();
        }
      } catch (err: any) {
        console.error("Error saving mold-only order:", err);
        toast.error("Error al registrar el molde", { description: "No se pudo guardar. Intenta de nuevo." });
      }
      setIsSubmitting(false);
      return;
    }

    // Las líneas idénticas pertenecen al mismo producto del pedido. Se consolidan
    // antes de guardar para que Inventarios y Estampación reciban la cantidad total
    // (por ejemplo, 50 + 50 se convierte en una sola orden de 100 unidades).
    const linesToSubmit = consolidateMagicalLines(orderLines);
    // Si una línea falla, las demás deben guardarse igual (antes se abortaba
    // el pedido completo y se perdían unidades del mismo cliente).
    const failedLines: string[] = [];
    const createdCodes: string[] = [];

    // Process each distinct line as a separate order
    const moldeCostoNum = parseFloat(moldeCosto) || 0;
    const moldeIncluidoEnTotal = moldeNuevo && moldeModo === "con_pedido" && moldeCostoNum > 0;
    const extraCost = ((dobleTinta || escarcha) ? (parseFloat(costoAdicional) || 0) : 0)
      + (cobroLogo ? (parseFloat(costoLogo) || 0) : 0)
      + (moldeIncluidoEnTotal ? moldeCostoNum : 0);
    const extraNoteParts: string[] = [];
    if (dobleTinta) extraNoteParts.push("doble tinta");
    if (escarcha) extraNoteParts.push("escarcha");
    const adicionalNote = ((dobleTinta || escarcha) && parseFloat(costoAdicional) > 0)
      ? `Costo adicional ${extraNoteParts.join(" y ")}: $${(parseFloat(costoAdicional) || 0).toLocaleString("es-CO")}`
      : "";
    const logoNote = (cobroLogo && parseFloat(costoLogo) > 0)
      ? `Cobro de logo: $${(parseFloat(costoLogo) || 0).toLocaleString("es-CO")}`
      : "";
    const moldeNote = moldeNuevo && moldeCostoNum > 0
      ? `Molde nuevo "${moldeNombre}": $${moldeCostoNum.toLocaleString("es-CO")} (${moldeModo === "con_pedido" ? "cobrado con el pedido" : "pagado por separado"})`
      : "";
    const extraNote = [adicionalNote, logoNote, moldeNote].filter(Boolean).join(" | ");

    // Calcular totales del pedido completo para prorratear el abono entre líneas.
    // El abono ingresado por el asesor es por el TOTAL del pedido, no por cada línea.
    const lineTotalsForProration = linesToSubmit.map((line, idx) => {
      if (line.isGift) return 0;
      const base = parseFloat(line.valorTotal) || 0;
      return idx === 0 ? base + extraCost : base;
    });
    const orderGrandTotal = lineTotalsForProration.reduce((s, v) => s + v, 0);
    const totalAbonoPedido = estadoPago === "pago_total"
      ? orderGrandTotal
      : (parseFloat(abono) || 0);
    let abonoAsignado = 0;

    for (let lineIdx = 0; lineIdx < linesToSubmit.length; lineIdx++) {
      const line = linesToSubmit[lineIdx];
      const isFirstLine = lineIdx === 0;
      const quantity = parseInt(line.units, 10) || 0;
      const referencia = `${line.product} (${line.type})`;
      const gelColor = resolveColor(line.gelColor, line.gelCustom);
      const inkColor = resolveColor(line.inkColor, line.inkCustom);
      const inkCount = line.inkCount ?? 1;
      const inkColor2 = inkCount >= 2 ? resolveColor(line.inkColor2 || "", line.inkCustom2 || "") : null;
      const inkColor3 = inkCount >= 3 ? resolveColor(line.inkColor3 || "", line.inkCustom3 || "") : null;
      const glitterColorVal = resolveColor(line.glitterColor || "", line.glitterCustom || "") || null;
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
        clientName: clientNameValue,
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
      let orderData: { id: string; order_code?: string | null } | null = null;
      try {
        const { data, error } = await supabase.from("orders").insert({
          brand: "magical",
          sale_type: "mayor",
          client_name: clientNameValue,
          client_nit: (fd.get("mw_cedulaNit") as string) || null,
          client_phone: (fd.get("mw_contacto") as string) || null,
          client_email: (fd.get("mw_email") as string) || null,
          client_address: (fd.get("mw_direccion") as string) || null,
          client_city: (fd.get("mw_ciudad") as string) || null,
          product: referencia,
          quantity,
          submission_id: submissionId,
          unit_price: parseFloat(line.valorUnitario) || 0,
          total_amount: lineTotal,
          abono: abonoAmount,
          ink_color: inkColor,
          ink_count: inkCount,
          ink_color_2: inkColor2,
          ink_color_3: inkColor3,
          glitter_color: glitterColorVal,
          gel_color: gelColor,
          logo_url: logoUrl,
          logo_url_2: logoUrl2,
          logo_count: logosCount,
          logo_name: logoNombre || null,
          logo_name_2: logosCount >= 2 ? (logoNombre2 || null) : null,
          line_index: lineIdx + 1,
          line_count: linesToSubmit.length,
          observations: [observaciones, line.isGift ? "🎁 OBSEQUIO" : "", isFirstLine ? extraNote : ""].filter(Boolean).join(" | ") || null,
          personalization: personalizacion || null,
          advisor_id: user?.id || "",
          advisor_name: user?.email || "Asesor",
          production_status: "pendiente",
          is_recompra: isRecompra,
          payment_proof_url: paymentProofUrl,
          payment_complete: estadoPago === "pago_total",
          delivery_date: fechaRequerida || null,
          payment_date: paymentDate || new Date().toISOString().slice(0, 10),
        }).select("id").single();
        if (error) {
          console.error("Error saving order:", error);
          const dup = /duplicad|duplicate/i.test(error.message);
          failedLines.push(
            `${quantity} × ${referencia}: ${dup ? "posible duplicado" : error.message}`
          );
          continue;
        }
        orderData = data;
      } catch (err: any) {
        console.error("Error saving order:", err);
        failedLines.push(`${quantity} × ${referencia}: ${err?.message || "error desconocido"}`);
        continue;
      }

      if (!orderData) {
        failedLines.push(`${quantity} × ${referencia}: sin confirmación de la base de datos`);
        continue;
      }

      if (orderData.order_code) createdCodes.push(orderData.order_code);
      if (!firstOrderIdForLogo) firstOrderIdForLogo = orderData.id;

      // El pedido queda pendiente de revisión de Inventarios.
      // Ni se reserva stock ni se crea orden de producción desde Ventas:
      // Inventarios decide (reservar inventario o solicitar producción).
      await createOrderNotifications({
        orderId: orderData.id,
        brand: "magical",
        product: referencia,
        quantity,
        clientName: clientNameValue,
        needsCuerpos: false,
        shortage: 0,
        hasLogo: !!logoFile,
        advisorId: user?.id || "",
      });
    }

    if (logoRequestId && firstOrderIdForLogo) {
      await supabase.from("logo_requests").update({ order_id: firstOrderIdForLogo }).eq("id", logoRequestId);
    }

    queryClient.invalidateQueries({ queryKey: ["production-orders"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });

    if (failedLines.length > 0) {
      toast.error(`No se guardaron ${failedLines.length} línea(s) del pedido`, {
        description: failedLines.join(" | "),
        duration: 15000,
      });
    }

    const savedCount = linesToSubmit.length - failedLines.length;
    const giftCount = orderLines.filter((l) => l.isGift).length;
    const productCount = orderLines.filter((l) => !l.isGift).length;
    const summary = [
      `${productCount} producto(s)`,
      giftCount > 0 ? `${giftCount} obsequio(s)` : "",
    ].filter(Boolean).join(" + ");
    toast.success(
      savedCount === linesToSubmit.length ? "Pedido creado" : "Pedido creado parcialmente",
      {
        description: `${clientNameValue} — ${summary}. ${savedCount} de ${linesToSubmit.length} línea(s) guardada(s)${
          createdCodes.length ? ` (${createdCodes.join(", ")})` : ""
        }. Enviado a Inventarios y Contabilidad.`,
        duration: 12000,
      },
    );

    [
      "ventas:mw:lines","ventas:mw:abono","ventas:mw:estadoPago",
      "ventas:mw:dobleTinta","ventas:mw:escarcha","ventas:mw:isRecompra",
      "ventas:mw:noLogo","ventas:mw:needsLogoAdjustment","ventas:mw:costoAdicional",
      "ventas:mw:cobroLogo","ventas:mw:costoLogo",
      "ventas:mw:moldeNuevo","ventas:mw:moldeNombre","ventas:mw:moldeCosto","ventas:mw:moldeModo",
      "ventas:mw:fields","ventas:mw:logoCount","ventas:mw:clientName","ventas:mw:recompraLogoUrl",
    ].forEach(clearFormDraft);
    setLogoFileState(null);
    setLogoFile2State(null);
    setLogoCount(1);
    setClientName("");
    setRecompraLogoUrl("");
    setRutFileState(null);
    setPaymentProofFile(null);
    setMoldeNuevo(false);
    setMoldeNombre("");
    setMoldeCosto("");
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
              <ClientNameAutocomplete
                name="mw_nombre"
                required
                value={clientName}
                onValueChange={setClientName}
                onSelect={(c) => {
                  const f = formRef.current;
                  if (!f) return;
                  const set = (n: string, v: string) => {
                    const el = f.querySelector(`[name="${n}"]`) as HTMLInputElement | null;
                    if (el && v) el.value = v;
                  };
                  set("mw_cedulaNit", c.nit);
                  set("mw_contacto", c.telefono);
                  set("mw_email", c.email);
                  set("mw_direccion", c.direccion);
                  set("mw_ciudad", c.ciudad);
                }}
              />
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
                    options={gelOptions}
                    allowCustom={false}
                  />
                  <ColorSelect
                    label="Color de escarcha (opcional)"
                    value={line.glitterColor || ""}
                    customValue={line.glitterCustom || ""}
                    onValueChange={(v) => updateLine(line.id, { glitterColor: v })}
                    onCustomChange={(v) => updateLine(line.id, { glitterCustom: v })}
                    options={glitterOptions}
                    placeholder="Sin escarcha"
                    allowCustom={false}
                  />
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Tintas de marcación</p>
                      <p className="text-xs text-muted-foreground">Elija cuántas tintas lleva el logo (máx. 3)</p>
                    </div>
                    <div className="inline-flex rounded-md border bg-background p-0.5">
                      {[1, 2, 3].map((n) => (
                        <Button
                          key={n}
                          type="button"
                          size="sm"
                          variant={(line.inkCount ?? 1) === n ? "default" : "ghost"}
                          className="h-8 px-4"
                          onClick={() =>
                            updateLine(line.id, {
                              inkCount: n,
                              ...(n < 2 ? { inkColor2: "", inkCustom2: "" } : {}),
                              ...(n < 3 ? { inkColor3: "", inkCustom3: "" } : {}),
                            })
                          }
                        >
                          {n} {n === 1 ? "tinta" : "tintas"}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[1, 2, 3].map((slot) => {
                      const active = (line.inkCount ?? 1) >= slot;
                      const val = slot === 1 ? line.inkColor : slot === 2 ? line.inkColor2 || "" : line.inkColor3 || "";
                      const key = slot === 1 ? "inkColor" : slot === 2 ? "inkColor2" : "inkColor3";
                      return (
                        <div key={slot} className={active ? "" : "opacity-40 pointer-events-none"}>
                          <ColorSelect
                            label={`Tinta ${slot}`}
                            value={val}
                            customValue=""
                            onValueChange={(v) => updateLine(line.id, { [key]: v } as Partial<OrderLine>)}
                            onCustomChange={() => {}}
                            options={inkOptions}
                            placeholder={active ? "Seleccionar tinta" : "—"}
                            allowCustom={false}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                {!line.isGift && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Unidades</Label>
                    <Input type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} required value={line.units} onChange={(e) => updateLine(line.id, { units: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor unitario</Label>
                    <Input type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} required value={line.valorUnitario} onChange={(e) => updateLine(line.id, { valorUnitario: e.target.value, autoCalc: true })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor total línea</Label>
                    <Input type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} required value={line.valorTotal} onChange={(e) => updateLine(line.id, { valorTotal: e.target.value, autoCalc: false })} />
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
                    <Input type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} required value={line.units} onChange={(e) => updateLine(line.id, { units: e.target.value })} />
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
                  <Input id="mw_abono" name="mw_abono" type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} value={abono} onChange={(e) => setAbono(e.target.value)} />
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
              <Label htmlFor="mw_paymentDate">Fecha del pago</Label>
              <Input id="mw_paymentDate" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Si el pago fue hoy déjala como está; si fue otro día selecciónala.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Medio de pago</Label>
              <Select value={paymentChannel} onValueChange={setPaymentChannel}>
                <SelectTrigger><SelectValue placeholder="Selecciona medio de pago" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nequi">Nequi</SelectItem>
                  <SelectItem value="bancolombia">Bancolombia</SelectItem>
                  <SelectItem value="davivienda">Davivienda</SelectItem>
                  <SelectItem value="link_pago">Link de pago</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
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
              <div className="flex items-center justify-between rounded-md border border-input p-3">
                <Label htmlFor="mw_cobroLogo" className="cursor-pointer">Cobrar logo</Label>
                <Switch id="mw_cobroLogo" checked={cobroLogo} onCheckedChange={setCobroLogo} />
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
                  type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
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
            {cobroLogo && (
              <div className="space-y-1.5 rounded-md border border-input bg-muted/30 p-3">
                <Label htmlFor="mw_costoLogo">Costo del logo</Label>
                <Input
                  id="mw_costoLogo"
                  type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="Ej: 20000"
                  value={costoLogo}
                  onChange={(e) => setCostoLogo(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Este valor se sumará al total del pedido y será cobrado al cliente.
                </p>
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Molde nuevo</legend>
            <div className="flex items-center justify-between rounded-md border border-input p-3">
              <div>
                <Label htmlFor="mw_moldeNuevo" className="cursor-pointer">¿Este pedido incluye un molde nuevo?</Label>
                <p className="text-xs text-muted-foreground">Activa esta opción si el cliente está pagando un molde nuevo.</p>
              </div>
              <Switch id="mw_moldeNuevo" checked={moldeNuevo} onCheckedChange={setMoldeNuevo} />
            </div>
            {moldeNuevo && (
              <div className="space-y-4 rounded-md border border-input bg-muted/30 p-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="mw_moldeNombre">Nombre del molde</Label>
                    <Input
                      id="mw_moldeNombre"
                      placeholder="Ej: Molde logo XYZ"
                      value={moldeNombre}
                      onChange={(e) => setMoldeNombre(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mw_moldeCosto">Costo del molde</Label>
                    <Input
                      id="mw_moldeCosto"
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                      placeholder="Ej: 80000"
                      value={moldeCosto}
                      onChange={(e) => setMoldeCosto(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Forma de cobro del molde</Label>
                  <Select value={moldeModo} onValueChange={(v) => setMoldeModo(v as typeof moldeModo)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="con_pedido">Cobrado junto con este pedido (suma al total)</SelectItem>
                      <SelectItem value="separado">Pagado por separado (no suma al total)</SelectItem>
                      <SelectItem value="solo_molde">Solo molde (sin productos en este pedido)</SelectItem>
                    </SelectContent>
                  </Select>
                  {moldeModo === "solo_molde" && (
                    <p className="text-xs text-muted-foreground">
                      Se creará un pedido únicamente por la compra del molde. Las líneas de producto se ignorarán.
                    </p>
                  )}
                </div>
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Archivos adjuntos</legend>

            {!noLogo && (
              <div className="rounded-lg border border-input p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Logos del pedido</p>
                    <p className="text-xs text-muted-foreground">Indique cuántos logos lleva la marcación.</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-md border border-input p-1">
                    {[1, 2].map((n) => (
                      <Button
                        key={n}
                        type="button"
                        size="sm"
                        variant={logoCount === n ? "default" : "ghost"}
                        className="h-8 px-3"
                        onClick={() => {
                          setLogoCount(n);
                          if (n === 1) setLogoFile2State(null);
                        }}
                      >
                        {n} logo{n > 1 ? "s" : ""}
                      </Button>
                    ))}
                  </div>
                </div>

                {isRecompra && (
                  <div className="space-y-1.5 rounded-md border border-input bg-muted/30 p-3">
                    <Label>Logo anterior del cliente *</Label>
                    <Select value={recompraLogoUrl || undefined} onValueChange={setRecompraLogoUrl}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            clientName.trim().length < 3
                              ? "Escriba primero el nombre del cliente"
                              : previousLogos.length
                                ? "Seleccionar logo ya trabajado"
                                : "Sin logos previos — adjunte el archivo"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {previousLogos.map((l: any) => {
                          const url = l.adjusted_logo_url || l.original_logo_url;
                          return (
                            <SelectItem key={l.id} value={url}>
                              {(l.logo_name || l.product || "Logo") + " — " + new Date(l.created_at).toLocaleDateString("es-CO")}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      En recompras el logo no se genera de nuevo: selecciónelo aquí o adjunte el archivo para que Estampación lo reciba.
                    </p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FileField label="Logo 1" name="mw_logo" value={logoFileState} onChange={setLogoFileState} accept="image/*,.pdf,.svg,.ai" />
                  <div className="space-y-1.5">
                    <Label htmlFor="mw_logo_nombre">Nombre o referencia del logo 1 *</Label>
                    <Input
                      id="mw_logo_nombre"
                      name="mw_logo_nombre"
                      placeholder="Ej: Logo Coca-Cola v2"
                    />
                  </div>
                </div>

                <div className={`grid gap-4 sm:grid-cols-2 ${logoCount < 2 ? "opacity-50" : ""}`}>
                  <FileField
                    label="Logo 2"
                    name="mw_logo_2"
                    value={logoFile2State}
                    onChange={setLogoFile2State}
                    accept="image/*,.pdf,.svg,.ai"
                    disabled={logoCount < 2}
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor="mw_logo_nombre_2">Nombre o referencia del logo 2{logoCount >= 2 ? " *" : ""}</Label>
                    <Input
                      id="mw_logo_nombre_2"
                      name="mw_logo_nombre_2"
                      disabled={logoCount < 2}
                      placeholder="Ej: Escudo del colegio"
                    />
                  </div>
                </div>
              </div>
            )}

            <FileField label="Adjuntar RUT de la empresa (opcional)" name="mw_rut" value={rutFileState} onChange={setRutFileState} accept="image/*,.pdf" />
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
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (!formRef.current) return;
                if (!formRef.current.reportValidity()) return;
                setConfirmOpen(true);
              }}
            >
              Revisar pedido
            </Button>
            <Button type="button" variant="outline" onClick={onReset}>Cancelar</Button>
          </div>
        </form>
        <OrderConfirmationDialog
          open={confirmOpen}
          onOpenChange={(o) => { if (!isSubmitting) setConfirmOpen(o); }}
          isSubmitting={isSubmitting}
          onConfirm={() => {
            setConfirmOpen(false);
            formRef.current?.requestSubmit();
          }}
          summary={buildMagicalMayorSummary({
            form: formRef.current,
            orderLines,
            grandTotal,
            abono,
            estadoPago,
            isRecompra,
            noLogo,
            dobleTinta,
            escarcha,
            costoAdicional,
            paymentProofFile,
            cobroLogo,
            costoLogo,
            moldeNuevo,
            moldeNombre,
            moldeCosto,
            moldeModo,
          })}
        />
      </CardContent>
    </Card>
  );
}

/* ---- Sweatspot – Al por mayor ---- */

interface SweatspotOrderLine {
  id: string;
  referencia: string;
  tamano: "150 ml" | "250 ml" | "250 ml juguetón" | "250 ml con correa" | "500 ml" | "500 ml con correa" | "";
  tipoLogo: "Impresión full" | "Impresión básica" | "";
  colorSilicona: string;
  colorTinta: string;
  units: string;
  valorUnitario: string;
  valorTotal: string;
  autoCalc: boolean;
}

function consolidateSweatspotLines(lines: SweatspotOrderLine[]): SweatspotOrderLine[] {
  const consolidated = new Map<string, SweatspotOrderLine>();
  for (const line of lines) {
    const key = [
      line.referencia, line.tamano, line.tipoLogo, line.colorSilicona,
      line.colorTinta, line.valorUnitario,
    ].join("|");
    const existing = consolidated.get(key);
    if (!existing) {
      consolidated.set(key, { ...line });
      continue;
    }
    existing.units = String((parseInt(existing.units, 10) || 0) + (parseInt(line.units, 10) || 0));
    existing.valorTotal = String((parseFloat(existing.valorTotal) || 0) + (parseFloat(line.valorTotal) || 0));
  }
  return Array.from(consolidated.values());
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
  const [ssPaymentChannel, setSsPaymentChannel] = usePersistedState<string>("ventas:ss:paymentChannel", "");
  const [ssPaymentDate, setSsPaymentDate] = usePersistedState<string>("ventas:ss:paymentDate", new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ssIsRecompra, setSsIsRecompra] = usePersistedState("ventas:ss:isRecompra", false);
  const [ssNoLogo, setSsNoLogo] = usePersistedState("ventas:ss:noLogo", false);
  const [ssNeedsLogoAdjustment, setSsNeedsLogoAdjustment] = usePersistedState("ventas:ss:needsLogoAdjustment", false);
  const [ssCobroLogo, setSsCobroLogo] = usePersistedState("ventas:ss:cobroLogo", false);
  const [ssCostoLogo, setSsCostoLogo] = usePersistedState("ventas:ss:costoLogo", "");
  const [ssPaymentProofFile, setSsPaymentProofFile] = useState<File | null>(null);
  const [ssLogoFileState, setSsLogoFileState] = useState<File | null>(null);
  const [ssRutFileState, setSsRutFileState] = useState<File | null>(null);
  const ssFormRef = useRef<HTMLFormElement>(null);
  useFormDraft(ssFormRef, "ventas:ss:fields");
  const [ssConfirmOpen, setSsConfirmOpen] = useState(false);
  const tamanos = ["150 ml", "250 ml", "250 ml juguetón", "250 ml con correa", "500 ml", "500 ml con correa"] as const;

  // Grand total across all lines
  const grandTotal = useMemo(() => {
    const linesSum = ssLines.reduce((sum, line) => sum + (parseFloat(line.valorTotal) || 0), 0);
    const logoExtra = ssCobroLogo ? (parseFloat(ssCostoLogo) || 0) : 0;
    return linesSum + logoExtra;
  }, [ssLines, ssCobroLogo, ssCostoLogo]);

  useEffect(() => {
    if (!ssCobroLogo) setSsCostoLogo("");
  }, [ssCobroLogo]);

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
    const personalizacion = (fd.get("ss_personalizacion") as string) || "";
    const submissionId = crypto.randomUUID();
    const observacionesRaw = (fd.get("ss_observaciones") as string) || "";
    const observaciones = ssPaymentChannel
      ? `Medio de pago: ${ssPaymentChannel}${observacionesRaw ? ` | ${observacionesRaw}` : ""}`
      : observacionesRaw;
    const rutFile = ssRutFileState;
    const logoFile = ssLogoFileState;
    const logoNombre = ((fd.get("ss_logo_nombre") as string) || "").trim();
    const fechaRequerida = fd.get("ss_fechaRequerida") as string;

    // Nombre/referencia del logo OBLIGATORIO para pedidos mayor con logo
    if (!ssNoLogo && !logoNombre) {
      toast.error("Referencia del logo requerida", {
        description: "Escriba un nombre claro para identificar el logo (ej: Logo Coca-Cola v2).",
      });
      setIsSubmitting(false);
      return;
    }

    // Validate all lines
    for (const line of ssLines) {
      if (!line.tamano || !line.colorSilicona || !line.colorTinta || !line.units) {
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
      if (uploadErr) {
        console.error("[Ventas sweatspot] Error subiendo soporte de pago:", uploadErr);
        toast.error("No se pudo subir el soporte de pago", {
          description: (uploadErr.message || "Error desconocido") + ". El pedido no fue creado. Intente de nuevo.",
        });
        setIsSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
      ssPaymentProofUrl = urlData.publicUrl;
    }

    // Auto-create design request once if logo was uploaded.
    // En recompras NO se crea solicitud de diseño automática.
    let logoUrl: string | null = null;
    let ssLogoRequestId: string | null = null;
    let ssFirstOrderIdForLogo: string | null = null;
    const ssHasLogoFile = !!(logoFile && logoFile.size > 0);
    const ssHasPersonalization = !!(personalizacion && personalizacion.trim());
    if ((ssHasLogoFile || ssHasPersonalization) && user && !ssIsRecompra && !ssNoLogo) {
      const firstRef = ssLines[0].referencia;
      const result = await createLogoRequestFromOrder({
        brand: "Sweatspot",
        clientName,
        logoName: logoNombre,
        product: firstRef,
        advisorId: user.id,
        advisorName: user.email || "Asesor",
        logoFile: ssHasLogoFile ? logoFile : null,
        clientComments: observaciones || undefined,
        additionalInstructions: personalizacion || undefined,
      });
      if (result.success) {
        toast.success("Diseño de logo", { description: result.message });
        logoUrl = result.logoUrl || "logo-uploaded";
        ssLogoRequestId = result.requestId || null;
      } else {
        toast.error("Diseño de logo", { description: result.message });
        if (result.logoUrl) logoUrl = result.logoUrl;
      }
    }

    const ssShortStages = buildStages("sweatspot", { hasLogo: !ssNoLogo, needsCuerpos: false, product: "" });
    const ssFullStagesFor = (product: string) =>
      buildStages("sweatspot", { hasLogo: !ssNoLogo, needsCuerpos: true, product });
    const ssFullStages = ssFullStagesFor(ssLines[0]?.referencia || "");

    // Consolidar referencias idénticas para que todo el flujo reciba la cantidad total.
    const linesToSubmit = consolidateSweatspotLines(ssLines);
    const failedSsLines: string[] = [];

    // Process each distinct line as a separate order
    // Calcular totales para prorratear el abono entre líneas (el abono es por el TOTAL del pedido).
    const ssLogoExtra = ssCobroLogo ? (parseFloat(ssCostoLogo) || 0) : 0;
    const ssLineTotals = linesToSubmit.map((line, idx) => {
      const base = parseFloat(line.valorTotal) || 0;
      return idx === 0 ? base + ssLogoExtra : base;
    });
    const ssGrandTotal = ssLineTotals.reduce((s, v) => s + v, 0);
    const ssLogoNote = (ssCobroLogo && ssLogoExtra > 0)
      ? `Cobro de logo: $${ssLogoExtra.toLocaleString("es-CO")}`
      : "";
    const totalAbonoPedidoSs = ssEstadoPago === "pago_total"
      ? ssGrandTotal
      : (parseFloat(ssAbono) || 0);
    let abonoAsignadoSs = 0;

    for (let lineIdx = 0; lineIdx < linesToSubmit.length; lineIdx++) {
      const line = linesToSubmit[lineIdx];
      const quantity = parseInt(line.units, 10) || 0;
      const referencia = line.referencia;
      const inkColor = line.colorTinta;
      const siliconeColor = line.colorSilicona;
      const thermoSize = line.tamano as "150 ml" | "250 ml" | "250 ml juguetón" | "250 ml con correa" | "500 ml" | "500 ml con correa";
      const tipoLogo = line.tipoLogo;
      const lineTotal = ssLineTotals[lineIdx];
      // Prorratear el abono según el peso de la línea sobre el total del pedido.
      let abonoAmount = 0;
      if (ssGrandTotal > 0) {
        const isLast = lineIdx === linesToSubmit.length - 1;
        if (!isLast) {
          abonoAmount = Math.round((totalAbonoPedidoSs * lineTotal) / ssGrandTotal);
          abonoAsignadoSs += abonoAmount;
        } else {
          abonoAmount = Math.max(totalAbonoPedidoSs - abonoAsignadoSs, 0);
          abonoAsignadoSs += abonoAmount;
        }
      }
      const logoType = tipoLogo === "Impresión básica" ? "impresion_basica" as const : "impresion_full" as const;

      // Por defecto todos los productos Sweatspot pasan por producción.
      // El listado de productos realmente importados se definirá manualmente.
      const isImportedProduct = false;

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
        const { data, error } = await supabase.from("orders").insert({
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
          submission_id: submissionId,
          unit_price: parseFloat(line.valorUnitario) || 0,
          total_amount: lineTotal,
          abono: abonoAmount,
          ink_color: inkColor,
          silicone_color: siliconeColor,
          logo_url: logoUrl,
          observations: [observaciones, lineIdx === 0 ? ssLogoNote : ""].filter(Boolean).join(" | ") || null,
          personalization: personalizacion || null,
          advisor_id: user?.id || "",
          advisor_name: user?.email || "Asesor",
          production_status: isImportedProduct ? "listo" : "pendiente",
          is_recompra: ssIsRecompra,
          payment_proof_url: ssPaymentProofUrl,
          payment_complete: ssEstadoPago === "pago_total",
          delivery_date: fechaRequerida || null,
          payment_date: ssPaymentDate || new Date().toISOString().slice(0, 10),
        }).select("id").single();
        if (error) {
          console.error("Error saving order:", error);
          const dup = /duplicad|duplicate/i.test(error.message);
          failedSsLines.push(
            `${quantity} × ${referencia}: ${dup ? "posible duplicado" : error.message}`
          );
          continue;
        }
        orderData = data;
      } catch (err: any) {
        console.error("Error saving order:", err);
        failedSsLines.push(`${quantity} × ${referencia}: ${err?.message || "error desconocido"}`);
        continue;
      }

      if (!orderData) {
        failedSsLines.push(`${quantity} × ${referencia}: sin confirmación de la base de datos`);
        continue;
      }

      if (!ssFirstOrderIdForLogo) ssFirstOrderIdForLogo = orderData.id;

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

      // El pedido queda pendiente de revisión de Inventarios (sin reservar stock
      // ni crear orden de producción desde Ventas).
      await createOrderNotifications({
        orderId: orderData.id,
        brand: "sweatspot",
        product: referencia,
        quantity,
        clientName,
        needsCuerpos: false,
        shortage: 0,
        hasLogo: !!logoFile,
        advisorId: user?.id || "",
      });
    }

    if (ssLogoRequestId && ssFirstOrderIdForLogo) {
      await supabase.from("logo_requests").update({ order_id: ssFirstOrderIdForLogo }).eq("id", ssLogoRequestId);
    }

    queryClient.invalidateQueries({ queryKey: ["production-orders"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });

    const lineCount = ssLines.length;
    if (failedSsLines.length > 0) {
      toast.error(`No se guardaron ${failedSsLines.length} línea(s) del pedido`, {
        description: failedSsLines.join(" | "),
        duration: 15000,
      });
    }
    toast.success(`${lineCount > 1 ? lineCount + " pedidos creados" : "Pedido al por mayor creado"}`, {
      description: `${clientName} — ${lineCount > 1 ? lineCount + " líneas" : ssLines[0].units + " uds"}. Enviado a Inventarios y Contabilidad.`,
    });

    const saldoFinal = ssEstadoPago === "pago_total"
      ? 0
      : grandTotal - (parseFloat(ssAbono) || 0);
    if (saldoFinal > 0) {
      toast.warning("Saldo pendiente registrado", {
        description: `Falta $${saldoFinal.toLocaleString("es-CO")} para completar el pago. Contabilidad fue notificada.`,
      });
    }

    [
      "ventas:ss:lines","ventas:ss:abono","ventas:ss:estadoPago",
      "ventas:ss:isRecompra","ventas:ss:noLogo","ventas:ss:needsLogoAdjustment",
      "ventas:ss:cobroLogo","ventas:ss:costoLogo",
      "ventas:ss:fields",
    ].forEach(clearFormDraft);
    setSsLogoFileState(null);
    setSsRutFileState(null);
    setSsPaymentProofFile(null);
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
                const normalizeTamano = (raw: string): SweatspotOrderLine["tamano"] => {
                  const lower = (raw || "").toLowerCase().replace(/\s+/g, " ").trim();
                  if (lower.includes("150")) return "150 ml";
                  if (lower.includes("250") && lower.includes("juguet")) return "250 ml juguetón";
                  if (lower.includes("250") && lower.includes("correa")) return "250 ml con correa";
                  if (lower.includes("250")) return "250 ml";
                  if (lower.includes("500") && lower.includes("correa")) return "500 ml con correa";
                  if (lower.includes("500")) return "500 ml";
                  return "";
                };
                const newLines: SweatspotOrderLine[] = data.productos.map((p: any) => {
                  const tamanoRaw = p.tamano || p.tipo || p.producto || data.tamano || "";
                  const tamano = normalizeTamano(tamanoRaw);
                  const referencia = tamano ? `Termo ${tamano}` : "";
                  return {
                    id: crypto.randomUUID(),
                    referencia,
                    tamano,
                    tipoLogo: "",
                    colorSilicona: data.color_silicona || "",
                    colorTinta: p.color_tinta || "",
                    units: String(p.unidades || ""),
                    valorUnitario: String(p.valor_unitario || ""),
                    valorTotal: String(p.valor_total || ""),
                    autoCalc: !p.valor_total,
                  };
                });
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
              <ClientNameAutocomplete
                name="ss_nombre"
                required
                onSelect={(c) => {
                  const f = ssFormRef.current;
                  if (!f) return;
                  const set = (n: string, v: string) => {
                    const el = f.querySelector(`[name="${n}"]`) as HTMLInputElement | null;
                    if (el && v) el.value = v;
                  };
                  set("ss_cedulaNit", c.nit);
                  set("ss_contacto", c.telefono);
                  set("ss_email", c.email);
                  set("ss_direccion", c.direccion);
                  set("ss_ciudad", c.ciudad);
                }}
              />
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
                  <Label>Tamaño</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {tamanos.map((t) => (
                      <label key={t} className="flex items-center gap-2 rounded-md border border-input p-3 cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input type="radio" name={`ss_tamano_${line.id}`} value={t} checked={line.tamano === t} onChange={() => updateSSLine(line.id, { tamano: t, referencia: `Termo ${t}` })} className="accent-primary h-4 w-4" />
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
                    <Input type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} value={line.units} onChange={(e) => updateSSLine(line.id, { units: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor unitario</Label>
                    <Input type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} value={line.valorUnitario} onChange={(e) => updateSSLine(line.id, { valorUnitario: e.target.value, autoCalc: true })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor total</Label>
                    <Input type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} value={line.valorTotal} onChange={(e) => updateSSLine(line.id, { valorTotal: e.target.value, autoCalc: false })} required />
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
                  <Input id="ss_abono" name="ss_abono" type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} value={ssAbono} onChange={(e) => setSsAbono(e.target.value)} />
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
              <Label htmlFor="ss_paymentDate">Fecha del pago</Label>
              <Input id="ss_paymentDate" type="date" value={ssPaymentDate} onChange={(e) => setSsPaymentDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Si el pago fue hoy déjala como está; si fue otro día selecciónala.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Medio de pago</Label>
              <Select value={ssPaymentChannel} onValueChange={setSsPaymentChannel}>
                <SelectTrigger><SelectValue placeholder="Selecciona medio de pago" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nequi">Nequi</SelectItem>
                  <SelectItem value="bancolombia">Bancolombia</SelectItem>
                  <SelectItem value="davivienda">Davivienda</SelectItem>
                  <SelectItem value="link_pago">Link de pago</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
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
              <div className="flex items-center justify-between rounded-md border border-input p-3">
                <Label htmlFor="ss_cobroLogo" className="cursor-pointer">Cobrar logo</Label>
                <Switch id="ss_cobroLogo" checked={ssCobroLogo} onCheckedChange={setSsCobroLogo} />
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
            {ssCobroLogo && (
              <div className="space-y-1.5 rounded-md border border-input bg-muted/30 p-3 max-w-md">
                <Label htmlFor="ss_costoLogo">Costo del logo</Label>
                <Input
                  id="ss_costoLogo"
                  type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="Ej: 20000"
                  value={ssCostoLogo}
                  onChange={(e) => setSsCostoLogo(e.target.value)}
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
              <FileField label="Adjuntar logo" name="ss_logo" value={ssLogoFileState} onChange={setSsLogoFileState} accept="image/*,.pdf,.svg,.ai" />
              <FileField label="Adjuntar RUT de la empresa (opcional)" name="ss_rut" value={ssRutFileState} onChange={setSsRutFileState} accept="image/*,.pdf" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss_logo_nombre">Nombre o referencia del logo *</Label>
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
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (!ssFormRef.current) return;
                if (!ssFormRef.current.reportValidity()) return;
                setSsConfirmOpen(true);
              }}
            >
              {isSubmitting ? "Creando..." : "Revisar pedido"}
            </Button>
            <Button type="button" variant="outline" onClick={onReset}>Cancelar</Button>
          </div>
        </form>
        <OrderConfirmationDialog
          open={ssConfirmOpen}
          onOpenChange={(o) => { if (!isSubmitting) setSsConfirmOpen(o); }}
          isSubmitting={isSubmitting}
          onConfirm={() => {
            setSsConfirmOpen(false);
            ssFormRef.current?.requestSubmit();
          }}
          summary={buildSweatspotMayorSummary({
            form: ssFormRef.current,
            ssLines,
            grandTotal,
            ssAbono,
            ssEstadoPago,
            ssIsRecompra,
            ssNoLogo,
            ssPaymentProofFile,
            ssCobroLogo,
            ssCostoLogo,
          })}
        />
      </CardContent>
    </Card>
  );
}

/* ---- Generic form (retail / al por menor) ---- */

const MAGICAL_TIPOS = ["Frío", "Térmico"] as const;

interface RetailProductLine {
  id: string;
  selectedRef: string;
  tipo: string;
  cantidad: string;
  retailPrice: string;
  colorProducto: string;
  isGift: boolean;
}

function createEmptyRetailLine(isGift = false): RetailProductLine {
  return {
    id: crypto.randomUUID(),
    selectedRef: "",
    tipo: "",
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
  const draftKey = `ventas:generic:${brand}:${saleType}`;
  const [paymentMethod, setPaymentMethod] = usePersistedState<"contra_entrega" | "pagado">(`${draftKey}:paymentMethod`, "contra_entrega");
  const [paymentChannel, setPaymentChannel] = usePersistedState<string>(`${draftKey}:paymentChannel`, "");
  const [genericPaymentDate, setGenericPaymentDate] = usePersistedState<string>(`${draftKey}:paymentDate`, new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingCost, setShippingCost] = usePersistedState<string>(`${draftKey}:shippingCost`, "");
  const [genericPaymentProofFile, setGenericPaymentProofFile] = useState<File | null>(null);
  const { stockItems } = useInventory();
  const genericFormRef = useRef<HTMLFormElement>(null);
  const [genericConfirmOpen, setGenericConfirmOpen] = useState(false);

  // Multi-product lines
  const [productLines, setProductLines] = usePersistedState<RetailProductLine[]>(`${draftKey}:productLines`, [createEmptyRetailLine()]);

  // Controlled fields for SmartPaste
  const [nombre, setNombre] = usePersistedState<string>(`${draftKey}:nombre`, "");
  const [telefono, setTelefono] = usePersistedState<string>(`${draftKey}:telefono`, "");
  const [cedula, setCedula] = usePersistedState<string>(`${draftKey}:cedula`, "");
  const [email, setEmail] = usePersistedState<string>(`${draftKey}:email`, "");
  const [ciudad, setCiudad] = usePersistedState<string>(`${draftKey}:ciudad`, "");
  const [departamento, setDepartamento] = usePersistedState<string>(`${draftKey}:departamento`, "");
  const [direccion, setDireccion] = usePersistedState<string>(`${draftKey}:direccion`, "");
  const [notas, setNotas] = usePersistedState<string>(`${draftKey}:notas`, "");

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

  // Magical: referencias unificadas (sin sufijo de tipo) + tipos disponibles por referencia
  const magicalRefTypes = useMemo(() => {
    if (brand !== "magical") return {} as Record<string, string[]>;
    const map: Record<string, Set<string>> = {};
    stockItems
      .filter((s) => s.brand === "magical" && s.category === "producto_terminado")
      .forEach((s) => {
        const base = s.name.replace(/\s*\((fr[ií]o|t[eé]rmico)\)\s*$/i, "").trim();
        if (!map[base]) map[base] = new Set<string>();
        const inferred = s.product_type || (/fr[ií]o/i.test(s.name) ? "Frío" : /t[eé]rmico/i.test(s.name) ? "Térmico" : "");
        if (inferred) map[base].add(inferred.trim());
      });
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v].sort()]));
  }, [stockItems, brand]);

  const magicalBaseRefs = useMemo(() => Object.keys(magicalRefTypes).sort(), [magicalRefTypes]);

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
    const submissionId = crypto.randomUUID();

    // Validate all lines have product selected
    for (const line of productLines) {
      if (!line.selectedRef) {
        toast.error("Producto requerido", { description: "Seleccione un producto en todas las líneas." });
        setIsSubmitting(false);
        return;
      }
      if (brand === "magical" && !line.tipo) {
        toast.error("Tipo requerido", { description: "Seleccione Frío o Térmico en todas las líneas." });
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
      const paymentProofFile = genericPaymentProofFile;
      if (paymentProofFile && paymentProofFile.size > 0) {
        const ext = paymentProofFile.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, paymentProofFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
          paymentProofUrl = urlData.publicUrl;
        } else {
          console.error("[Ventas retail] Error subiendo soporte de pago:", uploadError);
          toast.error("No se pudo subir el soporte de pago", {
            description: uploadError.message + ". El pedido no fue creado. Intente de nuevo.",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Process each product line as a separate order
      for (const line of productLines) {
        const referencia = brand === "magical" && line.tipo
          ? `${line.selectedRef} (${line.tipo})`
          : line.selectedRef;
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
          // Crear solicitud a inventarios (no descontar directamente)
          await supabase.from("inventory_requests" as any).insert({
            requester_id: user?.id || "",
            requester_name: user?.email || "Asesor",
            requester_area: "asesor_comercial",
            brand: dbBrand,
            category: "producto_terminado",
            stock_item_id: matchedItem.id,
            item_name: matchedItem.name,
            quantity,
            reason: `Pedido al detal de ${displayName}`,
          } as any);
          toast.info("Solicitud enviada a inventarios", {
            description: `Inventarios revisará la entrega de ${quantity} uds de "${referencia}".`,
          });
        } else {
          toast.warning("Sin registro de inventario", { description: `"${referencia}" no encontrado en inventario.` });
        }

        if (brand === "magical") {
          const gelResult = useInventoryStore.getState().discountGelForMagical(referencia, quantity);
          toast.info("Consumo de gel", { description: gelResult.message });
        }

        // Build observations for this line
        const lineObs = [
          paymentChannel ? `Medio de pago: ${paymentChannel}` : "",
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
            submission_id: submissionId,
            total_amount: totalAmount,
            abono: line.isGift || paymentMethod === "pagado" || paymentProofUrl ? totalAmount : 0,
            advisor_id: user?.id || "",
            advisor_name: user?.email || "Asesor",
            production_status: "listo",
            payment_method: line.isGift ? "obsequio" : (paymentProofUrl ? "pagado" : paymentMethod),
            payment_proof_url: paymentProofUrl,
            payment_complete: line.isGift || paymentMethod === "pagado" || !!paymentProofUrl,
            observations: lineObs || null,
            shipping_cost: line.isGift ? 0 : shippingAmount,
            silicone_color: brand === "sweatspot" && line.colorProducto ? line.colorProducto : null,
            payment_date: genericPaymentDate || new Date().toISOString().slice(0, 10),
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
      // Clear draft on success
      [
        "paymentMethod","shippingCost","productLines","nombre","telefono","cedula","email","ciudad","departamento","direccion","notas",
      ].forEach((k) => { try { localStorage.removeItem(`${draftKey}:${k}`); } catch {/* ignore */} });
      setProductLines([createEmptyRetailLine()]);
      setNombre(""); setTelefono(""); setCedula(""); setEmail(""); setCiudad(""); setDepartamento(""); setDireccion(""); setNotas("");
      setShippingCost(""); setPaymentMethod("contra_entrega"); setGenericPaymentProofFile(null);
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
        <form ref={genericFormRef} onSubmit={handleSubmit} className="space-y-5">
          <SmartPasteField brand={brand} onDataParsed={handleSmartPaste} />

           <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Datos del cliente</legend>
            <div className="grid gap-4 sm:grid-cols-2">
               <ClientNameAutocomplete
                 label="Nombre completo"
                 name="nombre"
                 required
                 value={nombre}
                 onValueChange={setNombre}
                 onSelect={(c) => {
                   if (c.telefono) setTelefono(c.telefono);
                   if (c.nit) setCedula(c.nit);
                   if (c.email) setEmail(c.email);
                   if (c.ciudad) setCiudad(c.ciudad);
                   if (c.direccion) setDireccion(c.direccion);
                 }}
               />
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
                <div className={`grid gap-3 ${brand === "magical" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                  <div className="space-y-1.5">
                    <Label>Referencia / Producto</Label>
                    <Select
                      value={line.selectedRef || undefined}
                      onValueChange={(v) => {
                        updateProductLine(line.id, { selectedRef: v });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {(brand === "magical" ? magicalBaseRefs : finishedRefs).map((ref) => (
                          <SelectItem key={ref} value={ref}>{ref}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {brand === "magical" && (
                    <div className="space-y-1.5">
                      <Label>Tipo</Label>
                      <Select
                        value={line.tipo || undefined}
                        onValueChange={(v) => updateProductLine(line.id, { tipo: v })}
                        disabled={!line.selectedRef}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={line.selectedRef ? "Frío / Térmico" : "Seleccione referencia"} />
                        </SelectTrigger>
                        <SelectContent>
                          {MAGICAL_TIPOS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Cantidad</Label>
                    <Input type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} min="1" required value={line.cantidad} onChange={(e) => updateProductLine(line.id, { cantidad: e.target.value })} />
                  </div>
                </div>
                {!line.isGift && (
                  <div className="space-y-1.5">
                    <Label>Precio de venta</Label>
                    <Input type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} required value={line.retailPrice} onChange={(e) => updateProductLine(line.id, { retailPrice: e.target.value })} />
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
                <Input id="shipping_cost" name="shipping_cost" type="number" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} placeholder="0" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
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

            </fieldset>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground mb-2">Medio de pago</legend>
            <Select value={paymentChannel} onValueChange={setPaymentChannel}>
              <SelectTrigger><SelectValue placeholder="Selecciona medio de pago" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nequi">Nequi</SelectItem>
                <SelectItem value="bancolombia">Bancolombia</SelectItem>
                <SelectItem value="davivienda">Davivienda</SelectItem>
                <SelectItem value="link_pago">Link de pago</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="generic_paymentDate">Fecha del pago</Label>
              <Input id="generic_paymentDate" type="date" value={genericPaymentDate} onChange={(e) => setGenericPaymentDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Si el pago fue hoy déjala como está; si fue otro día selecciónala.</p>
            </div>
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="generic_paymentProof">Soporte de pago (opcional)</Label>
              <Input
                id="generic_paymentProof"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setGenericPaymentProofFile(e.target.files?.[0] || null)}
                className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary"
              />
              {genericPaymentProofFile && (
                <p className="text-xs text-muted-foreground">Adjunto: {genericPaymentProofFile.name}</p>
              )}
              <p className="text-xs text-muted-foreground">Adjunte el comprobante para revisión en contabilidad.</p>
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas adicionales</Label>
            <Textarea
              id="notas"
              name="notas"
              rows={4}
              placeholder="Observaciones del pedido..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full min-h-[120px] resize-y"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (!genericFormRef.current) return;
                if (!genericFormRef.current.reportValidity()) return;
                setGenericConfirmOpen(true);
              }}
            >
              {isSubmitting ? "Creando..." : "Revisar pedido"}
            </Button>
            <Button type="button" variant="outline" onClick={onReset}>Cancelar</Button>
          </div>
        </form>
        <OrderConfirmationDialog
          open={genericConfirmOpen}
          onOpenChange={(o) => { if (!isSubmitting) setGenericConfirmOpen(o); }}
          isSubmitting={isSubmitting}
          onConfirm={() => {
            setGenericConfirmOpen(false);
            genericFormRef.current?.requestSubmit();
          }}
          summary={buildGenericRetailSummary({
            brandLabel,
            isMayor,
            cliente: { nombre, telefono, cedula, email, ciudad, departamento, direccion },
            productLines,
            grandTotal,
            shippingCost,
            paymentMethod,
            notas,
            brand,
          })}
        />
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

function FileField({
  label,
  name,
  value,
  onChange,
  accept,
  disabled,
}: {
  label: string;
  name: string;
  value?: File | null;
  onChange?: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <Input
          id={name}
          name={name}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.files?.[0] || null)}
          className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary"
        />
        {value && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
            ✓ {value.name}
          </p>
        )}
      </div>
    </div>
  );
}

export default Ventas;
