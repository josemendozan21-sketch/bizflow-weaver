import { create } from "zustand";
import type {
  MagicalProductionOrder,
  MagicalProductionStage,
  StageStatus,
  BodyProductionTask,
  PlasticoTipo,
} from "@/types/magicalProduction";
import { STAGE_ORDER } from "@/types/magicalProduction";
import { useLogisticsStore } from "@/stores/logisticsStore";

interface MagicalProductionStore {
  orders: MagicalProductionOrder[];
  bodyTasks: BodyProductionTask[];
  addOrder: (order: Omit<MagicalProductionOrder, "id" | "stageStatus" | "createdAt" | "completedAt">) => void;
  addBodyTask: (data: { tipoPlastico: PlasticoTipo; referencia: string; unidades: number }) => void;
  updateBodyTaskStatus: (taskId: string, status: StageStatus) => void;
  updateStageStatus: (orderId: string, status: StageStatus) => void;
  advanceStage: (orderId: string) => void;
}

export const useMagicalProductionStore = create<MagicalProductionStore>((set, get) => ({
  orders: [],
  bodyTasks: [],

  addOrder: (data) => {
    const order: MagicalProductionOrder = {
      ...data,
      id: `mw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stageStatus: "pendiente",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    set({ orders: [...get().orders, order] });
  },

  addBodyTask: (data) => {
    const task: BodyProductionTask = {
      id: `body-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...data,
      status: "pendiente",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    set({ bodyTasks: [...get().bodyTasks, task] });
  },

  updateBodyTaskStatus: (taskId, status) => {
    set({
      bodyTasks: get().bodyTasks.map((t) =>
        t.id === taskId
          ? { ...t, status, ...(status === "finalizado" ? { completedAt: new Date().toISOString().slice(0, 10) } : {}) }
          : t
      ),
    });
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

    const currentIdx = STAGE_ORDER.indexOf(order.currentStage);

    if (order.currentStage === "empaque") {
      set({
        orders: get().orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                currentStage: "listo" as MagicalProductionStage,
                stageStatus: "finalizado",
                completedAt: new Date().toISOString().slice(0, 10),
              }
            : o
        ),
      });
      useLogisticsStore.getState().addWholesaleReady({
        clientName: order.clientName,
        brand: "magical",
        product: `Magical Warmers — ${order.molde}`,
        quantity: order.quantity,
        saleType: "mayor",
        sourceTaskId: orderId,
      });
      return;
    }

    let nextIdx = currentIdx + 1;
    if (nextIdx >= STAGE_ORDER.length) return;

    let nextStage = STAGE_ORDER[nextIdx];

    if (nextStage === "produccion_cuerpos" && !order.needsCuerpos) {
      nextIdx++;
      nextStage = STAGE_ORDER[nextIdx];
    }

    set({
      orders: get().orders.map((o) =>
        o.id === orderId
          ? { ...o, currentStage: nextStage, stageStatus: "pendiente" }
          : o
      ),
    });
  },
}));
