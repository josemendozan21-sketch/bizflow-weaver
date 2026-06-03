import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useBudgetEntries, useMonthlyBudget, ADVISOR_EMAILS } from "@/hooks/useMonthlyBudget";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, X } from "lucide-react";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

export function IncomeCalendar({ year, month }: { year: number; month: number }) {
  const { data: budget } = useMonthlyBudget(year, month);
  const { data: entries = [] } = useBudgetEntries(budget?.id);
  const [selected, setSelected] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const toLocalISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const startDate = toLocalISO(monthStart);
  const endDate = toLocalISO(new Date(year, month, 1));

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
        const raw = String((o as any).advisor_name || "").toLowerCase().trim();
        let displayAdvisor = (o as any).advisor_name || "";
        for (const [name, aliases] of Object.entries(ADVISOR_EMAILS)) {
          if (aliases.some((a) => raw.includes(a.toLowerCase()))) {
            displayAdvisor = name;
            break;
          }
        }
        rows.push({
          id: `o-${(o as any).id}`,
          amount: Number((o as any).total_amount || 0),
          entry_date: d,
          category: `Asesor — ${displayAdvisor}`,
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

  const filteredIngresos = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return ingresos;
    return ingresos.filter((e) =>
      (e.category || "").toLowerCase().includes(q) ||
      (e.description || "").toLowerCase().includes(q)
    );
  }, [ingresos, searchTerm]);

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredIngresos) {
      const key = String(e.entry_date).slice(0, 10);
      map.set(key, (map.get(key) || 0) + Number(e.amount));
    }
    return map;
  }, [filteredIngresos]);

  const monthTotal = filteredIngresos.reduce((s, e) => s + Number(e.amount), 0);

  const selectedEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!selected) return [];
    const dayEntries = ingresos.filter((e) => String(e.entry_date).slice(0, 10) === toLocalISO(selected));
    if (!q) return dayEntries;
    return dayEntries.filter((e) =>
      (e.category || "").toLowerCase().includes(q) ||
      (e.description || "").toLowerCase().includes(q)
    );
  }, [ingresos, selected, searchTerm]);

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return filteredIngresos;
  }, [filteredIngresos, searchTerm]);

  // Leading offset
  const firstWeekday = (monthStart.getDay() + 6) % 7; // Monday=0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">
                Ingresos de {format(monthStart, "MMMM yyyy", { locale: es })}
              </CardTitle>
              <p className="text-sm text-muted-foreground">Total mes: <span className="font-medium text-emerald-600">{formatCOP(monthTotal)}</span></p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente o asesor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground mb-1">
            {["L","M","X","J","V","S","D"].map((d) => (<div key={d} className="text-center">{d}</div>))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, i) => (<div key={`b${i}`} />))}
            {days.map((d) => {
              const dKey = toLocalISO(d);
              const total = dailyTotals.get(dKey) || 0;
              const isSel = selected && toLocalISO(selected) === dKey;
              const hasMatch = searchTerm.trim() ? total > 0 : dailyTotals.has(dKey);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelected(d)}
                  className={`min-h-[64px] rounded-md border p-1 text-left transition-colors ${
                    isSel ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                  } ${hasMatch ? "bg-emerald-500/5" : ""}`}
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
            {searchTerm.trim()
              ? `Resultados (${searchResults.length})`
              : selected
                ? format(selected, "d 'de' MMMM", { locale: es })
                : "Selecciona un día"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {searchTerm.trim() ? (
            searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No se encontraron ingresos con ese criterio.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {searchResults.map((e) => (
                  <div key={e.id} className="border-l-2 border-emerald-500 pl-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs">{e.category}</Badge>
                      <span className="text-sm font-semibold text-emerald-700">{formatCOP(Number(e.amount))}</span>
                    </div>
                    {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
                    <p className="text-[10px] text-muted-foreground">{String(e.entry_date).slice(0, 10)}</p>
                  </div>
                ))}
                <div className="pt-2 border-t mt-2 flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span className="text-emerald-700">{formatCOP(searchResults.reduce((s, e) => s + Number(e.amount), 0))}</span>
                </div>
              </div>
            )
          ) : selectedEntries.length === 0 ? (
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
