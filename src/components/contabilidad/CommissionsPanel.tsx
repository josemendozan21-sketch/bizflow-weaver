import OrderCodeBadge from "@/components/common/OrderCodeBadge";
import { Fragment, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Info, TrendingUp, AlertCircle, Download } from "lucide-react";
import { CommissionExpandButton } from "@/components/commissions/CommissionExpandButton";
import { CommissionStatusBadge } from "@/components/commissions/CommissionStatusBadge";
import { CommissionRulesLegend } from "@/components/commissions/CommissionRulesLegend";
import type { Order } from "@/hooks/useOrders";
import { useAllOrderCharges } from "@/hooks/useOrderCharges";
import {
  summarizeAdvisorMonth,
  type OrderOverrides,
  type PaymentMode,
  type AdvisorMonthSummary,
  BONUS_TIER_1_THRESHOLD,
  BONUS_TIER_1_AMOUNT,
  UNLOCK_THRESHOLD,
  BONUS_TIER_2_THRESHOLD,
  BONUS_TIER_2_AMOUNT,
  MIN_WEEKEND_PCT,
  MIN_TICKET_DETAL,
  RETURN_PENALTY,
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
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

interface Props {
  orders: Order[];
}

export default function CommissionsPanel({ orders }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [overrides, setOverrides] = useState<OrderOverrides>({});
  const [openAdvisor, setOpenAdvisor] = useState<string | null>(null);
  const [expandedLine, setExpandedLine] = useState<string | null>(null);
  const { data: charges = {} } = useAllOrderCharges();

  const summaries = useMemo(
    () => summarizeAdvisorMonth(orders, overrides, year, month, charges),
    [orders, overrides, year, month, charges]
  );

  const setLineOverride = (
    orderId: string,
    patch: Partial<{ paymentMode: PaymentMode }>
  ) => {
    setOverrides((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], ...patch },
    }));
  };

  const buildExport = (a: AdvisorMonthSummary) => {
    const motivos = new Map<string, { count: number; value: number }>();
    for (const l of a.excludedLines) {
      const prev = motivos.get(l.reason) || { count: 0, value: 0 };
      motivos.set(l.reason, {
        count: prev.count + 1,
        value: prev.value + l.totalWithVat,
      });
    }
    return {
      fileBase: `comisiones_${a.advisorName.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_${MONTHS[month].toLowerCase()}_${year}`,
      summary: [
        { Concepto: "Asesor", Valor: a.advisorName },
        { Concepto: "Periodo", Valor: `${MONTHS[month]} ${year}` },
        {
          Concepto: "Criterio del período",
          Valor: "Fecha de factura (si no hay factura, fecha de venta)",
        },
        { Concepto: "Pedidos del período", Valor: a.grossOrdersCount },
        { Concepto: "Ventas totales (con IVA)", Valor: Math.round(a.grossSalesWithVat) },
        { Concepto: "Pedidos considerados", Valor: a.ordersCount },
        { Concepto: "Valor considerado (con IVA)", Valor: Math.round(a.totalWithVat) },
        { Concepto: "Base sin IVA", Valor: Math.round(a.totalSinIva) },
        { Concepto: "Pedidos excluidos", Valor: a.excludedCount },
        { Concepto: "Valor excluido (con IVA)", Valor: Math.round(a.excludedWithVat) },
        { Concepto: "Comisión calculada", Valor: Math.round(a.rawCommission) },
        { Concepto: "Bono", Valor: Math.round(a.bonus) },
        { Concepto: "Total a pagar", Valor: Math.round(a.totalToPay) },
        ...Array.from(motivos.entries()).map(([reason, v]) => ({
          Concepto: `Motivo exclusión: ${reason}`,
          Valor: `${v.count} pedido(s) · ${fmt(v.value)}`,
        })),
      ],
      lines: a.lines,
      excluded: a.excludedLines,
    };
  };

  const grandTotal = summaries.reduce((s, a) => s + a.totalToPay, 0);


  return (
    <div className="space-y-6">
      {/* Header + selector de mes */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Comisiones de asesores</h2>
          <p className="text-sm text-muted-foreground">
            Cálculo automático según política oficial 2026.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-full sm:w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map(
                (y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

      </div>

      <CommissionRulesLegend />

      {/* Resumen política */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" /> Política aplicada
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>
            <b>Detal:</b> L-V {pct(0.12)} contado / {pct(0.10)} contraentrega · FDS{" "}
            {pct(0.20)} / {pct(0.17)} (solo si se desbloquea)
          </p>
          <p>
            <b>Mayor:</b> nuevo {pct(0.10)}/{pct(0.12)} FDS · recompra {pct(0.06)}/
            {pct(0.07)} FDS
          </p>
          <p>
            <b>Bonos:</b> {fmt(BONUS_TIER_1_AMOUNT)} desde {fmt(BONUS_TIER_1_THRESHOLD)}{" "}
            · desbloqueo FDS desde {fmt(UNLOCK_THRESHOLD)} · +
            {fmt(BONUS_TIER_2_AMOUNT)} desde {fmt(BONUS_TIER_2_THRESHOLD)}
          </p>
          <p>
            <b>Penalización:</b> {fmt(RETURN_PENALTY)} por pedido devuelto contraentrega.
            Comisión sobre valor SIN IVA (19%), descontando flete y cargos
            adicionales del pedido.
          </p>
        </CardContent>
      </Card>

      {/* Total general */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total a pagar — {MONTHS[month]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-emerald-600">{fmt(grandTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {summaries.length} asesor(es) con ventas facturadas en el período
          </p>
        </CardContent>
      </Card>

      {summaries.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              No hay pedidos pagados en este período.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {summaries.map((a) => {
            const isOpen = openAdvisor === a.advisorId;
            // Mismo desglose que ve el asesor: pendientes de pago vs excluidos.
            const pendientes = a.excludedLines.filter((l) => l.status === "pendiente");
            const excluidos = a.excludedLines.filter((l) => l.status === "excluido");
            return (
              <Card key={a.advisorId}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{a.advisorName}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{a.ordersCount} pedidos considerados</Badge>
                        <Badge variant="outline">
                          Base comisión: {fmt(a.totalWithVat)}
                        </Badge>
                        <Badge variant="outline">
                          Ventas del período: {fmt(a.grossSalesWithVat)} ({a.grossOrdersCount})
                        </Badge>
                        {pendientes.length > 0 && (
                          <Badge className="bg-amber-500">
                            {pendientes.length} pendientes de pago ·{" "}
                            {fmt(pendientes.reduce((s, l) => s + l.totalWithVat, 0))}
                          </Badge>
                        )}
                        {excluidos.length > 0 && (
                          <Badge variant="secondary">
                            {excluidos.length} excluidos ·{" "}
                            {fmt(excluidos.reduce((s, l) => s + l.totalWithVat, 0))}
                          </Badge>
                        )}
                        {a.weekendUnlocked ? (
                          <Badge className="bg-emerald-600">FDS desbloqueado</Badge>
                        ) : (
                          <Badge variant="secondary">FDS bloqueado</Badge>
                        )}
                        {a.bonus > 0 && (
                          <Badge className="bg-amber-500">Bono {fmt(a.bonus)}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-2xl font-bold text-emerald-600">
                        {fmt(a.totalToPay)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Comisión {fmt(a.rawCommission)} + Bono {fmt(a.bonus)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Misma cifra que el asesor ve como “Comisión causada”
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => exportCommissionsXlsx(buildExport(a))}
                        >
                          <Download className="h-3.5 w-3.5" /> Excel
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => exportCommissionsCsv(buildExport(a))}
                        >
                          <Download className="h-3.5 w-3.5" /> CSV
                        </Button>
                      </div>
                    </div>
                  </div>

                </CardHeader>
                <CardContent className="space-y-3">
                  {/* KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <KpiBox
                      label="Vendido s/IVA"
                      value={fmt(a.totalSinIva)}
                    />
                    <KpiBox
                      label="% FDS"
                      value={pct(a.weekendPct)}
                      ok={a.kpiWeekendPctOk}
                      hint={`mín ${pct(MIN_WEEKEND_PCT)}`}
                    />
                    <KpiBox
                      label="Ticket prom. detal"
                      value={fmt(a.ticketAvgDetal)}
                      ok={a.kpiTicketOk}
                      hint={`mín ${fmt(MIN_TICKET_DETAL)}`}
                    />
                    <KpiBox
                      label="Devoluciones"
                      value={`${a.returnsCount} (${fmt(a.returnsPenalty)})`}
                    />
                  </div>

                  <Collapsible
                    open={isOpen}
                    onOpenChange={(o) =>
                      setOpenAdvisor(o ? a.advisorId : null)
                    }
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <ChevronDown
                          className={`h-4 w-4 mr-1 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                        Ver detalle de pedidos ({a.lines.length})
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <Table className="table-fixed">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10 px-1" />
                            <TableHead>Cliente</TableHead>
                            <TableHead className="w-[90px] px-2">Día</TableHead>
                            <TableHead className="w-[150px] px-2">Forma de pago</TableHead>
                            <TableHead className="w-[120px] px-2 text-right">Total c/IVA</TableHead>
                            <TableHead className="w-[120px] px-2 text-right">Comisión</TableHead>
                            <TableHead className="w-[132px] px-2">Causación</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {a.lines.map((l) => {
                            const open = expandedLine === l.order.id;
                            return (
                              <Fragment key={l.order.id}>
                                <TableRow
                                  className="cursor-pointer"
                                  onClick={() => setExpandedLine(open ? null : l.order.id)}
                                >
                                  <TableCell className="w-10 px-1">
                                    <CommissionExpandButton
                                      open={open}
                                      label={l.order.client_name}
                                      onClick={() => setExpandedLine(open ? null : l.order.id)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium max-w-[200px] truncate">
                                    {l.order.client_name}
                                    {l.order.is_recompra && (
                                      <Badge variant="outline" className="ml-1 text-[10px]">
                                        recompra
                                      </Badge>
                                    )}
                                    {l.returned && (
                                      <Badge variant="destructive" className="ml-1 text-[10px]">
                                        Devuelto
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={l.weekend ? "default" : "secondary"}>
                                      {l.weekend ? "FDS" : "Semana"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Select
                                      value={l.paymentMode}
                                      onValueChange={(v) =>
                                        setLineOverride(l.order.id, {
                                          paymentMode: v as PaymentMode,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-7 w-full sm:w-[140px] text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="contado">
                                          Contado/Transf.
                                        </SelectItem>
                                        <SelectItem value="contraentrega">
                                          Contraentrega
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="text-right whitespace-nowrap">
                                    {fmt(l.totalWithVat)}
                                  </TableCell>
                                  <TableCell className="text-right font-bold whitespace-nowrap">
                                    {fmt(l.netCommission)}
                                    {l.penalty > 0 && (
                                      <div className="text-[10px] text-destructive">
                                        -{fmt(l.penalty)}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="w-[126px] px-2">
                                    <CommissionStatusBadge status={l.status} />
                                  </TableCell>
                                </TableRow>
                                {open && (
                                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableCell colSpan={7} className="py-3">
                                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-2 text-xs">
                                        <div>
                                          <p className="text-muted-foreground">Tipo</p>
                                          <p className="font-medium">
                                            {l.order.sale_type === "mayor" ? "Mayor" : "Detal"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground">Flete + cargos</p>
                                          <p className="font-medium">
                                            {l.shippingCost + l.extraCharges > 0
                                              ? `-${fmt(l.shippingCost + l.extraCharges)}`
                                              : "—"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground">Base usada c/IVA</p>
                                          <p className="font-medium">{fmt(l.commissionableWithVat)}</p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground">Base s/IVA</p>
                                          <p className="font-medium">{fmt(l.baseSinIva)}</p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground">Tarifa</p>
                                          <p className="font-medium">{pct(l.ratePct)}</p>
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
                    </CollapsibleContent>
                  </Collapsible>

                  {a.excludedLines.length > 0 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50/40 dark:bg-amber-950/10 p-3 space-y-2">
                      <p className="text-xs font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        Pedidos excluidos y motivo ({a.excludedLines.length} ·{" "}
                        {fmt(a.excludedWithVat)})
                      </p>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cliente</TableHead>
                              <TableHead>N° pedido</TableHead>
                              <TableHead className="text-right">Total c/IVA</TableHead>
                              <TableHead className="text-right">Abono</TableHead>
                              <TableHead>Motivo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {a.excludedLines.map((l) => (
                              <TableRow key={l.order.id}>
                                <TableCell className="font-medium">
                                  {l.order.client_name}
                                </TableCell>
                                <TableCell className="text-xs">
                                  <OrderCodeBadge code={(l.order as any).order_code} orderId={l.order.id} compact />
                                </TableCell>
                                <TableCell className="text-right">
                                  {fmt(l.totalWithVat)}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {fmt(Number(l.order.abono) || 0)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {l.reason}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
        <CardContent className="pt-4 text-xs flex gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            <b>Forma de pago</b> se ajusta manualmente aquí (default: contado).{" "}
            <b>Devolución</b> la registra Logística desde su módulo al recibir el paquete.
            Los KPIs de mayoristas nuevos y tiempo de respuesta se validan fuera del sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiBox({
  label,
  value,
  ok,
  hint,
}: {
  label: string;
  value: string;
  ok?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`rounded-md border p-2 ${
        ok === undefined
          ? "bg-muted/30"
          : ok
          ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20"
          : "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
      }`}
    >
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm flex items-center gap-1">
        {ok !== undefined && (
          <TrendingUp
            className={`h-3 w-3 ${
              ok ? "text-emerald-600" : "text-amber-600"
            }`}
          />
        )}
        {value}
      </p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
