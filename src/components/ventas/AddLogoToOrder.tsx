import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import OrderLogosField, { makeLogoEntry, type LogoEntry } from "./OrderLogosField";
import { uploadLogoFile } from "@/hooks/useLogoRequests";

/**
 * Para pedidos al por mayor guardados "sin logo" que sí lo llevan:
 * sube el logo, abre la solicitud en Diseño y devuelve la orden a Estampación
 * para que siga el flujo normal (diseño → muestras → aprobación del asesor).
 */
export function AddLogoToOrder({ order, onDone }: { order: any; onDone?: () => void }) {
  const qc = useQueryClient();
  const [logos, setLogos] = useState<LogoEntry[]>([makeLogoEntry()]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (logos.some((l) => !l.file || !l.name.trim())) {
      toast.error("Cada logo necesita archivo y nombre");
      return;
    }
    setSaving(true);
    try {
      const uploaded = [] as { url: string; name: string }[];
      for (const l of logos) uploaded.push({ url: await uploadLogoFile(l.file!, "originals"), name: l.name.trim() });
      const first = uploaded[0];

      const { error: oErr } = await supabase
        .from("orders")
        .update({
          logo_url: first.url,
          logo_name: first.name,
          logos: uploaded as any,
          logo_count: uploaded.length,
          logo_source: "nuevo",
          sample_status: "pendiente",
        } as any)
        .eq("id", order.id);
      if (oErr) throw oErr;

      const { error: rErr } = await supabase.from("logo_requests").insert({
        client_name: order.client_name,
        logo_name: first.name,
        brand: order.brand,
        product: order.product,
        original_logo_url: first.url,
        extra_logos: uploaded.slice(1) as any,
        advisor_id: order.advisor_id,
        advisor_name: order.advisor_name,
        order_id: order.id,
      } as any);
      if (rErr) throw rErr;

      // Devolver la orden de producción a Estampación
      const { data: po } = await supabase
        .from("production_orders")
        .select("id, stages, current_stage")
        .eq("order_id", order.id)
        .maybeSingle();
      if (po) {
        const stages: string[] = po.stages || [];
        const next = stages.includes("estampacion")
          ? stages
          : order.brand === "sweatspot"
            ? ["estampacion", ...stages]
            : (() => {
                const i = stages.indexOf("produccion_cuerpos");
                const s = [...stages];
                s.splice(i >= 0 ? i + 1 : 0, 0, "estampacion");
                return s;
              })();
        const curIdx = next.indexOf(po.current_stage);
        const estIdx = next.indexOf("estampacion");
        const moveBack = curIdx > estIdx;
        await supabase
          .from("production_orders")
          .update({
            stages: next,
            logo_file: first.url,
            stamp_size_status: "pendiente",
            stamp_inkgel_status: "pendiente",
            ...(moveBack ? { current_stage: "estampacion", stage_status: "pendiente" } : {}),
          } as any)
          .eq("id", po.id);
        if (moveBack || po.current_stage === "estampacion") await supabase.from("orders").update({ production_status: "estampacion" }).eq("id", order.id);
      }

      await supabase.from("notifications").insert([
        { target_role: "disenador", title: "Logo agregado a pedido", message: `${order.order_code || ""} ${order.client_name}: la asesora subió el logo.`, type: "info", reference_id: order.id },
        { target_role: "estampacion", title: "Pedido pasa por Estampación", message: `${order.order_code || ""} ${order.client_name} ahora lleva logo: hacer muestras de tamaño y tinta.`, type: "info", reference_id: order.id },
      ] as any);

      qc.invalidateQueries();
      toast.success("Logo agregado", { description: "El pedido pasa por Diseño y Estampación." });
      onDone?.();
    } catch (e: any) {
      toast.error("No se pudo agregar el logo", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="text-sm text-foreground">
        Este pedido se guardó <strong>sin logo</strong>. Si lleva logo, súbalo aquí: pasará a Diseño y a Estampación para las muestras.
      </p>
      <OrderLogosField logos={logos} onChange={setLogos} />
      <Button className="w-full" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
        Agregar logo al pedido
      </Button>
    </div>
  );
}
