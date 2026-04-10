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

// Magical stage order
const MAGICAL_STAGES = [
  "produccion_cuerpos",
  "estampacion",
  "dosificacion",
  "sellado",
  "recorte",
  "empaque",
  "listo",
];

const MAGICAL_STAGE_LABELS: Record<string, string> = {
  produccion_cuerpos: "Producción de Cuerpos",
  estampacion: "Estampación",
  dosificacion: "Dosificación",
  sellado: "Sellado",
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
    mutationFn: async (orderId: string) => {
      // Get current order
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

      if (currentIdx >= lastActionableIdx) {
        // Complete the order
        const { error } = await supabase
          .from("production_orders")
          .update({
            current_stage: "listo",
            stage_status: "finalizado",
            completed_at: new Date().toISOString(),
          })
          .eq("id", orderId);
        if (error) throw error;

        // Update the parent order's production_status
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

      return { completed: false, order: po, nextStage };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["production_orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });

      if (result.completed) {
        const labels = result.order.brand === "magical" ? MAGICAL_STAGE_LABELS : SS_STAGE_LABELS;
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
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "finalizado") updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from("body_production_tasks").update(updates).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["body_production_tasks"] }),
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
  };
}
