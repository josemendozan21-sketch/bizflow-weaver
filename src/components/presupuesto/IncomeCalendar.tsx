import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBudgetEntries, useMonthlyBudget } from "@/hooks/useMonthlyBudget";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

export function IncomeCalendar({ year, month }: { year: number; month: number }) {
  const { data: budget } = useMonthlyBudget(year, month);
  const { data: entries = [] } = useBudgetEntries(budget?.id);
  const [selected, setSelected] = useState<Date | null>(null);

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDate = monthStart.toISOString().slice(0, 10);
  const endDate = new Date(year, month, 1).toISOString().slice(0, 10);

  const { data: autoIncome = [] } = useQuery({
    queryKey: ["income_calendar_auto", year, month],
    queryFn: async () => {
      const [ordersRes, feriaRes, posRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total_amount, payment_date, created_at, advisor_name, client_name, brand")
          .gte("payment_date", startDate)
          .lt("payment_date", endDate),
        supabase
          .from("feria_sales")
          .select("id, total_amount, sale_date, product_name")
          .gte("sale_date", startDate)
          .lt("sale_date", endDate),
        supabase
          .from("pos_sales")
          .select("id, total_amount, sale_date")
          .gte("sale_date", startDate)
          .lt("sale_date", endDate),
      ]);
      const rows: { id: string; amount: number; entry_date: string; category: string; description: string | null }[] = [];
      for (const o of ordersRes.data ?? []) {
        const d = (o as any).payment_date || String((o as any).created_at).slice(0, 10);
        rows.push({
          id: `o-${(o as any).id}`,
          amount: Number((o as any).total_amount || 0),
          entry_date: d,
          category: `Asesor — ${(o as any).advisor_name || ""}`,
          description: `${(o as any).client_name || ""}${(o as any).brand ? ` · ${(o as any).brand}` : ""}`,
        });
      }
      for (const f of feriaRes.data ?? []) {
        rows.push({
          id: `f-${(f as any).id}`,
          amount: Number((f as any).total_amount || 0),
          entry_date: String((f as any).sale_date).slice(0, 10),
          category: "Ferias",
          description: (f as any).product_name || null,
        });
      }
      for (const p of posRes.data ?? []) {
        rows.push({
          id: `p-${(p as any).id}`,
          amount: Number((p as any).total_amount || 0),
          entry_date: String((p as any).sale_date).slice(0, 10),
          category: "Punto 92",
          description: null,
        });
      }
      return rows;
    },
  });

  const ingresos = useMemo(() => {
    const manual = entries
      .filter((e) => e.kind === "ingreso")
      .map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        entry_date: e.entry_date,
        category: e.category,
        description: e.description,
      }));
    return [...manual, ...autoIncome];
  }, [entries, autoIncome]);

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of ingresos) {
      const key = e.entry_date;
      map.set(key, (map.get(key) || 0) + Number(e.amount));
    }
    return map;
  }, [ingresos]);

  const monthTotal = ingresos.reduce((s, e) => s + Number(e.amount), 0);
  const selectedEntries = selected
    ? ingresos.filter((e) => isSameDay(new Date(e.entry_date), selected))
    : [];

  // Leading offset
  const firstWeekday = (monthStart.getDay() + 6) % 7; // Monday=0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Ingresos de {format(monthStart, "MMMM yyyy", { locale: es })}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Total mes: <span className="font-medium text-emerald-600">{formatCOP(monthTotal)}</span></p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground mb-1">
            {["L","M","X","J","V","S","D"].map((d) => (<div key={d} className="text-center">{d}</div>))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, i) => (<div key={`b${i}`} />))}
            {days.map((d) => {
              const total = dailyTotals.get(d.toISOString().slice(0, 10)) || 0;
              const isSel = selected && isSameDay(d, selected);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelected(d)}
                  className={`min-h-[64px] rounded-md border p-1 text-left transition-colors ${
                    isSel ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                  } ${total > 0 ? "bg-emerald-500/5" : ""}`}
                >
                  <div className="text-xs font-medium">{d.getDate()}</div>
                  {total > 0 && (
                    <div className="text-[10px] text-emerald-700 font-semibold mt-1 leading-tight">
                      {formatCOP(total)}
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
          {selectedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{selected ? "Sin ingresos este día." : "Haz clic en un día del calendario."}</p>
          ) : (
            <div className="space-y-2">
              {selectedEntries.map((e) => (
                <div key={e.id} className="border-l-2 border-emerald-500 pl-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-xs">{e.category}</Badge>
                    <span className="text-sm font-semibold text-emerald-700">{formatCOP(Number(e.amount))}</span>
                  </div>
                  {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
                </div>
              ))}
              <div className="pt-2 border-t mt-2 flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span className="text-emerald-700">{formatCOP(selectedEntries.reduce((s, e) => s + Number(e.amount), 0))}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}