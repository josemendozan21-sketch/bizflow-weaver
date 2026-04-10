import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, ArrowLeft, CheckCircle2, Zap, Info } from "lucide-react";
import magicalLogo from "@/assets/magical-warmers-logo.png";
import { StampingTaskCard } from "./StampingTaskCard";
import { useProductionStore } from "@/stores/productionStore";
import type { Brand } from "@/types/production";
import { toast } from "sonner";

export function StampingSection() {
  const { stampingTasks, addStampingTask } = useProductionStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [brand, setBrand] = useState<Brand | null>(null);

  // Common fields
  const [clientName, setClientName] = useState("");
  const [referencia, setReferencia] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [inkColor, setInkColor] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Magical fields
  const [gelColor, setGelColor] = useState("");
  const [glitter, setGlitter] = useState(false);
  const [doubleInk, setDoubleInk] = useState(false);

  // Sweatspot fields
  const [thermoSize, setThermoSize] = useState<"150 ml" | "250 ml" | "250 ml juguetón" | "500 ml">("500 ml");
  const [siliconeColor, setSiliconeColor] = useState("");

  const handleSelectBrand = (b: Brand) => {
    setBrand(b);
    setStep(2);
  };

  const resetForm = () => {
    setStep(1);
    setBrand(null);
    setClientName("");
    setReferencia("");
    setCantidad("");
    setInkColor("");
    setObservaciones("");
    setGelColor("");
    setGlitter(false);
    setDoubleInk(false);
    setThermoSize("500 ml");
    setSiliconeColor("");
  };

  const canProceed = () => {
    if (!clientName.trim() || !cantidad || !inkColor.trim()) return false;
    if (brand === "magical" && !gelColor.trim()) return false;
    if (brand === "sweatspot" && !siliconeColor.trim()) return false;
    return true;
  };

  const handleSubmit = () => {
    if (!brand) return;
    if (brand === "magical") {
      addStampingTask({
        brand: "magical",
        clientName: clientName.trim(),
        quantity: parseInt(cantidad),
        inkColor: inkColor.trim(),
        gelColor: gelColor.trim(),
        glitter,
        doubleInk,
        logoFile: referencia.trim() || undefined,
        observations: observaciones.trim() || undefined,
      });
    } else {
      addStampingTask({
        brand: "sweatspot",
        clientName: clientName.trim(),
        quantity: parseInt(cantidad),
        inkColor: inkColor.trim(),
        thermoSize,
        siliconeColor: siliconeColor.trim(),
        logoFile: referencia.trim() || undefined,
        observations: observaciones.trim() || undefined,
      });
    }
    toast.success("Tarea de estampación creada exitosamente.");
    resetForm();
  };

  const stepLabels = ["Seleccionar marca", "Completar datos", "Confirmar"];

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-foreground">¿Qué hacer aquí?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Registra tareas de estampación o serigrafía. Selecciona la marca, completa los datos técnicos y avanza el estado de cada tarea.
            </p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${step > i + 1 ? "bg-primary/10 text-primary" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              <span>{i + 1}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < stepLabels.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {step === 1 && "Paso 1: Selecciona la marca"}
            {step === 2 && `Paso 2: Datos de estampación — ${brand === "magical" ? "Magical Warmers" : "Sweatspot"}`}
            {step === 3 && "Paso 3: Confirma la tarea"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <BrandButton icon={<Zap className="h-8 w-8" />} label="Sweatspot" onClick={() => handleSelectBrand("sweatspot")} />
              <BrandButton icon={<img src={magicalLogo} alt="Magical Warmers" className="h-14 w-auto object-contain" />} onClick={() => handleSelectBrand("magical")} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 max-w-md">
              <Field label="Cliente *" id="client">
                <Input id="client" placeholder="Nombre del cliente" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </Field>
              <Field label="Referencia / Logo" id="ref">
                <Input id="ref" placeholder="Nombre del archivo de logo (opcional)" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              </Field>
              <Field label="Cantidad *" id="qty">
                <Input id="qty" type="number" min="1" placeholder="Ej: 200" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
              </Field>
              <Field label="Color de tinta *" id="ink">
                <Input id="ink" placeholder="Ej: Dorado, Negro" value={inkColor} onChange={(e) => setInkColor(e.target.value)} />
              </Field>

              {brand === "magical" && (
                <>
                  <Separator />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campos Magical Warmers</p>
                  <Field label="Color de gel *" id="gel">
                    <Input id="gel" placeholder="Ej: Azul, Rosa" value={gelColor} onChange={(e) => setGelColor(e.target.value)} />
                  </Field>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox id="glitter" checked={glitter} onCheckedChange={(v) => setGlitter(!!v)} />
                      <Label htmlFor="glitter" className="text-sm">Escarcha</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="double" checked={doubleInk} onCheckedChange={(v) => setDoubleInk(!!v)} />
                      <Label htmlFor="double" className="text-sm">Doble tinta</Label>
                    </div>
                  </div>
                </>
              )}

              {brand === "sweatspot" && (
                <>
                  <Separator />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campos Sweatspot</p>
                  <Field label="Tamaño del termo *" id="size">
                    <Select value={thermoSize} onValueChange={(v) => setThermoSize(v as typeof thermoSize)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="150 ml">150 ml</SelectItem>
                        <SelectItem value="250 ml">250 ml</SelectItem>
                        <SelectItem value="250 ml juguetón">250 ml juguetón</SelectItem>
                        <SelectItem value="500 ml">500 ml</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Color de silicona *" id="silicone">
                    <Input id="silicone" placeholder="Ej: Negro, Rojo" value={siliconeColor} onChange={(e) => setSiliconeColor(e.target.value)} />
                  </Field>
                </>
              )}

              <Field label="Observaciones" id="obs">
                <Textarea id="obs" placeholder="Notas opcionales..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} />
              </Field>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
                </Button>
                <Button onClick={() => { if (canProceed()) setStep(3); else toast.error("Completa los campos obligatorios."); }}>
                  Siguiente <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 max-w-md">
              <div className="rounded-md border p-4 space-y-2 text-sm">
                <Row label="Marca" value={brand === "magical" ? "Magical Warmers" : "Sweatspot"} />
                <Row label="Cliente" value={clientName} />
                {referencia && <Row label="Referencia" value={referencia} />}
                <Row label="Cantidad" value={`${cantidad} unidades`} />
                <Row label="Color de tinta" value={inkColor} />
                {brand === "magical" && (
                  <>
                    <Row label="Color de gel" value={gelColor} />
                    <Row label="Escarcha" value={glitter ? "Sí" : "No"} />
                    <Row label="Doble tinta" value={doubleInk ? "Sí" : "No"} />
                  </>
                )}
                {brand === "sweatspot" && (
                  <>
                    <Row label="Tamaño" value={thermoSize} />
                    <Row label="Color silicona" value={siliconeColor} />
                  </>
                )}
                {observaciones && <Row label="Observaciones" value={observaciones} />}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button onClick={handleSubmit}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar tarea
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing tasks */}
      {stampingTasks.length > 0 && (
        <>
          <Separator />
          <h3 className="text-sm font-semibold text-foreground">Tareas de estampación ({stampingTasks.length})</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {stampingTasks.map((task) => (
              <StampingTaskCard key={task.id} task={task} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BrandButton({ icon, label, onClick }: { icon: React.ReactNode; label?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-3 rounded-lg border-2 border-border p-6 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
      <span className="text-primary">{icon}</span>
      {label && <span className="font-semibold text-foreground">{label}</span>}
    </button>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
