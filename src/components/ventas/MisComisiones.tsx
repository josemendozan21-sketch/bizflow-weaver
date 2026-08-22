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
import { Loader2, Info, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/contexts/AuthContext";
import {
  summarizeAdvisorProgress,
  BONUS_TIER_1_THRESHOLD,
  BONUS_TIER_1_AMOUNT,
  BONUS_TIER_2_THRESHOLD,
  BONUS_TIER_2_AMOUNT,
  UNLOCK_THRESHOLD,
} from "@/lib/commissions";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

type Filter = "todos" | "facturado" | "pendiente";

export default function MisComisiones() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useOrders();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [filter, setFilter] = useState<Filter>("todos");

  const summary = useMemo(
    () => summarizeAdvisorProgress(orders, year, month, user?.id),
    [orders, year, month, user?.id]
  );

  const lines = useMemo(() => {
    if (filter === "facturado") return summary.lines.filter((l) => l.invoiced);
    if (filter === "pendiente") return summary.lines.filter((l) => !l.invoiced);
    return summary.lines;
  }, [summary.lines, filter]);

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
            Cómo vas este mes según los pedidos que has montado.
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
        </div>

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
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Facturado
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
              <Clock className="h-4 w-4 text-amber-600" /> Pendiente por facturar
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
              Comisión + bono si se factura todo
            </p>
          </CardContent>
        </Card>
      </div>

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
            El pago se liquida sobre pedidos facturados. Los pedidos pendientes por
            facturar se pagan cuando contabilidad los facture; la comisión se calcula
            sobre el valor sin IVA.
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
                ["facturado", "Facturados"],
                ["pendiente", "Por facturar"],
              ] as [Filter, string][]).map(([v, label]) => (
                <Button
                  key={v}
                  size="sm"
                  variant={filter === v ? "default" : "outline"}
                  onClick={() => setFilter(v)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No hay pedidos en este período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Base sin IVA</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Comisión</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.order.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(l.date, "d MMM", { locale: es })}
                        {l.weekend && (
                          <Badge variant="outline" className="ml-1 text-[10px]">FDS</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {l.order.client_name}
                      </TableCell>
                      <TableCell className="text-xs">
                        {l.order.sale_type === "menor" ? "Detal" : "Mayor"}
                        {" · "}
                        {l.clientKind === "recompra" ? "Recompra" : "Nuevo"}
                      </TableCell>
                      <TableCell className="text-right">{fmt(l.totalWithVat)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {fmt(l.baseSinIva)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(l.ratePct * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {fmt(l.netCommission)}
                      </TableCell>
                      <TableCell>
                        {l.returned ? (
                          <Badge variant="destructive">Devuelto</Badge>
                        ) : l.invoiced ? (
                          <Badge className="bg-emerald-600">Facturado</Badge>
                        ) : (
                          <Badge className="bg-amber-500">Por facturar</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
