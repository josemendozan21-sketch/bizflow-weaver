import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LogoRequest, LogoRequestStatus, isOrderClosed, useUpdateLogoRequest, uploadLogoFile } from "@/hooks/useLogoRequests";
import { StatusBadge } from "./StatusBadge";
import { Upload, Loader2, MessageSquare, Info, Save, Check, RotateCcw, Download, FileText, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LogoPreview } from "./LogoPreview";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";
import LogoStatusHistory from "./LogoStatusHistory";
import ReferenceFilesPanel from "./ReferenceFilesPanel";
import { uploadReferenceFiles, useInvalidateReferenceFiles } from "@/hooks/useLogoReferenceFiles";
import { normalizeStages, TERMINAL_STAGES } from "@/lib/orderFlow";


interface Props {
  requests: LogoRequest[];
}

/** Estados en los que el asesor tiene la pelota: puede aprobar o pedir cambios. */
export const ADVISOR_REVIEW_STATUSES: LogoRequestStatus[] = ["en_revision", "ajustado", "listo_aprobacion"];

export function TrabajoDisenador({ requests }: Props) {
  const filtered = requests.filter(
    (r) =>
      ["pendiente_diseno", "en_revision", "ajustado", "ajustes_solicitados", "listo_aprobacion"].includes(r.status) &&
      !isOrderClosed(r)
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

export function DesignerCard({ request: req }: { request: LogoRequest }) {
  const [designNotes, setDesignNotes] = useState(req.design_notes || "");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [adjustedPreview, setAdjustedPreview] = useState<string | null>(req.adjusted_logo_url);
  const [adjustedFile, setAdjustedFile] = useState<File | null>(null);
  const [modFeedback, setModFeedback] = useState("");
  const [modFiles, setModFiles] = useState<File[]>([]);
  const [showModInput, setShowModInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const updateRequest = useUpdateLogoRequest();
  const invalidateReferences = useInvalidateReferenceFiles();
  const { user, role } = useAuth();
  const { toast } = useToast();

  const isDesigner = role === "disenador" || role === "admin";
  const isAdvisor = role === "asesor_comercial" || role === "admin";
  const awaitingAdvisor = ADVISOR_REVIEW_STATUSES.includes(req.status);
  const orderClosed = isOrderClosed(req);

  useEffect(() => {
    if (!adjustedFile) setAdjustedPreview(req.adjusted_logo_url);
  }, [req.adjusted_logo_url, adjustedFile]);

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

  /** Guarda archivo y notas sin cambiar el estado (trabajo en curso). */
  const handleSave = async () => {
    setUploading(true);
    try {
      const updates: Partial<LogoRequest> & { id: string } = {
        id: req.id,
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

  /** Envía el diseño al asesor para que lo apruebe o pida cambios. */
  const handleSendToAdvisor = async () => {
    if (orderClosed) {
      toast({
        title: "Este pedido ya salió",
        description: "El pedido está despachado o cancelado, por eso no se puede enviar a aprobación.",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    try {
      let adjustedUrl = req.adjusted_logo_url;
      if (adjustedFile) {
        adjustedUrl = await uploadLogoFile(adjustedFile, "adjusted");
        setAdjustedFile(null);
      }
      if (!adjustedUrl) {
        toast({
          title: "Falta el diseño",
          description: "Sube el archivo ajustado antes de enviarlo al asesor.",
          variant: "destructive",
        });
        return;
      }

      // Primera vuelta → "En revisión". Después de un ajuste pedido por el
      // asesor → "Ajustado", para que se distinga a simple vista.
      const nextStatus: LogoRequestStatus =
        req.status === "ajustes_solicitados" || req.advisor_feedback ? "ajustado" : "en_revision";

      await updateRequest.mutateAsync({
        id: req.id,
        status: nextStatus,
        adjusted_logo_url: adjustedUrl,
        design_notes: designNotes.trim() || null,
        designer_id: user?.id,
        designer_name: user?.email || "Diseñador",
      });

      await supabase.from("notifications").insert({
        target_user_id: req.advisor_id,
        target_role: "asesor_comercial",
        title: nextStatus === "ajustado" ? "Logo ajustado listo para revisar" : "Logo listo para tu aprobación",
        message: `El diseño de ${req.client_name} (${req.brand} · ${req.product}) está disponible para aprobación o comentarios.`,
        type: "info",
        reference_id: req.id,
      });

      sonnerToast.success("Enviado al asesor", {
        description: "El asesor ya puede aprobarlo o solicitar modificaciones.",
      });
    } catch {
      // handled
    } finally {
      setSending(false);
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

      // Move related production_orders to estampación — but ONLY those that
      // haven't already advanced past it. Otherwise an out-of-order logo
      // approval drags orders already in dosificación / sellado / etc. back
      // to "estampación pendiente" and forces operators to restart.
      if (req.client_name) {
        await supabase
          .from("production_orders")
          .update({ current_stage: "estampacion", stage_status: "pendiente" })
          .eq("client_name", req.client_name)
          .eq("brand", req.brand)
          .in("current_stage", ["pendiente", "diseno", "produccion_cuerpos"]);

        // Si Inventarios ya ingresó el pedido ANTES de aprobar el logo, la ruta
        // quedó armada sin la etapa de estampación y el pedido se vuelve
        // invisible para Estampación. Reponemos la etapa y devolvemos el pedido
        // a estampación cuando aún no se ha estampado.
        const { data: relatedPos } = await supabase
          .from("production_orders")
          .select(
            "id, brand, stages, needs_cuerpos, logo_file, molde, current_stage, stamp_size_status, stamp_inkgel_status",
          )
          .eq("client_name", req.client_name)
          .eq("brand", req.brand);

        for (const po of (relatedPos ?? []) as any[]) {
          const stampingDone =
            po.stamp_size_status === "finalizado" && po.stamp_inkgel_status === "finalizado";
          const stages: string[] = po.stages ?? [];
          if (
            stampingDone ||
            stages.includes("estampacion") ||
            TERMINAL_STAGES.includes(po.current_stage)
          ) {
            continue;
          }
          const fixed = normalizeStages({ ...po, logo_file: po.logo_file ?? "pendiente" });
          if (!fixed.includes("estampacion")) continue;
          await supabase
            .from("production_orders")
            .update({
              stages: fixed,
              current_stage: "estampacion",
              stage_status: "pendiente",
            } as never)
            .eq("id", po.id);
        }
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
      const note = modFeedback.trim();
      if (modFiles.length > 0) {
        const { failed } = await uploadReferenceFiles({
          files: modFiles,
          requestId: req.id,
          orderId: req.order_id || null,
          stage: "modificacion",
          note,
          userId: user?.id || null,
          userName: user?.email || null,
        });
        if (failed > 0) {
          toast({
            title: "Algunos archivos no se subieron",
            description: `${failed} archivo(s) de referencia fallaron. Puedes intentarlo de nuevo.`,
            variant: "destructive",
          });
        }
        invalidateReferences();
      }

      const existingNotes = req.advisor_feedback ? `${req.advisor_feedback}\n---\n` : "";
      await updateRequest.mutateAsync({
        id: req.id,
        status: "ajustes_solicitados",
        advisor_feedback: existingNotes + note,
      });

      await supabase.from("notifications").insert({
        target_user_id: req.designer_id || null,
        target_role: "disenador",
        title: "Modificación solicitada por el asesor",
        message: `${req.client_name} (${req.brand} · ${req.product}): ${note}`,
        type: "warning",
        reference_id: req.id,
      });

      setModFeedback("");
      setModFiles([]);
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
            <CardTitle className="text-base">
              {req.client_name}
              {req.logo_name && (
                <span className="block text-xs font-normal text-primary mt-0.5">🎨 {req.logo_name}</span>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{req.brand} · {req.product}</p>
            {req.order_code && <div className="mt-1"><OrderCodeBadge code={req.order_code} compact /></div>}
          </div>
          <StatusBadge status={req.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {orderClosed && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Este pedido ya fue despachado o cancelado. El diseño quedó cerrado: no se envía a aprobación ni vuelve a
            producción.
          </div>
        )}

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
            {[
              { name: (req as any).logo_name || null, url: req.original_logo_url },
              ...(((req as any).original_logo_url_2 ? [{ name: (req as any).logo_name_2 || null, url: (req as any).original_logo_url_2 }] : [])),
              ...(((req as any).extra_logos as Array<{ name?: string | null; url?: string | null }> | null) || []),
            ]
              .filter((l) => l?.url)
              .map((l, i) => (
                <div key={`logo-${i}`} className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {i === 0 ? "Logo original" : `Logo ${i + 1}`}
                      {l?.name ? ` — ${l.name}` : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={l!.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Abrir
                      </a>
                      <a
                        href={l!.url!}
                        download={l?.name || undefined}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Download className="h-3 w-3" /> Descargar
                      </a>
                    </div>
                  </div>
                  <div className="border rounded-lg p-2 bg-muted/20 flex items-center justify-center min-h-[80px]">
                    <LogoPreview url={l!.url!} alt={i === 0 ? "Original" : `Logo ${i + 1}`} />
                  </div>
                </div>
              ))}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Logo ajustado</p>
            {isDesigner ? (
              <>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
                {adjustedPreview ? (
                  <div className="border rounded-lg p-2 bg-muted/20 flex items-center justify-center min-h-[80px] cursor-pointer" onClick={() => fileRef.current?.click()}>
                    {isPdfPreview(adjustedPreview) ? (
                      <div className="flex flex-col items-center gap-1">
                        <FileText className="h-8 w-8 text-destructive" />
                        <p className="text-xs text-muted-foreground">{adjustedPreview.startsWith("pdf:") ? adjustedPreview.slice(4) : "PDF"}</p>
                      </div>
                    ) : (
                      <LogoPreview url={adjustedPreview} alt="Ajustado" />
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors min-h-[80px] flex flex-col items-center justify-center"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Subir diseño ajustado (imagen o PDF)</p>
                  </div>
                )}
              </>
            ) : (
              <div className="border rounded-lg p-2 bg-muted/20 flex items-center justify-center min-h-[80px]">
                {adjustedPreview ? (
                  <LogoPreview url={adjustedPreview} alt="Ajustado" />
                ) : (
                  <p className="text-xs text-muted-foreground text-center px-2">El diseñador está trabajando en este logo.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <ReferenceFilesPanel requestId={req.id} />

        {/* Designer controls — only for designer/admin */}
        {isDesigner && (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Notas del diseñador</p>
              <Textarea value={designNotes} onChange={(e) => setDesignNotes(e.target.value)} rows={2} placeholder="Notas sobre los cambios realizados..." />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={handleSendToAdvisor}
                disabled={sending || uploading}
                className="w-full sm:flex-1"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Enviar al asesor para aprobación</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {awaitingAdvisor
                ? "Ya está con el asesor. Si subes una nueva versión, vuelve a enviarla."
                : "Cuando el diseño esté listo, envíalo al asesor para su aprobación."}
            </p>
          </>
        )}

        {/* Advisor review — approve or request changes once the design was sent */}
        {isAdvisor && !orderClosed && (awaitingAdvisor || req.additional_instructions?.includes("recompra")) && !["aprobado", "finalizado"].includes(req.status) && (
          <div className="space-y-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground">
              Revisión del asesor
              {!req.adjusted_logo_url && (
                <span className="ml-2 text-orange-600">(Recompra — aprueba si se reutiliza el logo original)</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Si el diseño ya está bien, apruébalo de una vez y pasa a producción. Si necesitas cambios, pídelos con tu
              comentario.
            </p>
            {!showModInput ? (
              <div className="flex flex-col gap-3 sm:flex-row">
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
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Archivos de referencia (opcional): imágenes o PDF que ayuden a Diseño.
                  </p>
                  <Input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => setModFiles(Array.from(e.target.files || []))}
                    className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary"
                  />
                  {modFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">{modFiles.length} archivo(s) seleccionado(s)</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRequestModification}
                    disabled={actionLoading || !modFeedback.trim()}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar comentarios"}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowModInput(false); setModFeedback(""); setModFiles([]); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <LogoStatusHistory requestId={req.id} />
      </CardContent>
    </Card>
  );
}
