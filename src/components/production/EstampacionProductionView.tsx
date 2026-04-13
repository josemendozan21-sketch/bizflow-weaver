import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Play,
  Paintbrush,
  AlertTriangle,
  Download,
  Info,
} from "lucide-react";
import { useProductionOrders, type ProductionOrder } from "@/hooks/useProductionOrders";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface BodyStockItem {
  id: string;
  referencia: string;
  available: number;
  brand: string;
}

interface LogoRequestInfo {
  id: string;
  status: string;
  adjusted_logo_url: string | null;
  original_logo_url: string;
  client_name: string;
}

const STATUS_BADGE: Record<string, { label: string; variant: "secondary" | "default" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  en_proceso: { label: "En proceso", variant: "default" },
  finalizado: { label: "Finalizado", variant: "outline" },
};

export const EstampacionProductionView = () => {
  const { orders: allOrders, isLoading, updateStageStatus, advanceStage } = useProductionOrders();

  // Only show orders in estampacion stage
  const estampacionOrders = allOrders.filter((o) => o.current_stage === "estampacion");

  // Fetch body_stock for read-only panel
  const bodyStockQuery = useQuery({
    queryKey: ["body_stock_estampacion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_stock")
        .select("*")
        .order("referencia");
      if (error) throw error;
      return (data ?? []) as BodyStockItem[];
    },
  });

  // Fetch logo_requests to check approval status
  const logoRequestsQuery = useQuery({
    queryKey: ["logo_requests_for_estampacion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logo_requests")
        .select("id, status, adjusted_logo_url, original_logo_url, client_name");
      if (error) throw error;
      return (data ?? []) as LogoRequestInfo[];
    },
  });

  const bodyStock = bodyStockQuery.data ?? [];
  const logoRequests = logoRequestsQuery.data ?? [];

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Body Stock Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Cuerpos disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bodyStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay registros de cuerpos.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {bodyStock.map((item) => {
                const color =
                  item.available > 10
                    ? "text-green-600 bg-green-50 border-green-200"
                    : item.available > 0
                    ? "text-yellow-600 bg-yellow-50 border-yellow-200"
                    : "text-red-600 bg-red-50 border-red-200";
                return (
                  <div key={item.id} className={`rounded-md border p-2 text-xs ${color}`}>
                    <span className="font-medium">{item.referencia}</span>
                    <span className="block font-bold text-sm">{item.available} uds</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <h3 className="text-sm font-semibold text-foreground">
        Órdenes en estampación ({estampacionOrders.length})
      </h3>

      {estampacionOrders.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay órdenes en etapa de estampación actualmente.
        </p>
      )}

      <div className="grid gap-4">
        {estampacionOrders.map((order) => (
          <EstampacionOrderCard
            key={order.id}
            order={order}
            logoRequests={logoRequests}
            onStart={() => updateStageStatus.mutate({ orderId: order.id, status: "en_proceso" })}
            onFinish={() => advanceStage.mutate({ orderId: order.id })}
          />
        ))}
      </div>
    </div>
  );
};

function EstampacionOrderCard({
  order,
  logoRequests,
  onStart,
  onFinish,
}: {
  order: ProductionOrder;
  logoRequests: LogoRequestInfo[];
  onStart: () => void;
  onFinish: () => void;
}) {
  const badge = STATUS_BADGE[order.stage_status] || STATUS_BADGE.pendiente;

  // Find matching logo_request by client_name and check approval
  const matchingLogo = logoRequests.find(
    (lr) => lr.client_name.toLowerCase() === order.client_name.toLowerCase()
  );

  const hasLogo = !!order.logo_file;
  const logoApproved = !hasLogo || (matchingLogo && (matchingLogo.status === "aprobado" || matchingLogo.status === "finalizado"));
  const logoUrl = matchingLogo?.adjusted_logo_url || matchingLogo?.original_logo_url;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Paintbrush className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{order.client_name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {order.brand === "magical" ? "Magical Warmers" : "Sweatspot"}
              </p>
            </div>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border p-3 text-xs space-y-1">
          <Row label="Cliente" value={order.client_name} />
          <Row label="Molde / Referencia" value={order.molde || order.thermo_size || "-"} />
          <Row label="Cantidad" value={`${order.quantity} uds`} />
          <Row label="Color de tinta" value={order.ink_color || "-"} />
          <Row label="Color de gel" value={order.gel_color || "-"} />
          {order.observations && <Row label="Observaciones" value={order.observations} />}
        </div>

        {/* Logo section */}
        {logoUrl && (
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Logo</p>
            <img
              src={logoUrl}
              alt="Logo del cliente"
              className="max-h-24 rounded border object-contain"
            />
            <a href={logoUrl} download target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="mt-1">
                <Download className="h-3 w-3 mr-1" /> Descargar logo
              </Button>
            </a>
          </div>
        )}

        {/* Logo not approved warning */}
        {hasLogo && !logoApproved && (
          <Alert variant="destructive" className="border-yellow-300 bg-yellow-50 text-yellow-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              ⚠️ El diseño aún no ha sido aprobado. Espera la aprobación del asesor para iniciar.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 pt-1">
          {order.stage_status === "pendiente" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onStart}
              disabled={hasLogo && !logoApproved}
            >
              <Play className="h-3 w-3 mr-1" /> Iniciar proceso
            </Button>
          )}
          {order.stage_status === "en_proceso" && (
            <Button size="sm" onClick={onFinish}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Finalizar proceso
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
