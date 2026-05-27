import { useEffect, useState } from "react";
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
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select("id, client_name, brand, molde, quantity, ink_color, gel_color, stamp_size_photo_url, stamp_size_status, stamp_inkgel_photo_url, stamp_inkgel_status, stamp_advisor_feedback, advisor_id")
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

  // Realtime: refetch when production_orders change so advisors see new
  // stamping photos right after estampación uploads them.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("stamping_approvals_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "production_orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["stamping_approvals"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (pendingApprovals.length === 0) return null;

  // Group by client+brand+step so each "logo" appears once even if it has
  // multiple production order lines.
  type Group = {
    key: string;
    step: "size" | "inkgel";
    orderIds: string[];
    representative: StampApproval;
    totalQuantity: number;
  };
  const groupsMap = new Map<string, Group>();
  for (const o of pendingApprovals) {
    const step: "size" | "inkgel" =
      o.stamp_size_status === "pendiente" && o.stamp_size_photo_url ? "size" : "inkgel";
    const photoUrl = step === "size" ? o.stamp_size_photo_url : o.stamp_inkgel_photo_url;
    const key = `${o.brand}|${o.client_name}|${step}|${photoUrl}`;
    const g = groupsMap.get(key);
    if (g) {
      g.orderIds.push(o.id);
      g.totalQuantity += o.quantity || 0;
    } else {
      groupsMap.set(key, {
        key,
        step,
        orderIds: [o.id],
        representative: o,
        totalQuantity: o.quantity || 0,
      });
    }
  }
  const groups = Array.from(groupsMap.values());

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-700">
        <Camera className="h-4 w-4" />
        Aprobaciones de estampación pendientes ({groups.length})
      </h3>
      <div className="grid gap-3">
        {groups.map((g) => {
          const order = g.representative;
          const isSize = g.step === "size";
          const photoUrl = (isSize ? order.stamp_size_photo_url : order.stamp_inkgel_photo_url)!;
          return (
            <Card key={g.key} className="ring-2 ring-amber-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{order.client_name}</CardTitle>
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
                    {isSize ? "Tamaño de logo" : "Tinta y gel"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {order.brand === "magical" ? "Magical Warmers" : "Sweatspot"} · {order.molde || "-"} · {g.totalQuantity} uds
                  {g.orderIds.length > 1 && (
                    <span className="ml-2 text-amber-700 font-medium">
                      ({g.orderIds.length} líneas)
                    </span>
                  )}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ApprovalAction
                  orderIds={g.orderIds}
                  step={g.step}
                  label={isSize ? "Aprobación de tamaño de logo" : "Aprobación de tinta y gel"}
                  photoUrl={photoUrl}
                  details={!isSize ? `Tinta: ${order.ink_color || "-"} · Gel: ${order.gel_color || "-"}` : undefined}
                  onDone={() => queryClient.invalidateQueries({ queryKey: ["stamping_approvals"] })}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ApprovalAction({
  orderIds,
  step,
  label,
  photoUrl,
  details,
  onDone,
}: {
  orderIds: string[];
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
    if (!approved && !feedback.trim()) {
      const ok = window.confirm(
        "¿Rechazar sin escribir motivo? El equipo de estampación no sabrá qué corregir."
      );
      if (!ok) return;
    }
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

      if (feedback.trim()) {
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
        .in("id", orderIds);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["production_orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onDone();

      toast.success(
        approved ? "Aprobado" : "Rechazado",
        {
          description: approved
            ? `${label} aprobado para ${orderIds.length} línea(s).`
            : `Se notificó al área de estampación (${orderIds.length} línea(s)).`,
        }
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
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
          Rechazar
        </Button>
      </div>
    </div>
  );
}
