import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseAccountingXlsx, accountKey, type ParsedAccountRow } from "@/lib/accountingExcel";
import {
  MONTHS,
  useAccountingAccounts,
  useBulkSaveAmounts,
  type AmountKind,
} from "@/hooks/useAccountingBudget";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

export function AccountingUploadDialog({
  open,
  onOpenChange,
  year,
  month,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  year: number;
  month: number;
}) {
  const { data: accounts = [] } = useAccountingAccounts(true);
  const bulk = useBulkSaveAmounts();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedAccountRow[] | null>(null);
  const [targetMonth, setTargetMonth] = useState(month);
  const [amountKind, setAmountKind] = useState<AmountKind>("real");

  const index = new Map(accounts.map((a) => [accountKey(a.group_code, a.name), a]));

  const matched = (rows ?? [])
    .map((r) => ({ row: r, account: index.get(accountKey(r.group_code, r.name)) }))
    .filter((x) => x.row.values[targetMonth] !== undefined);

  const found = matched.filter((m) => m.account);
  const missing = matched.filter((m) => !m.account);

  const handleFile = async (f: File) => {
    try {
      const parsed = parseAccountingXlsx(await f.arrayBuffer());
      if (parsed.length === 0) {
        toast.error("No se encontraron filas con formato '51. Nombre de la cuenta'");
        return;
      }
      setRows(parsed);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo leer el archivo");
    }
  };

  const confirm = async () => {
    try {
      await bulk.mutateAsync({
        year,
        month: targetMonth,
        amount_kind: amountKind,
        rows: found.map((m) => ({ account_id: m.account!.id, amount: m.row.values[targetMonth] })),
      });
      toast.success(`${found.length} cuentas actualizadas en ${MONTHS[targetMonth - 1]} ${year}`);
      setRows(null);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo cargar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setRows(null); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Cargar mes desde Excel</DialogTitle>
          <DialogDescription>
            El archivo debe tener la columna "Concepto" con el formato "51. Nombre de la cuenta" y columnas por mes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(targetMonth)} onValueChange={(v) => setTargetMonth(Number(v))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={amountKind} onValueChange={(v) => setAmountKind(v as AmountKind)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="real">Ejecución real</SelectItem>
              <SelectItem value="presupuesto">Presupuesto</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">Año {year}</Badge>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Seleccionar archivo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
        </div>

        {rows && (
          <div className="max-h-80 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matched.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{m.row.group_code}. {m.row.name}</TableCell>
                    <TableCell className="text-right text-sm">{formatCOP(m.row.values[targetMonth])}</TableCell>
                    <TableCell>
                      <Badge variant={m.account ? "default" : "destructive"}>
                        {m.account ? "Reconocida" : "Sin cuenta"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {rows && (
          <p className="text-sm text-muted-foreground">
            {found.length} cuentas se actualizarán. {missing.length > 0 && `${missing.length} no existen en el catálogo y se omitirán.`}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirm} disabled={!rows || found.length === 0 || bulk.isPending}>
            {bulk.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Cargar {found.length} valores
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
