import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Zap, Flame, Upload } from "lucide-react";

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

      {/* Step 1: Brand */}
      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <BrandCard
            icon={<Zap className="h-8 w-8" />}
            name="Sweatspot"
            onClick={() => handleBrandSelect("sweatspot")}
          />
          <BrandCard
            icon={<Flame className="h-8 w-8" />}
            name="Magical Warmers"
            onClick={() => handleBrandSelect("magical")}
          />
        </div>
      )}

      {/* Step 2: Sale Type */}
      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <SaleTypeCard
            title="Al por mayor"
            description="Pedidos en volumen con abono inicial"
            onClick={() => handleSaleTypeSelect("mayor")}
          />
          <SaleTypeCard
            title="Al por menor"
            description="Venta unitaria al consumidor final"
            onClick={() => handleSaleTypeSelect("menor")}
          />
        </div>
      )}

      {/* Step 3: Form */}
      {step === 3 && brand && saleType && (
        <OrderForm brand={brand} saleType={saleType} onReset={handleReset} />
      )}
    </div>
  );
};

/* ---- Sub-components ---- */

function StepIndicator({ n, current, label }: { n: number; current: number; label: string }) {
  const active = current >= n;
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {n}
      </span>
      <span className={active ? "text-foreground font-medium" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function BrandCard({ icon, name, onClick }: { icon: React.ReactNode; name: string; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center gap-3 p-8">
        <div className="text-primary">{icon}</div>
        <span className="text-lg font-semibold text-foreground">{name}</span>
      </CardContent>
    </Card>
  );
}

function SaleTypeCard({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
        <span className="text-lg font-semibold text-foreground">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </CardContent>
    </Card>
  );
}

/* ---- Order Form ---- */

function OrderForm({ brand, saleType, onReset }: { brand: Brand; saleType: SaleType; onReset: () => void }) {
  const brandLabel = brand === "sweatspot" ? "Sweatspot" : "Magical Warmers";
  const isMayor = saleType === "mayor";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: save order
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">
          Nuevo pedido — {brandLabel}
        </CardTitle>
        <CardDescription>
          {isMayor ? "Venta al por mayor" : "Venta al por menor"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Client info */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Datos del cliente</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre completo" name="nombre" required />
              <Field label="Teléfono" name="telefono" type="tel" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ciudad" name="ciudad" required />
              <Field label="Departamento" name="departamento" required />
            </div>
            <Field label="Dirección de envío" name="direccion" required />
          </fieldset>

          {/* Product info */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Detalles del producto</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Referencia / Producto" name="referencia" required />
              <Field label="Cantidad" name="cantidad" type="number" required />
            </div>

            {isMayor && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Color de gel" name="colorGel" required />
                  <Field label="Color de tinta" name="colorTinta" required />
                </div>
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="escarcha" className="accent-primary h-4 w-4" />
                <Label htmlFor="escarcha">Escarcha</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="dobleMarcacion" className="accent-primary h-4 w-4" />
                <Label htmlFor="dobleMarcacion">Doble marcación</Label>
              </div>
            </div>
          </fieldset>

          {/* Pricing */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-2">Valores</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Precio de venta total" name="precioTotal" type="number" required />
              {isMayor && (
                <Field label="Abono inicial (50%)" name="abono" type="number" />
              )}
            </div>
          </fieldset>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas adicionales</Label>
            <Textarea id="notas" placeholder="Observaciones del pedido..." />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Crear pedido</Button>
            <Button type="button" variant="outline" onClick={onReset}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}

export default Ventas;
