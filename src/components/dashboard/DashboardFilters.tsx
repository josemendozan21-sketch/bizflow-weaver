import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface DashboardFilterValues {
  brand: string;
  status: string;
  priority: string;
  date: Date | undefined;
}

interface DashboardFiltersProps {
  filters: DashboardFilterValues;
  onChange: (filters: DashboardFilterValues) => void;
}

export function DashboardFilters({ filters, onChange }: DashboardFiltersProps) {
  const [dateOpen, setDateOpen] = useState(false);

  const update = (partial: Partial<DashboardFilterValues>) =>
    onChange({ ...filters, ...partial });

  const hasFilters =
    filters.brand !== "todas" ||
    filters.status !== "todos" ||
    filters.priority !== "todas" ||
    filters.date !== undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.brand} onValueChange={(v) => update({ brand: v })}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Marca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas las marcas</SelectItem>
          <SelectItem value="sweatspot">Sweatspot</SelectItem>
          <SelectItem value="magical">Magical Warmers</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => update({ status: v })}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los estados</SelectItem>
          <SelectItem value="pendiente">Pendiente</SelectItem>
          <SelectItem value="diseno">Diseño</SelectItem>
          <SelectItem value="cuerpos">Producción cuerpos</SelectItem>
          <SelectItem value="estampacion">Estampación</SelectItem>
          <SelectItem value="dosificacion">Dosificación</SelectItem>
          <SelectItem value="finalizado">Finalizado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.priority} onValueChange={(v) => update({ priority: v })}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas</SelectItem>
          <SelectItem value="alta">Alta</SelectItem>
          <SelectItem value="media">Media</SelectItem>
          <SelectItem value="baja">Baja</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-8 text-xs w-[150px] justify-start",
              !filters.date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-3 w-3 mr-1" />
            {filters.date ? format(filters.date, "dd MMM yyyy", { locale: es }) : "Fecha"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.date}
            onSelect={(d) => {
              update({ date: d });
              setDateOpen(false);
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground"
          onClick={() =>
            onChange({ brand: "todas", status: "todos", priority: "todas", date: undefined })
          }
        >
          <X className="h-3 w-3 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
