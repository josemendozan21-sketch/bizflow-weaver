import { create } from "zustand";

export interface AccountingOrder {
  id: string;
  clientName: string;
  brand: "magical" | "sweatspot";
  product: string;
  quantity: number;
  saleType: "mayor" | "menor";
  dispatchedAt: string;
  transportadora: string;
  numeroGuia: string;
  status: "pendiente" | "facturado";
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  invoiceNotes?: string;
}

interface AccountingStore {
  orders: AccountingOrder[];
  addOrder: (order: Omit<AccountingOrder, "id" | "status">) => void;
  markInvoiced: (id: string, data: { invoiceNumber: string; invoiceAmount: number; invoiceNotes?: string }) => void;
}

export const useAccountingStore = create<AccountingStore>((set, get) => ({
  orders: [],

  addOrder: (order) => {
    const newOrder: AccountingOrder = {
      ...order,
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: "pendiente",
    };
    set({ orders: [...get().orders, newOrder] });
  },

  markInvoiced: (id, data) => {
    set({
      orders: get().orders.map((o) =>
        o.id === id
          ? {
              ...o,
              status: "facturado" as const,
              invoiceNumber: data.invoiceNumber,
              invoiceAmount: data.invoiceAmount,
              invoiceNotes: data.invoiceNotes || "",
              invoiceDate: new Date().toISOString().slice(0, 10),
            }
          : o
      ),
    });
  },
}));
