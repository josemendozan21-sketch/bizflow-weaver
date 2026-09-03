import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FacetGroup } from "@/lib/inventoryFacets";

interface FacetSelectProps {
  group: FacetGroup;
  value?: string;
  onChange: (value: string | undefined) => void;
  className?: string;
}

/** Faceta como desplegable buscable: mantiene la información pero sin saturar la vista. */
export default function FacetSelect({ group, value, onChange, className }: FacetSelectProps) {
  const [open, setOpen] = useState(false);
  const searchable = group.options.length > 8;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 gap-1.5 font-normal text-muted-foreground border-dashed",
            value && "text-foreground border-solid border-primary/40 bg-primary/5",
            className,
          )}
        >
          <span className="truncate max-w-[10rem]">{value ?? group.label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          {searchable && <CommandInput placeholder={`Buscar ${group.label.toLowerCase()}...`} className="h-9" />}
          <CommandList>
            <CommandEmpty>Sin opciones</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={`__all__ ${group.label}`}
                onSelect={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value ? "opacity-0" : "opacity-100")} />
                <span className="text-muted-foreground">Todas</span>
              </CommandItem>
              {group.options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => {
                    onChange(value === opt.value ? undefined : opt.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{opt.value}</span>
                  <span className="ml-2 text-xs tabular-nums text-muted-foreground">{opt.count}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
