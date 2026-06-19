import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Wallet, Trophy, CalendarClock } from "lucide-react";

function fmt(n: number) {
  return `$ ${Math.round(n).toLocaleString("es-CO")}`;
}

interface Receivable {
  id: string;
  client_name: string;
  saldo: number;
  days: number;
  advisor_name: string | null;
}

interface AdvisorRow {
  name: string;
  total: number;
  count: number;
}

interface UpcomingPayment {
  id: string;
  description: string;
  category: string | null;
  due_date: string;
  amount: number;
  status: string;
}

export function AdminFocusPanels() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [totalCartera, setTotalCartera] = useState(0);
  const [advisors, setAdvisors] = useState<AdvisorRow[]>([]);
  const [payments, setPayments] = useState<UpcomingPayment[]>([]);
  const [totalUpcoming, setTotalUpcoming] = useState(0);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const in30 = new Date(now);
      in30.setDate(in30.getDate() + 30);

      const [{ data: pending }, { data: monthOrders }, { data: upcoming }] =
        await Promise.all([
          supabase
            .from("orders")
            .select("id, client_name, total_amount, abono, advisor_name, created_at, invoice_date")
            .eq("payment_complete", false),
          supabase
            .from("orders")
            .select("total_amount, advisor_name")
            .gte("created_at", startOfMonth.toISOString()),
          supabase
            .from("scheduled_payments" as any)
            .select("id, description, category, due_date, budgeted_amount, paid_amount, status")
            .neq("status", "pagado")
            .lte("due_date", in30.toISOString().slice(0, 10))
            .order("due_date", { ascending: true })
            .limit(15),
        ]);

      const recs: Receivable[] = (pending ?? [])
        .map((r: any) => {
          const saldo = Math.max(0, Number(r.total_amount || 0) - Number(r.abono || 0));
          const base = r.invoice_date ? new Date(r.invoice_date) : new Date(r.created_at);
          return {
            id: r.id,
            client_name: r.client_name,
            saldo,
            days: Math.max(0, differenceInDays(new Date(), base)),
            advisor_name: r.advisor_name,
          };
        })
        .filter((r) => r.saldo > 0)
        .sort((a, b) => b.saldo - a.saldo);

      setTotalCartera(recs.reduce((s, r) => s + r.saldo, 0));
      setReceivables(recs.slice(0, 6));

      const grouped = new Map<string, AdvisorRow>();
      (monthOrders ?? []).forEach((o: any) => {
        const name = o.advisor_name || "Sin asesor";
        const row = grouped.get(name) ?? { name, total: 0, count: 0 };
        row.total += Number(o.total_amount || 0);
        row.count += 1;
        grouped.set(name, row);
      });
      setAdvisors(
        Array.from(grouped.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 6),
      );

      const pays: UpcomingPayment[] = (upcoming ?? []).map((p: any) => ({
        id: p.id,
        description: p.description,
        category: p.category,
        due_date: p.due_date,
        amount: Math.max(0, Number(p.budgeted_amount || 0) - Number(p.paid_amount || 0)),
        status: p.status,
      }));
      setPayments(pays);
      setTotalUpcoming(pays.reduce((s, p) => s + p.amount, 0));
    })();
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Cartera */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-orange-600" />
            Cartera por cobrar
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Total pendiente: <span className="font-semibold text-foreground">{fmt(totalCartera)}</span>
          </p>
        </CardHeader>
        <CardContent>
          {receivables.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pedidos pendientes de pago.</p>
          ) : (
            <ul className="divide-y">
              {receivables.map((r) => (
                <li key={r.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{r.client_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {r.advisor_name ?? "—"} · {r.days} días
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">{fmt(r.saldo)}</p>
                    {r.days >= 30 && (
                      <Badge variant="destructive" className="text-[9px] h-4">
                        vencida
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Top asesores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600" />
            Top asesores — mes actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {advisors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin ventas este mes.</p>
          ) : (
            <ul className="space-y-2">
              {advisors.map((a, idx) => {
                const max = advisors[0]?.total || 1;
                const pct = Math.round((a.total / max) * 100);
                return (
                  <li key={a.name} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">
                        <span className="text-muted-foreground mr-1">#{idx + 1}</span>
                        {a.name}
                      </span>
                      <span className="font-semibold shrink-0">{fmt(a.total)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {a.count} pedidos
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Próximos pagos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-rose-600" />
            Próximos pagos — 30 días
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{fmt(totalUpcoming)}</span>
          </p>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay pagos programados próximos.</p>
          ) : (
            <ul className="divide-y">
              {payments.map((p) => {
                const date = parseISO(p.due_date);
                const days = differenceInDays(date, new Date());
                const overdue = days < 0;
                return (
                  <li key={p.id} className="py-2 flex items-center gap-3">
                    <div className="flex flex-col items-center w-11 shrink-0">
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {format(date, "MMM", { locale: es })}
                      </span>
                      <span className="text-base font-bold leading-none">
                        {format(date, "d")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.description}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {p.category ?? "—"}
                        {overdue ? ` · vencido ${Math.abs(days)}d` : ` · en ${days}d`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">{fmt(p.amount)}</p>
                      {overdue && (
                        <Badge variant="destructive" className="text-[9px] h-4">
                          vencido
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}