import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  CheckCircle2,
  Play,
  Paintbrush,
  AlertTriangle,
  Download,
  Info,
  Upload,
  Camera,
  Loader2,
} from "lucide-react";
import { useProductionOrders, type ProductionOrder } from "@/hooks/useProductionOrders";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

  const estampacionOrders = allOrders.filter((o) => o.current_stage === "estampacion");

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

  const coldStock = bodyStock.filter((item) =>
    item.referencia.toLowerCase().includes("frio") || item.referencia.toLowerCase().includes("frío")
  );
  const thermalStock = bodyStock.filter((item) =>
    item.referencia.toLowerCase().includes("termico") || item.referencia.toLowerCase().includes("térmico")
  );

  return (
    <Tabs defaultValue="ordenes" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="ordenes">Órdenes ({estampacionOrders.length})</TabsTrigger>
        <TabsTrigger value="frios">Productos Fríos ({coldStock.length})</TabsTrigger>
        <TabsTrigger value="termicos">Productos Térmicos ({thermalStock.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="ordenes" className="space-y-4">
        {estampacionOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay órdenes en etapa de estampación actualmente.
          </p>
        ) : (
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
        )}
      </TabsContent>

      <TabsContent value="frios">
        <BodyStockGrid items={coldStock} title="Productos Fríos" />
      </TabsContent>

      <TabsContent value="termicos">
        <BodyStockGrid items={thermalStock} title="Productos Térmicos" />
      </TabsContent>
    </Tabs>
  );
};

function BodyStockGrid({ items, title }: { items: BodyStockItem[]; title: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No hay {title.toLowerCase()} registrados.</p>;
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item) => {
        const color =
          item.available > 10
            ? "text-green-600 bg-green-50 border-green-200"
            : item.available > 0
            ? "text-yellow-600 bg-yellow-50 border-yellow-200"
            : "text-red-600 bg-red-50 border-red-200";
        return (
          <Card key={item.id} className={`${color} border`}>
            <CardContent className="p-3">
              <p className="font-medium text-sm">{item.referencia}</p>
              <p className="font-bold text-lg">{item.available} uds</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

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

  const matchingLogo = logoRequests.find(
    (lr) => lr.client_name.toLowerCase() === order.client_name.toLowerCase()
  );

  const hasLogo = !!order.logo_file;
  // If there's no matching logo_request, it's a recompra without logo adjustment → treat as approved.
  // Otherwise, require explicit approval.
  const logoApproved =
    !hasLogo ||
    !matchingLogo ||
    matchingLogo.status === "aprobado" ||
    matchingLogo.status === "finalizado";
  const logoUrl = matchingLogo?.adjusted_logo_url || matchingLogo?.original_logo_url;

  // Stamping approval status
  const sizeStatus = order.stamp_size_status || "pendiente";
  const inkgelStatus = order.stamp_inkgel_status || "pendiente";

  // Determine the current stamping step
  const canStartProcess = logoApproved || !hasLogo;
  const isInProcess = order.stage_status === "en_proceso";

  // Step 1: Size approval needed
  const needsSizeUpload = isInProcess && sizeStatus === "pendiente" && !order.stamp_size_photo_url;
  const sizeWaitingApproval = isInProcess && sizeStatus === "pendiente" && !!order.stamp_size_photo_url;
  const sizeApproved = sizeStatus === "aprobado";
  const sizeRejected = sizeStatus === "rechazado";

  // Step 2: Ink/gel approval needed (only after size is approved)
  const needsInkgelUpload = isInProcess && sizeApproved && inkgelStatus === "pendiente" && !order.stamp_inkgel_photo_url;
  const inkgelWaitingApproval = isInProcess && sizeApproved && inkgelStatus === "pendiente" && !!order.stamp_inkgel_photo_url;
  const inkgelApproved = inkgelStatus === "aprobado";
  const inkgelRejected = inkgelStatus === "rechazado";

  // Can finalize only when both approvals are done
  const canFinalize = isInProcess && sizeApproved && inkgelApproved;

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
              <p className="text-xs text-muted-foreground">Asesor: {order.advisor_name || "—"}</p>
            </div>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border p-3 text-xs space-y-1">
          <Row label="Cliente" value={order.client_name} />
          <Row label="Asesor" value={order.advisor_name || "—"} />
          <Row label="Molde / Referencia" value={order.molde || order.thermo_size || "-"} />
          <Row label="Cantidad" value={`${order.quantity} uds`} />
          <Row label="Color de tinta" value={order.ink_color || "-"} />
          <Row label="Color de gel" value={order.gel_color || "-"} />
          {order.logo_file && <Row label="Nombre / Referencia del logo" value={order.logo_file} />}
          {order.observations && <Row label="Observaciones" value={order.observations} />}
        </div>

        {/* Logo section */}
        {logoUrl && (
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Logo</p>
            <img src={logoUrl} alt="Logo del cliente" className="max-h-24 rounded border object-contain" />
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

        {/* Advisor feedback if rejected */}
        {order.stamp_advisor_feedback && (sizeRejected || inkgelRejected) && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Retroalimentación del asesor: {order.stamp_advisor_feedback}
            </AlertDescription>
          </Alert>
        )}

        {/* Stamping approval steps (visible when in process) */}
        {isInProcess && (
          <div className="space-y-3">
            {/* Step 1: Size approval */}
            <StampApprovalStep
              orderId={order.id}
              step="size"
              label="Paso 1: Aprobación de tamaño de logo"
              status={sizeStatus}
              photoUrl={order.stamp_size_photo_url}
              needsUpload={needsSizeUpload || sizeRejected}
              waitingApproval={sizeWaitingApproval}
              approved={sizeApproved}
            />

            {/* Step 2: Ink/gel approval (only shown after size approved) */}
            {sizeApproved && (
              <StampApprovalStep
                orderId={order.id}
                step="inkgel"
                label="Paso 2: Aprobación de tinta y gel"
                status={inkgelStatus}
                photoUrl={order.stamp_inkgel_photo_url}
                needsUpload={needsInkgelUpload || inkgelRejected}
                waitingApproval={inkgelWaitingApproval}
                approved={inkgelApproved}
              />
            )}
          </div>
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
          {canFinalize && (
            <Button size="sm" onClick={onFinish}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Finalizar estampación
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StampApprovalStep({
  orderId,
  step,
  label,
  status,
  photoUrl,
  needsUpload,
  waitingApproval,
  approved,
}: {
  orderId: string;
  step: "size" | "inkgel";
  label: string;
  status: string;
  photoUrl: string | null;
  needsUpload: boolean;
  waitingApproval: boolean;
  approved: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const statusColors: Record<string, string> = {
    pendiente: "bg-yellow-100 text-yellow-800 border-yellow-200",
    aprobado: "bg-green-100 text-green-800 border-green-200",
    rechazado: "bg-red-100 text-red-800 border-red-200",
  };

  const statusLabels: Record<string, string> = {
    pendiente: photoUrl ? "Esperando aprobación" : "Pendiente",
    aprobado: "Aprobado ✓",
    rechazado: "Rechazado — Subir nueva foto",
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${orderId}/${step}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("stamping-photos")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("stamping-photos")
        .getPublicUrl(path);

      const column = step === "size" ? "stamp_size_photo_url" : "stamp_inkgel_photo_url";
      const statusCol = step === "size" ? "stamp_size_status" : "stamp_inkgel_status";

      const { error } = await supabase
        .from("production_orders")
        .update({ [column]: urlData.publicUrl, [statusCol]: "pendiente", stamp_advisor_feedback: null } as any)
        .eq("id", orderId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["production_orders"] });
      toast.success("Foto subida", { description: "El asesor recibirá la solicitud de aprobación." });
      setDialogOpen(false);
      setFile(null);
    } catch (err: any) {
      toast.error("Error al subir foto", { description: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${statusColors[status] || statusColors.pendiente}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">{label}</p>
        <Badge variant="outline" className="text-[10px]">
          {statusLabels[status] || status}
        </Badge>
      </div>

      {/* Show uploaded photo */}
      {photoUrl && (
        <img src={photoUrl} alt={`Foto ${step}`} className="max-h-32 rounded border object-contain" />
      )}

      {/* Upload button */}
      {needsUpload && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Camera className="h-3 w-3" /> Subir fotografía
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {step === "size"
                  ? "Suba una fotografía de la prueba de tamaño del logo para que el asesor la apruebe."
                  : "Suba una fotografía de la prueba de tinta y gel para que el asesor la apruebe."}
              </p>
              <div className="space-y-1.5">
                <Label>Fotografía *</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleUpload}
                disabled={uploading || !file}
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Subir y enviar para aprobación
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {waitingApproval && (
        <p className="text-[10px] italic">Esperando aprobación del asesor...</p>
      )}

      {approved && (
        <div className="flex items-center gap-1 text-green-700 text-xs">
          <CheckCircle2 className="h-3 w-3" /> Aprobado por el asesor
        </div>
      )}
    </div>
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
