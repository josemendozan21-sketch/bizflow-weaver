import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";
import { supabase } from "@/integrations/supabase/client";
import { matchesQuery } from "@/lib/search";

interface Issue {
  orderId: string;
  orderCode: string | null;
  clientName: string;
  brand: string;
  product: string;
  advisorName: string | null;
  problems: string[];
  orderQty: number;
  prodQty: number | null;
  prodId: string | null;
  logoFile: string | null;
  inkColor: string | null;
  gelColor: string | null;
  siliconeColor: string | null;
}

const ACTIVE_STATUSES = [
  "pendiente",
  "diseno",
  "produccion_cuerpos",
  "estampacion",
  "dosificacion",
  "sellado",
  "recorte",
  "empaque",
  "listo",
];

export default function OrderSyncHealthPanel({ readOnly = false }: { readOnly?: boolean }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["order-sync-health"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<Issue[]> => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          "id, order_code, brand, client_name, product, quantity, advisor_name, sale_type, production_status, logo_url, ink_color, gel_color, silicone_color",
        )
        .eq("sale_type", "mayor")
        .in("production_status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const list = orders ?? [];
      if (list.length === 0) return [];

      const { data: pos, error: poErr } = await supabase
        .from("production_orders")
        .select("id, order_id, quantity, logo_file, ink_color, gel_color, silicone_color")
        .in("order_id", list.map((o: any) => o.id));
      if (poErr) throw poErr;
      const byOrder = new Map<string, any>();
      (pos ?? []).forEach((p: any) => p.order_id && byOrder.set(p.order_id, p));

      const result: Issue[] = [];
      for (const o of list as any[]) {
        const p = byOrder.get(o.id);
        const problems: string[] = [];
        if (!p) {
          problems.push("Sin orden de producción");
        } else {
          if (Number(p.quantity) !== Number(o.quantity)) {
            problems.push(`Cantidades distintas: pedido ${o.quantity} vs producción ${p.quantity}`);
          }
          if (o.logo_url && !p.logo_file) problems.push("Logo no sincronizado con producción");
          if (o.ink_color && !p.ink_color) problems.push("Color de tinta no sincronizado");
          if (o.brand === "magical" && o.gel_color && !p.gel_color) problems.push("Color de gel no sincronizado");
          if (o.brand === "sweatspot" && o.silicone_color && !p.silicone_color)
            problems.push("Color de silicona no sincronizado");
        }
        if (problems.length > 0) {
          result.push({
            orderId: o.id,
            orderCode: o.order_code,
            clientName: o.client_name,
            brand: o.brand,
            product: o.product,
            advisorName: o.advisor_name,
            problems,
            orderQty: Number(o.quantity) || 0,
            prodQty: p ? Number(p.quantity) : null,
            prodId: p?.id ?? null,
            logoFile: o.logo_url ?? null,
            inkColor: o.ink_color ?? null,
            gelColor: o.gel_color ?? null,
            siliconeColor: o.silicone_color ?? null,
          });
        }
      }
      return result;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return issues;
    return issues.filter((i) => matchesQuery([i.orderCode, i.clientName, i.product, i.advisorName, i.brand], q));
  }, [issues, search]);

  const resync = async (i: Issue) => {
    if (!i.prodId) {
      toast.error("Este pedido no tiene orden de producción. Úsalo desde “Pedidos sin orden de producción”.");
      return;
    }
    setBusy(i.orderId);
    try {
      const { error } = await supabase
        .from("production_orders")
        .update({
          quantity: i.orderQty,
          ...(i.logoFile ? { logo_file: i.logoFile } : {}),
          ...(i.inkColor ? { ink_color: i.inkColor } : {}),
          ...(i.brand === "magical" && i.gelColor ? { gel_color: i.gelColor } : {}),
          ...(i.brand === "sweatspot" && i.siliconeColor ? { silicone_color: i.siliconeColor } : {}),
        })
        .eq("id", i.prodId);
      if (error) throw error;

      await supabase
        .from("body_production_tasks")
        .update({ unidades: i.orderQty })
        .eq("order_id", i.orderId)
        .neq("status", "finalizado");

      toast.success("Pedido resincronizado con producción");
      queryClient.invalidateQueries({ queryKey: ["order-sync-health"] });
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["production_orders"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo resincronizar");
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
            Pedidos con problemas de sincronización
            <Badge variant={issues.length > 0 ? "destructive" : "secondary"}>{issues.length}</Badge>
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
          Detecta diferencias de cantidades, logos o colores entre Ventas y Producción.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> Todos los pedidos están sincronizados.
          </p>
        )}
        {filtered.map((i) => (
          <div key={i.orderId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {i.orderCode && <OrderCodeBadge code={i.orderCode} />}
                <span className="text-sm font-medium">{i.clientName}</span>
                <Badge variant="outline" className="text-[11px]">
                  {/sweat/i.test(i.brand) ? "Sweatspot" : "Magical Warmers"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {i.orderQty} uds · {i.product} · Asesor: {i.advisorName || "—"}
              </p>
              <ul className="text-xs text-destructive list-disc pl-4">
                {i.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            {!readOnly && i.prodId && (
              <Button size="sm" variant="outline" disabled={busy === i.orderId} onClick={() => resync(i)}>
                <RefreshCw className="h-4 w-4 mr-1" />
                {busy === i.orderId ? "Sincronizando…" : "Resincronizar"}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
