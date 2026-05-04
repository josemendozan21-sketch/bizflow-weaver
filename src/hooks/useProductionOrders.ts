import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLogisticsStore } from "@/stores/logisticsStore";
import { toast } from "sonner";

export interface ProductionOrder {
  id: string;
  order_id: string | null;
  brand: string;
  client_name: string;
  quantity: number;
  current_stage: string;
  stage_status: string;
  workflow_type: string;
  stages: string[];
  gel_color: string | null;
  ink_color: string | null;
  logo_file: string | null;
  thermo_size: string | null;
  silicone_color: string | null;
  logo_type: string | null;
  needs_cuerpos: boolean | null;
  has_stock: boolean | null;
  molde: string | null;
  observations: string | null;
  advisor_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // Completion fields
  finished_photo_url: string | null;
  packager_name: string | null;
  final_count: number | null;
  // Stamping approval fields
  stamp_size_photo_url: string | null;
  stamp_size_status: string;
  stamp_size_approved_at: string | null;
  stamp_inkgel_photo_url: string | null;
  stamp_inkgel_status: string;
  stamp_inkgel_approved_at: string | null;
  stamp_advisor_feedback: string | null;
}

export interface BodyTask {
  id: string;
  production_order_id: string | null;
  tipo_plastico: string;
  referencia: string;
  unidades: number;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

const MAGICAL_STAGE_LABELS: Record<string, string> = {
  produccion_cuerpos: "Producción de Cuerpos",
  estampacion: "Estampación",
  dosificacion: "Dosificación",
  sellado: "Sellado",
  descristalizacion: "Descristalización",
  recorte: "Recorte",
  empaque: "Empaque",
  listo: "Listo",
};

const SS_STAGE_LABELS: Record<string, string> = {
  estampacion: "Estampación",
  produccion_tubos: "Producción de tubos",
  ensamble_cuello: "Ensamble de cuello",
  sello_base: "Sello de base",
  refile: "Refile",
  colocacion_boquilla: "Colocación de boquilla",
  listo: "Listo",
};

export function useProductionOrders(brand?: "magical" | "sweatspot") {
  const queryClient = useQueryClient();

  // Realtime subscription for production_orders
  useEffect(() => {
    const channel = supabase
      .channel("production_orders_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "production_orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["production_orders"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "body_production_tasks" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["body_production_tasks"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const ordersQuery = useQuery({
    queryKey: ["production_orders", brand],
    queryFn: async () => {
      let q = supabase.from("production_orders").select("*").order("created_at", { ascending: false });
      if (brand) q = q.eq("brand", brand);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProductionOrder[];
    },
  });

  const bodyTasksQuery = useQuery({
    queryKey: ["body_production_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_production_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BodyTask[];
    },
    enabled: brand === "magical" || !brand,
  });

  const updateStageStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("production_orders")
        .update({ stage_status: status })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["production_orders"] }),
  });

  const advanceStage = useMutation({
    mutationFn: async ({ orderId, confirmedQuantity, completionData }: { orderId: string; confirmedQuantity?: number; completionData?: { photoUrl: string; packagerName: string; finalCount: number } }) => {
      // Get fresh order data
      const { data: order, error: fetchErr } = await supabase
        .from("production_orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (fetchErr || !order) throw fetchErr || new Error("Orden no encontrada");

      const po = order as ProductionOrder;
      const stages = po.stages;
      const currentIdx = stages.indexOf(po.current_stage);
      const lastActionableIdx = stages.length - 2; // before "listo"

      // If current stage is produccion_cuerpos, add produced quantity to body_stock
      if (po.current_stage === "produccion_cuerpos" && po.molde) {
        const qtyToAdd = confirmedQuantity ?? po.quantity;
        const { data: existing } = await supabase
          .from("body_stock")
          .select("*")
          .eq("brand", po.brand)
          .ilike("referencia", po.molde)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("body_stock")
            .update({ available: existing.available + qtyToAdd })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("body_stock")
            .insert({ brand: po.brand, referencia: po.molde, available: qtyToAdd });
        }
      }

      if (currentIdx >= lastActionableIdx) {
        // Complete the order
        const { error } = await supabase
          .from("production_orders")
          .update({
            current_stage: "listo" as string,
            stage_status: "finalizado" as string,
            completed_at: new Date().toISOString(),
            ...(completionData ? {
              finished_photo_url: completionData.photoUrl,
              packager_name: completionData.packagerName,
              final_count: completionData.finalCount,
            } : {}),
          })
          .eq("id", orderId);
        if (error) throw error;

        // Auto-publish finished photo to product gallery
        if (completionData?.photoUrl) {
          try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
              // Derive a friendly product name
              const productName = po.brand === "magical"
                ? (po.molde ? `Magical Warmers — ${po.molde}` : "Magical Warmers")
                : (po.thermo_size ? `Termo ${po.thermo_size}` : "Sweatspot");
              // Try to extract storage path from public URL
              const marker = "/object/public/product-gallery/";
              const idx = completionData.photoUrl.indexOf(marker);
              const storagePath = idx >= 0
                ? completionData.photoUrl.slice(idx + marker.length)
                : completionData.photoUrl;
              await supabase.from("product_gallery").upsert(
                {
                  brand: po.brand,
                  product_name: productName,
                  photo_url: completionData.photoUrl,
                  storage_path: storagePath,
                  client_name: po.client_name,
                  logo_reference: po.logo_file || null,
                  ink_color: po.ink_color || null,
                  gel_color: po.gel_color || null,
                  notes: po.observations || null,
                  uploaded_by: authUser.id,
                  uploaded_by_name: completionData.packagerName || authUser.email || "Producción",
                  source_order_id: po.order_id,
                  source_production_order_id: orderId,
                } as any,
                { onConflict: "source_production_order_id" }
              );
            }
          } catch (galleryErr) {
            // Non-fatal: gallery is a nice-to-have
            console.warn("[useProductionOrders] Could not publish to gallery:", galleryErr);
          }
        }

        // Update parent order
        if (po.order_id) {
          await supabase.from("orders").update({ production_status: "listo" }).eq("id", po.order_id);
        }

        // Send to logistics
        useLogisticsStore.getState().addWholesaleReady({
          clientName: po.client_name,
          brand: po.brand as "magical" | "sweatspot",
          product: po.brand === "magical" ? `Magical Warmers — ${po.molde}` : `Termo ${po.thermo_size}`,
          quantity: po.quantity,
          saleType: "mayor",
          sourceTaskId: orderId,
        });

        // Notify logistics team
        await supabase.from("notifications").insert({
          target_role: "logistica",
          title: "Pedido listo para despacho",
          message: `${po.client_name} — ${po.quantity} und ${po.brand === "magical" ? "Magical Warmers" : "Sweatspot"}. Producción finalizada y enviado a Logística.`,
          type: "pedido_listo",
          reference_id: po.order_id || orderId,
        });

        // Notify other teams about completion (Ventas via advisor, Contabilidad, Admin)
        const brandLabel = po.brand === "magical" ? "Magical Warmers" : "Sweatspot";
        const completionNotifs: any[] = [
          {
            target_role: "contabilidad",
            title: "Pedido finalizado en producción",
            message: `${po.client_name} — ${po.quantity} und ${brandLabel}. Listo para facturación.`,
            type: "pedido_listo",
            reference_id: po.order_id || orderId,
          },
          {
            target_role: "admin",
            title: "Pedido finalizado en producción",
            message: `${po.client_name} — ${po.quantity} und ${brandLabel}. Producción completada.`,
            type: "pedido_listo",
            reference_id: po.order_id || orderId,
          },
        ];
        if (po.advisor_id) {
          completionNotifs.push({
            target_role: "asesor_comercial",
            target_user_id: po.advisor_id,
            title: "Tu pedido está listo",
            message: `${po.client_name} — ${po.quantity} und ${brandLabel}. Producción finalizada y enviado a Logística.`,
            type: "pedido_listo",
            reference_id: po.order_id || orderId,
          });
        }
        await supabase.from("notifications").insert(completionNotifs);

        return { completed: true, order: po };
      }

      // Advance to next stage
      let nextIdx = currentIdx + 1;
      let nextStage = stages[nextIdx];

      // Skip produccion_cuerpos if not needed
      if (nextStage === "produccion_cuerpos" && !po.needs_cuerpos) {
        nextIdx++;
        nextStage = stages[nextIdx];
      }

      const { error } = await supabase
        .from("production_orders")
        .update({ current_stage: nextStage, stage_status: "pendiente" })
        .eq("id", orderId);
      if (error) throw error;

      // Update parent order status
      if (po.order_id) {
        await supabase.from("orders").update({ production_status: nextStage }).eq("id", po.order_id);
      }

      // Notify teams of stage advancement
      const labels = po.brand === "magical" ? MAGICAL_STAGE_LABELS : SS_STAGE_LABELS;
      const prevLabel = labels[po.current_stage] || po.current_stage;
      const nextLabel = labels[nextStage] || nextStage;
      const brandLabel = po.brand === "magical" ? "Magical Warmers" : "Sweatspot";
      const stageNotifs: any[] = [
        {
          target_role: "produccion",
          title: "Avance de etapa",
          message: `${po.client_name} — ${brandLabel}. ${prevLabel} finalizada → ${nextLabel}.`,
          type: "avance_etapa",
          reference_id: po.order_id || orderId,
        },
        {
          target_role: "admin",
          title: "Avance de etapa",
          message: `${po.client_name} — ${brandLabel}. ${prevLabel} → ${nextLabel}.`,
          type: "avance_etapa",
          reference_id: po.order_id || orderId,
        },
      ];
      if (po.advisor_id) {
        stageNotifs.push({
          target_role: "asesor_comercial",
          target_user_id: po.advisor_id,
          title: "Avance de tu pedido",
          message: `${po.client_name} — ${brandLabel}. ${prevLabel} finalizada → ${nextLabel}.`,
          type: "avance_etapa",
          reference_id: po.order_id || orderId,
        });
      }
      await supabase.from("notifications").insert(stageNotifs);

      return { completed: false, order: po, nextStage };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["production_orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });

      if (result.completed) {
        toast.success(`Orden de ${result.order.client_name} completada. Enviada a Logística.`);
      } else {
        const labels = result.order.brand === "magical" ? MAGICAL_STAGE_LABELS : SS_STAGE_LABELS;
        const currentLabel = labels[result.order.current_stage] || result.order.current_stage;
        toast.success(`${currentLabel} finalizada. Avanzando a la siguiente etapa.`);
      }
    },
  });

  const addBodyTask = useMutation({
    mutationFn: async (data: { tipo_plastico: string; referencia: string; unidades: number; production_order_id?: string }) => {
      const { error } = await supabase.from("body_production_tasks").insert({
        tipo_plastico: data.tipo_plastico,
        referencia: data.referencia,
        unidades: data.unidades,
        production_order_id: data.production_order_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["body_production_tasks"] });
      toast.success("Tarea de producción de cuerpos creada.");
    },
  });

  const updateBodyTaskStatus = useMutation({
    mutationFn: async ({ taskId, status, actualQuantity }: { taskId: string; status: string; actualQuantity?: number }) => {
      const updates = status === "finalizado"
        ? { status, completed_at: new Date().toISOString() }
        : { status };
      const { error } = await supabase.from("body_production_tasks").update(updates).eq("id", taskId);
      if (error) throw error;

      // When finalizing, upsert body_stock with the actual quantity produced
      if (status === "finalizado" && actualQuantity !== undefined && actualQuantity > 0) {
        // Get the task to know referencia and tipo_plastico
        const { data: task } = await supabase
          .from("body_production_tasks")
          .select("*")
          .eq("id", taskId)
          .single();

        if (task) {
          const refName = task.referencia;
          const { data: existing } = await supabase
            .from("body_stock")
            .select("*")
            .eq("brand", "magical")
            .ilike("referencia", refName)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("body_stock")
              .update({ available: existing.available + actualQuantity })
              .eq("id", existing.id);
          } else {
            await supabase
              .from("body_stock")
              .insert({ brand: "magical", referencia: refName, available: actualQuantity });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["body_production_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["production_orders"] });
    },
  });

  /** Admin: force complete an order (skip all remaining stages, send to Logística). */
  const forceCompleteOrder = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      const { data: order, error: fetchErr } = await supabase
        .from("production_orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (fetchErr || !order) throw fetchErr || new Error("Orden no encontrada");
      const po = order as ProductionOrder;

      const { error } = await supabase
        .from("production_orders")
        .update({
          current_stage: "listo",
          stage_status: "finalizado",
          completed_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) throw error;

      if (po.order_id) {
        await supabase.from("orders").update({ production_status: "listo" }).eq("id", po.order_id);
      }

      useLogisticsStore.getState().addWholesaleReady({
        clientName: po.client_name,
        brand: po.brand as "magical" | "sweatspot",
        product: po.brand === "magical" ? `Magical Warmers — ${po.molde}` : `Termo ${po.thermo_size}`,
        quantity: po.quantity,
        saleType: "mayor",
        sourceTaskId: orderId,
      });
      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production_orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return {
    orders: ordersQuery.data ?? [],
    bodyTasks: bodyTasksQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    isBodyTasksLoading: bodyTasksQuery.isLoading,
    updateStageStatus,
    advanceStage,
    addBodyTask,
    updateBodyTaskStatus,
    forceCompleteOrder,
  };
}
