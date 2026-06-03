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
  onSubmit: (operario: string, peso_final_g: number, notas?: string) => Promise<void> | void;
}

export function FinishRollUsageDialog({ roll, onClose, onSubmit }: Props) {
  const [operario, setOperario] = useState("");
  const [pesoFinal, setPesoFinal] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (roll) {
      setOperario(roll.montado_por || "");
      setPesoFinal("");
      setNotas("");
    }
  }, [roll]);

  if (!roll) return null;

  const pesoNum = Number(pesoFinal);
  const valid = !!operario.trim() && pesoFinal !== "" && pesoNum >= 0 && pesoNum <= roll.peso_inicial_g;
  const consumido = pesoFinal !== "" ? roll.peso_inicial_g - pesoNum : null;

  return (
    <Dialog open={!!roll} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Finalizar — {roll.code}</DialogTitle>
          <DialogDescription>Peso inicial: {roll.peso_inicial_g} g</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Operario *</Label>
            <Input value={operario} onChange={(e) => setOperario(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Peso final (g) *</Label>
            <Input
              autoFocus
              type="number"
              min={0}
              max={roll.peso_inicial_g}
              value={pesoFinal}
              onChange={(e) => setPesoFinal(e.target.value)}
              placeholder="gramos restantes"
            />
            {consumido != null && consumido >= 0 && (
              <p className="text-xs text-muted-foreground">Consumido: <strong>{consumido} g</strong></p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Notas (qué se hizo con el rollo)</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!valid} onClick={() => onSubmit(operario.trim(), pesoNum, notas.trim() || undefined)}>
            Finalizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}