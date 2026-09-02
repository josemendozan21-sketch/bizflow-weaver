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
import OrderCodeBadge from "@/components/common/OrderCodeBadge";

interface StampApproval {
  id: string;
  order_code?: string | null;
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
        .select("id, order_code, client_name, brand, molde, quantity, ink_color, gel_color, stamp_size_photo_url, stamp_size_status, stamp_inkgel_photo_url, stamp_inkgel_status, stamp_advisor_feedback, advisor_id")
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

  // Una tarjeta por PRODUCTO (línea de producción), agrupadas por pedido completo.
  type Item = {
    order: StampApproval;
    step: "size" | "inkgel";
    photoUrl: string;
  };
  type Group = {
    key: string;
    clientName: string;
    brand: string;
    items: Item[];
  };
  const groupsMap = new Map<string, Group>();
  for (const o of pendingApprovals) {
    const step: "size" | "inkgel" =
      o.stamp_size_status === "pendiente" && o.stamp_size_photo_url ? "size" : "inkgel";
    const photoUrl = (step === "size" ? o.stamp_size_photo_url : o.stamp_inkgel_photo_url)!;
    const ctx = o.order_id ? contextById[o.order_id] : undefined;
    const key = ctx?.groupKey ?? `${o.brand}|${o.client_name}`;
    const g = groupsMap.get(key);
    if (g) {
      g.items.push({ order: o, step, photoUrl });
    } else {
      groupsMap.set(key, { key, clientName: o.client_name, brand: o.brand, items: [{ order: o, step, photoUrl }] });
    }
  }
  const groups = Array.from(groupsMap.values());
  for (const g of groups) {
    g.items.sort((a, b) => {
      const ai = a.order.order_id ? contextById[a.order.order_id]?.productIndex ?? 99 : 99;
      const bi = b.order.order_id ? contextById[b.order.order_id]?.productIndex ?? 99 : 99;
      return ai - bi;
    });
  }
  const totalItems = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-700">
        <Camera className="h-4 w-4" />
        Aprobaciones de estampación pendientes ({totalItems})
      </h3>
      <div className="grid gap-3">
        {groups.map((g) => {
          const first = g.items[0];
          const productCount = first.order.order_id
            ? contextById[first.order.order_id]?.productCount ?? g.items.length
            : g.items.length;
          const sameStep = g.items.every((i) => i.step === g.items[0].step);
          return (
            <Card key={g.key} className="ring-2 ring-amber-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <OrderCodeBadge code={first.order.order_code} compact />
                    <CardTitle className="text-sm truncate">{g.clientName}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200 whitespace-nowrap">
                    {g.items.length} de {productCount} producto{productCount === 1 ? "" : "s"} por aprobar
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {g.brand === "magical" ? "Magical Warmers" : "Sweatspot"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {g.items.map((item) => {
                  const ctx = item.order.order_id ? contextById[item.order.order_id] : undefined;
                  const isSize = item.step === "size";
                  return (
                    <div key={item.order.id} className="rounded-md border p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                            Producto {ctx?.productIndex ?? 1} de {ctx?.productCount ?? productCount}
                          </Badge>
                          <OrderCodeBadge code={item.order.order_code} compact />
                        </div>
                        <Badge variant="outline" className="text-[10px] whitespace-nowrap bg-amber-50 text-amber-800 border-amber-200">
                          {isSize ? "Tamaño de logo" : "Tinta y gel"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ctx?.variantLabel || item.order.molde || "-"} · {item.order.quantity} uds
                      </p>
                      <ApprovalAction
                        orderIds={[item.order.id]}
                        step={item.step}
                        label={isSize ? "Aprobación de tamaño de logo" : "Aprobación de tinta y gel"}
                        photoUrl={item.photoUrl}
                        details={
                          !isSize
                            ? `Tinta: ${item.order.ink_color || "-"} · Gel: ${item.order.gel_color || "-"}`
                            : undefined
                        }
                        onDone={() => queryClient.invalidateQueries({ queryKey: ["stamping_approvals"] })}
                      />
                    </div>
                  );
                })}

                {g.items.length > 1 && sameStep && (
                  <ApproveAllButton
                    orderIds={g.items.map((i) => i.order.id)}
                    step={g.items[0].step}
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

function ApproveAllButton({
  orderIds,
  step,
  onDone,
}: {
  orderIds: string[];
  step: "size" | "inkgel";
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const approveAll = async () => {
    const ok = window.confirm(
      `¿Aprobar las fotos de los ${orderIds.length} productos de este pedido?`
    );
    if (!ok) return;
    setSubmitting(true);
    try {
      const statusCol = step === "size" ? "stamp_size_status" : "stamp_inkgel_status";
      const approvedAtCol = step === "size" ? "stamp_size_approved_at" : "stamp_inkgel_approved_at";
      const { error } = await supabase
        .from("production_orders")
        .update({ [statusCol]: "aprobado", [approvedAtCol]: new Date().toISOString() } as any)
        .in("id", orderIds);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["production_orders"] });
      onDone();
      toast.success("Aprobado", { description: `${orderIds.length} productos aprobados.` });
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button size="sm" variant="outline" className="w-full" onClick={approveAll} disabled={submitting}>
      {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
      Aprobar todos los productos de este pedido
    </Button>
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
