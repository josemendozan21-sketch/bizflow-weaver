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
  { id: "1", productName: "Lumbar", productType: "Frío", gramsPerUnit: 720 },
  { id: "2", productName: "Lumbar", productType: "Térmico", gramsPerUnit: 720 },
  { id: "3", productName: "Shoulder", productType: "Frío", gramsPerUnit: 620 },
  { id: "4", productName: "Shoulder", productType: "Térmico", gramsPerUnit: 620 },
  { id: "5", productName: "Cervical", productType: "Frío", gramsPerUnit: 550 },
  { id: "6", productName: "Cervical", productType: "Térmico", gramsPerUnit: 550 },
  { id: "7", productName: "Multiusos", productType: "Térmico", gramsPerUnit: 320 },
  { id: "8", productName: "Multiusos", productType: "Frío", gramsPerUnit: 500 },
  { id: "9", productName: "Pocket", productType: "Frío", gramsPerUnit: 125 },
  { id: "10", productName: "Pocket", productType: "Térmico", gramsPerUnit: 125 },
  { id: "11", productName: "Handy", productType: "Frío", gramsPerUnit: 75 },
  { id: "12", productName: "Handy", productType: "Térmico", gramsPerUnit: 75 },
  { id: "13", productName: "Muela", productType: "Frío", gramsPerUnit: 50 },
  { id: "14", productName: "Muela", productType: "Térmico", gramsPerUnit: 50 },
  { id: "15", productName: "Círculo 8 cm", productType: "Frío", gramsPerUnit: 35 },
  { id: "16", productName: "Círculo 8 cm", productType: "Térmico", gramsPerUnit: 35 },
  { id: "17", productName: "Círculo 12 cm", productType: "Frío", gramsPerUnit: 125 },
  { id: "18", productName: "Círculo 12 cm", productType: "Térmico", gramsPerUnit: 125 },
  { id: "19", productName: "Antifaz", productType: "Frío", gramsPerUnit: 220 },
  { id: "20", productName: "Antifaz", productType: "Térmico", gramsPerUnit: 220 },
  { id: "21", productName: "Tapa ojos", productType: "Frío", gramsPerUnit: 200 },
  { id: "22", productName: "Tapa ojos", productType: "Térmico", gramsPerUnit: 200 },
  { id: "23", productName: "Maxilo", productType: "Frío", gramsPerUnit: 280 },
  { id: "24", productName: "Maxilo", productType: "Térmico", gramsPerUnit: 280 },
  { id: "25", productName: "Faja", productType: "Frío", gramsPerUnit: 600 },
  { id: "26", productName: "Faja", productType: "Térmico", gramsPerUnit: 600 },
];

const INITIAL_GEL_STOCK: GelStock[] = [
  { id: "gs-1", name: "Gel terapéutico", availableGrams: 15000 },
];

const INITIAL_STOCK_ITEMS: StockItem[] = [
  // Materia prima
  { id: "si-1", category: "materia_prima", name: "Gel / mezcla", available: 15000, unit: "gramos", minStock: 5000 },
  { id: "si-2", category: "materia_prima", name: "Glicerina", available: 25, unit: "kilos", minStock: 10 },
  { id: "si-3", category: "materia_prima", name: "Carbopol", available: 3000, unit: "gramos", minStock: 1000 },
  { id: "si-4", category: "materia_prima", name: "Tinta PVC - Blanco", available: 5, unit: "tarros", minStock: 2 },
  { id: "si-4b", category: "materia_prima", name: "Tinta PVC - Negro", available: 4, unit: "tarros", minStock: 2 },
  { id: "si-4c", category: "materia_prima", name: "Tinta PVC - Rojo", available: 3, unit: "tarros", minStock: 2 },
  { id: "si-4d", category: "materia_prima", name: "Tinta PVC - Azul", available: 3, unit: "tarros", minStock: 2 },
  { id: "si-5", category: "materia_prima", name: "Colorante - Azul", available: 500, unit: "gramos", minStock: 200 },
  { id: "si-5b", category: "materia_prima", name: "Colorante - Rojo", available: 400, unit: "gramos", minStock: 200 },
  { id: "si-5c", category: "materia_prima", name: "Colorante - Verde", available: 350, unit: "gramos", minStock: 200 },
  { id: "si-5d", category: "materia_prima", name: "Colorante - Morado", available: 300, unit: "gramos", minStock: 200 },
  { id: "si-6a", category: "materia_prima", name: "Rollos de frío", available: 15, unit: "unidades", minStock: 5 },
  { id: "si-6b", category: "materia_prima", name: "Rollos de calor", available: 12, unit: "unidades", minStock: 5 },
  // Cuerpos o referencias
  { id: "si-7", category: "cuerpos_referencias", name: "Envase Muela", available: 200, unit: "unidades", minStock: 50 },
  { id: "si-8", category: "cuerpos_referencias", name: "Envase Cuello", available: 150, unit: "unidades", minStock: 50 },
  { id: "si-9", category: "cuerpos_referencias", name: "Envase Rodilla", available: 80, unit: "unidades", minStock: 50 },
  // Productos terminados
  { id: "si-10", category: "producto_terminado", name: "Muela (terminado)", available: 120, unit: "unidades", minStock: 30 },
  { id: "si-11", category: "producto_terminado", name: "Cuello (terminado)", available: 45, unit: "unidades", minStock: 30 },
  { id: "si-12", category: "producto_terminado", name: "Rodilla (terminado)", available: 15, unit: "unidades", minStock: 30 },
];

export interface ProductionRequirement {
  id: string;
  brand: string;
  product: string;
  quantity: number;
  reason: string;
  createdAt: string;
  status: "pendiente" | "en_proceso" | "completado";
}

interface InventoryStore {
  materialConfigs: MaterialConfig[];
  gelStock: GelStock[];
  dailyEntries: DailyProductionEntry[];
  inventoryTotals: InventoryTotal[];
  stockItems: StockItem[];
  productionRequirements: ProductionRequirement[];
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
  /** Retail: discount from producto_terminado. Returns { success, message } */
  discountFinishedProduct: (productName: string, quantity: number) => { success: boolean; message: string };
  /** Wholesale: check cuerpos_referencias, discount if available, else create production requirement */
  reserveBodyStock: (productName: string, quantity: number, brand: string) => { available: boolean; discounted: number; message: string };
  /** Magical Warmers: discount gel from materia_prima based on config */
  discountGelForMagical: (productName: string, quantity: number) => { success: boolean; gramsUsed: number; message: string };
  addProductionRequirement: (req: Omit<ProductionRequirement, "id" | "createdAt" | "status">) => void;
  updateProductionRequirementStatus: (id: string, status: ProductionRequirement["status"]) => void;
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
  stockItems: INITIAL_STOCK_ITEMS,
  productionRequirements: [],

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

  updateStockItem: (id, updates) => {
    set({ stockItems: get().stockItems.map((s) => (s.id === id ? { ...s, ...updates } : s)) });
  },

  addStockItem: (item) => {
    set({ stockItems: [...get().stockItems, { ...item, id: `si-${Date.now()}` }] });
  },

  deleteStockItem: (id) => {
    set({ stockItems: get().stockItems.filter((s) => s.id !== id) });
  },

  getStockStatus: (item) => {
    if (item.available <= item.minStock * 0.3) return "critico";
    if (item.available <= item.minStock) return "bajo";
    return "ok";
  },

  discountFinishedProduct: (productName, quantity) => {
    const items = get().stockItems;
    const item = items.find(
      (s) => s.category === "producto_terminado" && s.name.toLowerCase().includes(productName.toLowerCase())
    );
    if (!item) {
      return { success: false, message: `Producto terminado "${productName}" no encontrado en inventario.` };
    }
    if (item.available < quantity) {
      return { success: false, message: `Stock insuficiente de "${item.name}". Disponible: ${item.available}, requerido: ${quantity}.` };
    }
    set({
      stockItems: items.map((s) =>
        s.id === item.id ? { ...s, available: s.available - quantity } : s
      ),
    });
    return { success: true, message: `Se descontaron ${quantity} uds. de "${item.name}". Nuevo stock: ${item.available - quantity}.` };
  },

  reserveBodyStock: (productName, quantity, brand) => {
    const items = get().stockItems;
    const item = items.find(
      (s) => s.category === "cuerpos_referencias" && s.name.toLowerCase().includes(productName.toLowerCase())
    );

    if (!item || item.available <= 0) {
      // No stock at all — generate production requirement
      get().addProductionRequirement({
        brand,
        product: productName,
        quantity,
        reason: `Sin stock de cuerpos para "${productName}". Se requieren ${quantity} unidades.`,
      });
      return { available: false, discounted: 0, message: `Sin stock de "${productName}". Se generó requerimiento de producción por ${quantity} uds.` };
    }

    const toDiscount = Math.min(item.available, quantity);
    const remaining = quantity - toDiscount;

    set({
      stockItems: items.map((s) =>
        s.id === item.id ? { ...s, available: s.available - toDiscount } : s
      ),
    });

    if (remaining > 0) {
      get().addProductionRequirement({
        brand,
        product: productName,
        quantity: remaining,
        reason: `Stock parcial de "${item.name}". Descontados: ${toDiscount}, faltan: ${remaining} uds.`,
      });
      return { available: true, discounted: toDiscount, message: `Se descontaron ${toDiscount} uds. de "${item.name}". Faltan ${remaining} uds — requerimiento de producción generado.` };
    }

    return { available: true, discounted: toDiscount, message: `Se reservaron ${toDiscount} uds. de "${item.name}".` };
  },

  discountGelForMagical: (productName, quantity) => {
    const config = get().materialConfigs.find(
      (c) => c.productName.toLowerCase().includes(productName.toLowerCase())
    );
    const gramsPerUnit = config?.gramsPerUnit || 60; // fallback
    const totalGrams = quantity * gramsPerUnit;

    const items = get().stockItems;
    const gelItem = items.find((s) => s.category === "materia_prima" && s.name.toLowerCase() === "gel");

    if (!gelItem) {
      return { success: false, gramsUsed: 0, message: "No se encontró 'Gel' en materia prima." };
    }

    if (gelItem.available < totalGrams) {
      // Project usage but warn
      const newAvailable = Math.max(0, gelItem.available - totalGrams);
      set({
        stockItems: items.map((s) => s.id === gelItem.id ? { ...s, available: newAvailable } : s),
        gelStock: get().gelStock.map((g) => ({ ...g, availableGrams: Math.max(0, g.availableGrams - totalGrams) })),
      });
      return { success: true, gramsUsed: totalGrams, message: `⚠️ Gel insuficiente. Se proyectaron ${totalGrams}g (${quantity} uds × ${gramsPerUnit}g). Stock actual negativo — reabastecer.` };
    }

    set({
      stockItems: items.map((s) => s.id === gelItem.id ? { ...s, available: gelItem.available - totalGrams } : s),
      gelStock: get().gelStock.map((g) => ({ ...g, availableGrams: Math.max(0, g.availableGrams - totalGrams) })),
    });
    return { success: true, gramsUsed: totalGrams, message: `Se descontaron ${totalGrams}g de gel (${quantity} uds × ${gramsPerUnit}g/ud).` };
  },

  addProductionRequirement: (req) => {
    const newReq: ProductionRequirement = {
      ...req,
      id: `pr-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      status: "pendiente",
    };
    set({ productionRequirements: [...get().productionRequirements, newReq] });
  },

  updateProductionRequirementStatus: (id, status) => {
    set({
      productionRequirements: get().productionRequirements.map((r) =>
        r.id === id ? { ...r, status } : r
      ),
    });
  },
}));
