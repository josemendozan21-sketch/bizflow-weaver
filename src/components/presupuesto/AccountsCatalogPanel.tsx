import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  GROUP_LABELS,
  useAccountingAccounts,
  useSaveAccount,
  useDeleteAccount,
  type AccountingAccount,
  type AccountKind,
} from "@/hooks/useAccountingBudget";

const GROUPS = Object.keys(GROUP_LABELS);

export function AccountsCatalogPanel({ canManage }: { canManage: boolean }) {
  const { data: accounts = [] } = useAccountingAccounts(true);
  const save = useSaveAccount();
  const del = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccountingAccount | null>(null);
  const [form, setForm] = useState({ group_code: "51", name: "", kind: "gasto" as AccountKind, active: true });

  const openNew = () => {
    setEditing(null);
    setForm({ group_code: "51", name: "", kind: "gasto", active: true });
    setOpen(true);
  };
  const openEdit = (a: AccountingAccount) => {
    setEditing(a);
    setForm({ group_code: a.group_code, name: a.name, kind: a.kind, active: a.active });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Escribe el nombre de la cuenta");
    try {
      await save.mutateAsync({ id: editing?.id, ...form, name: form.name.trim() });
      toast.success(editing ? "Cuenta actualizada" : "Cuenta creada");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  };

  const remove = async (a: AccountingAccount) => {
    if (!confirm(`¿Eliminar la cuenta "${a.name}" y todos sus valores mensuales?`)) return;
    try {
      await del.mutateAsync(a.id);
      toast.success("Cuenta eliminada");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Catálogo de cuentas contables ({accounts.length})</CardTitle>
        {canManage && (
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Nueva cuenta
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Grupo</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead className="w-28">Naturaleza</TableHead>
              <TableHead className="w-24">Estado</TableHead>
              {canManage && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-sm text-muted-foreground">{GROUP_LABELS[a.group_code] ?? a.group_code}</TableCell>
                <TableCell className="text-sm font-medium">{a.name}</TableCell>
                <TableCell>
                  <Badge variant={a.kind === "costo" ? "secondary" : "outline"}>{a.kind}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={a.active ? "default" : "destructive"}>{a.active ? "Activa" : "Inactiva"}</Badge>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(a)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cuenta" : "Nueva cuenta contable"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={form.group_code} onValueChange={(v) => setForm({ ...form, group_code: v, kind: ["61", "72", "73"].includes(v) ? "costo" : "gasto" })}>
              <SelectTrigger><SelectValue placeholder="Grupo contable" /></SelectTrigger>
              <SelectContent>
                {GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>{GROUP_LABELS[g]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Nombre de la cuenta"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as AccountKind })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gasto">Gasto</SelectItem>
                <SelectItem value="costo">Costo</SelectItem>
              </SelectContent>
            </Select>
            {editing && (
              <Select value={form.active ? "1" : "0"} onValueChange={(v) => setForm({ ...form, active: v === "1" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Activa</SelectItem>
                  <SelectItem value="0">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={save.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
