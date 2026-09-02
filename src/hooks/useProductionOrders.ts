import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLogisticsStore } from "@/stores/logisticsStore";
import { toast } from "sonner";
import { baseRefName } from "@/lib/canonicalBodyRef";

export interface ProductionOrder {
  id: string;
  order_id: string | null;
  order_code?: string | null;
  brand: string;
  client_name: string;
  quantity: number;
  current_stage: string;
  stage_status: string;
  workflow_type: string;
  stages: string[];
  gel_color: string | null;
  ink_color: string | null;
  ink_count: number | null;
  ink_color_2: string | null;
  ink_color_3: string | null;
  glitter_color: string | null;
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
  advisor_name?: string | null;
  delivery_date?: string | null;
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
  fabricated_by?: string | null;
  brand?: string | null;

}

export interface ProductionStageLog {
  id: string;
  production_order_id: string;
  stage: string;
  operator_name: string;
  started_at: string;
  ended_at: string | null;
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
      const rows = (data ?? []) as ProductionOrder[];
      // Enrich with advisor_name from profiles
      const advisorIds = Array.from(new Set(rows.map((r) => r.advisor_id).filter(Boolean) as string[]));
      if (advisorIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, email")
          .in("user_id", advisorIds);
        const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.display_name || p.email]));
        rows.forEach((r) => { r.advisor_name = r.advisor_id ? (map.get(r.advisor_id) ?? null) : null; });
      }
      return rows;
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

  const stageLogsQuery = useQuery({
    queryKey: ["production_stage_logs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("production_stage_logs")
        .select("*")
        .order("started_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductionStageLog[];
    },
  });

  // Realtime for stage logs
  useEffect(() => {
    const channel = supabase
      .channel("production_stage_logs_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "production_stage_logs" },
        () => queryClient.invalidateQueries({ queryKey: ["production_stage_logs"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  /** Close any open stage log for this order+stage by setting ended_at = now() */
  async function closeOpenStageLog(orderId: string, stage: string) {
    const { data: open } = await (supabase as any)
      .from("production_stage_logs")
      .select("id")
      .eq("production_order_id", orderId)
      .eq("stage", stage)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1);
    const row = (open ?? [])[0] as any;
    if (row?.id) {
      await (supabase as any)
        .from("production_stage_logs")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", row.id);
    }
  }

  const updateStageStatus = useMutation({
    mutationFn: async ({ orderId, status, operatorName }: { orderId: string; status: string; operatorName?: string }) => {
      // Fetch current stage to log against
      const { data: po } = await supabase
        .from("production_orders")
        .select("current_stage")
        .eq("id", orderId)
        .single();
      const { error } = await supabase
        .from("production_orders")
        .update({ stage_status: status })
        .eq("id", orderId);
      if (error) throw error;

      if (status === "en_proceso" && operatorName && po?.current_stage) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        await (supabase as any).from("production_stage_logs").insert({
          production_order_id: orderId,
          stage: po.current_stage,
          operator_name: operatorName,
          started_at: new Date().toISOString(),
          recorded_by: authUser?.id ?? null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production_orders"] });
      queryClient.invalidateQueries({ queryKey: ["production_stage_logs"] });
    },
  });

  /** Starts the parallel stamping work without recording it as body production. */
  const startStamping = useMutation({
    mutationFn: async ({ orderId, operatorName }: { orderId: string; operatorName: string }) => {
      const { data: order, error: fetchError } = await supabase
        .from("production_orders")
        .select("current_stage")
        .eq("id", orderId)
        .single();
      if (fetchError || !order) throw fetchError || new Error("Orden no encontrada");

      if (order.current_stage !== "produccion_cuerpos") {
        return updateStageStatus.mutateAsync({ orderId, status: "en_proceso", operatorName });
      }

      const { error: statusError } = await supabase
        .from("production_orders")
        .update({ stage_status: "en_proceso" })
        .eq("id", orderId);
      if (statusError) throw statusError;

      const { data: openLogs, error: logReadError } = await (supabase as any)
        .from("production_stage_logs")
        .select("id")
        .eq("production_order_id", orderId)
        .eq("stage", "estampacion")
        .is("ended_at", null)
        .limit(1);
      if (logReadError) throw logReadError;

      if (!(openLogs ?? []).length) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { error: logError } = await (supabase as any).from("production_stage_logs").insert({
          production_order_id: orderId,
          stage: "estampacion",
          operator_name: operatorName,
          started_at: new Date().toISOString(),
          recorded_by: authUser?.id ?? null,
        });
        if (logError) throw logError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production_orders"] });
      queryClient.invalidateQueries({ queryKey: ["production_stage_logs"] });
    },
    onError: (error) => {
      toast.error("No se pudo iniciar estampación", {
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    },
  });

  const advanceStage = useMutation({
    mutationFn: async ({ orderId, confirmedQuantity, completionData, operatorName }: { orderId: string; confirmedQuantity?: number; completionData?: { photoUrl: string; packagerName: string; finalCount: number }; operatorName?: string }) => {
      // Get fresh order data
      const { data: order, error: fetchErr } = await supabase
        .from("production_orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (fetchErr || !order) throw fetchErr || new Error("Orden no encontrada");

      const po = order as ProductionOrder;

      // Close the currently-open log for this stage (mark ended_at)
      // If operatorName provided and there is no open log yet, create a closed one.
      const stageBeingFinished = po.current_stage;
      if (operatorName) {
        const { data: openRows } = await (supabase as any)
          .from("production_stage_logs")
          .select("id, operator_name")
          .eq("production_order_id", orderId)
          .eq("stage", stageBeingFinished)
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(1);
        const open = (openRows ?? [])[0] as any;
        if (open?.id) {
          await (supabase as any)
            .from("production_stage_logs")
            .update({ ended_at: new Date().toISOString(), operator_name: operatorName })
            .eq("id", open.id);
        } else {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const nowIso = new Date().toISOString();
          await (supabase as any).from("production_stage_logs").insert({
            production_order_id: orderId,
            stage: stageBeingFinished,
            operator_name: operatorName,
            started_at: nowIso,
            ended_at: nowIso,
            recorded_by: authUser?.id ?? null,
          });
        }
      } else {
        await closeOpenStageLog(orderId, stageBeingFinished);
      }

      const stages = po.stages;
      const currentIdx = stages.indexOf(po.current_stage);
      const lastActionableIdx = stages.length - 2; // before "listo"

      // If current stage is produccion_cuerpos, add produced quantity to body_stock
      if (po.current_stage === "produccion_cuerpos" && po.molde) {
        const qtyToAdd = confirmedQuantity ?? po.quantity;
        const { resolveCanonicalBodyRef } = await import("@/lib/canonicalBodyRef");
        const canonicalMolde = await resolveCanonicalBodyRef(po.brand, po.molde);
        // Register the produced bodies as a PENDING-RECEPTION inventory movement.
        // Stock is NOT added until Inventarios confirms reception from the history view.
        try {
          // Ensure a stock_items row exists for this cuerpo (the trigger requires it)
          const tipo = /\((Frío|Frio)\)/i.test(canonicalMolde) ? "Frío" : /\((Térmico|Termico|Calor)\)/i.test(canonicalMolde) ? "Térmico" : null;
          const base = baseRefName(canonicalMolde);
          const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          const { data: stockRows } = await supabase
            .from("stock_items")
            .select("id, name, product_type")
            .eq("brand", po.brand)
            .eq("category", "cuerpos_referencias");
          let stockItem = (stockRows || []).find(
            (row: any) => norm(baseRefName(row.name)) === norm(base) && (!tipo || !row.product_type || row.product_type === tipo)
          ) as { id: string } | undefined;

          if (!stockItem) {
            const { data: created } = await supabase
              .from("stock_items")
              .insert({
                brand: po.brand,
                category: "cuerpos_referencias",
                name: base,
                available: 0,
                in_process: 0,
                product_type: tipo,
              } as any)
              .select("id")
              .single();
            stockItem = created;
          }

          const { data: { user: authUser } } = await supabase.auth.getUser();
          await supabase.from("inventory_movements").insert({
            stock_item_id: stockItem?.id ?? null,
            item_name: canonicalMolde,
            brand: po.brand,
            category: "cuerpos_referencias",
            quantity: qtyToAdd,
            direction: "retorno",
            area: "produccion",
            movement_kind: "entrada",
            purpose: `Producción de cuerpos finalizada — ${po.client_name}`,
            // AUTO_REQ marker tells the trigger to skip the automatic stock update;
            // stock will be applied when Inventarios confirms reception.
            reason: `AUTO_REQ: Pendiente de recepción en Inventarios`,
            requested_by_name: "Producción",
            order_id: po.order_id,
            recorded_by: authUser?.id ?? null,
            recorded_by_name: authUser?.email ?? "Producción",
            reception_confirmed: false,
          } as any);

          await supabase.from("notifications").insert({
            target_role: "inventarios",
            title: "Cuerpos finalizados — confirmar recepción",
            message: `${qtyToAdd} uds de "${canonicalMolde}" (${po.client_name}). Confirma la recepción desde el Historial de movimientos.`,
            type: "info",
          } as any);
        } catch (movErr) {
          console.warn("[useProductionOrders] No se pudo registrar movimiento de entrada:", movErr);
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
          await supabase
            .from("orders")
            .update({
              production_status: "listo",
              production_completed_at: new Date().toISOString(),
            })
            .eq("id", po.order_id);
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

      // Estampación puede completar la muestra mientras los cuerpos todavía se fabrican.
      // Cuando Producción termina los cuerpos, no debemos devolver el pedido a Estampación:
      // la marca "finalizado" en ambas aprobaciones confirma que esa etapa ya se completó.
      if (
        po.current_stage === "produccion_cuerpos" &&
        nextStage === "estampacion" &&
        po.stamp_size_status === "finalizado" &&
        po.stamp_inkgel_status === "finalizado"
      ) {
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
        if (po.current_stage === "estampacion") {
          await supabase
            .from("orders")
            .update({
              production_status: nextStage,
              stamping_completed_at: new Date().toISOString(),
            })
            .eq("id", po.order_id);

          // Auto-finalize matching approved logo request so the card disappears
          // from Diseño de logos once estampación finishes the stamping process.
          const brandLabel = po.brand === "magical" ? "Magical Warmers" : "Sweatspot";
          await supabase
            .from("logo_requests")
            .update({ status: "finalizado" })
            .eq("status", "aprobado")
            .eq("brand", brandLabel)
            .eq("client_name", po.client_name);
        } else {
          await supabase
            .from("orders")
            .update({ production_status: nextStage })
            .eq("id", po.order_id);
        }
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
      queryClient.invalidateQueries({ queryKey: ["production_stage_logs"] });

      if (result.completed) {
        toast.success(`Orden de ${result.order.client_name} completada. Enviada a Logística.`);
      } else {
        const labels = result.order.brand === "magical" ? MAGICAL_STAGE_LABELS : SS_STAGE_LABELS;
        const currentLabel = labels[result.order.current_stage] || result.order.current_stage;
        toast.success(`${currentLabel} finalizada. Avanzando a la siguiente etapa.`);
      }
    },
    onError: (error) => {
      toast.error("No se pudo finalizar la etapa", {
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    },
  });

  /**
   * Completa Estampación sin alterar Producción de cuerpos cuando ambas áreas trabajan
   * en paralelo. Si el pedido ya está realmente en Estampación, usa el avance normal.
   */
  const completeStamping = useMutation({
    mutationFn: async ({ orderId, operatorName }: { orderId: string; operatorName?: string }) => {
      const { data: order, error: fetchError } = await supabase
        .from("production_orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (fetchError || !order) throw fetchError || new Error("Orden no encontrada");

      const po = order as ProductionOrder;
      if (po.current_stage !== "produccion_cuerpos") {
        return advanceStage.mutateAsync({ orderId, operatorName });
      }

      if (po.stamp_size_status !== "aprobado" || po.stamp_inkgel_status !== "aprobado") {
        throw new Error("Las aprobaciones de tamaño y tinta/gel deben estar completas.");
      }

      const now = new Date().toISOString();
      const { data: openLogs, error: logReadError } = await (supabase as any)
        .from("production_stage_logs")
        .select("id")
        .eq("production_order_id", orderId)
        .eq("stage", "estampacion")
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1);
      if (logReadError) throw logReadError;

      const openLog = (openLogs ?? [])[0] as { id?: string } | undefined;
      if (openLog?.id) {
        const { error: logUpdateError } = await (supabase as any)
          .from("production_stage_logs")
          .update({ ended_at: now, operator_name: operatorName })
          .eq("id", openLog.id);
        if (logUpdateError) throw logUpdateError;
      }

      const { error: stampError } = await supabase
        .from("production_orders")
        .update({
          stamp_size_status: "finalizado",
          stamp_inkgel_status: "finalizado",
        } as any)
        .eq("id", orderId);
      if (stampError) throw stampError;

      if (po.order_id) {
        const { error: parentError } = await supabase
          .from("orders")
          .update({ stamping_completed_at: now })
          .eq("id", po.order_id);
        if (parentError) throw parentError;
      }

      const brandLabel = po.brand === "magical" ? "Magical Warmers" : "Sweatspot";
      const { error: logoError } = await supabase
        .from("logo_requests")
        .update({ status: "finalizado" })
        .eq("status", "aprobado")
        .eq("brand", brandLabel)
        .eq("client_name", po.client_name);
      if (logoError) throw logoError;

      return { completedEarly: true, order: po };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["production_orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["production_stage_logs"] });
      queryClient.invalidateQueries({ queryKey: ["logo_requests_for_estampacion"] });
      if ("completedEarly" in result && result.completedEarly) {
        toast.success(`Estampación de ${result.order.client_name} finalizada.`, {
          description: "La fabricación de cuerpos continúa en Producción.",
        });
      }
    },
    onError: (error) => {
      toast.error("No se pudo finalizar estampación", {
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
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

      // NOTE: stock is NOT added here anymore. The single official route is:
      // Producción finaliza -> movimiento "pendiente de recepción" -> Inventarios confirma.
      // Writing body_stock from here duplicated the produced units.

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
    stageLogs: stageLogsQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    isBodyTasksLoading: bodyTasksQuery.isLoading,
    updateStageStatus,
    startStamping,
    advanceStage,
    completeStamping,
    addBodyTask,
    updateBodyTaskStatus,
    forceCompleteOrder,
  };
}
