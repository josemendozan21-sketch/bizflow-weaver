export type MagicalProductionStage =
  | "produccion_cuerpos"
  | "estampacion"
  | "dosificacion"
  | "sellado"
  | "recorte"
  | "empaque"
  | "listo";

export type StageStatus = "pendiente" | "en_proceso" | "finalizado";

export const STAGE_ORDER: MagicalProductionStage[] = [
  "produccion_cuerpos",
  "estampacion",
  "dosificacion",
  "sellado",
  "recorte",
  "empaque",
  "listo",
];

export const STAGE_LABELS: Record<MagicalProductionStage, string> = {
  produccion_cuerpos: "Producción de Cuerpos",
  estampacion: "Estampación",
  dosificacion: "Dosificación",
  sellado: "Sellado",
  recorte: "Recorte",
  empaque: "Empaque",
  listo: "Listo",
};

export interface MagicalProductionOrder {
  id: string;
  clientName: string;
  quantity: number;
  currentStage: MagicalProductionStage;
  stageStatus: StageStatus;
  /** Whether cuerpos production was needed */
  needsCuerpos: boolean;
  // Estampación fields
  gelColor: string;
  inkColor: string;
  logoFile?: string;
  molde: string;
  // Extra
  observations?: string;
  createdAt: string;
  completedAt?: string;
  sourceOrderId?: string;
}
