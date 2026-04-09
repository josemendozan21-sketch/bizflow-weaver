import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LogoRequest, useUpdateLogoRequest } from "@/hooks/useLogoRequests";
import { StatusBadge } from "./StatusBadge";
import { Check, RotateCcw, Loader2 } from "lucide-react";

interface Props {
  requests: LogoRequest[];
}

export function AprobacionAsesor({ requests }: Props) {
  const filtered = requests.filter((r) => r.status === "listo_aprobacion");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Aprobación del asesor</h2>
        <p className="text-sm text-muted-foreground">{filtered.length} diseño(s) pendiente(s) de aprobación</p>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay diseños pendientes de aprobación.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((req) => (
            <ApprovalCard key={req.id} request={req} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ request: req }: { request: LogoRequest }) {
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const updateRequest = useUpdateLogoRequest();

  const handleAction = async (action: "aprobado" | "ajustes_solicitados") => {
    setSaving(true);
    try {
      await updateRequest.mutateAsync({
        id: req.id,
        status: action,
        advisor_feedback: action === "ajustes_solicitados" ? feedback.trim() : null,
        approved_at: action === "aprobado" ? new Date().toISOString() : null,
      });
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{req.client_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{req.brand} · {req.product}</p>
          </div>
          <StatusBadge status={req.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logos comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Logo original</p>
            <div className="border rounded-lg p-3 bg-muted/20 flex items-center justify-center">
              <img src={req.original_logo_url} alt="Original" className="max-h-24 object-contain" />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Logo ajustado</p>
            <div className="border rounded-lg p-3 bg-muted/20 flex items-center justify-center">
              {req.adjusted_logo_url ? (
                <img src={req.adjusted_logo_url} alt="Ajustado" className="max-h-24 object-contain" />
              ) : (
                <p className="text-xs text-muted-foreground">Sin logo ajustado</p>
              )}
            </div>
          </div>
        </div>

        {/* Designer notes */}
        {req.design_notes && (
          <div className="p-3 bg-muted/30 rounded-lg text-sm">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notas del diseñador</p>
            <p>{req.design_notes}</p>
          </div>
        )}

        {/* Feedback for adjustments */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Feedback (si solicitas ajustes)</p>
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} placeholder="Describe los ajustes necesarios..." />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button onClick={() => handleAction("aprobado")} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" /> Aprobar diseño</>}
          </Button>
          <Button variant="outline" onClick={() => handleAction("ajustes_solicitados")} disabled={saving || !feedback.trim()} className="flex-1">
            <RotateCcw className="mr-2 h-4 w-4" /> Solicitar ajustes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
