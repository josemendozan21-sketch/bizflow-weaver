import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SelectionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  onClick: () => void;
  className?: string;
}

/**
 * Tarjeta de selección unificada (marcas, tipo de venta, etc.):
 * título + descripción + chevron, con hover sutil de borde.
 */
export default function SelectionCard({
  title,
  description,
  icon,
  onClick,
  className,
}: SelectionCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "cursor-pointer transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <CardContent className="flex items-center justify-between gap-4 py-5">
        <div className="flex items-center gap-3 min-w-0">
          {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
          <div className="min-w-0">
            <p className="font-medium truncate">{title}</p>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardContent>
    </Card>
  );
}
