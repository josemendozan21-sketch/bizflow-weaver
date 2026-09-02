import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Download, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  MONTHS,
  GROUP_LABELS,
  canManageBudget,
  useAccountingAccounts,
  useAccountingAmounts,
  useSaveAmount,
  type AccountingAccount,
} from "@/hooks/useAccountingBudget";
import { exportAccountingMonthXlsx, exportAccountingYearXlsx } from "@/lib/accountingExcel";
import { AccountsCatalogPanel } from "@/components/presupuesto/AccountsCatalogPanel";
import { AccountingUploadDialog } from "@/components/presupuesto/AccountingUploadDialog";
import { BankAccountsPanel } from "@/components/presupuesto/BankAccountsPanel";
import { IncomeCalendar } from "@/components/presupuesto/IncomeCalendar";
import { PaymentsCalendar } from "@/components/presupuesto/PaymentsCalendar";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

export default function Presupuesto() {
  const today = new Date();
  const { role } = useAuth();
  const canManage = canManageBudget(role);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: accounts = [] } = useAccountingAccounts(true);
  const { data: amounts = [] } = useAccountingAmounts(year);
  const saveAmount = useSaveAmount();

  const amountMap = useMemo(() => {
    const m = new Map<string, number>();
    amounts.forEach((a) => m.set(`${a.account_id}|${a.month}|${a.amount_kind}`, Number(a.amount || 0)));
    return m;
  }, [amounts]);

  const get = (accountId: string, m: number, kind: "real" | "presupuesto") =>
    amountMap.get(`${accountId}|${m}|${kind}`) ?? 0;

  const groups = useMemo(() => {
    const codes = Array.from(new Set(accounts.map((a) => a.group_code))).sort();
    return codes.map((code) => ({
      code,
      accounts: accounts.filter((a) => a.group_code === code),
    }));
  }, [accounts]);

  const totals = useMemo(() => {
    let projected = 0;
    let real = 0;
    accounts.forEach((a) => {
      projected += get(a.id, month, "presupuesto");
      real += get(a.id, month, "real");
    });
    return { projected, real };
  }, [accounts, amountMap, month]);

  const navigate = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Presupuesto por cuenta contable</h1>
          <p className="text-sm text-muted-foreground">Alineado con el plan de cuentas de W.O.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Badge variant="secondary" className="text-sm px-3 py-1">{MONTHS[month - 1]} {year}</Badge>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Cargar mes
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => exportAccountingMonthXlsx(year, month, accounts, amounts)}>
            <Download className="h-4 w-4 mr-1" /> Mes
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAccountingYearXlsx(year, accounts, amounts, "real")}>
            <Download className="h-4 w-4 mr-1" /> Año
          </Button>
        </div>
      </div>

      <Tabs defaultValue="mes">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="mes">Mes</TabsTrigger>
          <TabsTrigger value="anual">Anual</TabsTrigger>
          <TabsTrigger value="cuentas">Cuentas</TabsTrigger>
          <TabsTrigger value="bancos">Bancos</TabsTrigger>
          <TabsTrigger value="ingresos">Calendario ingresos</TabsTrigger>
          <TabsTrigger value="pagos">Calendario pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="mes" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard title="Presupuestado" value={totals.projected} />
            <KpiCard title="Ejecutado (real)" value={totals.real} />
            <KpiCard title="Diferencia" value={totals.projected - totals.real} />
          </div>

          {groups.map((g) => (
            <GroupTable
              key={g.code}
              code={g.code}
              accounts={g.accounts}
              month={month}
              get={get}
              canManage={canManage}
              onSave={(accountId, kind, amount) =>
                saveAmount.mutate({ account_id: accountId, year, month, amount_kind: kind, amount })
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="anual" className="mt-4">
          <AnnualMatrix year={year} accounts={accounts} get={get} />
        </TabsContent>

        <TabsContent value="cuentas" className="mt-4">
          <AccountsCatalogPanel canManage={canManage} />
        </TabsContent>

        <TabsContent value="bancos" className="mt-4">
          <BankAccountsPanel year={year} month={month} />
        </TabsContent>

        <TabsContent value="ingresos" className="mt-4">
          <IncomeCalendar year={year} month={month} />
        </TabsContent>

        <TabsContent value="pagos" className="mt-4">
          <PaymentsCalendar year={year} month={month} />
        </TabsContent>
      </Tabs>

      <AccountingUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} year={year} month={month} />
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent><p className="text-2xl font-bold">{formatCOP(value)}</p></CardContent>
    </Card>
  );
}

function AmountCell({
  value,
  editable,
  onSave,
}: {
  value: number;
  editable: boolean;
  onSave: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  if (!editable) return <span className="text-sm">{formatCOP(value)}</span>;
  return (
    <Input
      className="h-8 text-right text-sm"
      value={draft ?? (value ? String(value) : "")}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === null) return;
        const n = parseFloat(draft.replace(/[^0-9.-]/g, ""));
        setDraft(null);
        const parsed = Number.isFinite(n) ? Math.abs(n) : 0;
        if (parsed !== value) onSave(parsed);
      }}
      placeholder="0"
    />
  );
}

function GroupTable({
  code,
  accounts,
  month,
  get,
  canManage,
  onSave,
}: {
  code: string;
  accounts: AccountingAccount[];
  month: number;
  get: (id: string, m: number, kind: "real" | "presupuesto") => number;
  canManage: boolean;
  onSave: (accountId: string, kind: "real" | "presupuesto", amount: number) => void;
}) {
  const subtotal = accounts.reduce(
    (acc, a) => ({
      p: acc.p + get(a.id, month, "presupuesto"),
      r: acc.r + get(a.id, month, "real"),
    }),
    { p: 0, r: 0 },
  );

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{GROUP_LABELS[code] ?? code}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cuenta</TableHead>
              <TableHead className="text-right w-40">Presupuestado</TableHead>
              <TableHead className="text-right w-40">Real</TableHead>
              <TableHead className="text-right w-36">Diferencia</TableHead>
              <TableHead className="text-right w-28">% ejec.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => {
              const p = get(a.id, month, "presupuesto");
              const r = get(a.id, month, "real");
              return (
                <TableRow key={a.id} className={!a.active ? "opacity-50" : undefined}>
                  <TableCell className="text-sm">{a.name}</TableCell>
                  <TableCell className="text-right">
                    <AmountCell value={p} editable={canManage} onSave={(v) => onSave(a.id, "presupuesto", v)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <AmountCell value={r} editable={canManage} onSave={(v) => onSave(a.id, "real", v)} />
                  </TableCell>
                  <TableCell className="text-right text-sm">{formatCOP(p - r)}</TableCell>
                  <TableCell className="text-right text-sm">{p > 0 ? `${Math.round((r / p) * 100)}%` : "—"}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="font-semibold bg-muted/40">
              <TableCell>Subtotal</TableCell>
              <TableCell className="text-right">{formatCOP(subtotal.p)}</TableCell>
              <TableCell className="text-right">{formatCOP(subtotal.r)}</TableCell>
              <TableCell className="text-right">{formatCOP(subtotal.p - subtotal.r)}</TableCell>
              <TableCell className="text-right">{subtotal.p > 0 ? `${Math.round((subtotal.r / subtotal.p) * 100)}%` : "—"}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AnnualMatrix({
  year,
  accounts,
  get,
}: {
  year: number;
  accounts: AccountingAccount[];
  get: (id: string, m: number, kind: "real" | "presupuesto") => number;
}) {
  const monthTotals = MONTHS.map((_, i) =>
    accounts.reduce((s, a) => s + get(a.id, i + 1, "real"), 0),
  );

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Ejecución real {year}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[240px]">Cuenta</TableHead>
              {MONTHS.map((m) => <TableHead key={m} className="text-right whitespace-nowrap">{m.slice(0, 3)}</TableHead>)}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => {
              const vals = MONTHS.map((_, i) => get(a.id, i + 1, "real"));
              const total = vals.reduce((s, v) => s + v, 0);
              return (
                <TableRow key={a.id}>
                  <TableCell className="text-sm whitespace-nowrap">{a.group_code}. {a.name}</TableCell>
                  {vals.map((v, i) => (
                    <TableCell key={i} className="text-right text-xs whitespace-nowrap">
                      {v ? formatCOP(v) : "—"}
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-xs font-medium whitespace-nowrap">{formatCOP(total)}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="font-semibold bg-muted/40">
              <TableCell>Total general</TableCell>
              {monthTotals.map((v, i) => (
                <TableCell key={i} className="text-right text-xs whitespace-nowrap">{formatCOP(v)}</TableCell>
              ))}
              <TableCell className="text-right text-xs whitespace-nowrap">
                {formatCOP(monthTotals.reduce((s, v) => s + v, 0))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
