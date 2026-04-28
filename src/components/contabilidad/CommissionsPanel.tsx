import { useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { ChevronDown, Info, TrendingUp, AlertCircle } from "lucide-react";
import type { Order } from "@/hooks/useOrders";
import {
  summarizeAdvisorMonth,
  type OrderOverrides,
  type PaymentMode,
  BONUS_TIER_1_THRESHOLD,
  BONUS_TIER_1_AMOUNT,
  UNLOCK_THRESHOLD,
  BONUS_TIER_2_THRESHOLD,
  BONUS_TIER_2_AMOUNT,
  MIN_WEEKEND_PCT,
  MIN_TICKET_DETAL,
  RETURN_PENALTY,
} from "@/lib/commissions";

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

  const summaries = useMemo(
    () => summarizeAdvisorMonth(orders, overrides, year, month),
    [orders, overrides, year, month]
  );

  const setLineOverride = (
    orderId: string,
    patch: Partial<{ paymentMode: PaymentMode; returned: boolean }>
  ) => {
    setOverrides((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], ...patch },
    }));
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
              {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map(
                (y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

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
            Comisión sobre valor SIN IVA (19%).
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
              No hay pedidos facturados en este período.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {summaries.map((a) => {
            const isOpen = openAdvisor === a.advisorId;
            return (
              <Card key={a.advisorId}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{a.advisorName}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{a.ordersCount} pedidos</Badge>
                        <Badge variant="outline">
                          Vendido: {fmt(a.totalWithVat)}
                        </Badge>
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
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">
                        {fmt(a.totalToPay)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Comisión {fmt(a.rawCommission)} + Bono {fmt(a.bonus)}
                      </p>
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
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Día</TableHead>
                              <TableHead>Forma de pago</TableHead>
                              <TableHead>Devuelto</TableHead>
                              <TableHead className="text-right">Total c/IVA</TableHead>
                              <TableHead className="text-right">Base s/IVA</TableHead>
                              <TableHead className="text-right">%</TableHead>
                              <TableHead className="text-right">Comisión</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {a.lines.map((l) => (
                              <TableRow key={l.order.id}>
                                <TableCell className="font-medium">
                                  {l.order.client_name}
                                  {l.order.is_recompra && (
                                    <Badge
                                      variant="outline"
                                      className="ml-1 text-[10px]"
                                    >
                                      recompra
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {l.order.sale_type === "mayor" ? "Mayor" : "Detal"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={l.weekend ? "default" : "secondary"}
                                  >
                                    {l.weekend ? "FDS" : "Semana"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={l.paymentMode}
                                    onValueChange={(v) =>
                                      setLineOverride(l.order.id, {
                                        paymentMode: v as PaymentMode,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-7 w-[140px] text-xs">
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
                                <TableCell>
                                  <Checkbox
                                    checked={l.returned}
                                    disabled={l.paymentMode !== "contraentrega"}
                                    onCheckedChange={(v) =>
                                      setLineOverride(l.order.id, {
                                        returned: !!v,
                                      })
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  {fmt(l.totalWithVat)}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {fmt(l.baseSinIva)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {pct(l.ratePct)}
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {fmt(l.netCommission)}
                                  {l.penalty > 0 && (
                                    <div className="text-[10px] text-destructive">
                                      -{fmt(l.penalty)}
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
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
            Los campos <b>Forma de pago</b> y <b>Devuelto</b> se ajustan manualmente.
            Por defecto cada pedido se calcula como contado/transferencia inmediata.
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
