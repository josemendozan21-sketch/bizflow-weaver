import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RollTipo } from "@/hooks/useRollCuts";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: { tipo: RollTipo; medida_cm: number; cortado_por: string; pesos: number[] }) => Promise<void> | void;
}

export function CreateRollCutDialog({ open, onClose, onSubmit }: Props) {
  const [tipo, setTipo] = useState<RollTipo>("calor");
  const [medida, setMedida] = useState("20");
  const [cantidad, setCantidad] = useState("1");
  const [operario, setOperario] = useState("");
  const [pesos, setPesos] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTipo("calor"); setMedida("20"); setCantidad("1"); setOperario(""); setPesos([""]);
    }
  }, [open]);

  useEffect(() => {
    const n = Math.max(1, Math.min(50, Number(cantidad) || 1));
    setPesos((prev) => {
      const arr = [...prev];
      while (arr.length < n) arr.push("");
      return arr.slice(0, n);
    });
  }, [cantidad]);

  const medidaNum = Number(medida);
  const valid =
    operario.trim() &&
    medidaNum >= 5 && medidaNum <= 150 &&
    pesos.length >= 1 &&
    pesos.every((p) => Number(p) > 0);

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onSubmit({
        tipo,
        medida_cm: medidaNum,
        cortado_por: operario.trim(),
        pesos: pesos.map((p) => Number(p)),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cortar rollo</DialogTitle>
          <DialogDescription>Registra los rollos pequeños generados a partir del rollo grande (150 cm).</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as RollTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="calor">Térmico</SelectItem>
                  <SelectItem value="frio">Frío</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Medida (cm) *</Label>
              <Input type="number" min={5} max={150} value={medida} onChange={(e) => setMedida(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Operario que cortó *</Label>
            <Input value={operario} onChange={(e) => setOperario(e.target.value)} placeholder="Ej: Juan Pérez" />
          </div>

          <div className="space-y-1">
            <Label>Cantidad de rollos pequeños *</Label>
            <Input type="number" min={1} max={50} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </div>

          <div className="space-y-2 border-t pt-2">
            <Label>Peso inicial de cada rollo (g) *</Label>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {pesos.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">Rollo {i + 1}</span>
                  <Input
                    type="number"
                    min={1}
                    placeholder="gramos"
                    value={p}
                    onChange={(e) => {
                      const arr = [...pesos];
                      arr[i] = e.target.value;
                      setPesos(arr);
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">El código se genera automáticamente: RC/RF + medida + ddmm.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? "Guardando..." : `Registrar ${pesos.length} rollo(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}