import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useOrders, PRODUCTION_STATUS_LABELS, PRODUCTION_STATUS_COLORS, type Order } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Package, Calendar, DollarSign, MapPin, Upload, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const STAGE_ORDER = [
  "pendiente",
  "diseno",
  "produccion_cuerpos",
  "estampacion",
  "dosificacion",
  "sellado",
  "recorte",
  "empaque",
  "listo",
  "despachado",
  "entregado",
];

function getStageProgress(status: string): number {
  const idx = STAGE_ORDER.indexOf(status);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

function getFriendlyStageLabel(status: string, order: Order): string {
  if (status === "listo" && order.sale_type === "mayor" && !order.payment_complete) {
    return "Listo — Pendiente aprobación de pago";
  }

  const inProgressStages: Record<string, string> = {
    pendiente: "Pendiente de inicio",
    diseno: "En producción — Diseño de logo",
    produccion_cuerpos: "En producción — Fabricación de cuerpos",
    estampacion: "En producción — Estampación",
    dosificacion: "En producción — Dosificación",
    sellado: "En producción — Sellado",
    recorte: "En producción — Recorte",
    empaque: "En producción — Empaque",
    listo: "Listo para despacho",
    despachado: "Despachado",
    entregado: "Entregado",
  };

  return inProgressStages[status] || PRODUCTION_STATUS_LABELS[status] || status;
}

export function MisPedidos() {
  const { data: orders = [], isLoading } = useOrders();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No tienes pedidos registrados aún.
        </CardContent>
      </Card>
    );
  }

  // Show orders needing payment action first
  const sortedOrders = [...orders].sort((a, b) => {
    const aNeedsAction = a.production_status === "listo" && a.sale_type === "mayor" && !a.payment_complete;
    const bNeedsAction = b.production_status === "listo" && b.sale_type === "mayor" && !b.payment_complete;
    if (aNeedsAction && !bNeedsAction) return -1;
    if (!aNeedsAction && bNeedsAction) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{orders.length} pedido(s) registrado(s)</p>
      <div className="grid gap-4 md:grid-cols-2">
        {sortedOrders.map((order) => {
          const progress = getStageProgress(order.production_status);
          const friendlyLabel = getFriendlyStageLabel(order.production_status, order);
          const needsPaymentAction = order.production_status === "listo" && order.sale_type === "mayor" && !order.payment_complete;

          return (
            <Card key={order.id} className={`overflow-hidden ${needsPaymentAction ? "ring-2 ring-amber-400" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{order.client_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {order.brand === "magical" ? "Magical Warmers" : "Sweatspot"} · {order.sale_type === "mayor" ? "Al por mayor" : "Al por menor"}
                    </p>
                  </div>
                  <Badge className={PRODUCTION_STATUS_COLORS[order.production_status] || "bg-muted text-muted-foreground"}>
                    {PRODUCTION_STATUS_LABELS[order.production_status] || order.production_status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Payment action banner */}
                {needsPaymentAction && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Acción requerida: Confirmar pago del excedente
                    </div>
                    <p className="text-xs text-amber-700">
                      Este pedido está listo en producción. Solicita el saldo restante al cliente y sube el soporte de pago para autorizar el despacho.
                    </p>
                    <div className="text-sm font-medium text-amber-900">
                      Saldo pendiente: ${((Number(order.total_amount) || 0) - (Number(order.abono) || 0)).toLocaleString("es-CO")}
                    </div>
                    <PaymentConfirmDialog order={order} />
                  </div>
                )}

                {/* Already confirmed badge */}
                {order.production_status === "listo" && order.sale_type === "mayor" && order.payment_complete && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2 text-green-800 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Pago confirmado — Listo para despacho por logística
                  </div>
                )}

                {/* Progress indicator */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{friendlyLabel}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    <span>{order.product}</span>
                  </div>
                  <div className="text-right font-medium">{order.quantity} uds</div>
                </div>

                {(order.total_amount ?? 0) > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Total: ${Number(order.total_amount).toLocaleString()}</span>
                    </div>
                    {(order.abono ?? 0) > 0 && (
                      <div className="text-right text-muted-foreground">
                        Abono: ${Number(order.abono).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {order.client_city && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{order.client_city}</span>
                  </div>
                )}

                {order.delivery_date && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Entrega: {format(new Date(order.delivery_date), "d MMM yyyy", { locale: es })}</span>
                  </div>
                )}

                {order.logo_url && (
                  <div className="text-xs text-primary">🎨 Solicitud de diseño vinculada</div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>{order.advisor_name}</span>
                  <span>{format(new Date(order.created_at), "d MMM yyyy HH:mm", { locale: es })}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PaymentConfirmDialog({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState(order.payment_proof_url || "");
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const handleUploadAndConfirm = async () => {
    setUploading(true);
    try {
      let finalProofUrl = proofUrl;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${order.id}/soporte_pago_final.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, file, { upsert: true });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(path);
        finalProofUrl = urlData.publicUrl;
      }

      if (!finalProofUrl && !file) {
        toast.error("Debes subir el soporte de pago");
        setUploading(false);
        return;
      }

      const { error } = await supabase.from("orders").update({
        payment_complete: true,
        payment_proof_url: finalProofUrl,
        abono: order.total_amount, // Mark as fully paid
      }).eq("id", order.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Pago confirmado", { description: "El pedido ahora está disponible para despacho en logística." });
      setOpen(false);
    } catch (err: any) {
      toast.error("Error al confirmar pago", { description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const saldo = (Number(order.total_amount) || 0) - (Number(order.abono) || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full">
          <Upload className="h-4 w-4 mr-1" /> Subir soporte y confirmar pago
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar pago completo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p><strong>Cliente:</strong> {order.client_name}</p>
            <p><strong>Producto:</strong> {order.product} — {order.quantity} uds</p>
            <p><strong>Total:</strong> ${Number(order.total_amount).toLocaleString("es-CO")}</p>
            <p><strong>Abono:</strong> ${Number(order.abono).toLocaleString("es-CO")}</p>
            <p className="font-semibold text-destructive">Saldo pendiente: ${saldo.toLocaleString("es-CO")}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Soporte de pago del excedente *</Label>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">Imagen o PDF del comprobante de pago</p>
          </div>

          <Button
            className="w-full"
            onClick={handleUploadAndConfirm}
            disabled={uploading || !file}
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Confirmar pago y autorizar despacho
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
