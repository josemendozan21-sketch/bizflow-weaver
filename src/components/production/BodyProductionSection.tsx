import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Package, ArrowRight, ArrowLeft, Zap, Info } from "lucide-react";
import magicalLogo from "@/assets/magical-warmers-logo.png";
import { toast } from "sonner";

type Brand = "sweatspot" | "magical";

interface BodyEntry {
  id: string;
  brand: Brand;
  referencia: string;
  cantidad: number;
  observaciones: string;
  status: "pendiente" | "en_proceso" | "completado";
  createdAt: string;
}

export const BodyProductionSection = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [referencia, setReferencia] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [entries, setEntries] = useState<BodyEntry[]>([]);

  const handleSelectBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setStep(2);
  };

  const handleSubmit = () => {
    if (!selectedBrand || !referencia.trim() || !cantidad) return;
    const entry: BodyEntry = {
      id: `body-${Date.now()}`,
      brand: selectedBrand,
      referencia: referencia.trim(),
      cantidad: parseInt(cantidad),
      observaciones: observaciones.trim(),
      status: "pendiente",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setEntries([entry, ...entries]);
    toast.success("Registro de producción creado exitosamente.");
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedBrand(null);
    setReferencia("");
    setCantidad("");
    setObservaciones("");
  };

  const updateStatus = (id: string, status: BodyEntry["status"]) => {
    setEntries(entries.map((e) => (e.id === id ? { ...e, status } : e)));
    const labels = { en_proceso: "en proceso", completado: "completado" };
    toast.info(`Registro marcado como ${labels[status]}.`);
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
              Registra la producción de cuerpos o referencias. Selecciona la marca, ingresa la referencia y cantidad producida.
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

      {/* Form card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {step === 1 && "Paso 1: Selecciona la marca"}
            {step === 2 && `Paso 2: Datos de producción — ${selectedBrand === "magical" ? "Magical Warmers" : "Sweatspot"}`}
            {step === 3 && "Paso 3: Confirma el registro"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <BrandButton brand="sweatspot" icon={<Zap className="h-8 w-8" />} label="Sweatspot" onClick={() => handleSelectBrand("sweatspot")} />
              <BrandButton brand="magical" icon={<img src={magicalLogo} alt="Magical Warmers" className="h-8 w-auto object-contain" />} label="Magical Warmers" onClick={() => handleSelectBrand("magical")} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="referencia">Referencia *</Label>
                <Input id="referencia" placeholder={selectedBrand === "magical" ? "Ej: MW-Frío-001" : "Ej: SS-Termo-500ml"} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad producida *</Label>
                <Input id="cantidad" type="number" min="1" placeholder="Ej: 200" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea id="observaciones" placeholder="Notas opcionales sobre esta producción..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
                </Button>
                <Button onClick={() => { if (referencia.trim() && cantidad) setStep(3); else toast.error("Completa los campos obligatorios."); }}>
                  Siguiente <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 max-w-md">
              <div className="rounded-md border p-4 space-y-2 text-sm">
                <Row label="Marca" value={selectedBrand === "magical" ? "Magical Warmers" : "Sweatspot"} />
                <Row label="Referencia" value={referencia} />
                <Row label="Cantidad" value={`${cantidad} unidades`} />
                {observaciones && <Row label="Observaciones" value={observaciones} />}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button onClick={handleSubmit}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar registro
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing entries */}
      {entries.length > 0 && (
        <>
          <Separator />
          <h3 className="text-sm font-semibold text-foreground">Registros recientes</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {entries.map((entry) => (
              <Card key={entry.id} className="border">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {entry.brand === "magical" ? <Flame className="h-4 w-4 text-primary" /> : <Zap className="h-4 w-4 text-primary" />}
                      <span className="font-medium text-sm">{entry.brand === "magical" ? "Magical Warmers" : "Sweatspot"}</span>
                    </div>
                    <StatusBadge status={entry.status} />
                  </div>
                  <div className="text-sm space-y-1">
                    <Row label="Referencia" value={entry.referencia} />
                    <Row label="Cantidad" value={`${entry.cantidad} uds`} />
                    {entry.observaciones && <Row label="Obs." value={entry.observaciones} />}
                    <Row label="Fecha" value={entry.createdAt} />
                  </div>
                  {entry.status !== "completado" && (
                    <div className="flex gap-2 pt-1">
                      {entry.status === "pendiente" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(entry.id, "en_proceso")}>Iniciar</Button>
                      )}
                      {entry.status === "en_proceso" && (
                        <Button size="sm" onClick={() => updateStatus(entry.id, "completado")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Completar
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

function BrandButton({ icon, label, onClick }: { brand: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-3 rounded-lg border-2 border-border p-6 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
      <span className="text-primary">{icon}</span>
      <span className="font-semibold text-foreground">{label}</span>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pendiente": return <Badge variant="secondary">Pendiente</Badge>;
    case "en_proceso": return <Badge variant="default">En proceso</Badge>;
    case "completado": return <Badge variant="outline">Completado</Badge>;
    default: return <Badge>{status}</Badge>;
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
