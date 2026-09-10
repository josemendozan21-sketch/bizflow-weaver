import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, ChevronUp, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS, type LogoRequestStatus } from "@/hooks/useLogoRequests";

interface Entry {
  id: string;
  logo_request_id: string;
  old_status: string | null;
  new_status: string;
  changed_by_name: string | null;
  note: string | null;
  created_at: string;
}

const label = (s: string | null) =>
  s ? STATUS_LABELS[s as LogoRequestStatus] || s : "Solicitud creada";

/** Historial de idas y vueltas entre el asesor y Diseño para este pedido. */
export function OrderDesignHistory({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["order-design-history", orderId],
    enabled: open && !!orderId,
    queryFn: async () => {
      const { data: reqs, error: reqErr } = await supabase
        .from("logo_requests")
        .select("id")
        .eq("order_id", orderId);
      if (reqErr) throw reqErr;
      const ids = (reqs || []).map((r) => r.id as string);
      if (ids.length === 0) return [] as Entry[];
      const { data, error } = await supabase
        .from("logo_request_status_log")
        .select("*")
        .in("logo_request_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Entry[];
    },
  });

  return (
    <div className="pt-3 border-t">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <History className="h-3.5 w-3.5 mr-1" /> Historial de diseño del logo
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
            <p className="text-xs text-muted-foreground">Este pedido no tiene movimientos de diseño.</p>
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

export default OrderDesignHistory;
