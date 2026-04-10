import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

export type ProductionBrand = "magical_warmers" | "sweatspot";

interface ProductionBrandSelectorProps {
  selectedBrand: ProductionBrand | null;
  onSelectBrand: (brand: ProductionBrand) => void;
}

const BRANDS: { value: ProductionBrand; label: string }[] = [
  { value: "magical_warmers", label: "Magical Warmers" },
  { value: "sweatspot", label: "Sweatspot" },
];

const ProductionBrandSelector = ({ selectedBrand, onSelectBrand }: ProductionBrandSelectorProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {BRANDS.map((brand) => {
        const isSelected = selectedBrand === brand.value;
        return (
          <Card
            key={brand.value}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              isSelected ? "ring-2 ring-primary shadow-md" : "hover:ring-1 hover:ring-primary/30"
            }`}
            onClick={() => onSelectBrand(brand.value)}
          >
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-foreground">{brand.label}</span>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ProductionBrandSelector;
