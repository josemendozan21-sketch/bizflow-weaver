import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search, Send } from "lucide-react";
import { toast } from "sonner";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";
import { supabase } from "@/integrations/supabase/client";
import { requestProductionForOrder } from "@/lib/orderFlow";
import { matchesQuery } from "@/lib/search";

interface UnroutedOrder {
  id: string;
  order_code: string | null;
  brand: string;
  client_name: string;
  product: string;
  quantity: number;
  advisor_name: string | null;
  advisor_id: string | null;
  delivery_date: string | null;
  logo_url: string | null;
  ink_color: string | null;
  gel_color: string | null;
  silicone_color: string | null;
  observations: string | null;
  created_at: string;
  submission_id: string | null;
  /** Estado de la solicitud de Diseño que aún bloquea la entrada a Producción. */
  logo_pending: string | null;
}

/** Quién debe actuar según el estado del logo (mismo bloqueo que aplica el sistema). */
export function logoPendingLabel(status: string): string {
  if (status === "pendiente_diseno") return "Logo pendiente en Diseño";
  if (status === "ajustes_solicitados") return "Diseño está ajustando el logo";
  return "Esperando que la asesora apruebe el logo";
}

const daysSince = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export default function UnroutedOrdersPanel({ readOnly = false }: { readOnly?: boolean }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["unrouted-orders"],
    queryFn: async (): Promise<UnroutedOrder[]> => {
      const { data: pending, error } = await supabase
        .from("orders")
        .select("id, order_code, brand, client_name, product, quantity, advisor_name, advisor_id, delivery_date, logo_url, ink_color, gel_color, silicone_color, observations, created_at, submission_id")
        .in("production_status", ["pendiente", "aprobado"])
        .is("inventory_archived_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const list = (pending ?? []) as unknown as UnroutedOrder[];
      if (list.length === 0) return [];

      const { data: pos, error: poErr } = await supabase
        .from("production_orders")
        .select("order_id")
        .in("order_id", list.map((o) => o.id));
      if (poErr) throw poErr;
      const routed = new Set((pos ?? []).map((p: { order_id: string }) => p.order_id));
      const unrouted = list.filter((o) => !routed.has(o.id));

      // Logo sin aprobar (del pedido o de otra línea del mismo envío): el sistema
      // no deja crear la orden de producción, así que se avisa antes de intentar.
      const subs = Array.from(new Set(unrouted.map((o) => o.submission_id).filter(Boolean) as string[]));
      const groupOf = new Map<string, string>(); // order_id -> clave de grupo
      unrouted.forEach((o) => groupOf.set(o.id, o.submission_id || o.id));
      for (let i = 0; i < subs.length; i += 100) {
        const { data: sib } = await supabase
          .from("orders")
          .select("id, submission_id")
          .in("submission_id", subs.slice(i, i + 100));
        (sib ?? []).forEach((r: { id: string; submission_id: string | null }) => {
          if (r.submission_id) groupOf.set(r.id, r.submission_id);
        });
      }
      const pendingByGroup = new Map<string, string>();
      const ids = Array.from(groupOf.keys());
      for (let i = 0; i < ids.length; i += 150) {
        const { data: lrs } = await supabase
          .from("logo_requests")
          .select("order_id, status")
          .in("order_id", ids.slice(i, i + 150))
          .not("status", "in", "(aprobado,finalizado)");
        (lrs ?? []).forEach((lr: { order_id: string | null; status: string }) => {
          const g = lr.order_id ? groupOf.get(lr.order_id) : undefined;
          if (g) pendingByGroup.set(g, lr.status);
        });
      }
      unrouted.forEach((o) => {
        o.logo_pending = pendingByGroup.get(o.submission_id || o.id) ?? null;
      });

      // Aviso a Inventarios por cada pedido con más de 2 días sin rutear (una sola vez por pedido)
      if (!readOnly) {
        const late = unrouted.filter((o) => daysSince(o.created_at) > 2);
        if (late.length > 0) {
          const { data: already } = await supabase
            .from("notifications")
            .select("reference_id")
            .eq("target_role", "inventarios")
            .eq("title", "Pedido sin rutear a producción")
            .in("reference_id", late.map((o) => o.id));
          const notified = new Set((already ?? []).map((n: { reference_id: string | null }) => n.reference_id));
          const rows = late
            .filter((o) => !notified.has(o.id))
            .map((o) => ({
              target_role: "inventarios",
              title: "Pedido sin rutear a producción",
              message: `${o.order_code ? o.order_code + " — " : ""}${o.client_name}: ${o.quantity} uds de "${o.product}" llevan ${daysSince(o.created_at)} día(s) esperando ruteo.`,
              type: "warning",
              reference_id: o.id,
            }));
          if (rows.length > 0) {
            await supabase.from("notifications").insert(rows as never);
          }
        }
      }

      return unrouted;
    },
    refetchInterval: 60_000,
  });


  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return orders;
    return orders.filter((o) =>
      matchesQuery([o.order_code, o.client_name, o.product, o.advisor_name, o.brand], q),
    );
  }, [orders, search]);

  const route = async (o: UnroutedOrder) => {
    setBusy(o.id);
    try {
      await requestProductionForOrder({
        order: {
          id: o.id,
          brand: o.brand,
          client_name: o.client_name,
          product: o.product,
          quantity: o.quantity,
          logo_url: o.logo_url,
          ink_color: o.ink_color,
          gel_color: o.gel_color,
          silicone_color: o.silicone_color,
          observations: o.observations,
          advisor_name: o.advisor_name,
          advisor_id: o.advisor_id,
          delivery_date: o.delivery_date,
          order_code: o.order_code,
        } as never,
        note: "Ruteo manual desde bandeja de pedidos sin orden de producción",
      });
      toast.success(`Pedido ${o.order_code || o.client_name} enviado a producción`);
      queryClient.invalidateQueries({ queryKey: ["unrouted-orders"] });
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo rutear el pedido");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Pedidos sin orden de producción
            <Badge variant={orders.length > 0 ? "destructive" : "secondary"}>{orders.length}</Badge>
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por código, cliente o producto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Pedidos aprobados o pendientes que esperan que Inventarios los rutee a producción. El asesor ya hizo su parte.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Todos los pedidos están ruteados a producción.
          </p>
        )}
        {filtered.map((o) => {
          const age = daysSince(o.created_at);
          const blocked = Boolean(o.logo_pending);
          const late = age > 5;
          const warn = age >= 2 && age <= 5;
          return (
            <div
              key={o.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 ${
                late ? "border-destructive/60 bg-destructive/5" : warn ? "border-amber-500/60 bg-amber-500/5" : ""
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {o.order_code && <OrderCodeBadge code={o.order_code} />}
                  <span className="text-sm font-medium">{o.client_name}</span>
                  <Badge variant="outline" className="text-[11px]">
                    {/sweat/i.test(o.brand) ? "Sweatspot" : "Magical Warmers"}
                  </Badge>
                  <Badge
                    variant={late ? "destructive" : warn ? "outline" : "secondary"}
                    className={`text-[11px] ${warn ? "border-amber-500 text-amber-600" : ""}`}
                  >
                    Esperando a Inventarios · {age === 0 ? "hoy" : `${age} día(s)`}
                  </Badge>
                  {blocked && (
                    <Badge variant="outline" className="text-[11px] border-amber-500 text-amber-600">
                      {logoPendingLabel(o.logo_pending!)}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {o.quantity} uds · {o.product} · Asesor: {o.advisor_name || "—"}
                </p>
                {blocked && (
                  <p className="text-xs text-amber-600">
                    No se puede enviar a producción hasta que Diseño y la asesora aprueben el logo.
                  </p>
                )}
              </div>
              {!readOnly && (
                <Button
                  size="sm"
                  disabled={busy === o.id || blocked}
                  title={blocked ? "El logo aún no está aprobado" : undefined}
                  onClick={() => route(o)}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {busy === o.id ? "Enviando…" : "Enviar a producción"}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
