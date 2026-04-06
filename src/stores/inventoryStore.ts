import { create } from "zustand";

export interface MaterialConfig {
  id: string;
  productName: string;
  productType: string;
  gramsPerUnit: number;
}

const INITIAL_CONFIGS: MaterialConfig[] = [
  { id: "1", productName: "Muela", productType: "Gel terapéutico", gramsPerUnit: 60 },
  { id: "2", productName: "Cuello", productType: "Gel terapéutico", gramsPerUnit: 120 },
  { id: "3", productName: "Rodilla", productType: "Gel terapéutico", gramsPerUnit: 90 },
];

interface InventoryStore {
  materialConfigs: MaterialConfig[];
  addMaterialConfig: (config: Omit<MaterialConfig, "id">) => void;
  updateMaterialConfig: (id: string, config: Partial<Omit<MaterialConfig, "id">>) => void;
  deleteMaterialConfig: (id: string) => void;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  materialConfigs: INITIAL_CONFIGS,

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
}));
