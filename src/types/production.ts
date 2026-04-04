export type Brand = "sweatspot" | "magical";

export type StampingStatus = "pendiente" | "en_proceso" | "completado";

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
