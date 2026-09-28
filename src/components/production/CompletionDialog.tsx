import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrderLineContext } from "@/hooks/useOrderLineContext";
import { toast } from "sonner";

interface CompletionDialogProps {
  open: boolean;
  onClose: () => void;
  order: { id: string; client_name: string; quantity: number } | null;
  onConfirm: (data: { photoUrl: string; packagerName: string; finalCount: number }) => void;
}

interface Slot {
  /** production_orders.id */
  poId: string;
  label: string;
  quantity: number;
  isCurrent: boolean;
  /** Ya tiene foto de producto finalizado */
  existingPhoto: string | null;
}

interface SlotState {
  file: File | null;
  preview: string | null;
  count: string;
}

export function CompletionDialog({ open, onClose, order, onConfirm }: CompletionDialogProps) {
  const qc = useQueryClient();
  const [packagerName, setPackagerName] = useState("");
  const [state, setState] = useState<Record<string, SlotState>>({});
  const [uploading, setUploading] = useState(false);

  // Pedido (orders.id) de la orden de producción que se finaliza
  const { data: currentPo } = useQuery({
    queryKey: ["completion_po", order?.id],
    enabled: open && !!order?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select("id, order_id, quantity")
        .eq("id", order!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: ctxMap } = useOrderLineContext(open && currentPo?.order_id ? [currentPo.order_id] : []);
  const ctx = currentPo?.order_id ? (ctxMap as any)?.[currentPo.order_id] : undefined;
  const lineIds: string[] = ctx?.lines?.map((l: any) => l.orderId) ?? [];

  const { data: siblingPos = [] } = useQuery({
    queryKey: ["completion_sibling_pos", lineIds.join(",")],
    enabled: open && lineIds.length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select("id, order_id, finished_photo_url, quantity")
        .in("order_id", lineIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const slots: Slot[] = (() => {
    if (!order) return [];
    if (!ctx || lineIds.length <= 1) {
      return [{ poId: order.id, label: "Producto", quantity: order.quantity, isCurrent: true, existingPhoto: null }];
    }
    const out: Slot[] = [];
    for (const line of ctx.lines) {
      const po = line.orderId === currentPo?.order_id
        ? { id: order.id, finished_photo_url: null }
        : siblingPos.find((p: any) => p.order_id === line.orderId);
      if (!po) continue;
      out.push({
        poId: po.id,
        label: line.variantLabel || line.orderCode || "Producto",
        quantity: line.quantity,
        isCurrent: po.id === order.id,
        existingPhoto: po.id === order.id ? null : (po as any).finished_photo_url ?? null,
      });
    }
    return out;
  })();

  // Inicializar conteos por línea
  useEffect(() => {
    setState((prev) => {
      const next = { ...prev };
      for (const s of slots) {
        if (!next[s.poId]) next[s.poId] = { file: null, preview: null, count: String(s.quantity || "") };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.map((s) => s.poId).join(",")]);

  useEffect(() => {
    if (!open) { setState({}); setPackagerName(""); }
  }, [open]);

  const pendingSlots = slots.filter((s) => !s.existingPhoto);

  const setSlot = (poId: string, patch: Partial<SlotState>) =>
    setState((p) => ({ ...p, [poId]: { ...(p[poId] ?? { file: null, preview: null, count: "" }), ...patch } }));

  const handleFile = (poId: string, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setSlot(poId, { file, preview: reader.result as string });
    reader.readAsDataURL(file);
  };

  const slotReady = (s: Slot) => {
    const st = state[s.poId];
    return !!st?.file && parseInt(st.count, 10) > 0;
  };
  const canSubmit = !!order && packagerName.trim() && pendingSlots.length > 0 && pendingSlots.every(slotReady);

  const upload = async (poId: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${poId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("finished-products").upload(path, file);
    if (error) throw error;
    return supabase.storage.from("finished-products").getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!canSubmit || !order) {
      toast.error("Suba una foto y el conteo de cada producto.");
      return;
    }
    setUploading(true);
    try {
      let currentData: { photoUrl: string; packagerName: string; finalCount: number } | null = null;
      for (const s of pendingSlots) {
        const st = state[s.poId];
        const url = await upload(s.poId, st.file!);
        const count = parseInt(st.count, 10);
        if (s.isCurrent) {
          currentData = { photoUrl: url, packagerName: packagerName.trim(), finalCount: count };
        } else {
          const { error } = await supabase
            .from("production_orders")
            .update({ finished_photo_url: url, packager_name: packagerName.trim(), final_count: count })
            .eq("id", s.poId)
            .is("finished_photo_url", null);
          if (error) throw error;
        }
      }
      qc.invalidateQueries({ queryKey: ["production_orders_for_advisor"] });
      if (currentData) onConfirm(currentData);
      else onClose();
    } catch (err: any) {
      toast.error("Error al subir la foto: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar empaque</DialogTitle>
          <DialogDescription>
            {slots.length > 1
              ? `Este pedido de ${order?.client_name} tiene ${slots.length} productos/colores: suba una foto de cada uno.`
              : `Complete la información del producto terminado para ${order?.client_name}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {slots.map((s, i) => {
            const st = state[s.poId];
            return (
              <div key={s.poId} className="rounded-md border p-3 space-y-2">
                <div className="text-sm font-medium">
                  {slots.length > 1 ? `${i + 1}. ` : ""}{s.label} · {s.quantity} uds
                </div>
                {s.existingPhoto ? (
                  <div className="space-y-1">
                    <img src={s.existingPhoto} alt={s.label} className="rounded-md max-h-28 object-cover w-full" />
                    <p className="text-xs text-muted-foreground">Ya tiene foto de producto finalizado.</p>
                  </div>
                ) : (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-primary/40 px-4 py-3 hover:bg-primary/5 transition-colors w-full justify-center">
                      <Camera className="h-5 w-5 text-primary" />
                      <span className="text-sm text-muted-foreground truncate">
                        {st?.file ? st.file.name : "Foto del producto finalizado *"}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(s.poId, e.target.files?.[0])} />
                    </label>
                    {st?.preview && <img src={st.preview} alt="Preview" className="rounded-md max-h-32 object-cover w-full" />}
                    <div className="space-y-1">
                      <Label className="text-xs">Conteo final de unidades *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={st?.count ?? ""}
                        onChange={(e) => setSlot(s.poId, { count: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}

          <div className="space-y-2">
            <Label htmlFor="packager">Quién hizo el empaque *</Label>
            <Input id="packager" placeholder="Nombre del empacador" value={packagerName} onChange={(e) => setPackagerName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Confirmar y finalizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
