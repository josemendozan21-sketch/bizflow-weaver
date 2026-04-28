import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign, Wallet, Flame } from "lucide-react";
import {
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  aggregateMonthly,
  productRotationForMonth,
  productHistory12Months,
  productionByStatusForMonth,
  formatCOP,
  pctChange,
} from "@/lib/monthlyAnalytics";
import { PRODUCTION_STATUS_LABELS, type Order } from "@/hooks/useOrders";
import { startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";

interface Props {
  orders: Order[];
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MonthlyAnalysis = ({ orders }: Props) => {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth());
  const [brandFilter, setBrandFilter] = useState<"todas" | "magical" | "sweatspot">("todas");

  const filteredOrders = useMemo(() => {
    if (brandFilter === "todas") return orders;
    return orders.filter((o) => {
      const b = (o.brand || "").toLowerCase();
      if (brandFilter === "magical") return b.includes("magical");
      return b.includes("sweatspot") || b.includes("sweat");
    });
  }, [orders, brandFilter]);

  const refDate = useMemo(() => new Date(year, month, 15), [year, month]);

  const monthlyBuckets = useMemo(() => aggregateMonthly(filteredOrders, refDate), [filteredOrders, refDate]);
  const rotation = useMemo(() => productRotationForMonth(filteredOrders, year, month), [filteredOrders, year, month]);
  const history = useMemo(() => productHistory12Months(filteredOrders, refDate), [filteredOrders, refDate]);
  const production = useMemo(() => productionByStatusForMonth(filteredOrders, year, month), [filteredOrders, year, month]);

  // KPIs del mes seleccionado vs mes anterior
  const kpis = useMemo(() => {
    const monthRef = new Date(year, month, 1);
    const prevRef = subMonths(monthRef, 1);
    const inMonth = (d: Date) => isWithinInterval(d, { start: startOfMonth(monthRef), end: endOfMonth(monthRef) });
    const inPrev = (d: Date) => isWithinInterval(d, { start: startOfMonth(prevRef), end: endOfMonth(prevRef) });

    let ventas = 0, pedidos = 0, cobrado = 0, pendiente = 0, unidadesDespachadas = 0;
    let ventasPrev = 0, pedidosPrev = 0;

    for (const o of filteredOrders) {
      const created = new Date(o.created_at);
      if (inMonth(created)) {
        ventas += Number(o.total_amount || 0);
        pedidos += 1;
        cobrado += Number(o.abono || 0);
        pendiente += Math.max(Number(o.total_amount || 0) - Number(o.abono || 0), 0);
      } else if (inPrev(created)) {
        ventasPrev += Number(o.total_amount || 0);
        pedidosPrev += 1;
      }
      if (o.dispatched_at) {
        const disp = new Date(o.dispatched_at);
        if (inMonth(disp)) unidadesDespachadas += Number(o.quantity || 0);
      }
    }
    return {
      ventas, pedidos, cobrado, pendiente, unidadesDespachadas,
      ventasChange: pctChange(ventas, ventasPrev),
      pedidosChange: pctChange(pedidos, pedidosPrev),
    };
  }, [filteredOrders, year, month]);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const o of orders) set.add(new Date(o.created_at).getFullYear());
    set.add(now.getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [orders, now]);

  const totalUnidadesMes = rotation.reduce((s, r) => s + r.unidades, 0);

  return (
    <div className="space-y-6">
      {/* Selectores */}
      <Card>
        <CardContent className="pt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Año</span>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mes</span>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Marca</span>
            <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v as typeof brandFilter)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="magical">Magical Warmers</SelectItem>
                <SelectItem value="sweatspot">Sweatspot</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          title="Ventas del mes"
          value={formatCOP(kpis.ventas)}
          change={kpis.ventasChange}
        />
        <KpiCard
          icon={<ShoppingCart className="h-4 w-4" />}
          title="Pedidos creados"
          value={String(kpis.pedidos)}
          change={kpis.pedidosChange}
        />
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          title="Ingresos cobrados"
          value={formatCOP(kpis.cobrado)}
          subtitle={`Pendiente: ${formatCOP(kpis.pendiente)}`}
        />
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          title="Unidades despachadas"
          value={String(kpis.unidadesDespachadas)}
          subtitle="Despachados en el mes"
        />
      </div>

      {/* Evolución 12 meses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución últimos 12 meses</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                formatter={(value: number, name: string) => {
                  if (name === "Pedidos") return [value, name];
                  return [formatCOP(value), name];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="ventasMagical" stackId="ventas" fill="hsl(var(--primary))" name="Magical" />
              <Bar yAxisId="left" dataKey="ventasSweatspot" stackId="ventas" fill="hsl(var(--accent))" name="Sweatspot" />
              <Line yAxisId="right" type="monotone" dataKey="pedidos" stroke="hsl(var(--foreground))" strokeWidth={2} name="Pedidos" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Rotación productos del mes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Rotación de productos — {MONTH_NAMES[month]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rotation.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin pedidos registrados en este mes.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">% mes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rotation.map((r, idx) => (
                    <TableRow key={`${r.brand}-${r.product}`}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {idx < 3 && <Badge variant="secondary" className="gap-1"><Flame className="h-3 w-3" />Top {idx + 1}</Badge>}
                        {r.product}
                      </TableCell>
                      <TableCell>{r.brand}</TableCell>
                      <TableCell className="text-right font-semibold">{r.unidades}</TableCell>
                      <TableCell className="text-right">{r.pedidos}</TableCell>
                      <TableCell className="text-right">{formatCOP(r.ingresos)}</TableCell>
                      <TableCell className="text-right">{r.pct.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold bg-muted/30">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{totalUnidadesMes}</TableCell>
                    <TableCell className="text-right">{rotation.reduce((s, r) => s + r.pedidos, 0)}</TableCell>
                    <TableCell className="text-right">{formatCOP(rotation.reduce((s, r) => s + r.ingresos, 0))}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico 12 meses por producto - heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico mensual por producto (12 meses)</CardTitle>
          <p className="text-sm text-muted-foreground">Unidades vendidas. Útil para detectar rotación sostenida y planificar proyecciones.</p>
        </CardHeader>
        <CardContent>
          {history.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin datos históricos.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background">Producto</TableHead>
                    <TableHead>Marca</TableHead>
                    {history.months.map((m) => (
                      <TableHead key={m.key} className="text-center capitalize">{m.label}</TableHead>
                    ))}
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.rows.map((row) => (
                    <TableRow key={`${row.brand}-${row.product}`}>
                      <TableCell className="font-medium sticky left-0 bg-background">{row.product}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.brand}</TableCell>
                      {history.months.map((m) => {
                        const v = row.byMonth[m.key] || 0;
                        const intensity = history.maxCell > 0 ? v / history.maxCell : 0;
                        return (
                          <TableCell
                            key={m.key}
                            className="text-center text-xs"
                            style={{
                              backgroundColor: v > 0 ? `hsl(var(--primary) / ${0.08 + intensity * 0.55})` : undefined,
                              color: intensity > 0.5 ? "hsl(var(--primary-foreground))" : undefined,
                            }}
                          >
                            {v || ""}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-semibold">{row.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Producción del mes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Producción — {MONTH_NAMES[month]} {year}</CardTitle>
          <p className="text-sm text-muted-foreground">Pedidos creados en el mes según su estado actual del flujo.</p>
        </CardHeader>
        <CardContent>
          {production.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin pedidos en producción este mes.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {production.map((p) => (
                <div key={p.status} className="rounded-lg border p-3 flex items-center justify-between">
                  <span className="text-sm">{PRODUCTION_STATUS_LABELS[p.status] || p.status}</span>
                  <Badge variant="secondary">{p.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function KpiCard({
  icon, title, value, change, subtitle,
}: { icon: React.ReactNode; title: string; value: string; change?: number | null; subtitle?: string }) {
  const positive = (change ?? 0) >= 0;
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {change !== undefined && change !== null && (
          <p className={`text-xs flex items-center gap-1 mt-1 ${positive ? "text-emerald-600" : "text-rose-600"}`}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}% vs mes anterior
          </p>
        )}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default MonthlyAnalysis;