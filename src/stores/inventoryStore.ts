import { create } from "zustand";

export interface MaterialConfig {
  id: string;
  productName: string;
  productType: string;
  gramsPerUnit: number;
}

export interface GelStock {
  id: string;
  name: string;
  availableGrams: number;
}

export interface DailyProductionEntry {
  id: string;
  fecha: string;
  area: "cuerpos" | "llenado" | "terminado";
  brand: "sweatspot" | "magical";
  inventoryType: "materia_prima" | "cuerpos_referencias" | "producto_terminado";
  product: string;
  quantity: number;
  unit: "unidades" | "gramos" | "kilos";
  observaciones?: string;
}

export interface InventoryTotal {
  product: string;
  brand: string;
  inventoryType: string;
  totalQuantity: number;
  unit: string;
}

export type StockStatus = "ok" | "bajo" | "critico";

export interface StockItem {
  id: string;
  category: "materia_prima" | "cuerpos_referencias" | "producto_terminado";
  name: string;
  available: number;
  unit: string;
  minStock: number;
}

const INITIAL_CONFIGS: MaterialConfig[] = [
  { id: "1", productName: "Muela", productType: "Gel terapéutico", gramsPerUnit: 60 },
  { id: "2", productName: "Cuello", productType: "Gel terapéutico", gramsPerUnit: 120 },
  { id: "3", productName: "Rodilla", productType: "Gel terapéutico", gramsPerUnit: 90 },
];

const INITIAL_GEL_STOCK: GelStock[] = [
  { id: "gs-1", name: "Gel terapéutico", availableGrams: 15000 },
];

const INITIAL_STOCK_ITEMS: StockItem[] = [
  // Materia prima
  { id: "si-1", category: "materia_prima", name: "Gel", available: 15000, unit: "gramos", minStock: 5000 },
  { id: "si-2", category: "materia_prima", name: "Mezclas para gel", available: 8000, unit: "gramos", minStock: 3000 },
  { id: "si-3", category: "materia_prima", name: "Rollos plásticos", available: 25, unit: "unidades", minStock: 10 },
  { id: "si-4", category: "materia_prima", name: "Tintas", available: 12, unit: "unidades", minStock: 5 },
  { id: "si-5", category: "materia_prima", name: "Silicona", available: 3000, unit: "gramos", minStock: 1000 },
  // Cuerpos o referencias
  { id: "si-6", category: "cuerpos_referencias", name: "Envase Muela", available: 200, unit: "unidades", minStock: 50 },
  { id: "si-7", category: "cuerpos_referencias", name: "Envase Cuello", available: 150, unit: "unidades", minStock: 50 },
  { id: "si-8", category: "cuerpos_referencias", name: "Envase Rodilla", available: 80, unit: "unidades", minStock: 50 },
  // Productos terminados
  { id: "si-9", category: "producto_terminado", name: "Muela (terminado)", available: 120, unit: "unidades", minStock: 30 },
  { id: "si-10", category: "producto_terminado", name: "Cuello (terminado)", available: 45, unit: "unidades", minStock: 30 },
  { id: "si-11", category: "producto_terminado", name: "Rodilla (terminado)", available: 15, unit: "unidades", minStock: 30 },
];

interface InventoryStore {
  materialConfigs: MaterialConfig[];
  gelStock: GelStock[];
  dailyEntries: DailyProductionEntry[];
  inventoryTotals: InventoryTotal[];
  stockItems: StockItem[];
  addMaterialConfig: (config: Omit<MaterialConfig, "id">) => void;
  updateMaterialConfig: (id: string, config: Partial<Omit<MaterialConfig, "id">>) => void;
  deleteMaterialConfig: (id: string) => void;
  updateGelStock: (id: string, availableGrams: number) => void;
  getTotalGelAvailable: () => number;
  addDailyEntry: (entry: Omit<DailyProductionEntry, "id">) => void;
  deleteDailyEntry: (id: string) => void;
  updateStockItem: (id: string, updates: Partial<Omit<StockItem, "id" | "category">>) => void;
  addStockItem: (item: Omit<StockItem, "id">) => void;
  deleteStockItem: (id: string) => void;
  getStockStatus: (item: StockItem) => StockStatus;
}

function recalcTotals(entries: DailyProductionEntry[]): InventoryTotal[] {
  const map = new Map<string, InventoryTotal>();
  for (const e of entries) {
    const key = `${e.product}|${e.brand}|${e.inventoryType}|${e.unit}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalQuantity += e.quantity;
    } else {
      map.set(key, {
        product: e.product,
        brand: e.brand,
        inventoryType: e.inventoryType,
        totalQuantity: e.quantity,
        unit: e.unit,
      });
    }
  }
  return Array.from(map.values());
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  materialConfigs: INITIAL_CONFIGS,
  gelStock: INITIAL_GEL_STOCK,
  dailyEntries: [],
  inventoryTotals: [],

  addMaterialConfig: (config) => {
    const newConfig: MaterialConfig = {
      ...config,
      id: `mc-${Date.now()}`,
    };
    set({ materialConfigs: [...get().materialConfigs, newConfig] });
  },

  updateMaterialConfig: (id, updates) => {
    set({
      materialConfigs: get().materialConfigs.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    });
  },

  deleteMaterialConfig: (id) => {
    set({ materialConfigs: get().materialConfigs.filter((c) => c.id !== id) });
  },

  updateGelStock: (id, availableGrams) => {
    set({
      gelStock: get().gelStock.map((s) =>
        s.id === id ? { ...s, availableGrams } : s
      ),
    });
  },

  getTotalGelAvailable: () => {
    return get().gelStock.reduce((sum, s) => sum + s.availableGrams, 0);
  },

  addDailyEntry: (entry) => {
    const newEntry: DailyProductionEntry = { ...entry, id: `de-${Date.now()}` };
    const newEntries = [...get().dailyEntries, newEntry];

    // If entry is materia_prima in gramos/kilos, also update gelStock
    if (entry.inventoryType === "materia_prima") {
      const addedGrams = entry.unit === "kilos" ? entry.quantity * 1000 : entry.unit === "gramos" ? entry.quantity : 0;
      if (addedGrams > 0) {
        const gelStock = get().gelStock.map((s) => ({ ...s, availableGrams: s.availableGrams + addedGrams }));
        set({ dailyEntries: newEntries, inventoryTotals: recalcTotals(newEntries), gelStock });
        return;
      }
    }

    set({ dailyEntries: newEntries, inventoryTotals: recalcTotals(newEntries) });
  },

  deleteDailyEntry: (id) => {
    const entry = get().dailyEntries.find((e) => e.id === id);
    const newEntries = get().dailyEntries.filter((e) => e.id !== id);

    // Reverse gelStock update if needed
    if (entry && entry.inventoryType === "materia_prima") {
      const removedGrams = entry.unit === "kilos" ? entry.quantity * 1000 : entry.unit === "gramos" ? entry.quantity : 0;
      if (removedGrams > 0) {
        const gelStock = get().gelStock.map((s) => ({ ...s, availableGrams: Math.max(0, s.availableGrams - removedGrams) }));
        set({ dailyEntries: newEntries, inventoryTotals: recalcTotals(newEntries), gelStock });
        return;
      }
    }

    set({ dailyEntries: newEntries, inventoryTotals: recalcTotals(newEntries) });
  },
}));
