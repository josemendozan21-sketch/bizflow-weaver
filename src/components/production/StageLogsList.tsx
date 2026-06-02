import { User, Clock } from "lucide-react";
import type { ProductionStageLog } from "@/hooks/useProductionOrders";

interface Props {
  logs: ProductionStageLog[];
  stageLabels: Record<string, string>;
}

function fmt(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function durationMins(start: string, end: string | null) {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export function StageLogsList({ logs, stageLabels }: Props) {
  if (!logs || logs.length === 0) return null;
  return (
    <details className="text-xs rounded-md border p-2">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
        Historial de etapas ({logs.length})
      </summary>
      <div className="mt-2 space-y-1.5">
        {logs.map((log) => {
          const dur = durationMins(log.started_at, log.ended_at);
          return (
            <div key={log.id} className="flex items-start gap-2 border-l-2 border-primary/30 pl-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">
                  {stageLabels[log.stage] || log.stage}
                  {!log.ended_at && <span className="ml-2 text-[10px] text-primary">en curso</span>}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{log.operator_name}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmt(log.started_at)} → {fmt(log.ended_at)}</span>
                  {dur && <span>· {dur}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}