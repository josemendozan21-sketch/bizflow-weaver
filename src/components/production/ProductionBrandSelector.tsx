import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Zap } from "lucide-react";
import magicalLogo from "@/assets/magical-warmers-logo.png";

export type ProductionBrand = "magical_warmers" | "sweatspot";

interface ProductionBrandSelectorProps {
  selectedBrand: ProductionBrand | null;
  onSelectBrand: (brand: ProductionBrand) => void;
}

const BRANDS: { value: ProductionBrand; label: string; description: string; icon?: React.ElementType; logo?: string }[] = [
  { value: "magical_warmers", label: "Magical Warmers", description: "Compresas terapéuticas de gel", logo: magicalLogo },
  { value: "sweatspot", label: "Sweatspot", description: "Termos y accesorios deportivos", icon: Zap },
];

const ProductionBrandSelector = ({ selectedBrand, onSelectBrand }: ProductionBrandSelectorProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {BRANDS.map((brand) => {
        const isSelected = selectedBrand === brand.value;
        const Icon = brand.icon;
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
                <div className="flex items-center gap-4">
                  {brand.logo ? (
                    <img src={brand.logo} alt={brand.label} className="h-10 w-auto object-contain" />
                  ) : (
                    <>
                      <div className={`rounded-xl p-3 ${isSelected ? "bg-primary/10" : "bg-muted"} flex items-center justify-center`}>
                        {Icon && <Icon className={`h-7 w-7 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{brand.label}</h3>
                        <p className="text-sm text-muted-foreground">{brand.description}</p>
                      </div>
                    </>
                  )}
                </div>
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
