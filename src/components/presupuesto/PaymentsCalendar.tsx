import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useScheduledPayments,
  useDeleteScheduledPayment,
  useBankAccounts,
  useMonthlyBudget,
  type ScheduledPayment,
} from "@/hooks/useMonthlyBudget";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { SchedulePaymentDialog } from "./SchedulePaymentDialog";
import { PayScheduledDialog } from "./PayScheduledDialog";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

export function PaymentsCalendar({ year, month }: { year: number; month: number }) {
  const { data: budget } = useMonthlyBudget(year, month);
  const { data: payments = [] } = useScheduledPayments(year, month);
  const { data: banks = [] } = useBankAccounts();
  const del = useDeleteScheduledPayment();
  const [selected, setSelected] = useState<Date | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<ScheduledPayment | null>(null);

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstWeekday = (monthStart.getDay() + 6) % 7;

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduledPayment[]>();
    for (const p of payments) {
      const arr = map.get(p.due_date) || [];
      arr.push(p);
      map.set(p.due_date, arr);
    }
    return map;
  }, [payments]);

  const monthBudgeted = payments.reduce((s, p) => s + Number(p.budgeted_amount), 0);
  const monthPaid = payments.filter((p) => p.status === "pagado").reduce((s, p) => s + Number(p.paid_amount || 0), 0);
  const monthPending = payments.filter((p) => p.status === "pendiente").reduce((s, p) => s + Number(p.budgeted_amount), 0);

  const selectedItems = selected
    ? payments.filter((p) => isSameDay(new Date(p.due_date), selected))
    : [];

  const handleDelete = (p: ScheduledPayment) => {
    if (!confirm(`¿Eliminar pago "${p.category}" de ${formatCOP(Number(p.budgeted_amount))}?`)) return;
    del.mutate(p.id, {
      onSuccess: () => toast.success("Pago eliminado"),
      onError: (e: any) => toast.error("Error: " + e.message),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Presupuestado</p>
          <p className="text-xl font-bold">{formatCOP(monthBudgeted)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Pagado real</p>
          <p className="text-xl font-bold text-emerald-600">{formatCOP(monthPaid)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Pendiente</p>
          <p className="text-xl font-bold text-destructive">{formatCOP(monthPending)}</p>
        </CardContent></Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setScheduleOpen(true)} disabled={!budget}>
          <Plus className="h-4 w-4 mr-1" /> Programar pago
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pagos de {format(monthStart, "MMMM yyyy", { locale: es })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground mb-1">
              {["L","M","X","J","V","S","D"].map((d) => (<div key={d} className="text-center">{d}</div>))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstWeekday }).map((_, i) => (<div key={`b${i}`} />))}
              {days.map((d) => {
                const items = byDay.get(d.toISOString().slice(0, 10)) || [];
                const pendientes = items.filter((p) => p.status === "pendiente").length;
                const pagados = items.filter((p) => p.status === "pagado").length;
                const isSel = selected && isSameDay(d, selected);
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelected(d)}
                    className={`min-h-[64px] rounded-md border p-1 text-left transition-colors ${
                      isSel ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="text-xs font-medium">{d.getDate()}</div>
                    {pendientes > 0 && (
                      <div className="text-[10px] text-destructive font-semibold leading-tight mt-1">
                        {pendientes} pend.
                      </div>
                    )}
                    {pagados > 0 && (
                      <div className="text-[10px] text-emerald-600 font-semibold leading-tight">
                        {pagados} pag.
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? format(selected, "d 'de' MMMM", { locale: es }) : "Selecciona un día"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">{selected ? "Sin pagos este día." : "Haz clic en un día."}</p>
            ) : (
              <div className="space-y-3">
                {selectedItems.map((p) => {
                  const bank = banks.find((b) => b.id === (p.paid_bank_account_id ?? p.bank_account_id));
                  return (
                    <div key={p.id} className="border rounded-md p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{p.category}</span>
                          {p.description && <span className="text-xs text-muted-foreground">{p.description}</span>}
                        </div>
                        <Badge variant={p.status === "pagado" ? "default" : "destructive"}>{p.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Presup.: <span className="font-medium text-foreground">{formatCOP(Number(p.budgeted_amount))}</span>
                        {p.status === "pagado" && (
                          <> · Real: <span className="font-medium text-emerald-700">{formatCOP(Number(p.paid_amount))}</span></>
                        )}
                      </div>
                      {bank && <div className="text-xs text-muted-foreground">Banco: {bank.name}</div>}
                      <div className="flex gap-1 pt-1">
                        {p.status === "pendiente" && (
                          <Button size="sm" variant="default" onClick={() => setPayTarget(p)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Marcar pagado
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(p)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {scheduleOpen && budget && (
        <SchedulePaymentDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          budgetId={budget.id}
          defaultDate={selected ? selected.toISOString().slice(0, 10) : undefined}
        />
      )}
      {payTarget && (
        <PayScheduledDialog
          payment={payTarget}
          onClose={() => setPayTarget(null)}
        />
      )}
    </div>
  );
}