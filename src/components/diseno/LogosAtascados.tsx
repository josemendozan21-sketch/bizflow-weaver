import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/diseno/StatusBadge";
import type { LogoRequest } from "@/hooks/useLogoRequests";

const STUCK_STATUSES = ["pendiente_diseno", "en_revision", "ajustes_solicitados", "listo_aprobacion"];
const STUCK_HOURS = 24;

const hoursSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;

export function getStuckLogoRequests(requests: LogoRequest[]) {
  return requests.filter(
    (r) => STUCK_STATUSES.includes(r.status) && hoursSince(r.updated_at || r.created_at) >= STUCK_HOURS,
  );
}

export function LogosAtascados({ requests }: { requests: LogoRequest[] }) {
  const stuck = getStuckLogoRequests(requests);
  if (stuck.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          Logos sin movimiento hace más de 24 h
          <Badge variant="destructive">{stuck.length}</Badge>
        </CardTitle>
        <p className="text-xs text-amber-800">
          Estas solicitudes están esperando una acción de diseño o del asesor.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {stuck.slice(0, 8).map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-2">
            <div className="text-sm">
              <span className="font-medium">{r.client_name}</span>
              <span className="text-muted-foreground"> · {r.brand} · {r.product}</span>
              <p className="text-xs text-muted-foreground">
                Asesor: {r.advisor_name} · {Math.floor(hoursSince(r.updated_at || r.created_at) / 24)} día(s) sin cambios
              </p>
            </div>
            <StatusBadge status={r.status} />
          </div>
        ))}
        {stuck.length > 8 && (
          <p className="text-xs text-amber-800">y {stuck.length - 8} más…</p>
        )}
      </CardContent>
    </Card>
  );
}

export default LogosAtascados;
