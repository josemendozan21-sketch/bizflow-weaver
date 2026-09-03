import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, X, SlidersHorizontal, ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

  return (
    <div className="space-y-3 mb-4">
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

        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
          {resultCount} resultado{resultCount === 1 ? "" : "s"}
        </span>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="gap-1 pl-2 pr-1 py-1 text-xs font-normal"
            >
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
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClear}>
            Limpiar todo
          </Button>
        </div>
      )}

      <div className={cn("space-y-2", !expanded && "hidden md:block")}>
        {groups.map((group) => (
          <div key={group.key} className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">{group.label}</span>
            <Button
              type="button"
              size="sm"
              variant={!selection[group.key] ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => onSelect(group.key, undefined)}
            >
              Todos
            </Button>
            {group.options.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={selection[group.key] === opt.value ? "default" : "outline"}
                className="h-7 px-2.5 text-xs gap-1.5"
                onClick={() =>
                  onSelect(group.key, selection[group.key] === opt.value ? undefined : opt.value)
                }
              >
                {opt.value}
                <span
                  className={cn(
                    "text-[10px]",
                    selection[group.key] === opt.value ? "opacity-80" : "text-muted-foreground",
                  )}
                >
                  {opt.count}
                </span>
              </Button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
