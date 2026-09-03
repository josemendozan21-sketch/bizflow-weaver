import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Search, X, SlidersHorizontal, ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { FacetGroup, FacetSelection } from "@/lib/inventoryFacets";
import { countActiveFilters } from "@/lib/inventoryFacets";

interface FacetFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  groups: FacetGroup[];
  selection: FacetSelection;
  onSelect: (key: string, value: string | undefined) => void;
  onClear: () => void;
  resultCount: number;
  sortDir: "asc" | "desc";
  onToggleSort: () => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (v: boolean) => void;
}

const SEARCHABLE_THRESHOLD = 8;

function FacetDropdown({
  group,
  value,
  onSelect,
}: {
  group: FacetGroup;
  value?: string;
  onSelect: (key: string, value: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const searchable = group.options.length > SEARCHABLE_THRESHOLD;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={value ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1.5 text-xs"
        >
          {value ? (
            <>
              <span className="opacity-70">{group.label}:</span> {value}
            </>
          ) : (
            group.label
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          {searchable && <CommandInput placeholder={`Buscar ${group.label.toLowerCase()}...`} className="h-9" />}
          <CommandList>
            <CommandEmpty>Sin opciones</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={`__todos__ ${group.label}`}
                onSelect={() => {
                  onSelect(group.key, undefined);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value ? "opacity-0" : "opacity-100")} />
                Todos
              </CommandItem>
              {group.options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => {
                    onSelect(group.key, value === opt.value ? undefined : opt.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{opt.value}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground">{opt.count}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Barra de filtros por facetas: se lee de lo macro a lo micro y se comporta
 * igual en todas las marcas.
 */
export default function FacetFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar producto...",
  groups,
  selection,
  onSelect,
  onClear,
  resultCount,
  sortDir,
  onToggleSort,
  onlyAvailable,
  onOnlyAvailableChange,
}: FacetFilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = countActiveFilters(selection);
  const activeChips = groups
    .map((g) => ({ key: g.key, label: g.label, value: selection[g.key] }))
    .filter((c) => c.value);
  const visibleGroups = groups.filter((g) => g.options.length > 0);

  return (
    <div className="space-y-2.5 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="flex items-center gap-2 rounded-md border px-3 h-9">
          <Label htmlFor="only-available" className="text-xs cursor-pointer whitespace-nowrap">
            Solo con stock
          </Label>
          <Switch id="only-available" checked={onlyAvailable} onCheckedChange={onOnlyAvailableChange} />
        </div>

        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={onToggleSort}>
          {sortDir === "asc" ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
          {sortDir === "asc" ? "A-Z" : "Z-A"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 md:hidden"
          onClick={() => setExpanded((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>

        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
          {resultCount} resultado{resultCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className={cn("flex flex-wrap items-center gap-1.5", !expanded && "hidden md:flex")}>
        {visibleGroups.map((group) => (
          <FacetDropdown
            key={group.key}
            group={group}
            value={selection[group.key]}
            onSelect={onSelect}
          />
        ))}
        {activeCount > 0 && (
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClear}>
            Limpiar
          </Button>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="gap-1 pl-2 pr-1 py-1 text-xs font-normal">
              <span className="text-muted-foreground">{chip.label}:</span> {chip.value}
              <button
                type="button"
                aria-label={`Quitar filtro ${chip.label}`}
                className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                onClick={() => onSelect(chip.key, undefined)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
