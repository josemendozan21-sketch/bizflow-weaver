import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Users,
  Store,
  Wallet,
  Clock,
  TrendingUp,
  Target,
  Calendar as CalendarIcon,
  Instagram,
  HandCoins,
  Banknote,
} from "lucide-react";

const LOCATION_92 = "73050f3b-1c8e-44f1-9d0d-94772216c100";

function fmt(n: number) {
  return `$ ${Math.round(n).toLocaleString("es-CO")}`;
}

interface Kpis {
  ventasAsesoresDia: number;
  ventasPosDia: number;
  recaudosDia: number;
  cajaEmpresa: number;
  cuentasPorCobrar: number;
  ventasMesTotal: number;
  presupuestoProyectado: number;
  presupuestoEjecutado: number;
}

interface SocialPostLite {
  id: string;
  brand: string;
  title: string;
  scheduled_date: string;
  status: string;
  networks: string[] | null;
}

const brandColor: Record<string, string> = {
  bionovations: "bg-primary/10 text-primary",
  sweatspot: "bg-blue-500/10 text-blue-600",
  magical: "bg-pink-500/10 text-pink-600",
};

export function AdminTodayDashboard() {
  const [kpis, setKpis] = useState<Kpis>({
    ventasAsesoresDia: 0,
    ventasPosDia: 0,
    recaudosDia: 0,
    cajaEmpresa: 0,
    cuentasPorCobrar: 0,
    ventasMesTotal: 0,
    presupuestoProyectado: 0,
    presupuestoEjecutado: 0,
  });
  const [posts, setPosts] = useState<SocialPostLite[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const in14 = new Date(now);
      in14.setDate(in14.getDate() + 14);
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const [
        { data: ordersDay },
        { data: ordersMonth },
        { data: posDay },
        { data: posMonth },
        { data: pending },
        { data: banks },
        { data: budget },
        { data: nextPosts },
        { data: paymentsDay },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("total_amount, created_at, invoice_date")
          .gte("created_at", startOfDay.toISOString()),
        supabase
          .from("orders")
          .select("total_amount, created_at, invoice_date")
          .gte("created_at", startOfMonth.toISOString()),
        supabase
          .from("pos_sales")
          .select("total_amount")
          .eq("location_id", LOCATION_92)
          .gte("sale_date", startOfDay.toISOString()),
        supabase
          .from("pos_sales")
          .select("total_amount")
          .eq("location_id", LOCATION_92)
          .gte("sale_date", startOfMonth.toISOString()),
        supabase
          .from("orders")
          .select("total_amount, abono")
          .eq("payment_complete", false),
        supabase.from("bank_accounts" as any).select("current_balance, active"),
        supabase
          .from("monthly_budgets" as any)
          .select("id")
          .eq("year", now.getFullYear())
          .eq("month", now.getMonth() + 1)
          .maybeSingle(),
        supabase
          .from("social_posts")
          .select("id, brand, title, scheduled_date, status, networks")
          .eq("status", "programado")
          .gte("scheduled_date", startOfDay.toISOString().slice(0, 10))
          .lte("scheduled_date", in14.toISOString().slice(0, 10))
          .order("scheduled_date", { ascending: true })
          .limit(20),
        supabase
          .from("order_payments")
          .select("amount")
          .eq("payment_date", todayStr),
      ]);

      const ventasAsesoresDia = (ordersDay ?? []).reduce(
        (s, r: any) => s + Number(r.total_amount || 0),
        0,
      );
      const ventasPosDia = (posDay ?? []).reduce(
        (s, r: any) => s + Number(r.total_amount || 0),
        0,
      );
      const ventasMesTotal =
        (ordersMonth ?? []).reduce((s, r: any) => s + Number(r.total_amount || 0), 0) +
        (posMonth ?? []).reduce((s, r: any) => s + Number(r.total_amount || 0), 0);
      const cuentasPorCobrar = (pending ?? []).reduce(
        (s, r: any) =>
          s + Math.max(0, Number(r.total_amount || 0) - Number(r.abono || 0)),
        0,
      );
      const cajaEmpresa = (banks ?? [])
        .filter((b: any) => b.active !== false)
        .reduce((s, b: any) => s + Number(b.current_balance || 0), 0);
      const recaudosDia = (paymentsDay ?? []).reduce(
        (s, r: any) => s + Number(r.amount || 0),
        0,
      );

      let presupuestoProyectado = 0;
      let presupuestoEjecutado = 0;
      const budgetId = (budget as any)?.id;
      if (budgetId) {
        const [{ data: lines }, { data: entries }] = await Promise.all([
          supabase
            .from("budget_lines" as any)
            .select("kind, projected_amount")
            .eq("budget_id", budgetId),
          supabase
            .from("budget_entries" as any)
            .select("kind, amount")
            .eq("budget_id", budgetId),
        ]);
        presupuestoProyectado = (lines ?? [])
          .filter((l: any) => l.kind === "ingreso")
          .reduce((s, l: any) => s + Number(l.projected_amount || 0), 0);
        presupuestoEjecutado = (entries ?? [])
          .filter((e: any) => e.kind === "ingreso")
          .reduce((s, e: any) => s + Number(e.amount || 0), 0);
      }

      setKpis({
        ventasAsesoresDia,
        ventasPosDia,
        recaudosDia,
        cajaEmpresa,
        cuentasPorCobrar,
        ventasMesTotal,
        presupuestoProyectado,
        presupuestoEjecutado,
      });
      setPosts((nextPosts ?? []) as SocialPostLite[]);
    })();
  }, []);

  const avancePresupuesto =
    kpis.presupuestoProyectado > 0
      ? Math.round((kpis.presupuestoEjecutado / kpis.presupuestoProyectado) * 100)
      : 0;

  const cards = [
    {
      title: "Ventas del día — Asesores",
      value: fmt(kpis.ventasAsesoresDia),
      icon: Users,
      color: "text-blue-600 bg-blue-500/10",
    },
    {
      title: "Ventas del día — Punto 92",
      value: fmt(kpis.ventasPosDia),
      icon: Store,
      color: "text-emerald-600 bg-emerald-500/10",
    },
    {
      title: "Recaudos de pedidos",
      value: fmt(kpis.recaudosDia),
      subtitle: "Abonos a pedidos pendientes (banco)",
      icon: HandCoins,
      color: "text-green-700 bg-green-500/15",
    },
    {
      title: "Recaudos del punto",
      value: fmt(kpis.ventasPosDia),
      subtitle: "Dinero recaudado en Punto 92 hoy",
      icon: Banknote,
      color: "text-pink-600 bg-pink-500/15",
    },
    {
      title: "Caja empresa (bancos)",
      value: fmt(kpis.cajaEmpresa),
      icon: Wallet,
      color: "text-amber-600 bg-amber-500/10",
    },
    {
      title: "Cuentas por cobrar",
      value: fmt(kpis.cuentasPorCobrar),
      icon: Clock,
      color: "text-orange-600 bg-orange-500/10",
    },
    {
      title: "Ventas totales del mes",
      value: fmt(kpis.ventasMesTotal),
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-500/10",
    },
    {
      title: "Presupuesto proyectado",
      value: fmt(kpis.presupuestoProyectado),
      subtitle:
        kpis.presupuestoProyectado > 0
          ? `Ejecutado ${fmt(kpis.presupuestoEjecutado)} · ${avancePresupuesto}%`
          : "Sin presupuesto del mes",
      icon: Target,
      color: "text-rose-600 bg-rose-500/10",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title}>
              <CardContent className="p-5 flex items-start gap-3">
                <div className={`rounded-lg p-2 ${c.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{c.title}</p>
                  <p className="text-xl font-bold truncate">{c.value}</p>
                  {(c as any).subtitle && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {(c as any).subtitle}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Publicaciones programadas — próximos 14 días
          </CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay publicaciones programadas en los próximos 14 días.
            </p>
          ) : (
            <ul className="divide-y">
              {posts.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center gap-3">
                  <div className="flex flex-col items-center w-12 shrink-0">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {format(parseISO(p.scheduled_date), "MMM", { locale: es })}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {format(parseISO(p.scheduled_date), "d")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${brandColor[p.brand] ?? ""}`}
                      >
                        {p.brand}
                      </Badge>
                      {(p.networks ?? []).slice(0, 3).map((n) => (
                        <span
                          key={n}
                          className="text-[10px] text-muted-foreground inline-flex items-center gap-1"
                        >
                          <Instagram className="h-3 w-3" />
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}