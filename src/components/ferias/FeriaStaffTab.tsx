import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, FileText, Upload, Phone, BadgeCheck, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export interface FeriaStaff {
  id: string;
  feria_id: string;
  full_name: string;
  document_id: string | null;
  phone: string | null;
  role: string | null;
  arl_provider: string | null;
  arl_document_url: string | null;
  arl_valid_until: string | null;
  emergency_contact: string | null;
  notes: string | null;
}

function useFeriaStaff(feriaId: string) {
  return useQuery({
    queryKey: ["feria_staff", feriaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("feria_staff").select("*").eq("feria_id", feriaId).order("created_at");
      if (error) throw error;
      return data as FeriaStaff[];
    },
  });
}

export function FeriaStaffTab({ feriaId, canManage }: { feriaId: string; canManage: boolean }) {
  const { data: staff = [], isLoading } = useFeriaStaff(feriaId);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<any>({
    full_name: "", document_id: "", phone: "", role: "",
    arl_provider: "", arl_document_url: "", arl_valid_until: "",
    emergency_contact: "", notes: "",
  });

  const reset = () => setForm({
    full_name: "", document_id: "", phone: "", role: "",
    arl_provider: "", arl_document_url: "", arl_valid_until: "",
    emergency_contact: "", notes: "",
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${feriaId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("feria-staff-docs").upload(path, file);
      if (error) throw error;
      setForm((p: any) => ({ ...p, arl_document_url: path }));
      toast.success("ARL adjuntada");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadArl = async (path: string) => {
    const { data, error } = await supabase.storage.from("feria-staff-docs").createSignedUrl(path, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!form.full_name) throw new Error("Nombre requerido");
      const { error } = await supabase.from("feria_staff").insert({
        feria_id: feriaId,
        full_name: form.full_name,
        document_id: form.document_id || null,
        phone: form.phone || null,
        role: form.role || null,
        arl_provider: form.arl_provider || null,
        arl_document_url: form.arl_document_url || null,
        arl_valid_until: form.arl_valid_until || null,
        emergency_contact: form.emergency_contact || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feria_staff", feriaId] });
      toast.success("Personal agregado");
      setOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feria_staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feria_staff", feriaId] });
      toast.success("Eliminado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isArlExpired = (date: string | null) => date && new Date(date) < new Date();

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{staff.length} persona(s) asignada(s)</p>
        {canManage && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Agregar personal</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nuevo personal asignado</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nombre completo *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                  <div><Label>Documento</Label><Input value={form.document_id} onChange={(e) => setForm({ ...form, document_id: e.target.value })} placeholder="CC / CE" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label>Rol / Cargo</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Asesor, Logística..." /></div>
                </div>
                <div><Label>Contacto de emergencia</Label><Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} placeholder="Nombre y teléfono" /></div>

                <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><BadgeCheck className="h-4 w-4" />Información ARL</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">EPS / ARL</Label><Input value={form.arl_provider} onChange={(e) => setForm({ ...form, arl_provider: e.target.value })} placeholder="Sura, Colmena..." /></div>
                    <div><Label className="text-xs">Vigencia hasta</Label><Input type="date" value={form.arl_valid_until} onChange={(e) => setForm({ ...form, arl_valid_until: e.target.value })} /></div>
                  </div>
                  <div>
                    <Label className="text-xs">Documento ARL (PDF/Imagen)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input ref={fileRef} type="file" accept="application/pdf,image/*"
                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                        disabled={uploading} className="text-xs" />
                      {uploading && <span className="text-xs text-muted-foreground">Subiendo...</span>}
                      {form.arl_document_url && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"><FileText className="h-3 w-3 mr-1" />Adjunto</Badge>}
                    </div>
                  </div>
                </div>

                <div><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => create.mutate()} disabled={create.isPending || uploading}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : staff.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">Sin personal asignado</Card>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {staff.map((s) => (
            <Card key={s.id} className="p-3 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <p className="font-semibold">{s.full_name}</p>
                  {s.role && <p className="text-xs text-muted-foreground">{s.role}</p>}
                </div>
                {canManage && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm(`¿Eliminar a ${s.full_name}?`)) del.mutate(s.id); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="text-xs space-y-1 text-muted-foreground">
                {s.document_id && <p>CC: {s.document_id}</p>}
                {s.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</p>}
                {s.emergency_contact && <p className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />Emergencia: {s.emergency_contact}</p>}
              </div>
              {(s.arl_provider || s.arl_document_url || s.arl_valid_until) && (
                <div className="border-t pt-2 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 font-medium"><BadgeCheck className="h-3 w-3" />ARL{s.arl_provider ? `: ${s.arl_provider}` : ""}</div>
                    {s.arl_document_url && (
                      <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => downloadArl(s.arl_document_url!)}>
                        <Download className="h-3 w-3 mr-1" />Ver
                      </Button>
                    )}
                  </div>
                  {s.arl_valid_until && (
                    <Badge variant="outline" className={isArlExpired(s.arl_valid_until) ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}>
                      {isArlExpired(s.arl_valid_until) ? "Vencida " : "Vigente hasta "}
                      {format(new Date(s.arl_valid_until), "dd/MM/yyyy")}
                    </Badge>
                  )}
                </div>
              )}
              {s.notes && <p className="text-xs text-muted-foreground italic border-t pt-2">{s.notes}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
