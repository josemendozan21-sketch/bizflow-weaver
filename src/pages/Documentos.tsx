import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Download, Upload, Trash2, FileText, Search } from "lucide-react";
import { toast } from "sonner";

type DocCategory = "ccb" | "rut" | "productos" | "otros";

const CATEGORY_LABELS: Record<DocCategory, string> = {
  ccb: "Cámara de Comercio (CCB)",
  rut: "RUT",
  productos: "Ficha de productos",
  otros: "Otros",
};

interface CompanyDocument {
  id: string;
  name: string;
  category: DocCategory;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

const formatBytes = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export default function Documentos() {
  const { user, role } = useAuth();
  const canManage = role === "admin" || role === "asesor_comercial" || role === "contabilidad";

  const [docs, setDocs] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"todos" | DocCategory>("todos");

  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "otros" as DocCategory,
    description: "",
    file: null as File | null,
  });

  const fetchDocs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("company_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setDocs((data as CompanyDocument[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async () => {
    if (!form.file || !form.name.trim()) {
      toast.error("Nombre y archivo son obligatorios");
      return;
    }
    setUploading(true);
    try {
      const ext = form.file.name.split(".").pop() || "bin";
      const path = `${form.category}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("company-documents")
        .upload(path, form.file, { contentType: form.file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("company_documents").insert({
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || null,
        file_path: path,
        file_name: form.file.name,
        file_size: form.file.size,
        mime_type: form.file.type,
        uploaded_by: user?.id,
        uploaded_by_name: user?.email || null,
      });
      if (insErr) throw insErr;

      toast.success("Documento subido");
      setOpen(false);
      setForm({ name: "", category: "otros", description: "", file: null });
      fetchDocs();
    } catch (e: any) {
      toast.error(e.message || "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: CompanyDocument) => {
    const { data, error } = await supabase.storage
      .from("company-documents")
      .createSignedUrl(doc.file_path, 300, { download: doc.file_name });
    if (error || !data) { toast.error("No se pudo descargar"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (doc: CompanyDocument) => {
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return;
    const { error: sErr } = await supabase.storage.from("company-documents").remove([doc.file_path]);
    if (sErr) { toast.error(sErr.message); return; }
    const { error } = await supabase.from("company_documents").delete().eq("id", doc.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Documento eliminado");
    fetchDocs();
  };

  const filtered = docs.filter((d) => {
    if (tab !== "todos" && d.category !== tab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return d.name.toLowerCase().includes(q) || (d.description || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
          <p className="text-muted-foreground">Documentos de la empresa: CCB, RUT, fichas de productos y más</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5"><Upload className="h-4 w-4" />Subir documento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Subir documento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: CCB 2026" />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as DocCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CATEGORY_LABELS) as DocCategory[]).map((c) => (
                        <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descripción (opcional)</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
                <div>
                  <Label>Archivo *</Label>
                  <Input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>Cancelar</Button>
                <Button onClick={handleUpload} disabled={uploading}>{uploading ? "Subiendo..." : "Subir"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Buscar documento..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="todos">Todos ({docs.length})</TabsTrigger>
          {(Object.keys(CATEGORY_LABELS) as DocCategory[]).map((c) => (
            <TabsTrigger key={c} value={c}>
              {CATEGORY_LABELS[c]} ({docs.filter((d) => d.category === c).length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Documentos disponibles</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No hay documentos en esta categoría.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Tamaño</TableHead>
                      <TableHead>Subido por</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div className="font-medium">{d.name}</div>
                          {d.description && <div className="text-xs text-muted-foreground">{d.description}</div>}
                          <div className="text-xs text-muted-foreground">{d.file_name}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{CATEGORY_LABELS[d.category]}</Badge></TableCell>
                        <TableCell className="text-sm">{formatBytes(d.file_size)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div>{d.uploaded_by_name || "—"}</div>
                          <div className="text-xs">{new Date(d.created_at).toLocaleDateString()}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleDownload(d)} title="Descargar">
                              <Download className="h-4 w-4" />
                            </Button>
                            {canManage && (
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(d)} title="Eliminar">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}