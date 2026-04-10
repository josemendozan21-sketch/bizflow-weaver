export type SweatspotProductionStage =
  | "estampacion"
  | "produccion_tubos"
  | "ensamble_cuello"
  | "sello_base"
  | "refile"
  | "colocacion_boquilla"
  | "listo";

export type SweatspotStageStatus = "pendiente" | "en_proceso" | "finalizado";

export type SweatspotLogoType = "impresion_full" | "impresion_basica";

/** Full workflow: all stages */
export const FULL_STAGE_ORDER: SweatspotProductionStage[] = [
  "estampacion",
  "produccion_tubos",
  "ensamble_cuello",
  "sello_base",
  "refile",
  "colocacion_boquilla",
  "listo",
];

/** Short workflow: impresión básica + stock available */
export const SHORT_STAGE_ORDER: SweatspotProductionStage[] = [
  "estampacion",
  "colocacion_boquilla",
  "listo",
];

export const SS_STAGE_LABELS: Record<SweatspotProductionStage, string> = {
  estampacion: "Estampación",
  produccion_tubos: "Producción de tubos",
  ensamble_cuello: "Ensamble de cuello",
  sello_base: "Sello de base",
  refile: "Refile",
  colocacion_boquilla: "Colocación de boquilla",
  listo: "Listo",
};

export interface SweatspotProductionOrder {
  id: string;
  clientName: string;
  quantity: number;
  thermoSize: string;
  siliconeColor: string;
  inkColor: string;
  logoType: SweatspotLogoType;
  logoFile?: string;
  hasStock: boolean;
  /** Which workflow this order follows */
  workflowType: "short" | "full";
  /** The stages this order must pass through */
  stages: SweatspotProductionStage[];
  currentStage: SweatspotProductionStage;
  stageStatus: SweatspotStageStatus;
  observations?: string;
  createdAt: string;
  completedAt?: string;
  sourceOrderId?: string;
}
