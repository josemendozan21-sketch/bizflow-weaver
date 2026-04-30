import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Settings2, Lock, Unlock, Plus, Trash2, FileText } from "lucide-react";
import {
  useMonthlyBudget,
  useBudgetLines,
  useBudgetEntries,
  useAutoReadings,
  useCloseBudget,
  useDeleteBudgetEntry,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  type BudgetLine,
  type BudgetEntry,
} from "@/hooks/useMonthlyBudget";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { DefineBudgetDialog } from "@/components/presupuesto/DefineBudgetDialog";
import { AddEntryDialog } from "@/components/presupuesto/AddEntryDialog";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default function Presupuesto() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [defineOpen, setDefineOpen] = useState(false);
  const [addEntry, setAddEntry] = useState<{ kind: "ingreso" | "egreso"; category: string } | null>(null);

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

  const goCurrent = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  };

  // Compute aggregates per category
  const aggregate = useMemo(() => {
    const byCat = (kind: "ingreso" | "egreso", category: string) => {
      const projected = lines
        .filter((l) => l.kind === kind && l.category === category)
        .reduce((s, l) => s + Number(l.projected_amount || 0), 0);
      const manual = entries
        .filter((e) => e.kind === kind && e.category === category)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const autoVal = Number(auto[category] || 0);
      const real = manual + autoVal;
      return { projected, manual, auto: autoVal, real };
    };

    // Expand Ferias into one row per named feria; non-feria categories stay as-is
    const incomes = INCOME_CATEGORIES.flatMap((c) => {
      if (c === "Ferias") {
        const feriaLines = lines.filter((l) => l.kind === "ingreso" && l.category === "Ferias");
        const rows = feriaLines.map((l) => ({
          category: `Ferias - ${l.description || "sin nombre"}`,
          projected: Number(l.projected_amount || 0),
          manual: 0,
          auto: 0,
          real: 0,
        }));
        const totalsRow = { category: "Ferias (total real)", ...byCat("ingreso", "Ferias") };
        return rows.length > 0 ? [...rows, totalsRow] : [totalsRow];
      }
      if (c === "Otros ingresos") {
        const otrosLines = lines.filter((l) => l.kind === "ingreso" && l.category === "Otros ingresos");
        const rows = otrosLines.map((l) => ({
          category: `Otros ingresos - ${l.description || "sin nombre"}`,
          projected: Number(l.projected_amount || 0),
          manual: 0,
          auto: 0,
          real: 0,
        }));
        const totalsRow = { category: "Otros ingresos (total real)", ...byCat("ingreso", "Otros ingresos") };
        return rows.length > 0 ? [...rows, totalsRow] : [totalsRow];
      }
      return [{ category: c, ...byCat("ingreso", c) }];
    });
    const expenses = EXPENSE_CATEGORIES.flatMap((c) => {
      if (c === "Otros gastos") {
        const otrosLines = lines.filter((l) => l.kind === "egreso" && l.category === "Otros gastos");
        const rows = otrosLines.map((l) => ({
          category: `Otros gastos - ${l.description || "sin nombre"}`,
          projected: Number(l.projected_amount || 0),
          manual: 0,
          auto: 0,
          real: 0,
        }));
        const totalsRow = { category: "Otros gastos (total real)", ...byCat("egreso", "Otros gastos") };
        return rows.length > 0 ? [...rows, totalsRow] : [totalsRow];
      }
      return [{ category: c, ...byCat("egreso", c) }];
    });

    // Avoid double-counting Ferias: sum projected from named rows, real from totals row only
    const totalIncomeProj = incomes
      .filter((c) => c.category !== "Ferias (total real)" && c.category !== "Otros ingresos (total real)")
      .reduce((s, c) => s + c.projected, 0);
    const totalIncomeReal = incomes
      .filter(
        (c) =>
          !c.category.startsWith("Ferias - ") &&
          !c.category.startsWith("Otros ingresos - ")
      )
      .reduce((s, c) => s + c.real, 0);
    const totalExpenseProj = expenses
      .filter((c) => c.category !== "Otros gastos (total real)")
      .reduce((s, c) => s + c.projected, 0);
    const totalExpenseReal = expenses
      .filter((c) => !c.category.startsWith("Otros gastos - "))
      .reduce((s, c) => s + c.real, 0);

    return {
      incomes,
      expenses,
      totalIncomeProj,
      totalIncomeReal,
      totalExpenseProj,
      totalExpenseReal,
      utilityProj: totalIncomeProj - totalExpenseProj,
      utilityReal: totalIncomeReal - totalExpenseReal,
    };
  }, [lines, entries, auto]);

  const isClosed = budget?.status === "cerrado";

  const handleToggleClose = () => {
    if (!budget) return;
    closeMut.mutate(
      { id: budget.id, status: isClosed ? "abierto" : "cerrado" },
      {
        onSuccess: () => toast.success(isClosed ? "Mes reabierto" : "Mes cerrado"),
        onError: (e: any) => toast.error("Error: " + e.message),
      }
    );
  };

  const handleDeleteEntry = (e: BudgetEntry) => {
    if (!confirm(`¿Eliminar movimiento de ${formatCOP(Number(e.amount))}?`)) return;
    deleteEntry.mutate(e.id, {
      onSuccess: () => toast.success("Movimiento eliminado"),
      onError: (err: any) => toast.error("Error: " + err.message),
    });
  };

  // Chart data
  const summaryChart = [
    { name: "Ingresos", Proyectado: aggregate.totalIncomeProj, Real: aggregate.totalIncomeReal },
    { name: "Egresos", Proyectado: aggregate.totalExpenseProj, Real: aggregate.totalExpenseReal },
    { name: "Utilidad", Proyectado: aggregate.utilityProj, Real: aggregate.utilityReal },
  ];

  const expensesChart = aggregate.expenses.map((e) => ({
    name: e.category,
    Proyectado: e.projected,
    Real: e.real,
  }));

  const incomePieColors = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];
  const incomePieData = aggregate.incomes
    .filter((i) => i.real > 0)
    .map((i) => ({ name: i.category, value: i.real }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Presupuesto mensual</h1>
          <p className="text-sm text-muted-foreground">
            Proyección y seguimiento financiero del mes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={goCurrent}>
            {MONTHS[month - 1]} {year}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
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

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Ingresos"
          projected={aggregate.totalIncomeProj}
          real={aggregate.totalIncomeReal}
          positive
        />
        <KpiCard
          title="Egresos"
          projected={aggregate.totalExpenseProj}
          real={aggregate.totalExpenseReal}
        />
        <KpiCard
          title="Utilidad"
          projected={aggregate.utilityProj}
          real={aggregate.utilityReal}
          positive
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo restante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCOP(aggregate.totalExpenseProj - aggregate.totalExpenseReal)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Disponible del egreso proyectado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos vs Egresos vs Utilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summaryChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCOP(v)} />
                <Legend />
                <Bar dataKey="Proyectado" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="Real" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Egresos por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={expensesChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" className="text-xs" width={120} />
                <Tooltip formatter={(v: number) => formatCOP(v)} />
                <Legend />
                <Bar dataKey="Proyectado" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="Real" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Composición de ingresos reales</CardTitle>
          </CardHeader>
          <CardContent>
            {incomePieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                Aún no hay ingresos registrados este mes.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={incomePieData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {incomePieData.map((_, i) => (
                      <Cell key={i} fill={incomePieColors[i % incomePieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCOP(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income table */}
      <CategoryTable
        title="Ingresos"
        rows={aggregate.incomes}
        kind="ingreso"
        onAddEntry={(cat) => setAddEntry({ kind: "ingreso", category: cat })}
        disabled={isClosed || !budget}
      />

      {/* Expense table */}
      <CategoryTable
        title="Egresos / Costos y gastos"
        rows={aggregate.expenses}
        kind="egreso"
        onAddEntry={(cat) => setAddEntry({ kind: "egreso", category: cat })}
        disabled={isClosed || !budget}
      />

      {/* Manual entries list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimientos manuales registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay movimientos manuales este mes.
            </p>
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
                    <TableCell className="text-sm">
                      {format(new Date(e.entry_date), "d MMM", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.kind === "ingreso" ? "default" : "destructive"}>
                        {e.kind}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{e.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.description || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCOP(Number(e.amount))}
                    </TableCell>
                    <TableCell>
                      {e.proof_url ? (
                        <a href={e.proof_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost"><FileText className="h-3 w-3" /></Button>
                        </a>
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

      {/* Dialogs */}
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
        />
      )}
    </div>
  );
}

function KpiCard({
  title,
  projected,
  real,
  positive,
}: {
  title: string;
  projected: number;
  real: number;
  positive?: boolean;
}) {
  const pct = projected > 0 ? (real / projected) * 100 : 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${positive && real < 0 ? "text-destructive" : ""}`}>
          {formatCOP(real)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Proyectado: {formatCOP(projected)}
        </p>
        {projected > 0 && (
          <p className="text-xs text-muted-foreground">
            {pct.toFixed(0)}% del proyectado
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryTable({
  title,
  rows,
  kind,
  onAddEntry,
  disabled,
}: {
  title: string;
  rows: { category: string; projected: number; real: number; auto: number; manual: number }[];
  kind: "ingreso" | "egreso";
  onAddEntry: (category: string) => void;
  disabled?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
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
              return (
                <TableRow key={r.category}>
                  <TableCell className="font-medium">
                    {r.category}
                    {r.auto > 0 && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        auto: {formatCOP(r.auto)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCOP(r.projected)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCOP(r.real)}</TableCell>
                  <TableCell className={`text-right ${diff < 0 && kind === "ingreso" ? "text-destructive" : diff > 0 && kind === "egreso" ? "text-destructive" : "text-emerald-600"}`}>
                    {formatCOP(diff)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {r.projected > 0 ? `${pct.toFixed(0)}%` : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAddEntry(r.category)}
                      disabled={disabled}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Movimiento
                    </Button>
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