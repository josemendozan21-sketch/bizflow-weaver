import { create } from "zustand";

export interface DeliveryEntry {
  id: string;
  clientName: string;
  brand: "magical" | "sweatspot";
  product: string;
  quantity: number;
  saleType: "mayor" | "menor";
  deliveryDate: string; // yyyy-MM-dd
  status: "pendiente" | "en_produccion" | "listo" | "entregado";
  createdAt: string;
}

interface DeliveryStore {
  entries: DeliveryEntry[];
  addEntry: (entry: Omit<DeliveryEntry, "id" | "createdAt">) => void;
  updateStatus: (id: string, status: DeliveryEntry["status"]) => void;
}

export const useDeliveryStore = create<DeliveryStore>((set, get) => ({
  entries: [],

  addEntry: (entry) => {
    const newEntry: DeliveryEntry = {
      ...entry,
      id: `del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    set({ entries: [...get().entries, newEntry] });
  },

  updateStatus: (id, status) => {
    set({
      entries: get().entries.map((e) =>
        e.id === id ? { ...e, status } : e
      ),
    });
  },
}));
