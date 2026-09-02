import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OrderDisputeDialog from "@/components/ventas/OrderDisputeDialog";
import DisputesPanel from "@/components/contabilidad/DisputesPanel";
import { Loader2, Info, TrendingUp, Clock, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, Download, AlertTriangle } from "lucide-react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useOrders } from "@/hooks/useOrders";
import { useAllOrderCharges } from "@/hooks/useOrderCharges";
import { useAuth } from "@/contexts/AuthContext";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";
import {
  summarizeAdvisorProgress,
  STATUS_LABEL,
  BONUS_TIER_1_THRESHOLD,
  BONUS_TIER_1_AMOUNT,
  BONUS_TIER_2_THRESHOLD,
  BONUS_TIER_2_AMOUNT,
  UNLOCK_THRESHOLD,
} from "@/lib/commissions";
import {
  exportCommissionsCsv,
  exportCommissionsXlsx,
} from "@/lib/commissionExports";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

type Filter = "todos" | "facturado" | "pendiente" | "excluido" | "cero";


export default function MisComisiones() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useOrders();
  const { data: charges = {} } = useAllOrderCharges();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [filter, setFilter] = useState<Filter>("todos");
  const [search, setSearch] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const summary = useMemo(
    () => summarizeAdvisorProgress(orders, year, month, user?.id, charges),
    [orders, year, month, user?.id, charges]
  );


  const yearOptions = useMemo(() => {
    const years = new Set<number>([today.getFullYear()]);
    for (const o of orders) {
      const ref = o.invoice_date || o.created_at;
      if (ref) years.add(new Date(ref as string).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  const goPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };

  const goNextMonth = () => {
    if (isCurrentMonth) return;
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  // Histórico de los últimos 12 meses (hasta el mes actual)
  const history = useMemo(() => {
    const out: { label: string; total: number; commission: number; count: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const s = summarizeAdvisorProgress(orders, d.getFullYear(), d.getMonth(), user?.id, charges);
      if (s.ordersCount === 0) continue;
      out.push({
        label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        total: s.totalWithVat,
        commission: s.toPayInvoiced,
        count: s.ordersCount,
      });
    }
    return out;
  }, [orders, user?.id, charges]);

  const lines = useMemo(() => {
    let list = summary.lines;
    if (filter === "facturado") list = list.filter((l) => l.invoiced);
    else if (filter === "pendiente") list = list.filter((l) => l.status === "pendiente");
    else if (filter === "excluido") list = list.filter((l) => l.status === "excluido");
    else if (filter === "cero") list = list.filter((l) => !(Number(l.order.total_amount) > 0));

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((l) =>
        `${(l.order as any).order_code || ""} ${l.order.client_name || ""} ${l.order.product || ""}`
          .toLowerCase()
          .includes(q)
      );
    }
    const min = minAmount ? parseFloat(minAmount) : null;
    const max = maxAmount ? parseFloat(maxAmount) : null;
    if (min !== null) list = list.filter((l) => l.totalWithVat >= min);
    if (max !== null) list = list.filter((l) => l.totalWithVat <= max);
    return list;
  }, [summary.lines, filter, search, minAmount, maxAmount]);

  const zeroLines = useMemo(
    () => summary.lines.filter((l) => !(Number(l.order.total_amount) > 0)),
    [summary.lines]
  );

  const causadas = useMemo(
    () => summary.lines.filter((l) => l.invoiced),
    [summary.lines]
  );
  const noCausadas = useMemo(
    () => summary.lines.filter((l) => !l.invoiced),
    [summary.lines]
  );

  const motivos = useMemo(() => {
    const m = new Map<string, { count: number; value: number }>();
    for (const l of noCausadas) {
      const prev = m.get(l.reason) || { count: 0, value: 0 };
      m.set(l.reason, { count: prev.count + 1, value: prev.value + l.totalWithVat });
    }
    return Array.from(m.entries()).sort((a, b) => b[1].value - a[1].value);
  }, [noCausadas]);

  const [exporting, setExporting] = useState(false);

  const buildExportInput = () => ({
    fileBase: `comisiones_${MONTHS[month].toLowerCase()}_${year}`,
    summary: [
      { Concepto: "Asesor", Valor: summary.lines[0]?.order.advisor_name || "" },
      { Concepto: "Periodo", Valor: `${MONTHS[month]} ${year}` },
      {
        Concepto: "Criterio del período",
        Valor: "Fecha de factura (si no hay factura, fecha de venta)",
      },
      { Concepto: "Pedidos del período", Valor: summary.ordersCount },
      {
        Concepto: "Flete y cargos excluidos de la base",
        Valor: Math.round(summary.nonCommissionableWithVat),
      },
      { Concepto: "Pedidos sin factura emitida", Valor: summary.pendingInvoiceCount },
      { Concepto: "Ventas totales (con IVA)", Valor: Math.round(summary.totalWithVat) },
      { Concepto: "Pedidos considerados para comisión", Valor: summary.invoicedCount },
      { Concepto: "Valor considerado (con IVA)", Valor: Math.round(summary.invoicedWithVat) },
      { Concepto: "Pedidos pendientes de pago", Valor: summary.pendingCount },
      { Concepto: "Valor pendiente (con IVA)", Valor: Math.round(summary.pendingWithVat) },
      { Concepto: "Pedidos excluidos", Valor: summary.excludedCount },
      { Concepto: "Valor excluido (con IVA)", Valor: Math.round(summary.excludedWithVat) },
      { Concepto: "Comisión causada", Valor: Math.round(summary.invoicedCommission) },
      { Concepto: "Bono", Valor: Math.round(summary.bonusInvoiced) },
      { Concepto: "Total a pagar", Valor: Math.round(summary.toPayInvoiced) },
      {
        Concepto: "Comisión por causar (saldos pendientes)",
        Valor: Math.round(summary.pendingCommission),
      },
      ...motivos.map(([reason, v]) => ({
        Concepto: `Motivo exclusión: ${reason}`,
        Valor: `${v.count} pedido(s) · ${fmt(v.value)}`,
      })),
    ],
    lines: causadas,
    excluded: noCausadas,
  });

  const handleExportXlsx = async () => {
    if (summary.lines.length === 0) return;
    setExporting(true);
    try {
      await exportCommissionsXlsx(buildExportInput());
    } finally {
      setExporting(false);
    }
  };

  const handleExportCsv = () => {
    if (summary.lines.length === 0) return;
    exportCommissionsCsv(buildExportInput());
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const bonusProgress = Math.min(
    (summary.totalWithVat / BONUS_TIER_2_THRESHOLD) * 100,
    100
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Mis comisiones</h2>
          <p className="text-sm text-muted-foreground">
            Consulta el mes actual o meses anteriores según los pedidos que has montado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrevMonth} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={goNextMonth}
            disabled={isCurrentMonth}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleExportXlsx}
            disabled={exporting || summary.lines.length === 0}
            className="gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={summary.lines.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>

        </div>

      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Montado en el mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(summary.totalWithVat)}</p>
            <p className="text-xs text-muted-foreground">
              {summary.ordersCount} pedido(s) · con IVA
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Comisión causada (pagados)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {fmt(summary.invoicedCommission + summary.bonusInvoiced)}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.invoicedCount} pedido(s) · {fmt(summary.invoicedWithVat)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-600" /> Pendiente de pago del cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {fmt(summary.pendingCommission)}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.pendingCount} pedido(s) · {fmt(summary.pendingWithVat)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> Proyección total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(summary.toPayProjected)}</p>
            <p className="text-xs text-muted-foreground">
              Comisión + bono si se cobra todo
            </p>

          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" /> Resumen del período —{" "}
            {MONTHS[month]} {year} (por fecha de factura)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Ventas totales</p>
              <p className="font-semibold">{fmt(summary.totalWithVat)}</p>
              <p className="text-xs text-muted-foreground">{summary.ordersCount} pedido(s)</p>
            </div>
            <div className="rounded-md border border-emerald-300 p-2">
              <p className="text-xs text-muted-foreground">Considerados para comisión</p>
              <p className="font-semibold text-emerald-600">{fmt(summary.invoicedWithVat)}</p>
              <p className="text-xs text-muted-foreground">{summary.invoicedCount} pedido(s)</p>
            </div>
            <div className="rounded-md border border-amber-300 p-2">
              <p className="text-xs text-muted-foreground">Pendientes de pago</p>
              <p className="font-semibold text-amber-600">{fmt(summary.pendingWithVat)}</p>
              <p className="text-xs text-muted-foreground">{summary.pendingCount} pedido(s)</p>
            </div>
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground">Excluidos</p>
              <p className="font-semibold">{fmt(summary.excludedWithVat)}</p>
              <p className="text-xs text-muted-foreground">{summary.excludedCount} pedido(s)</p>
            </div>
          </div>

          {motivos.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Motivos por los que un pedido no causó comisión
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {motivos.map(([reason, v]) => (
                  <li key={reason}>
                    • {reason} — <b>{v.count}</b> pedido(s) · {fmt(v.value)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Avance de metas (facturación con IVA)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={bonusProgress} className="h-2" />
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant={summary.totalWithVat >= BONUS_TIER_1_THRESHOLD ? "default" : "secondary"}>
              Bono {fmt(BONUS_TIER_1_AMOUNT)} desde {fmt(BONUS_TIER_1_THRESHOLD)}
            </Badge>
            <Badge variant={summary.invoicedWithVat >= UNLOCK_THRESHOLD ? "default" : "secondary"}>
              FDS desbloqueado desde {fmt(UNLOCK_THRESHOLD)}
            </Badge>
            <Badge variant={summary.totalWithVat >= BONUS_TIER_2_THRESHOLD ? "default" : "secondary"}>
              +{fmt(BONUS_TIER_2_AMOUNT)} desde {fmt(BONUS_TIER_2_THRESHOLD)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
El período de liquidación es el <b>mes de la factura</b> (si el pedido aún
            no tiene factura, se muestra en su mes de venta y queda pendiente de
            facturar). La comisión se causa cuando el pedido está pagado o
            facturado; con abono parcial se causa proporcional a lo abonado. La
            base <b>excluye flete y cargos adicionales</b> y se calcula sin IVA.
          </p>

        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">Detalle de pedidos</CardTitle>
            <div className="flex gap-1">
              {([
                ["todos", "Todos"],
                ["facturado", "Causan comisión"],
                ["pendiente", "Pendientes"],
                ["excluido", "Excluidos"],
                ["cero", `En $0 (${zeroLines.length})`],
              ] as [Filter, string][]).map(([v, label]) => (

                <Button
                  key={v}
                  size="sm"
                  variant={filter === v ? "default" : "outline"}
                  onClick={() => setFilter(v)}
                  className={v === "cero" && zeroLines.length > 0 && filter !== v ? "border-amber-500 text-amber-600" : ""}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Input
              placeholder="Buscar por código, cliente o producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[260px] h-9"
            />
            <Input
              type="number"
              placeholder="Monto desde"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-[130px] h-9"
            />
            <Input
              type="number"
              placeholder="Monto hasta"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-[130px] h-9"
            />
            {(search || minAmount || maxAmount) && (
              <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setMinAmount(""); setMaxAmount(""); }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No hay pedidos en este período.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Fecha</TableHead>
                  <TableHead>N° Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Comisión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => {
                  const open = expandedId === l.order.id;
                  return (
                    <Fragment key={l.order.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpandedId(open ? null : l.order.id)}
                      >
                        <TableCell className="w-8 pr-0">
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {format(l.saleDate, "d MMM", { locale: es })}
                          {l.weekend && (
                            <Badge variant="outline" className="ml-1 text-[10px]">FDS</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <OrderCodeBadge code={(l.order as any).order_code} compact />
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          {l.order.client_name}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">{fmt(l.totalWithVat)}</TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {fmt(l.netCommission)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              l.status === "total"
                                ? "bg-emerald-600"
                                : l.status === "parcial"
                                  ? "bg-sky-600"
                                  : l.status === "pendiente"
                                    ? "bg-amber-500"
                                    : "bg-muted text-muted-foreground"
                            }
                          >
                            {STATUS_LABEL[l.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <OrderDisputeDialog
                            orderId={l.order.id}
                            orderCode={(l.order as any).order_code}
                            clientName={l.order.client_name}
                            currentAmount={Number(l.order.total_amount) || 0}
                          />
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={8} className="py-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">Factura</p>
                                <p className="font-medium">
                                  {l.invoiceDate ? format(l.invoiceDate, "d MMM yyyy", { locale: es }) : "Pendiente de facturar"}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Tipo</p>
                                <p className="font-medium">
                                  {l.order.sale_type === "menor" ? "Detal" : "Mayor"} · {l.clientKind === "recompra" ? "Recompra" : "Nuevo"}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Flete + cargos</p>
                                <p className="font-medium">
                                  {l.shippingCost + l.extraCharges > 0 ? `-${fmt(l.shippingCost + l.extraCharges)}` : "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Base comisionable</p>
                                <p className="font-medium">{fmt(l.netTotalWithVat)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Abono</p>
                                <p className="font-medium">{fmt(Number(l.order.abono) || 0)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Base sin IVA</p>
                                <p className="font-medium">{fmt(l.baseSinIva)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Tarifa</p>
                                <p className="font-medium">{(l.ratePct * 100).toFixed(0)}%</p>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2 border-t pt-2">
                              {l.reason}
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DisputesPanel orders={orders} />

      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Historial de meses anteriores</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Montado</TableHead>
                  <TableHead className="text-right">Comisión facturada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.label}>
                    <TableCell className="capitalize">{h.label}</TableCell>
                    <TableCell className="text-right">{h.count}</TableCell>
                    <TableCell className="text-right">{fmt(h.total)}</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {fmt(h.commission)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
