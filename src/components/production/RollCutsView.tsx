import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Scissors, Play, CheckCircle2, Trash2, Flame, Snowflake } from "lucide-react";
import { useRollCuts, type RollCut, type RollStatus, type RollTipo } from "@/hooks/useRollCuts";
import { CreateRollCutDialog } from "./CreateRollCutDialog";
import { StartRollUsageDialog } from "./StartRollUsageDialog";
import { FinishRollUsageDialog } from "./FinishRollUsageDialog";
import { useAuth } from "@/contexts/AuthContext";

function fmt(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const statusLabel: Record<RollStatus, string> = {
  disponible: "Disponible",
  en_uso: "En uso",
  consumido: "Consumido",
};

const statusVariant: Record<RollStatus, "default" | "secondary" | "outline"> = {
  disponible: "default",
  en_uso: "secondary",
  consumido: "outline",
};

export function RollCutsView() {
  const { rolls, loading, createCuts, startUsage, finishUsage, deleteRoll } = useRollCuts();
  const { role } = useAuth();
  const canManage = role === "admin" || role === "produccion" || role === "inventarios";

  const [createOpen, setCreateOpen] = useState(false);
  const [startRoll, setStartRoll] = useState<RollCut | null>(null);
  const [finishRoll, setFinishRoll] = useState<RollCut | null>(null);

  const [filterTipo, setFilterTipo] = useState<RollTipo | "all">("all");
  const [filterStatus, setFilterStatus] = useState<RollStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return rolls.filter((r) => {
      if (filterTipo !== "all" && r.tipo !== filterTipo) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (search && !r.code.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rolls, filterTipo, filterStatus, search]);

  const stats = useMemo(() => ({
    disponibles: rolls.filter((r) => r.status === "disponible").length,
    en_uso: rolls.filter((r) => r.status === "en_uso").length,
    consumidos: rolls.filter((r) => r.status === "consumido").length,
  }), [rolls]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Corte de Rollos</h2>
          <p className="text-sm text-muted-foreground">
            Registra el corte de rollos grandes (150 cm) en rollos pequeños y su uso en producción.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Cortar rollo
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Disponibles</div><div className="text-2xl font-bold">{stats.disponibles}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">En uso</div><div className="text-2xl font-bold">{stats.en_uso}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Consumidos</div><div className="text-2xl font-bold">{stats.consumidos}</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterTipo} onValueChange={(v) => setFilterTipo(v as any)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="calor">Térmico</SelectItem>
            <SelectItem value="frio">Frío</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="disponible">Disponible</SelectItem>
            <SelectItem value="en_uso">En uso</SelectItem>
            <SelectItem value="consumido">Consumido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Scissors className="h-10 w-10 mx-auto mb-2 opacity-40" />
          No hay rollos {filterStatus !== "all" ? `con estado "${statusLabel[filterStatus]}"` : "registrados"}.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => {
            const diff = r.peso_final_g != null ? r.peso_inicial_g - r.peso_final_g : null;
            return (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-mono flex items-center gap-2">
                      {r.tipo === "calor"
                        ? <Flame className="h-4 w-4 text-orange-500" />
                        : <Snowflake className="h-4 w-4 text-blue-500" />}
                      {r.code}
                    </CardTitle>
                    <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.tipo === "calor" ? "Térmico" : "Frío"} · {r.medida_cm} cm · cortó {r.cortado_por} · {fmt(r.cortado_at)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><div className="text-muted-foreground">Peso inicial</div><div className="font-semibold">{r.peso_inicial_g} g</div></div>
                    <div><div className="text-muted-foreground">Peso final</div><div className="font-semibold">{r.peso_final_g != null ? `${r.peso_final_g} g` : "—"}</div></div>
                    <div><div className="text-muted-foreground">Consumido</div><div className="font-semibold">{diff != null ? `${diff} g` : "—"}</div></div>
                  </div>

                  {(r.montado_por || r.finalizado_por) && (
                    <div className="text-xs space-y-1 border-t pt-2">
                      {r.montado_por && (
                        <div><span className="text-muted-foreground">Montado:</span> {r.montado_por} · {fmt(r.montado_at)}</div>
                      )}
                      {r.notas_inicio && <div className="text-muted-foreground italic">"{r.notas_inicio}"</div>}
                      {r.finalizado_por && (
                        <div><span className="text-muted-foreground">Finalizado:</span> {r.finalizado_por} · {fmt(r.finalizado_at)}</div>
                      )}
                      {r.notas_final && <div className="text-muted-foreground italic">"{r.notas_final}"</div>}
                    </div>
                  )}

                  {canManage && (
                    <div className="flex gap-2 pt-1">
                      {r.status === "disponible" && (
                        <>
                          <Button size="sm" className="flex-1" onClick={() => setStartRoll(r)}>
                            <Play className="h-3 w-3 mr-1" /> Iniciar uso
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm(`¿Eliminar rollo ${r.code}?`)) deleteRoll(r.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {r.status === "en_uso" && (
                        <Button size="sm" className="flex-1" onClick={() => setFinishRoll(r)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Finalizar
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateRollCutDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (p) => { const ok = await createCuts(p); if (ok) setCreateOpen(false); }}
      />
      <StartRollUsageDialog
        roll={startRoll}
        onClose={() => setStartRoll(null)}
        onSubmit={async (operario, notas) => {
          if (!startRoll) return;
          const ok = await startUsage(startRoll.id, operario, notas);
          if (ok) setStartRoll(null);
        }}
      />
      <FinishRollUsageDialog
        roll={finishRoll}
        onClose={() => setFinishRoll(null)}
        onSubmit={async (operario, peso, notas) => {
          if (!finishRoll) return;
          const ok = await finishUsage(finishRoll.id, operario, peso, notas);
          if (ok) setFinishRoll(null);
        }}
      />
    </div>
  );
}