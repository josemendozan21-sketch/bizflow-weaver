import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { History, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogoStatusHistory } from "@/hooks/useLogoStatusHistory";
import { STATUS_LABELS, type LogoRequestStatus } from "@/hooks/useLogoRequests";

const label = (s: string | null) =>
  s ? STATUS_LABELS[s as LogoRequestStatus] || s : "Creación de la solicitud";

export function LogoStatusHistory({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  const { data: entries = [], isLoading } = useLogoStatusHistory(requestId, open);

  return (
    <div className="pt-2 border-t">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <History className="h-3.5 w-3.5 mr-1" /> Historial de estados
        {open ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
      </Button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {isLoading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
            </p>
          )}
          {!isLoading && entries.length === 0 && (
            <p className="text-xs text-muted-foreground">Sin cambios registrados todavía.</p>
          )}
          {entries.map((e) => (
            <div key={e.id} className="text-xs border-l-2 border-muted pl-2 py-0.5">
              <p className="font-medium">
                {label(e.old_status)} → {label(e.new_status)}
              </p>
              <p className="text-muted-foreground">
                {format(new Date(e.created_at), "d MMM yyyy · HH:mm", { locale: es })}
                {e.changed_by_name ? ` · ${e.changed_by_name}` : ""}
              </p>
              {e.note && <p className="text-muted-foreground italic">{e.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LogoStatusHistory;
