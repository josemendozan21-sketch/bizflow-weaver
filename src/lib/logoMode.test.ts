import { describe, it, expect } from "vitest";
import { logoModeFlags, logoModeNeedsDesign } from "./logoMode";

describe("logoMode", () => {
  it("recompra tal cual no va a Diseño", () => {
    expect(logoModeNeedsDesign("recompra_igual")).toBe(false);
    expect(logoModeFlags("recompra_igual")).toMatchObject({ isRecompra: true, needsLogoAdjustment: false, recompraMismoLogo: "si" });
  });
  it("recompra con ajuste va a Diseño", () => {
    expect(logoModeNeedsDesign("recompra_ajuste")).toBe(true);
    expect(logoModeFlags("recompra_ajuste")).toMatchObject({ isRecompra: true, needsLogoAdjustment: true });
  });
  it("logo nuevo va a Diseño y no es recompra", () => {
    expect(logoModeNeedsDesign("nuevo")).toBe(true);
    expect(logoModeFlags("nuevo").isRecompra).toBe(false);
  });
  it("sin logo marca noLogo", () => {
    expect(logoModeFlags("sin_logo").noLogo).toBe(true);
  });
});
