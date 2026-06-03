import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RollCut } from "@/hooks/useRollCuts";

interface Props {
  roll: RollCut | null;
  onClose: () => void;
  onSubmit: (operario: string, notas?: string) => Promise<void> | void;
}

export function StartRollUsageDialog({ roll, onClose, onSubmit }: Props) {
  const [operario, setOperario] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (roll) { setOperario(""); setNotas(""); }
  }, [roll]);

  if (!roll) return null;

  return (
    <Dialog open={!!roll} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Iniciar uso — {roll.code}</DialogTitle>
          <DialogDescription>
            {roll.tipo === "calor" ? "Calor" : "Frío"} · {roll.medida_cm} cm · peso inicial {roll.peso_inicial_g} g
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Operario *</Label>
            <Input autoFocus value={operario} onChange={(e) => setOperario(e.target.value)} placeholder="Quien monta el rollo" />
          </div>
          <div className="space-y-1">
            <Label>Notas (qué se va a hacer)</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: Cuerpos magical 250ml..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!operario.trim()} onClick={() => onSubmit(operario.trim(), notas.trim() || undefined)}>
            Iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}