import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { History, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrderChangeLog, ORDER_FIELD_LABELS, MONEY_FIELDS } from "@/hooks/useOrderChangeLog";

const fmt = (field: string, value: string | null) => {
  if (value === null || value === "") return "—";
  if (MONEY_FIELDS.has(field)) {
    const n = Number(value);
    if (!Number.isNaN(n)) return `$${n.toLocaleString("es-CO")}`;
  }
  return value;
};

export function OrderChangeLogPanel({
  orderId,
  fieldFilter,
}: {
  orderId: string;
  /** Permite restringir los campos visibles del historial (ej. rol diseño) */
  fieldFilter?: (field: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data: allEntries = [], isLoading } = useOrderChangeLog(open ? orderId : undefined);
  const entries = fieldFilter ? allEntries.filter((e) => fieldFilter(e.field)) : allEntries;

  return (
    <div className="pt-3 border-t">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <History className="h-3.5 w-3.5 mr-1" /> Historial de cambios del pedido
        {open ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
      </Button>

      {open && (
        <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {isLoading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
            </p>
          )}
          {!isLoading && entries.length === 0 && (
            <p className="text-xs text-muted-foreground">Sin cambios registrados.</p>
          )}
          {entries.map((e) => (
            <div key={e.id} className="text-xs border-l-2 border-muted pl-2 py-0.5">
              <p className="font-medium">
                {ORDER_FIELD_LABELS[e.field] || e.field}: {fmt(e.field, e.old_value)} → {fmt(e.field, e.new_value)}
              </p>
              <p className="text-muted-foreground">
                {format(new Date(e.created_at), "d MMM yyyy · HH:mm", { locale: es })}
                {e.changed_by_name ? ` · ${e.changed_by_name}` : ""}
                {e.reason ? ` · ${e.reason}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrderChangeLogPanel;
