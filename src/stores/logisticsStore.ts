import { create } from "zustand";

export interface DispatchOrder {
  id: string;
  clientName: string;
  brand: "magical" | "sweatspot";
  product: string;
  quantity: number;
  saleType: "mayor" | "menor";
  readyDate: string;
  status: "listo" | "despachado";
  dispatchedAt?: string;
  /** For wholesale orders, links to the source stamping task */
  sourceTaskId?: string;
}

interface LogisticsStore {
  orders: DispatchOrder[];
  addOrder: (order: Omit<DispatchOrder, "id">) => void;
  dispatchOrder: (id: string) => void;
  /** Called by production store when wholesale order completes */
  addWholesaleReady: (order: Omit<DispatchOrder, "id" | "status" | "readyDate">) => void;
}

export const useLogisticsStore = create<LogisticsStore>((set, get) => ({
  orders: [],

  addOrder: (order) => {
    const newOrder: DispatchOrder = {
      ...order,
      id: `lo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    set({ orders: [...get().orders, newOrder] });
  },

  dispatchOrder: (id) => {
    set({
      orders: get().orders.map((o) =>
        o.id === id
          ? { ...o, status: "despachado" as const, dispatchedAt: new Date().toISOString().slice(0, 10) }
          : o
      ),
    });
  },

  addWholesaleReady: (order) => {
    // Avoid duplicates by sourceTaskId
    if (order.sourceTaskId && get().orders.some((o) => o.sourceTaskId === order.sourceTaskId)) {
      return;
    }
    const newOrder: DispatchOrder = {
      ...order,
      id: `lo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: "listo",
      readyDate: new Date().toISOString().slice(0, 10),
    };
    set({ orders: [...get().orders, newOrder] });
  },
}));
