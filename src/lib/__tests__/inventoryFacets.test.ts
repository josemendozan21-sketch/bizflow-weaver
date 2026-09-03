import { describe, expect, it } from "vitest";
import {
  magicalFacetValues,
  splitMagicalName,
  sweatspotFacetValues,
  buildFacetGroups,
  SWEATSPOT_FACETS,
} from "@/lib/inventoryFacets";
import type { ReferenceItem } from "@/lib/referenceCatalog";

const item = (over: Partial<ReferenceItem>): ReferenceItem => ({
  id: over.name || "x",
  brand: "sweatspot",
  brandKey: "sweatspot",
  category: "producto_terminado",
  name: "TERMO 500 AZUL",
  tipo: null,
  productType: null,
  color: null,
  logo: null,
  marcado: false,
  available: 10,
  minStock: 0,
  unit: "Unidades",
  sweatspotCategory: null,
  ...over,
});

describe("splitMagicalName", () => {
  it("separa familia y tamaño", () => {
    expect(splitMagicalName("Círculo 12 cm")).toEqual({ familia: "Círculo", tamano: "12 cm" });
    expect(splitMagicalName("Círculo Ojo")).toEqual({ familia: "Círculo", tamano: "Ojo" });
    expect(splitMagicalName("Antifaz")).toEqual({ familia: "Antifaz", tamano: null });
  });
});

describe("magicalFacetValues", () => {
  it("expone familia, tamaño y tipo", () => {
    const v = magicalFacetValues(item({ name: "Círculo 8 cm", tipo: "Frío" }));
    expect(v).toMatchObject({ familia: "Círculo", tamano: "8 cm", tipo: "Frío" });
  });
});

describe("sweatspotFacetValues", () => {
  it("deriva termo con correa, tamaño, logo y origen", () => {
    const v = sweatspotFacetValues(
      item({
        name: "TERMO 500 AZUL CORREA",
        sweatspotCategory: "termos_500",
        color: "AZUL",
        logo: "Sweatspot",
        productType: "NACIONAL",
      }),
    );
    expect(v).toMatchObject({
      categoria: "Termos",
      tamano: "500 ml",
      correa: "Con correa",
      logo: "Con logo",
      origen: "Nacional",
      color: "Azul",
    });
  });

  it("marca termos sin correa y sin logo", () => {
    const v = sweatspotFacetValues(item({ name: "TERMO 250 MORADO", sweatspotCategory: "termos_250" }));
    expect(v.correa).toBe("Sin correa");
    expect(v.logo).toBe("Marcable (sin logo)");
  });

  it("detecta talla en canguros", () => {
    const v = sweatspotFacetValues(
      item({ name: "CANGURO FREE BELT NEGRO TALLA L", sweatspotCategory: "canguros" }),
    );
    expect(v).toMatchObject({ categoria: "Canguros", talla: "L", tamano: null });
  });
});

describe("buildFacetGroups", () => {
  const items = [
    item({ name: "TERMO 500 AZUL CORREA", sweatspotCategory: "termos_500" }),
    item({ name: "TERMO 250 MORADO", sweatspotCategory: "termos_250" }),
    item({ name: "CANGURO BOTELLA", sweatspotCategory: "canguros" }),
  ];

  it("las facetas dependen de lo ya seleccionado", () => {
    const groups = buildFacetGroups(
      items,
      sweatspotFacetValues,
      (i) => i.available,
      SWEATSPOT_FACETS,
      { categoria: "Termos" },
    );
    const tamano = groups.find((g) => g.key === "tamano");
    expect(tamano?.options.map((o) => o.value)).toEqual(["250 ml", "500 ml"]);
    expect(groups.find((g) => g.key === "talla")).toBeUndefined();
  });
});
