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
  logo_file: string | null;
  created_at: string;
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
        .select("id, order_code, brand, client_name, product, quantity, advisor_name, advisor_id, delivery_date, logo_file, created_at")
        .in("production_status", ["pendiente", "aprobado"])
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
      return list.filter((o) => !routed.has(o.id));
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
          logo_file: o.logo_file,
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
          Pedidos aprobados o pendientes que aún no llegaron a los tableros de producción.
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
          const late = age > 2;
          return (
            <div
              key={o.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 ${
                late ? "border-destructive/60 bg-destructive/5" : ""
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {o.order_code && <OrderCodeBadge code={o.order_code} />}
                  <span className="text-sm font-medium">{o.client_name}</span>
                  <Badge variant="outline" className="text-[11px]">
                    {/sweat/i.test(o.brand) ? "Sweatspot" : "Magical Warmers"}
                  </Badge>
                  <Badge variant={late ? "destructive" : "secondary"} className="text-[11px]">
                    {age === 0 ? "hoy" : `${age} día(s)`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {o.quantity} uds · {o.product} · Asesor: {o.advisor_name || "—"}
                </p>
              </div>
              {!readOnly && (
                <Button size="sm" disabled={busy === o.id} onClick={() => route(o)}>
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
