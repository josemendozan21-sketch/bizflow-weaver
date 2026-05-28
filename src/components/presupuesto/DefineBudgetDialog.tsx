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
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  INCOME_CATEGORIES,
  COST_CATEGORIES,
  EXPENSE_CATEGORIES,
  LIABILITY_CATEGORIES,
  KIND_LABELS,
  useUpsertBudget,
  type BudgetLine,
  type BudgetKind,
} from "@/hooks/useMonthlyBudget";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  existingLines: BudgetLine[];
  existingNotes: string | null;
}

const MULTI_CATEGORIES: Record<string, BudgetKind> = {
  Ferias: "ingreso",
  "Otros ingresos": "ingreso",
  "Otros gastos": "gasto",
};

export function DefineBudgetDialog({
  open,
  onOpenChange,
  year,
  month,
  existingLines,
  existingNotes,
}: Props) {
  const upsert = useUpsertBudget();
  // Single-row amounts per (kind|category)
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  // Single-row optional expected date per (kind|category)
  const [dates, setDates] = useState<Record<string, string>>({});
  // Multi-row groups: key = `${kind}|${category}`
  const [multi, setMulti] = useState<Record<string, { name: string; amount: string; date: string }[]>>({});
  const [notes, setNotes] = useState("");

  const groups: { kind: BudgetKind; cats: string[] }[] = [
    { kind: "ingreso", cats: INCOME_CATEGORIES },
    { kind: "costo", cats: COST_CATEGORIES },
    { kind: "gasto", cats: EXPENSE_CATEGORIES },
    { kind: "pasivo", cats: LIABILITY_CATEGORIES },
  ];

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    const nextDates: Record<string, string> = {};
    const nextMulti: Record<string, { name: string; amount: string; date: string }[]> = {};
    for (const g of groups) {
      for (const c of g.cats) {
        const key = `${g.kind}|${c}`;
        if (MULTI_CATEGORIES[c]) {
          const rows = existingLines.filter((l) => l.kind === g.kind && l.category === c);
          nextMulti[key] = rows.length > 0
            ? rows.map((l) => ({ name: l.description || "", amount: String(l.projected_amount), date: l.expected_date || "" }))
            : [{ name: "", amount: "", date: "" }];
        } else {
          const l = existingLines.find((l) => l.kind === g.kind && l.category === c);
          next[key] = l ? String(l.projected_amount) : "";
          nextDates[key] = l?.expected_date || "";
        }
      }
    }
    setAmounts(next);
    setDates(nextDates);
    setMulti(nextMulti);
    setNotes(existingNotes || "");
  }, [open, existingLines, existingNotes]);

  const handleSave = () => {
    const lines: { kind: BudgetKind; category: string; projected_amount: number; description?: string | null; expected_date?: string | null }[] = [];
    for (const g of groups) {
      for (const c of g.cats) {
        const key = `${g.kind}|${c}`;
        if (MULTI_CATEGORIES[c]) {
          const rows = multi[key] || [];
          rows
            .filter((r) => r.name.trim() || parseFloat(r.amount) > 0)
            .forEach((r) => {
              lines.push({
                kind: g.kind,
                category: c,
                description: r.name.trim() || "Sin nombre",
                projected_amount: parseFloat(r.amount) || 0,
                expected_date: r.date || null,
              });
            });
        } else {
          lines.push({
            kind: g.kind,
            category: c,
            projected_amount: parseFloat(amounts[key]) || 0,
            expected_date: dates[key] || null,
          });
        }
      }
    }
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
          {groups.map((g) => (
            <section key={g.kind} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{KIND_LABELS[g.kind]}s proyectados</h3>
              {g.cats.map((c) => {
                const key = `${g.kind}|${c}`;
                if (MULTI_CATEGORIES[c]) {
                  const rows = multi[key] || [{ name: "", amount: "", date: "" }];
                  const showDate = c === "Ferias";
                  return (
                    <div key={key} className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{c}</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setMulti({ ...multi, [key]: [...rows, { name: "", amount: "", date: "" }] })}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Agregar
                        </Button>
                      </div>
                      {rows.map((r, idx) => (
                        <div key={idx} className={`grid ${showDate ? "grid-cols-[1fr_120px_140px_auto]" : "grid-cols-[1fr_140px_auto]"} gap-2 items-center`}>
                          <Input
                            placeholder="Concepto"
                            value={r.name}
                            onChange={(e) => {
                              const next = [...rows];
                              next[idx] = { ...next[idx], name: e.target.value };
                              setMulti({ ...multi, [key]: next });
                            }}
                          />
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={r.amount}
                            onChange={(e) => {
                              const next = [...rows];
                              next[idx] = { ...next[idx], amount: e.target.value };
                              setMulti({ ...multi, [key]: next });
                            }}
                          />
                          {showDate && (
                            <Input
                              type="date"
                              value={r.date}
                              onChange={(e) => {
                                const next = [...rows];
                                next[idx] = { ...next[idx], date: e.target.value };
                                setMulti({ ...multi, [key]: next });
                              }}
                            />
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setMulti({ ...multi, [key]: rows.filter((_, i) => i !== idx) })}
                            disabled={rows.length === 1}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <div key={key} className="grid grid-cols-[1fr_140px_140px] gap-2 items-center">
                    <Label className="text-sm">{c}</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={amounts[key] ?? ""}
                      onChange={(e) => setAmounts({ ...amounts, [key]: e.target.value })}
                    />
                    <Input
                      type="date"
                      title="Fecha estimada (opcional)"
                      value={dates[key] ?? ""}
                      onChange={(e) => setDates({ ...dates, [key]: e.target.value })}
                    />
                  </div>
                );
              })}
            </section>
          ))}

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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}