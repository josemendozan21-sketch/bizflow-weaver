import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { LogoRequest } from "@/hooks/useLogoRequests";

interface OrphanOrder {
  id: string;
  order_code: string | null;
  client_name: string;
  brand: string;
  product: string;
  quantity: number;
  advisor_id: string;
  advisor_name: string;
  logo_url: string | null;
  logo_name: string | null;
  personalization: string | null;
  observations: string | null;
  production_status: string;
  created_at: string;
}

const OPEN_STATUSES = ["pendiente", "diseno", "produccion_cuerpos", "estampacion"];

/**
 * Pedidos que traen logo o personalización pero no tienen solicitud de diseño.
 * Sirve de red de seguridad: aunque el flujo automático falle, Diseño los ve
 * y puede generar la solicitud en un clic.
 */
export function PedidosSinSolicitud({ requests }: { requests: LogoRequest[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders-sin-solicitud"],
    queryFn: async () => {
      const since = new Date(Date.now() - 120 * 24 * 3_600_000).toISOString();
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_code, client_name, brand, product, quantity, advisor_id, advisor_name, logo_url, logo_name, personalization, observations, production_status, created_at",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as OrphanOrder[];
    },
    staleTime: 60_000,
  });

  const orphans = useMemo(() => {
    const linkedIds = new Set(requests.map((r) => (r as any).order_id).filter(Boolean));
    const linkedUrls = new Set(
      requests
        .map((r) => r.original_logo_url)
        .filter((u) => !!u && u.startsWith("http")),
    );
    return orders.filter((o) => {
      if (!OPEN_STATUSES.includes(o.production_status)) return false;
      const hasDesignNeed = (o.logo_url && o.logo_url.startsWith("http")) || !!o.personalization?.trim();
      if (!hasDesignNeed) return false;
      if (linkedIds.has(o.id)) return false;
      if (o.logo_url && linkedUrls.has(o.logo_url)) return false;
      return true;
    });
  }, [orders, requests]);

  const createRequest = async (o: OrphanOrder) => {
    setCreating(o.id);
    const { error } = await supabase.from("logo_requests").insert({
      brand: o.brand === "magical" ? "Magical Warmers" : "Sweatspot",
      client_name: o.client_name,
      logo_name: o.logo_name,
      product: o.product,
      advisor_id: o.advisor_id,
      advisor_name: o.advisor_name,
      original_logo_url: o.logo_url && o.logo_url.startsWith("http") ? o.logo_url : "PENDIENTE_DISENO_DESDE_CERO",
      client_comments: [o.order_code ? `Pedido ${o.order_code}` : "", o.observations || ""].filter(Boolean).join(" | ") || null,
      additional_instructions: [
        "Generada desde el control de pedidos sin solicitud",
        o.personalization || "",
      ].filter(Boolean).join(" — "),
      status: "pendiente_diseno",
      order_id: o.id,
    } as never);
    setCreating(null);
    if (error) {
      toast({ title: "No se pudo crear la solicitud", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Solicitud creada", description: `${o.client_name} — ${o.product}` });
    qc.invalidateQueries({ queryKey: ["logo-requests"] });
    qc.invalidateQueries({ queryKey: ["orders-sin-solicitud"] });
  };

  if (isLoading || orphans.length === 0) return null;

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Pedidos sin solicitud de diseño
          <Badge variant="destructive">{orphans.length}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Estos pedidos activos tienen logo o personalización pero nunca llegaron a Diseño.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {orphans.slice(0, 15).map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-2">
            <div className="min-w-0 text-sm">
              <span className="font-medium">{o.order_code || "Sin código"}</span>
              <span className="text-muted-foreground"> · {o.client_name} · {o.product} ({o.quantity})</span>
              <p className="text-xs text-muted-foreground truncate">
                Asesor: {o.advisor_name} · {new Date(o.created_at).toLocaleDateString("es-CO")}
                {o.personalization ? ` · ${o.personalization}` : ""}
              </p>
            </div>
            <Button size="sm" onClick={() => createRequest(o)} disabled={creating === o.id}>
              {creating === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-1">Crear solicitud</span>
            </Button>
          </div>
        ))}
        {orphans.length > 15 && (
          <p className="text-xs text-muted-foreground">y {orphans.length - 15} más…</p>
        )}
      </CardContent>
    </Card>
  );
}

export default PedidosSinSolicitud;
