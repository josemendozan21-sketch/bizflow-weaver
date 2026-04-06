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

const INITIAL_CONFIGS: MaterialConfig[] = [
  { id: "1", productName: "Muela", productType: "Gel terapéutico", gramsPerUnit: 60 },
  { id: "2", productName: "Cuello", productType: "Gel terapéutico", gramsPerUnit: 120 },
  { id: "3", productName: "Rodilla", productType: "Gel terapéutico", gramsPerUnit: 90 },
];

const INITIAL_GEL_STOCK: GelStock[] = [
  { id: "gs-1", name: "Gel terapéutico", availableGrams: 15000 },
];

interface InventoryStore {
  materialConfigs: MaterialConfig[];
  gelStock: GelStock[];
  addMaterialConfig: (config: Omit<MaterialConfig, "id">) => void;
  updateMaterialConfig: (id: string, config: Partial<Omit<MaterialConfig, "id">>) => void;
  deleteMaterialConfig: (id: string) => void;
  updateGelStock: (id: string, availableGrams: number) => void;
  getTotalGelAvailable: () => number;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  materialConfigs: INITIAL_CONFIGS,
  gelStock: INITIAL_GEL_STOCK,

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
}));
