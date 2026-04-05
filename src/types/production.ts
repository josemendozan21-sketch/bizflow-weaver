export type Brand = "sweatspot" | "magical";

export type StampingStatus = "pendiente" | "en_proceso" | "completado";

export type FillingStatus = "pendiente" | "en_proceso" | "completado";

interface StampingTaskBase {
  id: string;
  brand: Brand;
  clientName: string;
  quantity: number;
  status: StampingStatus;
  logoFile?: string;
  inkColor: string;
  observations?: string;
  createdAt: string;
  /** Sweatspot only: when stamping completes, marked ready for sealing */
  readyForSealing?: boolean;
}

export interface MagicalStampingTask extends StampingTaskBase {
  brand: "magical";
  gelColor: string;
  glitter: boolean;
  doubleInk: boolean;
}

export interface SweatspotStampingTask extends StampingTaskBase {
  brand: "sweatspot";
  thermoSize: "150 ml" | "250 ml" | "250 ml juguetón" | "500 ml";
  siliconeColor: string;
}

export type StampingTask = MagicalStampingTask | SweatspotStampingTask;

export interface FillingTask {
  id: string;
  brand: "magical";
  clientName: string;
  product: string;
  quantity: number;
  gelColor: string;
  logoFile?: string;
  observations?: string;
  status: FillingStatus;
  createdAt: string;
  sourceStampingId: string;
}
