import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Snowflake, Thermometer, Play, CheckCircle2, ChevronDown, ChevronRight, Package } from "lucide-react";
import { toast } from "sonner";
import type { BodyTask } from "@/hooks/useProductionOrders";

interface Props {
  tasks: BodyTask[];
  onStart: (taskId: string) => void;
  onFinish: (task: BodyTask) => void;
}

interface Group {
  referencia: string;
  tasks: BodyTask[];
  totalUnidades: number;
  pendientes: number;
  enProceso: number;
}

function groupByReferencia(tasks: BodyTask[]): Group[] {
  const map = new Map<string, Group>();
  for (const t of tasks) {
    const key = t.referencia.trim();
    let g = map.get(key);
    if (!g) {
      g = { referencia: key, tasks: [], totalUnidades: 0, pendientes: 0, enProceso: 0 };
      map.set(key, g);
    }
    g.tasks.push(t);
    g.totalUnidades += t.unidades;
    if (t.status === "pendiente") g.pendientes += 1;
    else if (t.status === "en_proceso") g.enProceso += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.totalUnidades - a.totalUnidades);
}

const TipoCard = ({
  tipo,
  groups,
  onStart,
  onFinish,
}: {
  tipo: "frio" | "calor";
  groups: Group[];
  onStart: Props["onStart"];
  onFinish: Props["onFinish"];
}) => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const Icon = tipo === "frio" ? Snowflake : Thermometer;
  const label = tipo === "frio" ? "Frío" : "Térmico";
  const total = groups.reduce((s, g) => s + g.totalUnidades, 0);
  const accent = tipo === "frio" ? "text-sky-600" : "text-orange-600";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${accent}`} />
            <span>{label}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-normal">
            <Badge variant="secondary">{groups.length} ref.</Badge>
            <Badge variant="outline">{total} uds</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Sin pendientes.</p>
        )}
        {groups.map((g) => {
          const isOpen = openKey === g.referencia;
          return (
            <div key={g.referencia} className="rounded-md border">
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : g.referencia)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <Package className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-sm truncate">{g.referencia}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {g.enProceso > 0 && <Badge variant="default" className="text-[10px] h-5">{g.enProceso} en proceso</Badge>}
                  {g.pendientes > 0 && <Badge variant="secondary" className="text-[10px] h-5">{g.pendientes} pendiente</Badge>}
                  <Badge variant="outline" className="font-mono">{g.totalUnidades} uds</Badge>
                </div>
              </button>
              {isOpen && (
                <div className="border-t bg-muted/20 px-3 py-2 space-y-2">
                  <div className="flex flex-wrap gap-2 pb-2 border-b">
                    {g.pendientes > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          g.tasks
                            .filter((t) => t.status === "pendiente")
                            .forEach((t) => onStart(t.id));
                          toast.info(`Iniciado lote de ${g.referencia} (${g.pendientes} tareas).`);
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" /> Iniciar lote ({g.pendientes})
                      </Button>
                    )}
                  </div>
                  {g.tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs bg-background rounded p-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={t.status === "en_proceso" ? "default" : "secondary"} className="text-[10px] h-5">
                          {t.status === "en_proceso" ? "En proceso" : "Pendiente"}
                        </Badge>
                        <span className="font-medium">{t.unidades} uds</span>
                        <span className="text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-1">
                        {t.status === "pendiente" && (
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => onStart(t.id)}>
                            <Play className="h-3 w-3 mr-1" /> Iniciar
                          </Button>
                        )}
                        {t.status === "en_proceso" && (
                          <Button size="sm" className="h-6 text-xs" onClick={() => onFinish(t)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Finalizar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export const BodyTasksGrouped = ({ tasks, onStart, onFinish }: Props) => {
  const frioGroups = useMemo(() => groupByReferencia(tasks.filter((t) => t.tipo_plastico === "frio")), [tasks]);
  const calorGroups = useMemo(() => groupByReferencia(tasks.filter((t) => t.tipo_plastico === "calor")), [tasks]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TipoCard tipo="frio" groups={frioGroups} onStart={onStart} onFinish={onFinish} />
      <TipoCard tipo="calor" groups={calorGroups} onStart={onStart} onFinish={onFinish} />
    </div>
  );
};