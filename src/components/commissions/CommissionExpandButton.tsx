import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  open: boolean;
  onClick: () => void;
  label?: string;
}

export function CommissionExpandButton({ open, onClick, label = "pedido" }: Props) {
  const action = open ? "Ocultar detalle" : "Ver detalle";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 border border-border bg-background"
            aria-label={`${action} de ${label}`}
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{action}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}