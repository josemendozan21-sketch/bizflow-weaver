import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Camera, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface StampApproval {
  id: string;
  client_name: string;
  brand: string;
  molde: string | null;
  quantity: number;
  ink_color: string | null;
  gel_color: string | null;
  stamp_size_photo_url: string | null;
  stamp_size_status: string;
  stamp_inkgel_photo_url: string | null;
  stamp_inkgel_status: string;
  stamp_advisor_feedback: string | null;
  advisor_id: string | null;
}

export function StampingApprovals() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: pendingApprovals = [], isLoading } = useQuery({
    queryKey: ["stamping_approvals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select("id, client_name, brand, molde, quantity, ink_color, gel_color, stamp_size_photo_url, stamp_size_status, stamp_inkgel_photo_url, stamp_inkgel_status, stamp_advisor_feedback, advisor_id")
        .eq("current_stage", "estampacion")
        .or("stamp_size_status.eq.pendiente,stamp_inkgel_status.eq.pendiente");
      if (error) throw error;
      // Filter to only those with photos uploaded (waiting approval)
      return (data ?? []).filter(
        (o: any) =>
          (o.stamp_size_status === "pendiente" && o.stamp_size_photo_url) ||
          (o.stamp_size_status === "aprobado" && o.stamp_inkgel_status === "pendiente" && o.stamp_inkgel_photo_url)
      ) as StampApproval[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (pendingApprovals.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-700">
        <Camera className="h-4 w-4" />
        Aprobaciones de estampación pendientes ({pendingApprovals.length})
      </h3>
      <div className="grid gap-3">
        {pendingApprovals.map((order) => {
          // Determine which step needs approval
          const needsSizeApproval = order.stamp_size_status === "pendiente" && !!order.stamp_size_photo_url;
          const needsInkgelApproval = order.stamp_size_status === "aprobado" && order.stamp_inkgel_status === "pendiente" && !!order.stamp_inkgel_photo_url;

          return (
            <Card key={order.id} className="ring-2 ring-amber-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{order.client_name}</CardTitle>
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
                    {needsSizeApproval ? "Tamaño de logo" : "Tinta y gel"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {order.brand === "magical" ? "Magical Warmers" : "Sweatspot"} · {order.molde || "-"} · {order.quantity} uds
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {needsSizeApproval && (
                  <ApprovalAction
                    orderId={order.id}
                    step="size"
                    label="Aprobación de tamaño de logo"
                    photoUrl={order.stamp_size_photo_url!}
                    onDone={() => queryClient.invalidateQueries({ queryKey: ["stamping_approvals"] })}
                  />
                )}
                {needsInkgelApproval && (
                  <ApprovalAction
                    orderId={order.id}
                    step="inkgel"
                    label="Aprobación de tinta y gel"
                    photoUrl={order.stamp_inkgel_photo_url!}
                    details={`Tinta: ${order.ink_color || "-"} · Gel: ${order.gel_color || "-"}`}
                    onDone={() => queryClient.invalidateQueries({ queryKey: ["stamping_approvals"] })}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ApprovalAction({
  orderId,
  step,
  label,
  photoUrl,
  details,
  onDone,
}: {
  orderId: string;
  step: "size" | "inkgel";
  label: string;
  photoUrl: string;
  details?: string;
  onDone: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleAction = async (approved: boolean) => {
    setSubmitting(true);
    try {
      const statusCol = step === "size" ? "stamp_size_status" : "stamp_inkgel_status";
      const approvedAtCol = step === "size" ? "stamp_size_approved_at" : "stamp_inkgel_approved_at";

      const updates: Record<string, any> = {
        [statusCol]: approved ? "aprobado" : "rechazado",
      };

      if (approved) {
        updates[approvedAtCol] = new Date().toISOString();
      }

      if (!approved && feedback.trim()) {
        updates.stamp_advisor_feedback = feedback.trim();
      }

      // If rejected, clear the photo so stamping can re-upload
      if (!approved) {
        const photoCol = step === "size" ? "stamp_size_photo_url" : "stamp_inkgel_photo_url";
        updates[photoCol] = null;
      }

      const { error } = await supabase
        .from("production_orders")
        .update(updates as any)
        .eq("id", orderId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["production_orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onDone();

      toast.success(
        approved ? "Aprobado" : "Rechazado",
        { description: approved ? `${label} aprobado correctamente.` : "Se notificó al área de estampación." }
      );
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">{label}</p>
      {details && <p className="text-xs text-muted-foreground">{details}</p>}

      {/* Photo preview */}
      <div className="relative">
        <img
          src={photoUrl}
          alt={label}
          className="max-h-40 rounded-lg border object-contain cursor-pointer"
          onClick={() => setPreviewOpen(true)}
        />
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{label}</DialogTitle>
            </DialogHeader>
            <img src={photoUrl} alt={label} className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Feedback textarea */}
      <Textarea
        placeholder="Retroalimentación (opcional para aprobación, requerida para rechazo)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        className="text-xs min-h-[60px]"
      />

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => handleAction(true)}
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
          Aprobar
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleAction(false)}
          disabled={submitting || !feedback.trim()}
          className="flex-1"
        >
          {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
          Rechazar
        </Button>
      </div>
    </div>
  );
}
