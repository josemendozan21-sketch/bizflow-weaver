import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Trash2 } from "lucide-react";
import { useFerias, useDeleteFeria, type Feria } from "@/hooks/useFerias";
import { CreateFeriaDialog } from "@/components/ferias/CreateFeriaDialog";
import { FeriaDetail } from "@/components/ferias/FeriaDetail";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_COLOR: Record<string, string> = {
  planificada: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  en_curso: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  finalizada: "bg-slate-500/15 text-slate-700 border-slate-500/30",
  cancelada: "bg-red-500/15 text-red-700 border-red-500/30",
};

export default function Ferias() {
  const { data: ferias = [], isLoading } = useFerias();
  const del = useDeleteFeria();
  const { role } = useAuth();
  const [selected, setSelected] = useState<Feria | null>(null);

  const canManage = role === "admin" || role === "contabilidad" || role === "logistica";

  if (selected) {
    return <FeriaDetail feria={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ferias</h1>
          <p className="text-sm text-muted-foreground">Gestión integral de ferias comerciales: planificación, inventario y ventas</p>
        </div>
        {canManage && <CreateFeriaDialog />}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : ferias.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Aún no hay ferias registradas</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ferias.map((f) => (
            <Card key={f.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(f)}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold">{f.name}</h3>
                <Badge variant="outline" className={STATUS_COLOR[f.status]}>{f.status.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{f.city}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Calendar className="h-3 w-3" />
                {format(new Date(f.start_date), "dd MMM", { locale: es })} – {format(new Date(f.end_date), "dd MMM yyyy", { locale: es })}
              </p>
              {canManage && (
                <div className="flex justify-end mt-3">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); if (confirm(`¿Eliminar feria "${f.name}"?`)) del.mutate(f.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
