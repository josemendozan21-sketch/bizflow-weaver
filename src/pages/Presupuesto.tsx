import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ChevronLeft, ChevronRight, Settings2, Lock, Unlock, Plus, Trash2, FileText } from "lucide-react";
import { openSignedUrl } from "@/lib/signedUrl";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  useMonthlyBudget,
  useBudgetLines,
  useBudgetEntries,
  useAutoReadings,
  useCloseBudget,
  useDeleteBudgetEntry,
  INCOME_CATEGORIES,
  COST_CATEGORIES,
  EXPENSE_CATEGORIES,
  LIABILITY_CATEGORIES,
  KIND_LABELS,
  type BudgetEntry,
  type BudgetKind,
} from "@/hooks/useMonthlyBudget";
import { DefineBudgetDialog } from "@/components/presupuesto/DefineBudgetDialog";
import { AddEntryDialog } from "@/components/presupuesto/AddEntryDialog";
import { BankAccountsPanel } from "@/components/presupuesto/BankAccountsPanel";
import { IncomeCalendar } from "@/components/presupuesto/IncomeCalendar";
import { PaymentsCalendar } from "@/components/presupuesto/PaymentsCalendar";

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

const KIND_GROUPS: { kind: BudgetKind; cats: string[] }[] = [
  { kind: "ingreso", cats: INCOME_CATEGORIES },
  { kind: "costo", cats: COST_CATEGORIES },
  { kind: "gasto", cats: EXPENSE_CATEGORIES },
  { kind: "pasivo", cats: LIABILITY_CATEGORIES },
];

const MULTI = new Set(["Ferias", "Otros ingresos", "Otros gastos"]);

export default function Presupuesto() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [defineOpen, setDefineOpen] = useState(false);
  const [addEntry, setAddEntry] = useState<{ kind: BudgetKind; category: string; description?: string } | null>(null);

  const { data: budget } = useMonthlyBudget(year, month);
  const { data: lines = [] } = useBudgetLines(budget?.id);
  const { data: entries = [] } = useBudgetEntries(budget?.id);
  const { data: auto = {} } = useAutoReadings(year, month);
  const closeMut = useCloseBudget();
  const deleteEntry = useDeleteBudgetEntry();

  const navigate = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };
  const goCurrent = () => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); };

  // Build rows per group: simple cats single-row, multi cats expanded by description + totals
  const groupRows = useMemo(() => {
    return KIND_GROUPS.map((g) => {
      const rows: { category: string; projected: number; real: number; auto: number; entryCategory: string; entryDescription?: string; isTotal?: boolean }[] = [];
      for (const c of g.cats) {
        const projectedTotal = lines.filter((l) => l.kind === g.kind && l.category === c)
          .reduce((s, l) => s + Number(l.projected_amount || 0), 0);
        const manualTotal = entries.filter((e) => e.kind === g.kind && e.category === c)
          .reduce((s, e) => s + Number(e.amount || 0), 0);
        const autoVal = Number(auto[c] || 0);
        if (MULTI.has(c)) {
          const linesC = lines.filter((l) => l.kind === g.kind && l.category === c);
          linesC.forEach((l) => {
            const name = l.description || "sin nombre";
            const manual = entries
              .filter((e) => e.kind === g.kind && e.category === c && (e.description || "sin nombre") === name)
              .reduce((s, e) => s + Number(e.amount || 0), 0);
            rows.push({
              category: `${c} — ${name}`,
              projected: Number(l.projected_amount || 0),
              real: manual,
              auto: 0,
              entryCategory: c,
              entryDescription: name,
            });
          });
          rows.push({
            category: `${c} (total)`,
            projected: projectedTotal,
            real: manualTotal + autoVal,
            auto: autoVal,
            entryCategory: c,
            isTotal: true,
          });
        } else {
          rows.push({
            category: c,
            projected: projectedTotal,
            real: manualTotal + autoVal,
            auto: autoVal,
            entryCategory: c,
          });
        }
      }
      // Totals per kind: avoid double-counting MULTI rows
      const projected = rows.filter((r) => !r.category.includes(" — ")).reduce((s, r) => s + r.projected, 0);
      const real = rows.filter((r) => !r.category.includes(" — ")).reduce((s, r) => s + r.real, 0);
      return { kind: g.kind, rows, projected, real };
    });
  }, [lines, entries, auto]);

  const totals = useMemo(() => {
    const find = (k: BudgetKind) => groupRows.find((g) => g.kind === k)!;
    const ingreso = find("ingreso");
    const costo = find("costo");
    const gasto = find("gasto");
    const pasivo = find("pasivo");
    return {
      ingreso,
      costo,
      gasto,
      pasivo,
      utilityProj: ingreso.projected - costo.projected - gasto.projected,
      utilityReal: ingreso.real - costo.real - gasto.real,
    };
  }, [groupRows]);

  const isClosed = budget?.status === "cerrado";

  const handleToggleClose = () => {
    if (!budget) return;
    closeMut.mutate({ id: budget.id, status: isClosed ? "abierto" : "cerrado" }, {
      onSuccess: () => toast.success(isClosed ? "Mes reabierto" : "Mes cerrado"),
      onError: (e: any) => toast.error("Error: " + e.message),
    });
  };

  const handleDeleteEntry = (e: BudgetEntry) => {
    if (!confirm(`¿Eliminar movimiento de ${formatCOP(Number(e.amount))}?`)) return;
    deleteEntry.mutate(e.id, {
      onSuccess: () => toast.success("Movimiento eliminado"),
      onError: (err: any) => toast.error("Error: " + err.message),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Presupuesto mensual</h1>
          <p className="text-sm text-muted-foreground">Proyección, bancos y calendarios financieros del mes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={goCurrent}>{MONTHS[month - 1]} {year}</Button>
          <Button size="sm" variant="outline" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          {isClosed && <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Cerrado</Badge>}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setDefineOpen(true)} disabled={isClosed}>
          <Settings2 className="h-4 w-4 mr-1" />
          {budget ? "Editar presupuesto" : "Definir presupuesto del mes"}
        </Button>
        {budget && (
          <Button variant="outline" onClick={handleToggleClose}>
            {isClosed ? <Unlock className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
            {isClosed ? "Reabrir mes" : "Cerrar mes"}
          </Button>
        )}
      </div>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="bancos">Bancos</TabsTrigger>
          <TabsTrigger value="ingresos">Calendario ingresos</TabsTrigger>
          <TabsTrigger value="pagos">Calendario pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KpiCard title="Ingresos" projected={totals.ingreso.projected} real={totals.ingreso.real} positive />
            <KpiCard title="Costos" projected={totals.costo.projected} real={totals.costo.real} />
            <KpiCard title="Gastos" projected={totals.gasto.projected} real={totals.gasto.real} />
            <KpiCard title="Pasivos" projected={totals.pasivo.projected} real={totals.pasivo.real} />
            <KpiCard title="Utilidad" projected={totals.utilityProj} real={totals.utilityReal} positive />
          </div>

          {groupRows.map((g) => (
            <CategoryTable
              key={g.kind}
              title={`${KIND_LABELS[g.kind]}s`}
              rows={g.rows}
              kind={g.kind}
              onAddEntry={(cat, desc) => setAddEntry({ kind: g.kind, category: cat, description: desc })}
              disabled={isClosed || !budget}
            />
          ))}

          <Card>
            <CardHeader><CardTitle className="text-base">Movimientos manuales registrados</CardTitle></CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No hay movimientos manuales este mes.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Soporte</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{format(new Date(e.entry_date), "d MMM", { locale: es })}</TableCell>
                        <TableCell><Badge variant={e.kind === "ingreso" ? "default" : "destructive"}>{e.kind}</Badge></TableCell>
                        <TableCell className="text-sm">{e.category}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.description || "—"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCOP(Number(e.amount))}</TableCell>
                        <TableCell>
                          {e.proof_url ? (
                            <Button size="sm" variant="ghost" onClick={() => openSignedUrl(e.proof_url!)}>
                              <FileText className="h-3 w-3" />
                            </Button>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {!isClosed && (
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteEntry(e)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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

      <DefineBudgetDialog
        open={defineOpen}
        onOpenChange={setDefineOpen}
        year={year}
        month={month}
        existingLines={lines}
        existingNotes={budget?.notes ?? null}
      />
      {addEntry && budget && (
        <AddEntryDialog
          open={!!addEntry}
          onOpenChange={(o) => !o && setAddEntry(null)}
          budgetId={budget.id}
          kind={addEntry.kind}
          category={addEntry.category}
          defaultDescription={addEntry.description}
        />
      )}
    </div>
  );
}

function KpiCard({ title, projected, real, positive }: { title: string; projected: number; real: number; positive?: boolean }) {
  const pct = projected > 0 ? (real / projected) * 100 : 0;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent>
        <p className={`text-xl font-bold ${positive && real < 0 ? "text-destructive" : ""}`}>{formatCOP(real)}</p>
        <p className="text-xs text-muted-foreground mt-1">Proy: {formatCOP(projected)}</p>
        {projected > 0 && <p className="text-xs text-muted-foreground">{pct.toFixed(0)}%</p>}
      </CardContent>
    </Card>
  );
}

function CategoryTable({
  title, rows, kind, onAddEntry, disabled,
}: {
  title: string;
  rows: { category: string; projected: number; real: number; auto: number; entryCategory: string; entryDescription?: string; isTotal?: boolean }[];
  kind: BudgetKind;
  onAddEntry: (category: string, description?: string) => void;
  disabled?: boolean;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Proyectado</TableHead>
              <TableHead className="text-right">Real</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
              <TableHead className="text-right">% Cumpl.</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const diff = r.real - r.projected;
              const pct = r.projected > 0 ? (r.real / r.projected) * 100 : 0;
              const diffClass = kind === "ingreso"
                ? (diff < 0 ? "text-destructive" : "text-emerald-600")
                : (diff > 0 ? "text-destructive" : "text-emerald-600");
              return (
                <TableRow key={r.category} className={r.isTotal ? "bg-muted/40 font-medium" : ""}>
                  <TableCell className="font-medium">
                    {r.category}
                    {r.auto > 0 && <Badge variant="outline" className="ml-2 text-xs">auto: {formatCOP(r.auto)}</Badge>}
                  </TableCell>
                  <TableCell className="text-right">{formatCOP(r.projected)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCOP(r.real)}</TableCell>
                  <TableCell className={`text-right ${diffClass}`}>{formatCOP(diff)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{r.projected > 0 ? `${pct.toFixed(0)}%` : "—"}</TableCell>
                  <TableCell>
                    {!r.isTotal && (
                      <Button size="sm" variant="ghost" onClick={() => onAddEntry(r.entryCategory, r.entryDescription)} disabled={disabled}>
                        <Plus className="h-3 w-3 mr-1" /> Mov.
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}