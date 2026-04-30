import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  useUpsertBudget,
  type BudgetLine,
} from "@/hooks/useMonthlyBudget";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  existingLines: BudgetLine[];
  existingNotes: string | null;
}

export function DefineBudgetDialog({
  open,
  onOpenChange,
  year,
  month,
  existingLines,
  existingNotes,
}: Props) {
  const upsert = useUpsertBudget();
  const [income, setIncome] = useState<Record<string, string>>({});
  const [expense, setExpense] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      const inc: Record<string, string> = {};
      const exp: Record<string, string> = {};
      INCOME_CATEGORIES.forEach((c) => {
        const l = existingLines.find((l) => l.kind === "ingreso" && l.category === c);
        inc[c] = l ? String(l.projected_amount) : "";
      });
      EXPENSE_CATEGORIES.forEach((c) => {
        const l = existingLines.find((l) => l.kind === "egreso" && l.category === c);
        exp[c] = l ? String(l.projected_amount) : "";
      });
      setIncome(inc);
      setExpense(exp);
      setNotes(existingNotes || "");
    }
  }, [open, existingLines, existingNotes]);

  const handleSave = () => {
    const lines = [
      ...INCOME_CATEGORIES.map((c) => ({
        kind: "ingreso" as const,
        category: c,
        projected_amount: parseFloat(income[c]) || 0,
      })),
      ...EXPENSE_CATEGORIES.map((c) => ({
        kind: "egreso" as const,
        category: c,
        projected_amount: parseFloat(expense[c]) || 0,
      })),
    ];
    upsert.mutate(
      { year, month, lines, notes: notes.trim() || null },
      {
        onSuccess: () => {
          toast.success("Presupuesto guardado");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error("Error: " + e.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Definir presupuesto del mes</DialogTitle>
          <DialogDescription>
            Ingresa los montos proyectados para cada categoría.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Ingresos proyectados</h3>
            {INCOME_CATEGORIES.map((c) => (
              <div key={c} className="grid grid-cols-3 gap-2 items-center">
                <Label className="col-span-2 text-sm">{c}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={income[c] ?? ""}
                  onChange={(e) => setIncome({ ...income, [c]: e.target.value })}
                />
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Egresos proyectados</h3>
            {EXPENSE_CATEGORIES.map((c) => (
              <div key={c} className="grid grid-cols-3 gap-2 items-center">
                <Label className="col-span-2 text-sm">{c}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={expense[c] ?? ""}
                  onChange={(e) => setExpense({ ...expense, [c]: e.target.value })}
                />
              </div>
            ))}
          </section>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Comentarios sobre el presupuesto del mes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}