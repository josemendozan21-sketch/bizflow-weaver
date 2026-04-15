import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoRequest, LogoRequestStatus, useUpdateLogoRequest, uploadLogoFile } from "@/hooks/useLogoRequests";
import { StatusBadge } from "./StatusBadge";
import { Upload, Loader2, MessageSquare, Info, Save, Check, RotateCcw, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  requests: LogoRequest[];
}

const DESIGNER_STATUSES: { value: LogoRequestStatus; label: string }[] = [
  { value: "en_revision", label: "En revisión" },
  { value: "ajustado", label: "Ajustado" },
  { value: "listo_aprobacion", label: "Listo para aprobación" },
];

export function TrabajoDisenador({ requests }: Props) {
  const filtered = requests.filter((r) =>
    ["pendiente_diseno", "en_revision", "ajustado", "ajustes_solicitados"].includes(r.status)
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Trabajo del diseñador</h2>
        <p className="text-sm text-muted-foreground">{filtered.length} solicitud(es) en proceso</p>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay solicitudes asignadas para diseño.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((req) => (
            <DesignerCard key={req.id} request={req} />
          ))}
        </div>
      )}
    </div>
  );
}

function DesignerCard({ request: req }: { request: LogoRequest }) {
  const [designNotes, setDesignNotes] = useState(req.design_notes || "");
  const [newStatus, setNewStatus] = useState<LogoRequestStatus>(req.status);
  const [uploading, setUploading] = useState(false);
  const [adjustedPreview, setAdjustedPreview] = useState<string | null>(req.adjusted_logo_url);
  const [adjustedFile, setAdjustedFile] = useState<File | null>(null);
  const [modFeedback, setModFeedback] = useState("");
  const [showModInput, setShowModInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const updateRequest = useUpdateLogoRequest();
  const { user, role } = useAuth();
  const { toast } = useToast();

  const isDesigner = role === "disenador" || role === "admin";
  const isAdvisor = role === "asesor_comercial" || role === "admin";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdjustedFile(file);
    if (file.type === "application/pdf") {
      setAdjustedPreview("pdf:" + file.name);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => setAdjustedPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const isPdfPreview = (url: string | null) => url?.startsWith("pdf:") || url?.toLowerCase().endsWith(".pdf");

  const handleSave = async () => {
    setUploading(true);
    try {
      const updates: Partial<LogoRequest> & { id: string } = {
        id: req.id,
        status: newStatus,
        design_notes: designNotes.trim() || null,
        designer_id: user?.id,
        designer_name: user?.email || "Diseñador",
      };
      if (adjustedFile) {
        updates.adjusted_logo_url = await uploadLogoFile(adjustedFile, "adjusted");
        setAdjustedFile(null);
      }
      await updateRequest.mutateAsync(updates);
    } catch {
      // handled
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await updateRequest.mutateAsync({
        id: req.id,
        status: "aprobado",
        approved_at: new Date().toISOString(),
        advisor_feedback: null,
      });

      // Update related production_order to move to estampacion
      if (req.client_name) {
        await supabase
          .from("production_orders")
          .update({ current_stage: "estampacion", stage_status: "pendiente" })
          .eq("client_name", req.client_name)
          .eq("brand", req.brand);
      }

      sonnerToast.success("Logo aprobado", {
        description: "El pedido avanza a estampación.",
      });
    } catch {
      // handled by mutation
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestModification = async () => {
    if (!modFeedback.trim()) return;
    setActionLoading(true);
    try {
      const existingNotes = req.advisor_feedback ? `${req.advisor_feedback}\n---\n` : "";
      await updateRequest.mutateAsync({
        id: req.id,
        status: "ajustes_solicitados",
        advisor_feedback: existingNotes + modFeedback.trim(),
      });
      setModFeedback("");
      setShowModInput(false);
      sonnerToast.info("Modificación solicitada", {
        description: "El diseñador recibirá los nuevos comentarios.",
      });
    } catch {
      // handled
    } finally {
      setActionLoading(false);
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
        {/* Info from client */}
        {(req.client_comments || req.additional_instructions || req.advisor_feedback) && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg text-sm">
            {req.client_comments && (
              <div className="flex gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /><span>{req.client_comments}</span></div>
            )}
            {req.additional_instructions && (
              <div className="flex gap-2"><Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /><span>{req.additional_instructions}</span></div>
            )}
            {req.advisor_feedback && (
              <div className="flex gap-2 text-destructive"><MessageSquare className="h-4 w-4 shrink-0 mt-0.5" /><span><strong>Feedback asesor:</strong> {req.advisor_feedback}</span></div>
            )}
          </div>
        )}

        {/* Logos side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Logo original</p>
              {isDesigner && (
                <a
                  href={req.original_logo_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Download className="h-3 w-3" /> Descargar
                </a>
              )}
            </div>
            <div className="border rounded-lg p-2 bg-muted/20 flex items-center justify-center min-h-[80px]">
              <img src={req.original_logo_url} alt="Original" className="max-h-20 object-contain" />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Logo ajustado</p>
            {isDesigner ? (
              <>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
                {adjustedPreview ? (
                  <div className="border rounded-lg p-2 bg-muted/20 flex items-center justify-center min-h-[80px] cursor-pointer" onClick={() => fileRef.current?.click()}>
                    <img src={adjustedPreview} alt="Ajustado" className="max-h-20 object-contain" />
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors min-h-[80px] flex flex-col items-center justify-center"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Subir diseño ajustado</p>
                  </div>
                )}
              </>
            ) : (
              <div className="border rounded-lg p-2 bg-muted/20 flex items-center justify-center min-h-[80px]">
                {adjustedPreview ? (
                  <img src={adjustedPreview} alt="Ajustado" className="max-h-20 object-contain" />
                ) : (
                  <p className="text-xs text-muted-foreground text-center px-2">El diseñador está trabajando en este logo.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Designer controls — only for designer/admin */}
        {isDesigner && (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Notas del diseñador</p>
              <Textarea value={designNotes} onChange={(e) => setDesignNotes(e.target.value)} rows={2} placeholder="Notas sobre los cambios realizados..." />
            </div>
            <div className="flex items-center gap-3">
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as LogoRequestStatus)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESIGNER_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSave} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Guardar</>}
              </Button>
            </div>
          </>
        )}

        {/* Advisor approval/modification — only when adjusted logo exists */}
        {isAdvisor && req.adjusted_logo_url && (
          <div className="space-y-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground">Revisión del asesor</p>
            {!showModInput ? (
              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" /> ✅ Aprobar diseño</>}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowModInput(true)}
                  disabled={actionLoading}
                  className="flex-1 border-orange-400 text-orange-600 hover:bg-orange-50"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> ✏️ Solicitar modificación
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={modFeedback}
                  onChange={(e) => setModFeedback(e.target.value)}
                  rows={3}
                  placeholder="Describe los cambios que necesitas..."
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleRequestModification}
                    disabled={actionLoading || !modFeedback.trim()}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar comentarios"}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowModInput(false); setModFeedback(""); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
