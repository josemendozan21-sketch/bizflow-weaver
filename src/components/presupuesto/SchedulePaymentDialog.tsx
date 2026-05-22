import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useBankAccounts,
  useCreateScheduledPayment,
  COST_CATEGORIES,
  EXPENSE_CATEGORIES,
  LIABILITY_CATEGORIES,
} from "@/hooks/useMonthlyBudget";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  defaultDate?: string;
}

export function SchedulePaymentDialog({ open, onOpenChange, budgetId, defaultDate }: Props) {
  const create = useCreateScheduledPayment();
  const { data: banks = [] } = useBankAccounts();
  const [kind, setKind] = useState<"costo" | "gasto" | "pasivo">("gasto");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [bankId, setBankId] = useState("");
  const [notes, setNotes] = useState("");

  const cats = kind === "costo" ? COST_CATEGORIES : kind === "gasto" ? EXPENSE_CATEGORIES : LIABILITY_CATEGORIES;

  const save = () => {
    if (!category) { toast.error("Selecciona la categoría"); return; }
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Monto inválido"); return; }
    create.mutate(
      {
        budget_id: budgetId,
        kind,
        category,
        description: description.trim() || null,
        budgeted_amount: val,
        due_date: dueDate,
        bank_account_id: bankId || null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => { toast.success("Pago programado"); onOpenChange(false); },
        onError: (e: any) => toast.error("Error: " + e.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Programar pago</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => { setKind(v as any); setCategory(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="costo">Costo</SelectItem>
                  <SelectItem value="gasto">Gasto</SelectItem>
                  <SelectItem value="pasivo">Pasivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descripción</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalle del pago" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Monto presupuestado *</Label>
              <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Fecha de pago *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Banco origen (sugerido)</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger><SelectValue placeholder="Sin seleccionar" /></SelectTrigger>
              <SelectContent>
                {banks.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={create.isPending}>Programar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}