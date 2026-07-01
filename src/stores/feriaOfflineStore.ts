import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PendingSale {
  localId: string;
  feria_id: string;
  brand: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string | null;
  client_name: string | null;
  notes: string | null;
  sale_date: string; // ISO
  recorded_by: string | null;
  status: "pending" | "syncing" | "synced" | "error";
  synced_id?: string;
  oversold?: boolean;
  error_message?: string;
  created_at: number;
}

interface State {
  pendingSales: PendingSale[];
  enqueue: (
    sale: Omit<PendingSale, "localId" | "status" | "created_at" | "sale_date"> & {
      sale_date?: string;
    }
  ) => PendingSale;
  markSyncing: (localId: string) => void;
  markSynced: (localId: string, syncedId: string, oversold: boolean) => void;
  markError: (localId: string, message: string) => void;
  remove: (localId: string) => void;
  clearSynced: () => void;
}

export const useFeriaOfflineStore = create<State>()(
  persist(
    (set, get) => ({
      pendingSales: [],
      enqueue: (input) => {
        const sale: PendingSale = {
          ...input,
          sale_date: input.sale_date || new Date().toISOString(),
          localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status: "pending",
          created_at: Date.now(),
        };
        set({ pendingSales: [...get().pendingSales, sale] });
        return sale;
      },
      markSyncing: (localId) =>
        set({
          pendingSales: get().pendingSales.map((s) =>
            s.localId === localId ? { ...s, status: "syncing" } : s
          ),
        }),
      markSynced: (localId, syncedId, oversold) =>
        set({
          pendingSales: get().pendingSales.map((s) =>
            s.localId === localId
              ? { ...s, status: "synced", synced_id: syncedId, oversold }
              : s
          ),
        }),
      markError: (localId, message) =>
        set({
          pendingSales: get().pendingSales.map((s) =>
            s.localId === localId ? { ...s, status: "error", error_message: message } : s
          ),
        }),
      remove: (localId) =>
        set({ pendingSales: get().pendingSales.filter((s) => s.localId !== localId) }),
      clearSynced: () =>
        set({ pendingSales: get().pendingSales.filter((s) => s.status !== "synced") }),
    }),
    { name: "feria-offline-sales-v1" }
  )
);

export function pendingSalesForFeria(feriaId: string, list: PendingSale[]) {
  return list.filter((s) => s.feria_id === feriaId);
}