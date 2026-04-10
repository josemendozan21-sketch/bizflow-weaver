import { create } from "zustand";

export type ClientType = "Venta mostrador" | "Cliente empresa";

export interface AccountingOrder {
  id: string;
  clientName: string;
  brand: "magical" | "sweatspot";
  product: string;
  quantity: number;
  saleType: "mayor" | "menor";
  clientType: ClientType;
  createdAt: string;
  totalAmount?: number;
  abono?: number;
  paymentStatus?: "abono_inicial" | "pago_total" | "pendiente";
  hasRut: boolean;
  email?: string;
  cedula?: string;
  direccion?: string;
  ciudad?: string;
  observaciones?: string;
  /** Filled when dispatched */
  dispatchedAt?: string;
  transportadora?: string;
  numeroGuia?: string;
  status: "pendiente" | "facturado";
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  invoiceNotes?: string;
}

interface AccountingStore {
  orders: AccountingOrder[];
  addOrder: (order: Omit<AccountingOrder, "id" | "status" | "createdAt">) => void;
  updateDispatchInfo: (clientName: string, brand: string, info: { dispatchedAt: string; transportadora: string; numeroGuia: string }) => void;
  markInvoiced: (id: string, data: { invoiceNumber: string; invoiceAmount: number; invoiceNotes?: string }) => void;
}

export const useAccountingStore = create<AccountingStore>((set, get) => ({
  orders: [],

  addOrder: (order) => {
    const newOrder: AccountingOrder = {
      ...order,
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: "pendiente",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    set({ orders: [...get().orders, newOrder] });
  },

  updateDispatchInfo: (clientName, brand, info) => {
    const orders = get().orders;
    const idx = orders.findIndex(
      (o) => o.clientName === clientName && o.brand === brand && !o.dispatchedAt
    );
    if (idx === -1) return;
    const updated = [...orders];
    updated[idx] = { ...updated[idx], ...info };
    set({ orders: updated });
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
