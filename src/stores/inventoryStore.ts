import { create } from "zustand";

export interface MaterialConfig {
  id: string;
  productName: string;
  productType: string;
  gramsPerUnit: number;
  finishedUnits: number;
  bodyUnits: number;
  minBodyUnits: number;
  minFinishedUnits: number;
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

export type InventoryCategory = "materia_prima" | "producto_en_proceso" | "cuerpos_referencias" | "producto_terminado";
export type InventoryBrand = "sweatspot" | "magical_warmers";

export type ProductType = "Térmico" | "Frío" | null;

export type SweatspotProductCategory = "termos_150" | "termos_250" | "termos_500" | "canguros" | "chalecos";

export interface StockItem {
  id: string;
  brand: InventoryBrand;
  category: InventoryCategory;
  name: string;
  available: number;
  unit: string;
  minStock: number;
  productType?: ProductType;
  color?: string;
  logo?: string;
  sweatspotCategory?: SweatspotProductCategory;
}

const INITIAL_CONFIGS: MaterialConfig[] = [
  { id: "1", productName: "Lumbar", productType: "Frío", gramsPerUnit: 720, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "2", productName: "Lumbar", productType: "Térmico", gramsPerUnit: 720, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "3", productName: "Shoulder", productType: "Frío", gramsPerUnit: 620, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "4", productName: "Shoulder", productType: "Térmico", gramsPerUnit: 620, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "5", productName: "Cervical", productType: "Frío", gramsPerUnit: 550, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "6", productName: "Cervical", productType: "Térmico", gramsPerUnit: 550, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "7", productName: "Multiusos", productType: "Térmico", gramsPerUnit: 320, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "8", productName: "Multiusos", productType: "Frío", gramsPerUnit: 500, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "9", productName: "Pocket", productType: "Frío", gramsPerUnit: 125, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "10", productName: "Pocket", productType: "Térmico", gramsPerUnit: 125, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "11", productName: "Handy", productType: "Frío", gramsPerUnit: 75, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "12", productName: "Handy", productType: "Térmico", gramsPerUnit: 75, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "13", productName: "Muela", productType: "Frío", gramsPerUnit: 50, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "14", productName: "Muela", productType: "Térmico", gramsPerUnit: 50, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "15", productName: "Círculo 8 cm", productType: "Frío", gramsPerUnit: 35, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "16", productName: "Círculo 8 cm", productType: "Térmico", gramsPerUnit: 35, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "17", productName: "Círculo 12 cm", productType: "Frío", gramsPerUnit: 125, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
  { id: "18", productName: "Círculo 12 cm", productType: "Térmico", gramsPerUnit: 125, finishedUnits: 0, bodyUnits: 0, minBodyUnits: 0, minFinishedUnits: 0 },
];

const INITIAL_GEL_STOCK: GelStock[] = [
  { id: "gs-1", name: "Gel terapéutico", availableGrams: 15000 },
];

const INITIAL_STOCK_ITEMS: StockItem[] = [
  // Sweatspot - Materia prima
  { id: "si-ss-mp-1", brand: "sweatspot", category: "materia_prima", name: "Silicona Negro 250 ML", available: 433, unit: "unidades", minStock: 200 },
  { id: "si-ss-mp-2", brand: "sweatspot", category: "materia_prima", name: "Silicona Azul 250 ML", available: 433, unit: "unidades", minStock: 200 },
  { id: "si-ss-mp-3", brand: "sweatspot", category: "materia_prima", name: "Silicona Rosado 250 ML", available: 433, unit: "unidades", minStock: 200 },
  { id: "si-ss-mp-4", brand: "sweatspot", category: "materia_prima", name: "Silicona Morado 250 ML", available: 433, unit: "unidades", minStock: 200 },
  { id: "si-ss-mp-5", brand: "sweatspot", category: "materia_prima", name: "Silicona Negro 500 ML", available: 433, unit: "unidades", minStock: 200 },
  { id: "si-ss-mp-6", brand: "sweatspot", category: "materia_prima", name: "Silicona Azul 500 ML", available: 433, unit: "unidades", minStock: 200 },
  { id: "si-ss-mp-7", brand: "sweatspot", category: "materia_prima", name: "Silicona Rosado 500 ML", available: 433, unit: "unidades", minStock: 200 },
  { id: "si-ss-mp-8", brand: "sweatspot", category: "materia_prima", name: "Silicona Morado 500 ML", available: 433, unit: "unidades", minStock: 200 },
  { id: "si-ss-mp-9", brand: "sweatspot", category: "materia_prima", name: "Cuello Transparente", available: 433, unit: "unidades", minStock: 200 },
  { id: "si-ss-mp-10", brand: "sweatspot", category: "materia_prima", name: "Cuello Azul", available: 433, unit: "unidades", minStock: 200 },
  { id: "si-ss-mp-11", brand: "sweatspot", category: "materia_prima", name: "Cuello Negro", available: 433, unit: "unidades", minStock: 200 },
  { id: "si-ss-mp-12", brand: "sweatspot", category: "materia_prima", name: "Cuello Morado", available: 433, unit: "unidades", minStock: 200 },
  { id: "si-ss-mp-13", brand: "sweatspot", category: "materia_prima", name: "Cuello Rosado", available: 433, unit: "unidades", minStock: 200 },
  { id: "si-ss-mp-14", brand: "sweatspot", category: "materia_prima", name: "Boquillas", available: 433, unit: "unidades", minStock: 400 },
  // Magical Warmers - Materia prima
  { id: "si-mw-mp-1", brand: "magical_warmers", category: "materia_prima", name: "Gel / mezcla", available: 15000, unit: "gramos", minStock: 5000 },
  { id: "si-mw-mp-2", brand: "magical_warmers", category: "materia_prima", name: "Glicerina", available: 25, unit: "kilos", minStock: 10 },
  { id: "si-mw-mp-3", brand: "magical_warmers", category: "materia_prima", name: "Carbopol", available: 3000, unit: "gramos", minStock: 1000 },
  { id: "si-mw-mp-4", brand: "magical_warmers", category: "materia_prima", name: "Colorante - Azul", available: 500, unit: "gramos", minStock: 200 },
  { id: "si-mw-mp-5", brand: "magical_warmers", category: "materia_prima", name: "Colorante - Rojo", available: 400, unit: "gramos", minStock: 200 },
  { id: "si-mw-mp-6", brand: "magical_warmers", category: "materia_prima", name: "Rollos de frío", available: 15, unit: "unidades", minStock: 5 },
  { id: "si-mw-mp-7", brand: "magical_warmers", category: "materia_prima", name: "Rollos de calor", available: 12, unit: "unidades", minStock: 5 },
  // Magical Warmers - Cuerpos (Térmicos)
  { id: "si-mw-cr-t-1", brand: "magical_warmers", category: "cuerpos_referencias", name: "Lumbar", available: 0, unit: "unidades", minStock: 10, productType: "Térmico" },
  { id: "si-mw-cr-t-2", brand: "magical_warmers", category: "cuerpos_referencias", name: "Shoulder", available: 0, unit: "unidades", minStock: 10, productType: "Térmico" },
  { id: "si-mw-cr-t-3", brand: "magical_warmers", category: "cuerpos_referencias", name: "Cervical", available: 0, unit: "unidades", minStock: 10, productType: "Térmico" },
  { id: "si-mw-cr-t-4", brand: "magical_warmers", category: "cuerpos_referencias", name: "Multiusos", available: 0, unit: "unidades", minStock: 10, productType: "Térmico" },
  { id: "si-mw-cr-t-5", brand: "magical_warmers", category: "cuerpos_referencias", name: "Pocket", available: 0, unit: "unidades", minStock: 10, productType: "Térmico" },
  { id: "si-mw-cr-t-6", brand: "magical_warmers", category: "cuerpos_referencias", name: "Handy", available: 0, unit: "unidades", minStock: 10, productType: "Térmico" },
  { id: "si-mw-cr-t-7", brand: "magical_warmers", category: "cuerpos_referencias", name: "Muela", available: 0, unit: "unidades", minStock: 20, productType: "Térmico" },
  { id: "si-mw-cr-t-8", brand: "magical_warmers", category: "cuerpos_referencias", name: "Círculo 8 cm", available: 0, unit: "unidades", minStock: 10, productType: "Térmico" },
  { id: "si-mw-cr-t-9", brand: "magical_warmers", category: "cuerpos_referencias", name: "Círculo 12 cm", available: 0, unit: "unidades", minStock: 10, productType: "Térmico" },
  // Magical Warmers - Cuerpos (Fríos)
  { id: "si-mw-cr-f-1", brand: "magical_warmers", category: "cuerpos_referencias", name: "Lumbar", available: 0, unit: "unidades", minStock: 10, productType: "Frío" },
  { id: "si-mw-cr-f-2", brand: "magical_warmers", category: "cuerpos_referencias", name: "Shoulder", available: 0, unit: "unidades", minStock: 10, productType: "Frío" },
  { id: "si-mw-cr-f-3", brand: "magical_warmers", category: "cuerpos_referencias", name: "Cervical", available: 0, unit: "unidades", minStock: 10, productType: "Frío" },
  { id: "si-mw-cr-f-4", brand: "magical_warmers", category: "cuerpos_referencias", name: "Multiusos", available: 0, unit: "unidades", minStock: 10, productType: "Frío" },
  { id: "si-mw-cr-f-5", brand: "magical_warmers", category: "cuerpos_referencias", name: "Pocket", available: 0, unit: "unidades", minStock: 10, productType: "Frío" },
  { id: "si-mw-cr-f-6", brand: "magical_warmers", category: "cuerpos_referencias", name: "Handy", available: 0, unit: "unidades", minStock: 10, productType: "Frío" },
  { id: "si-mw-cr-f-7", brand: "magical_warmers", category: "cuerpos_referencias", name: "Muela", available: 0, unit: "unidades", minStock: 20, productType: "Frío" },
  { id: "si-mw-cr-f-8", brand: "magical_warmers", category: "cuerpos_referencias", name: "Círculo 8 cm", available: 0, unit: "unidades", minStock: 10, productType: "Frío" },
  { id: "si-mw-cr-f-9", brand: "magical_warmers", category: "cuerpos_referencias", name: "Círculo 12 cm", available: 0, unit: "unidades", minStock: 10, productType: "Frío" },
  // Magical Warmers - Producto Terminado (Térmicos)
  { id: "si-mw-pt-t-1", brand: "magical_warmers", category: "producto_terminado", name: "Lumbar", available: 0, unit: "unidades", minStock: 5, productType: "Térmico" },
  { id: "si-mw-pt-t-2", brand: "magical_warmers", category: "producto_terminado", name: "Shoulder", available: 0, unit: "unidades", minStock: 5, productType: "Térmico" },
  { id: "si-mw-pt-t-3", brand: "magical_warmers", category: "producto_terminado", name: "Cervical", available: 0, unit: "unidades", minStock: 5, productType: "Térmico" },
  { id: "si-mw-pt-t-4", brand: "magical_warmers", category: "producto_terminado", name: "Multiusos", available: 0, unit: "unidades", minStock: 5, productType: "Térmico" },
  { id: "si-mw-pt-t-5", brand: "magical_warmers", category: "producto_terminado", name: "Pocket", available: 0, unit: "unidades", minStock: 5, productType: "Térmico" },
  { id: "si-mw-pt-t-6", brand: "magical_warmers", category: "producto_terminado", name: "Handy", available: 0, unit: "unidades", minStock: 5, productType: "Térmico" },
  { id: "si-mw-pt-t-7", brand: "magical_warmers", category: "producto_terminado", name: "Muela", available: 0, unit: "unidades", minStock: 10, productType: "Térmico" },
  { id: "si-mw-pt-t-8", brand: "magical_warmers", category: "producto_terminado", name: "Círculo 8 cm", available: 0, unit: "unidades", minStock: 5, productType: "Térmico" },
  { id: "si-mw-pt-t-9", brand: "magical_warmers", category: "producto_terminado", name: "Círculo 12 cm", available: 0, unit: "unidades", minStock: 5, productType: "Térmico" },
  // Magical Warmers - Producto Terminado (Fríos)
  { id: "si-mw-pt-f-1", brand: "magical_warmers", category: "producto_terminado", name: "Lumbar", available: 0, unit: "unidades", minStock: 5, productType: "Frío" },
  { id: "si-mw-pt-f-2", brand: "magical_warmers", category: "producto_terminado", name: "Shoulder", available: 0, unit: "unidades", minStock: 5, productType: "Frío" },
  { id: "si-mw-pt-f-3", brand: "magical_warmers", category: "producto_terminado", name: "Cervical", available: 0, unit: "unidades", minStock: 5, productType: "Frío" },
  { id: "si-mw-pt-f-4", brand: "magical_warmers", category: "producto_terminado", name: "Multiusos", available: 0, unit: "unidades", minStock: 5, productType: "Frío" },
  { id: "si-mw-pt-f-5", brand: "magical_warmers", category: "producto_terminado", name: "Pocket", available: 0, unit: "unidades", minStock: 5, productType: "Frío" },
  { id: "si-mw-pt-f-6", brand: "magical_warmers", category: "producto_terminado", name: "Handy", available: 0, unit: "unidades", minStock: 5, productType: "Frío" },
  { id: "si-mw-pt-f-7", brand: "magical_warmers", category: "producto_terminado", name: "Muela", available: 0, unit: "unidades", minStock: 10, productType: "Frío" },
  { id: "si-mw-pt-f-8", brand: "magical_warmers", category: "producto_terminado", name: "Círculo 8 cm", available: 0, unit: "unidades", minStock: 5, productType: "Frío" },
  { id: "si-mw-pt-f-9", brand: "magical_warmers", category: "producto_terminado", name: "Círculo 12 cm", available: 0, unit: "unidades", minStock: 5, productType: "Frío" },
  // Sweatspot - Producto Terminado - Sin logo - Termos 150
  { id: "si-ss-pt-1", brand: "sweatspot", category: "producto_terminado", name: "Termo 150 ML", color: "Rosado", logo: "Sin logo", sweatspotCategory: "termos_150", available: 4, unit: "unidades", minStock: 43 },
  { id: "si-ss-pt-2", brand: "sweatspot", category: "producto_terminado", name: "Termo 150 ML", color: "Azul", logo: "Sin logo", sweatspotCategory: "termos_150", available: 4, unit: "unidades", minStock: 4 },
  { id: "si-ss-pt-3", brand: "sweatspot", category: "producto_terminado", name: "Termo 150 ML", color: "Negro", logo: "Sin logo", sweatspotCategory: "termos_150", available: 4, unit: "unidades", minStock: 434 },
  { id: "si-ss-pt-4", brand: "sweatspot", category: "producto_terminado", name: "Termo 150 ML", color: "Morado", logo: "Sin logo", sweatspotCategory: "termos_150", available: 4, unit: "unidades", minStock: 34 },
  // Sin logo - Termos 250
  { id: "si-ss-pt-5", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Rosado", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 34 },
  { id: "si-ss-pt-6", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Azul", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 113 },
  { id: "si-ss-pt-7", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Negro", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 115 },
  { id: "si-ss-pt-8", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Morado", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 116 },
  { id: "si-ss-pt-9", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Transparente", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 117 },
  { id: "si-ss-pt-10", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Salmon", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 118 },
  { id: "si-ss-pt-11", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Verde Militar", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 119 },
  { id: "si-ss-pt-12", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Verde Biche", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 121 },
  { id: "si-ss-pt-13", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Amarillo", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 122 },
  { id: "si-ss-pt-14", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Rojo", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 123 },
  { id: "si-ss-pt-15", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML Juguetón", color: "Rosado", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 124 },
  { id: "si-ss-pt-16", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML Juguetón", color: "Azul", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 125 },
  { id: "si-ss-pt-17", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML Juguetón", color: "Negro", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 127 },
  { id: "si-ss-pt-18", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML Juguetón", color: "Morado", logo: "Sin logo", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 128 },
  // Sin logo - Termos 500
  { id: "si-ss-pt-19", brand: "sweatspot", category: "producto_terminado", name: "Termo 500 ML", color: "Rosado", logo: "Sin logo", sweatspotCategory: "termos_500", available: 4, unit: "unidades", minStock: 129 },
  { id: "si-ss-pt-20", brand: "sweatspot", category: "producto_terminado", name: "Termo 500 ML", color: "Azul", logo: "Sin logo", sweatspotCategory: "termos_500", available: 4, unit: "unidades", minStock: 130 },
  { id: "si-ss-pt-21", brand: "sweatspot", category: "producto_terminado", name: "Termo 500 ML", color: "Negro", logo: "Sin logo", sweatspotCategory: "termos_500", available: 4, unit: "unidades", minStock: 131 },
  { id: "si-ss-pt-22", brand: "sweatspot", category: "producto_terminado", name: "Termo 500 ML", color: "Morado", logo: "Sin logo", sweatspotCategory: "termos_500", available: 4, unit: "unidades", minStock: 133 },
  // Sweatspot logo - Termos 150
  { id: "si-ss-pt-23", brand: "sweatspot", category: "producto_terminado", name: "Termo 150 ML", color: "Rosado", logo: "Sweatspot", sweatspotCategory: "termos_150", available: 4, unit: "unidades", minStock: 134 },
  { id: "si-ss-pt-24", brand: "sweatspot", category: "producto_terminado", name: "Termo 150 ML", color: "Azul", logo: "Sweatspot", sweatspotCategory: "termos_150", available: 4, unit: "unidades", minStock: 135 },
  { id: "si-ss-pt-25", brand: "sweatspot", category: "producto_terminado", name: "Termo 150 ML", color: "Negro", logo: "Sweatspot", sweatspotCategory: "termos_150", available: 4, unit: "unidades", minStock: 136 },
  { id: "si-ss-pt-26", brand: "sweatspot", category: "producto_terminado", name: "Termo 150 ML", color: "Morado", logo: "Sweatspot", sweatspotCategory: "termos_150", available: 4, unit: "unidades", minStock: 137 },
  // Sweatspot logo - Termos 250
  { id: "si-ss-pt-27", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Rosado", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 139 },
  { id: "si-ss-pt-28", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Azul", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 140 },
  { id: "si-ss-pt-29", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Negro", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 141 },
  { id: "si-ss-pt-30", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Morado", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 142 },
  { id: "si-ss-pt-31", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Transparente", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 143 },
  { id: "si-ss-pt-32", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Salmon", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 145 },
  { id: "si-ss-pt-33", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Verde Militar", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 146 },
  { id: "si-ss-pt-34", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Verde Biche", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 147 },
  { id: "si-ss-pt-35", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Amarillo", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 148 },
  { id: "si-ss-pt-36", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML", color: "Rojo", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 149 },
  { id: "si-ss-pt-37", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML Juguetón", color: "Rosado", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 151 },
  { id: "si-ss-pt-38", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML Juguetón", color: "Azul", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 152 },
  { id: "si-ss-pt-39", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML Juguetón", color: "Negro", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 153 },
  { id: "si-ss-pt-40", brand: "sweatspot", category: "producto_terminado", name: "Termo 250 ML Juguetón", color: "Morado", logo: "Sweatspot", sweatspotCategory: "termos_250", available: 4, unit: "unidades", minStock: 154 },
  // Sweatspot logo - Termos 500
  { id: "si-ss-pt-41", brand: "sweatspot", category: "producto_terminado", name: "Termo 500 ML", color: "Rosado", logo: "Sweatspot", sweatspotCategory: "termos_500", available: 4, unit: "unidades", minStock: 155 },
  { id: "si-ss-pt-42", brand: "sweatspot", category: "producto_terminado", name: "Termo 500 ML", color: "Azul", logo: "Sweatspot", sweatspotCategory: "termos_500", available: 4, unit: "unidades", minStock: 157 },
  { id: "si-ss-pt-43", brand: "sweatspot", category: "producto_terminado", name: "Termo 500 ML", color: "Negro", logo: "Sweatspot", sweatspotCategory: "termos_500", available: 4, unit: "unidades", minStock: 158 },
  { id: "si-ss-pt-44", brand: "sweatspot", category: "producto_terminado", name: "Termo 500 ML", color: "Morado", logo: "Sweatspot", sweatspotCategory: "termos_500", available: 4, unit: "unidades", minStock: 159 },
  // Canguros
  { id: "si-ss-pt-45", brand: "sweatspot", category: "producto_terminado", name: "Freebelt BIB S", color: "Negro", logo: "Sweatspot", sweatspotCategory: "canguros", available: 4, unit: "unidades", minStock: 159 },
  { id: "si-ss-pt-46", brand: "sweatspot", category: "producto_terminado", name: "Freebelt BIB M", color: "Negro", logo: "Sweatspot", sweatspotCategory: "canguros", available: 4, unit: "unidades", minStock: 159 },
  { id: "si-ss-pt-47", brand: "sweatspot", category: "producto_terminado", name: "Freebelt BIB L", color: "Negro", logo: "Sweatspot", sweatspotCategory: "canguros", available: 4, unit: "unidades", minStock: 159 },
  { id: "si-ss-pt-48", brand: "sweatspot", category: "producto_terminado", name: "Freebelt BIB XL", color: "Negro", logo: "Sweatspot", sweatspotCategory: "canguros", available: 4, unit: "unidades", minStock: 159 },
  { id: "si-ss-pt-49", brand: "sweatspot", category: "producto_terminado", name: "Canguro con Botella", color: "Negro", logo: "Sweatspot", sweatspotCategory: "canguros", available: 4, unit: "unidades", minStock: 159 },
  { id: "si-ss-pt-50", brand: "sweatspot", category: "producto_terminado", name: "Canguro Impermeable", color: "Negro", logo: "Sweatspot", sweatspotCategory: "canguros", available: 4, unit: "unidades", minStock: 159 },
  { id: "si-ss-pt-51", brand: "sweatspot", category: "producto_terminado", name: "Bib Number", color: "Negro", logo: "Sweatspot", sweatspotCategory: "canguros", available: 4, unit: "unidades", minStock: 159 },
  { id: "si-ss-pt-52", brand: "sweatspot", category: "producto_terminado", name: "BIB Spot", color: "Negro", logo: "Sweatspot", sweatspotCategory: "canguros", available: 4, unit: "unidades", minStock: 159 },
  // Chalecos
  { id: "si-ss-pt-53", brand: "sweatspot", category: "producto_terminado", name: "Chalecos SM", color: "Negro", logo: "Sweatspot", sweatspotCategory: "chalecos", available: 4, unit: "unidades", minStock: 159 },
  { id: "si-ss-pt-54", brand: "sweatspot", category: "producto_terminado", name: "Chalecos L/M", color: "Negro", logo: "Sweatspot", sweatspotCategory: "chalecos", available: 4, unit: "unidades", minStock: 159 },
  { id: "si-ss-pt-55", brand: "sweatspot", category: "producto_terminado", name: "Chalecos SM", color: "Azul", logo: "Sweatspot", sweatspotCategory: "chalecos", available: 4, unit: "unidades", minStock: 159 },
  { id: "si-ss-pt-56", brand: "sweatspot", category: "producto_terminado", name: "Chalecos L/M", color: "Azul", logo: "Sweatspot", sweatspotCategory: "chalecos", available: 4, unit: "unidades", minStock: 159 },
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
    const gelItem = items.find((s) => s.category === "materia_prima" && s.name.toLowerCase().includes("gel"));

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
