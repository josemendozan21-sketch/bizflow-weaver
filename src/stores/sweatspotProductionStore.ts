import { create } from "zustand";
import type {
  SweatspotProductionOrder,
  SweatspotProductionStage,
  SweatspotStageStatus,
  SweatspotLogoType,
} from "@/types/sweatspotProduction";
import { FULL_STAGE_ORDER, SHORT_STAGE_ORDER } from "@/types/sweatspotProduction";
import { useLogisticsStore } from "@/stores/logisticsStore";

interface SweatspotProductionStore {
  orders: SweatspotProductionOrder[];
  addOrder: (data: Omit<SweatspotProductionOrder, "id" | "stageStatus" | "createdAt" | "completedAt" | "workflowType" | "stages">) => void;
  updateStageStatus: (orderId: string, status: SweatspotStageStatus) => void;
  advanceStage: (orderId: string) => void;
}

function resolveWorkflow(logoType: SweatspotLogoType, hasStock: boolean): { workflowType: "short" | "full"; stages: SweatspotProductionStage[] } {
  if (logoType === "impresion_basica" && hasStock) {
    return { workflowType: "short", stages: [...SHORT_STAGE_ORDER] };
  }
  return { workflowType: "full", stages: [...FULL_STAGE_ORDER] };
}

export const useSweatspotProductionStore = create<SweatspotProductionStore>((set, get) => ({
  orders: [],

  addOrder: (data) => {
    const { workflowType, stages } = resolveWorkflow(data.logoType, data.hasStock);
    const order: SweatspotProductionOrder = {
      ...data,
      id: `ss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workflowType,
      stages,
      stageStatus: "pendiente",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    set({ orders: [...get().orders, order] });
  },

  updateStageStatus: (orderId, status) => {
    set({
      orders: get().orders.map((o) =>
        o.id === orderId ? { ...o, stageStatus: status } : o
      ),
    });
  },

  advanceStage: (orderId) => {
    const order = get().orders.find((o) => o.id === orderId);
    if (!order) return;

    const currentIdx = order.stages.indexOf(order.currentStage);
    const lastActionableIdx = order.stages.length - 2; // stage before "listo"

    // If we're at the last actionable stage, move to "listo" and send to logistics
    if (currentIdx >= lastActionableIdx) {
      set({
        orders: get().orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                currentStage: "listo" as SweatspotProductionStage,
                stageStatus: "finalizado",
                completedAt: new Date().toISOString().slice(0, 10),
              }
            : o
        ),
      });
      useLogisticsStore.getState().addWholesaleReady({
        clientName: order.clientName,
        brand: "sweatspot",
        product: `Termo ${order.thermoSize}`,
        quantity: order.quantity,
        saleType: "mayor",
        sourceTaskId: orderId,
      });
      return;
    }

    const nextStage = order.stages[currentIdx + 1];
    set({
      orders: get().orders.map((o) =>
        o.id === orderId
          ? { ...o, currentStage: nextStage, stageStatus: "pendiente" }
          : o
      ),
    });
  },
}));
