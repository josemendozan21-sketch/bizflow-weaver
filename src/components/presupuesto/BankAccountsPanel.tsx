import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useBankAccounts,
  useBankMovements,
  useUpdateBankAccount,
  useCreateBankAccount,
  type BankAccount,
} from "@/hooks/useMonthlyBudget";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

export function BankAccountsPanel({ year, month }: { year: number; month: number }) {
  const { data: banks = [] } = useBankAccounts();
  const { data: movements = [] } = useBankMovements(year, month);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [creating, setCreating] = useState(false);

  const totalBalance = banks.reduce((s, b) => s + Number(b.current_balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Bancos y cuentas</h2>
          <p className="text-sm text-muted-foreground">
            Saldo total: <span className="font-medium text-foreground">{formatCOP(totalBalance)}</span>
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nueva cuenta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banks.map((b) => (
          <Card key={b.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{b.name}</CardTitle>
              <Button size="icon" variant="ghost" onClick={() => setEditing(b)}>
                <Pencil className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCOP(Number(b.current_balance))}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Inicial: {formatCOP(Number(b.initial_balance))}
              </p>
              {b.notes && <p className="text-xs text-muted-foreground mt-1">{b.notes}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimientos del mes</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin movimientos este mes.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const bank = banks.find((b) => b.id === m.bank_account_id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{format(new Date(m.movement_date), "d MMM", { locale: es })}</TableCell>
                      <TableCell className="text-sm">{bank?.name ?? "—"}</TableCell>
                      <TableCell>
                        {m.direction === "ingreso" ? (
                          <span className="inline-flex items-center text-emerald-600 text-xs">
                            <ArrowDownCircle className="h-3 w-3 mr-1" /> Ingreso
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-destructive text-xs">
                            <ArrowUpCircle className="h-3 w-3 mr-1" /> Egreso
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{m.concept}</TableCell>
                      <TableCell className={`text-right font-medium ${m.direction === "ingreso" ? "text-emerald-600" : "text-destructive"}`}>
                        {m.direction === "ingreso" ? "+" : "-"} {formatCOP(Number(m.amount))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && <EditBankDialog bank={editing} onClose={() => setEditing(null)} />}
      {creating && <CreateBankDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function EditBankDialog({ bank, onClose }: { bank: BankAccount; onClose: () => void }) {
  const update = useUpdateBankAccount();
  const [name, setName] = useState(bank.name);
  const [initial, setInitial] = useState(String(bank.initial_balance));
  const [notes, setNotes] = useState(bank.notes ?? "");

  const save = () => {
    update.mutate(
      { id: bank.id, name, initial_balance: parseFloat(initial) || 0, notes: notes.trim() || null },
      {
        onSuccess: () => { toast.success("Cuenta actualizada"); onClose(); },
        onError: (e: any) => toast.error("Error: " + e.message),
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar cuenta</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1">
            <Label>Saldo inicial</Label>
            <Input type="number" value={initial} onChange={(e) => setInitial(e.target.value)} />
            <p className="text-xs text-muted-foreground">Cambiarlo ajustará el saldo actual por la misma diferencia.</p>
          </div>
          <div className="space-y-1"><Label>Notas</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={update.isPending}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateBankDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateBankAccount();
  const [name, setName] = useState("");
  const [initial, setInitial] = useState("");

  const save = () => {
    if (!name.trim()) { toast.error("Ingrese el nombre"); return; }
    create.mutate(
      { name: name.trim(), initial_balance: parseFloat(initial) || 0 },
      {
        onSuccess: () => { toast.success("Cuenta creada"); onClose(); },
        onError: (e: any) => toast.error("Error: " + e.message),
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva cuenta</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bancolombia 99" /></div>
          <div className="space-y-1"><Label>Saldo inicial</Label><Input type="number" value={initial} onChange={(e) => setInitial(e.target.value)} placeholder="0" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={create.isPending}>Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}