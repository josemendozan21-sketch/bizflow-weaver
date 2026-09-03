import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, X, SlidersHorizontal, ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import FacetSelect from "@/components/inventory/FacetSelect";
import type { FacetGroup, FacetSelection } from "@/lib/inventoryFacets";
import { countActiveFilters } from "@/lib/inventoryFacets";

interface FacetFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  groups: FacetGroup[];
  /** Facetas siempre visibles en la fila principal; el resto va en "Más filtros". */
  primaryKeys?: string[];
  selection: FacetSelection;
  onSelect: (key: string, value: string | undefined) => void;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
  sortDir: "asc" | "desc";
  onToggleSort: () => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (v: boolean) => void;
}

/**
 * Barra de filtros minimalista: una sola línea de desplegables (macro → micro),
 * el resto de facetas detrás de "Más filtros".
 */
export default function FacetFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar producto...",
  groups,
  primaryKeys,
  selection,
  onSelect,
  onClear,
  resultCount,
  totalCount,
  sortDir,
  onToggleSort,
  onlyAvailable,
  onOnlyAvailableChange,
}: FacetFilterBarProps) {
  const activeCount = countActiveFilters(selection);
  const primary = primaryKeys?.length
    ? groups.filter((g) => primaryKeys.includes(g.key))
    : groups.slice(0, 2);
  const secondary = groups.filter((g) => !primary.some((p) => p.key === g.key));
  const secondaryActive = secondary.filter((g) => selection[g.key]).length;

  const activeChips = secondary
    .map((g) => ({ key: g.key, label: g.label, value: selection[g.key] }))
    .filter((c) => c.value);

  const renderFacetList = (list: FacetGroup[]) => (
    <div className="space-y-3">
      {list.map((group) => (
        <div key={group.key} className="space-y-1.5">
          <span className="text-xs text-muted-foreground">{group.label}</span>
          <FacetSelect
            group={group}
            value={selection[group.key]}
            onChange={(v) => onSelect(group.key, v)}
            className="w-full justify-between"
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="pb-2.5 space-y-2.5 mb-2 border-b">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 border-0 border-b rounded-none shadow-none focus-visible:ring-0 focus-visible:border-primary px-8"
          />
          {search && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchChange("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Facetas principales (desktop) */}
        <div className="hidden md:flex items-center gap-2">
          {primary.map((group) => (
            <FacetSelect
              key={group.key}
              group={group}
              value={selection[group.key]}
              onChange={(v) => onSelect(group.key, v)}
            />
          ))}

          {secondary.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 text-muted-foreground"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Más
                  {secondaryActive > 0 && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{secondaryActive}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                {renderFacetList(secondary)}
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Filtros en móvil */}
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 md:hidden shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{activeCount}</Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:w-80 overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            {renderFacetList(groups)}
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={onClear}>
                Limpiar todo
              </Button>
            )}
          </SheetContent>
        </Sheet>

        {/* Toggle de stock */}
        <div
          className={cn(
            "flex items-center gap-2 h-9 px-2.5 rounded-md border shrink-0 transition-colors",
            onlyAvailable ? "border-primary/40 bg-primary/5" : "border-transparent",
          )}
        >
          <Switch
            id="only-available"
            checked={onlyAvailable}
            onCheckedChange={onOnlyAvailableChange}
          />
          <Label
            htmlFor="only-available"
            className={cn(
              "text-sm font-normal cursor-pointer whitespace-nowrap hidden sm:block",
              onlyAvailable ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Solo con stock
          </Label>
        </div>

        {/* Orden */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground shrink-0"
          aria-label={`Orden ${sortDir === "asc" ? "A-Z" : "Z-A"}`}
          title={`Orden ${sortDir === "asc" ? "A-Z" : "Z-A"}`}
          onClick={onToggleSort}
        >
          {sortDir === "asc" ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 min-h-[1.5rem]">
        {activeChips.map((chip) => (
          <Badge
            key={chip.key}
            variant="outline"
            className="gap-1 pl-2 pr-1 py-0.5 text-xs font-normal text-muted-foreground"
          >
            {chip.value}
            <button
              type="button"
              aria-label={`Quitar filtro ${chip.label}`}
              className="rounded-sm p-0.5 hover:text-foreground"
              onClick={() => onSelect(chip.key, undefined)}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {resultCount} de {totalCount}
          {activeCount > 0 && (
            <button
              type="button"
              className="ml-2 underline underline-offset-2 hover:text-foreground"
              onClick={onClear}
            >
              Limpiar
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
