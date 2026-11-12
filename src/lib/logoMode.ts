export type LogoMode = "nuevo" | "recompra_igual" | "recompra_ajuste" | "sin_logo";

export const LOGO_MODE_LABEL: Record<LogoMode, string> = {
  nuevo: "Logo nuevo",
  recompra_igual: "Recompra — logo tal cual",
  recompra_ajuste: "Recompra — logo con ajuste",
  sin_logo: "Sin logo",
};

export interface LogoModeFlags {
  isRecompra: boolean;
  noLogo: boolean;
  recompraMismoLogo: "si" | "no";
  needsLogoAdjustment: boolean;
}

/** Traduce la elección de la asesora a las banderas del formulario. */
export function logoModeFlags(mode: LogoMode): LogoModeFlags {
  switch (mode) {
    case "recompra_igual":
      return { isRecompra: true, noLogo: false, recompraMismoLogo: "si", needsLogoAdjustment: false };
    case "recompra_ajuste":
      return { isRecompra: true, noLogo: false, recompraMismoLogo: "si", needsLogoAdjustment: true };
    case "sin_logo":
      return { isRecompra: false, noLogo: true, recompraMismoLogo: "si", needsLogoAdjustment: false };
    default:
      return { isRecompra: false, noLogo: false, recompraMismoLogo: "no", needsLogoAdjustment: false };
  }
}

/** ¿Este modo abre una solicitud en Diseño? */
export function logoModeNeedsDesign(mode: LogoMode): boolean {
  return mode === "nuevo" || mode === "recompra_ajuste";
}
