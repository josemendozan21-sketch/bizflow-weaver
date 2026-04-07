import { create } from "zustand";
import type { StampingTask, StampingStatus, FillingTask, MagicalStampingTask, SweatspotStampingTask } from "@/types/production";
import { useLogisticsStore } from "@/stores/logisticsStore";

const INITIAL_STAMPING: StampingTask[] = [
  {
    id: "1",
    brand: "magical",
    clientName: "Distribuciones ABC",
    quantity: 200,
    status: "pendiente",
    inkColor: "Dorado",
    gelColor: "Azul",
    glitter: true,
    doubleInk: false,
    logoFile: "logo_abc.png",
    observations: "El cliente solicita empaque individual.",
    createdAt: "2026-04-02",
  },
  {
    id: "2",
    brand: "sweatspot",
    clientName: "Fitness Corp",
    quantity: 500,
    status: "en_proceso",
    inkColor: "Negro",
    thermoSize: "500 ml",
    siliconeColor: "Rojo",
    logoFile: "fitness_corp_logo.svg",
    createdAt: "2026-04-01",
  },
  {
    id: "3",
    brand: "magical",
    clientName: "Regalos Express",
    quantity: 100,
    status: "pendiente",
    inkColor: "Blanco",
    gelColor: "Rosa",
    glitter: false,
    doubleInk: true,
    createdAt: "2026-03-28",
  },
  {
    id: "4",
    brand: "sweatspot",
    clientName: "GymPro S.A.",
    quantity: 300,
    status: "pendiente",
    inkColor: "Azul",
    thermoSize: "250 ml",
    siliconeColor: "Negro",
    logoFile: "gympro.png",
    observations: "Incluir caja de presentación.",
    createdAt: "2026-04-03",
  },
];

interface ProductionStore {
  stampingTasks: StampingTask[];
  fillingTasks: FillingTask[];
  addStampingTask: (task: Omit<MagicalStampingTask, "id" | "status" | "createdAt" | "readyForSealing"> | Omit<SweatspotStampingTask, "id" | "status" | "createdAt" | "readyForSealing">) => void;
  updateStampingStatus: (taskId: string, newStatus: StampingStatus) => void;
  updateFillingStatus: (taskId: string, newStatus: FillingTask["status"]) => void;
}

export const useProductionStore = create<ProductionStore>((set, get) => ({
  stampingTasks: INITIAL_STAMPING,
  fillingTasks: [],

  addStampingTask: (taskData) => {
    const newTask = {
      ...taskData,
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: "pendiente" as const,
      createdAt: new Date().toISOString().slice(0, 10),
    } as StampingTask;
    set({ stampingTasks: [...get().stampingTasks, newTask] });
  },

  updateStampingStatus: (taskId, newStatus) => {
    const tasks = get().stampingTasks;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updated = tasks.map((t) =>
      t.id === taskId
        ? { ...t, status: newStatus, ...(newStatus === "completado" && t.brand === "sweatspot" ? { readyForSealing: true } : {}) }
        : t
    ) as StampingTask[];

    // Sweatspot completado → send to logistics
    if (newStatus === "completado" && task.brand === "sweatspot") {
      const swTask = task as SweatspotStampingTask;
      useLogisticsStore.getState().addWholesaleReady({
        clientName: swTask.clientName,
        brand: "sweatspot",
        product: `Termo ${swTask.thermoSize}`,
        quantity: swTask.quantity,
        saleType: "mayor",
        sourceTaskId: taskId,
      });
    }

    // If Magical Warmers is marked as completado, create a filling task
    if (newStatus === "completado" && task.brand === "magical") {
      const magicalTask = task as MagicalStampingTask;
      const alreadyExists = get().fillingTasks.some((f) => f.sourceStampingId === taskId);
      if (!alreadyExists) {
        const fillingTask: FillingTask = {
          id: `fill-${taskId}-${Date.now()}`,
          brand: "magical",
          clientName: magicalTask.clientName,
          product: "Magical Warmers",
          quantity: magicalTask.quantity,
          gelColor: magicalTask.gelColor,
          logoFile: magicalTask.logoFile,
          observations: magicalTask.observations,
          status: "pendiente",
          createdAt: new Date().toISOString().slice(0, 10),
          sourceStampingId: taskId,
        };
        set({ stampingTasks: updated, fillingTasks: [...get().fillingTasks, fillingTask] });
        return;
      }
    }

    set({ stampingTasks: updated });
  },

  updateFillingStatus: (taskId, newStatus) => {
    const task = get().fillingTasks.find((t) => t.id === taskId);
    set({
      fillingTasks: get().fillingTasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ),
    });

    // Magical filling completado → send to logistics
    if (newStatus === "completado" && task) {
      useLogisticsStore.getState().addWholesaleReady({
        clientName: task.clientName,
        brand: "magical",
        product: task.product,
        quantity: task.quantity,
        saleType: "mayor",
        sourceTaskId: task.sourceStampingId,
      });
    }
  },
}));
