import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertTriangle, Clock, Trophy, Percent } from "lucide-react";
import type { Order } from "@/hooks/useOrders";
import { useComplianceRules, type ComplianceArea } from "@/hooks/useComplianceRules";
import { AREA_LABELS, summarizeAreaCompliance } from "@/lib/compliance";

const AREAS: ComplianceArea[] = ["produccion", "estampacion", "logistica"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatMoney(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "a_tiempo") return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">A tiempo</Badge>;
  if (status === "atrasado") return <Badge variant="destructive">Atrasado</Badge>;
  if (status === "pendiente_vencido") return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Vencido pendiente</Badge>;
  return <Badge variant="secondary">Pendiente</Badge>;
}

const AreaCompliancePanel = ({ orders }: { orders: Order[] }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const { data: rules = [] } = useComplianceRules();

  const summaries = useMemo(() => {
    return AREAS.map((area) => {
      const rule = rules.find((r) => r.area === area) ?? null;
      return summarizeAreaCompliance(orders, area, rule, year, month);
    });
  }, [orders, rules, year, month]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Comisión = % sobre el valor SIN IVA de pedidos entregados a tiempo en la etapa del área.
          Solo se paga si se supera el umbral mínimo de cumplimiento.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaries.map((s) => (
          <Card key={s.area} className={s.unlocked ? "border-emerald-300 dark:border-emerald-700" : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{AREA_LABELS[s.area]}</span>
                {s.unlocked ? (
                  <Badge className="bg-emerald-100 text-emerald-800 gap-1 hover:bg-emerald-100"><Trophy className="h-3 w-3" /> Activa</Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" /> Bloqueada</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-bold">
                {(s.compliancePct * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                Cumplimiento ({s.onTimeOrders}/{s.onTimeOrders + s.lateOrders} resueltos)
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-2">
                <div className="flex flex-col items-center rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold">{s.onTimeOrders}</span>
                  <span className="text-muted-foreground">A tiempo</span>
                </div>
                <div className="flex flex-col items-center rounded-md bg-rose-50 dark:bg-rose-950/30 p-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span className="font-semibold">{s.lateOrders}</span>
                  <span className="text-muted-foreground">Atrasados</span>
                </div>
                <div className="flex flex-col items-center rounded-md bg-amber-50 dark:bg-amber-950/30 p-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold">{s.pendingOrders}</span>
                  <span className="text-muted-foreground">Pendientes</span>
                </div>
              </div>
              <div className="border-t pt-2 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base a tiempo (sin IVA)</span>
                  <span className="font-medium">{formatMoney(s.totalSinIvaOnTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Comisión ({s.rule?.percentage ?? 0}%)
                  </span>
                  <span className="font-medium">{formatMoney(s.baseCommission)}</span>
                </div>
                {s.bonus > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Bono</span>
                    <span className="font-medium">{formatMoney(s.bonus)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1">
                  <span className="font-semibold">Total a pagar</span>
                  <span className="font-bold text-primary">{formatMoney(s.totalToPay)}</span>
                </div>
              </div>
              {!s.unlocked && s.rule && (
                <p className="text-xs text-muted-foreground">
                  Mínimo para desbloquear: {(s.rule.min_threshold_pct * 100).toFixed(0)}%
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="produccion">
        <TabsList>
          {AREAS.map((a) => (
            <TabsTrigger key={a} value={a}>{AREA_LABELS[a]}</TabsTrigger>
          ))}
        </TabsList>
        {summaries.map((s) => (
          <TabsContent key={s.area} value={s.area}>
            <Card>
              <CardContent className="pt-6">
                {s.lines.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sin pedidos para este mes.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Fecha objetivo</TableHead>
                        <TableHead>Fecha real</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Días</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.lines.map((l) => (
                        <TableRow key={l.order.id}>
                          <TableCell className="font-medium">{l.order.client_name}</TableCell>
                          <TableCell className="text-sm">{l.order.product} ×{l.order.quantity}</TableCell>
                          <TableCell className="text-sm">{l.dueDate?.slice(0, 10) ?? "—"}</TableCell>
                          <TableCell className="text-sm">{l.completedAt?.slice(0, 10) ?? "—"}</TableCell>
                          <TableCell><StatusBadge status={l.status} /></TableCell>
                          <TableCell className={l.daysDiff != null && l.daysDiff < 0 ? "text-rose-600" : "text-emerald-700"}>
                            {l.daysDiff != null ? (l.daysDiff >= 0 ? `+${l.daysDiff}` : l.daysDiff) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatMoney(l.totalWithVat)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AreaCompliancePanel;