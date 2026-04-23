import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Camera, Download, Loader2, Search, Trash2, Upload, ImageIcon, X } from "lucide-react";

type GalleryItem = {
  id: string;
  brand: string;
  product_name: string;
  photo_url: string;
  storage_path: string;
  client_name: string | null;
  logo_reference: string | null;
  notes: string | null;
  uploaded_by: string;
  uploaded_by_name: string | null;
  created_at: string;
};

const BRANDS = [
  { value: "magical", label: "Magical Warmers" },
  { value: "sweatspot", label: "Sweatspot" },
];

const UPLOADER_ROLES = ["admin", "produccion", "estampacion", "logistica", "disenador"];

export default function Galeria() {
  const { user, role } = useAuth();
  const canUpload = !!role && UPLOADER_ROLES.includes(role);

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandTab, setBrandTab] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    brand: "magical",
    product_name: "",
    client_name: "",
    logo_reference: "",
    notes: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_gallery")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Error cargando galería: " + error.message);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
    const channel = supabase
      .channel("product_gallery_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "product_gallery" }, () => loadItems())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const products = useMemo(() => {
    const set = new Set<string>();
    items
      .filter((i) => brandTab === "all" || i.brand === brandTab)
      .forEach((i) => set.add(i.product_name));
    return Array.from(set).sort();
  }, [items, brandTab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (brandTab !== "all" && i.brand !== brandTab) return false;
      if (productFilter !== "all" && i.product_name !== productFilter) return false;
      if (q) {
        const hay = `${i.product_name} ${i.client_name ?? ""} ${i.logo_reference ?? ""} ${i.notes ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, brandTab, productFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, GalleryItem[]>();
    for (const it of filtered) {
      const key = `${it.brand}::${it.product_name}`;
      const arr = map.get(key) || [];
      arr.push(it);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    setFiles(list);
  };

  const resetForm = () => {
    setFiles([]);
    setForm({ brand: "magical", product_name: "", client_name: "", logo_reference: "", notes: "" });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!user) return;
    if (!form.product_name.trim()) {
      toast.error("Selecciona un producto.");
      return;
    }
    if (files.length === 0) {
      toast.error("Adjunta al menos una foto.");
      return;
    }
    setUploading(true);
    try {
      const uploaderName =
        (user.user_metadata as any)?.display_name ||
        user.email ||
        "Usuario";

      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${form.brand}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-gallery")
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("product-gallery").getPublicUrl(path);
        const { error: insErr } = await supabase.from("product_gallery").insert({
          brand: form.brand,
          product_name: form.product_name.trim(),
          photo_url: pub.publicUrl,
          storage_path: path,
          client_name: form.client_name.trim() || null,
          logo_reference: form.logo_reference.trim() || null,
          notes: form.notes.trim() || null,
          uploaded_by: user.id,
          uploaded_by_name: uploaderName,
        });
        if (insErr) throw insErr;
      }
      toast.success(`${files.length} foto(s) subidas.`);
      resetForm();
      setOpen(false);
      loadItems();
    } catch (err: any) {
      toast.error("Error al subir: " + (err.message || err));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    if (!confirm("¿Eliminar esta foto?")) return;
    const { error } = await supabase.from("product_gallery").delete().eq("id", item.id);
    if (error) {
      toast.error("No se pudo eliminar: " + error.message);
      return;
    }
    await supabase.storage.from("product-gallery").remove([item.storage_path]);
    toast.success("Foto eliminada.");
    loadItems();
  };

  const handleDownload = async (item: GalleryItem) => {
    try {
      const res = await fetch(item.photo_url);
      const blob = await res.blob();
      const ext = item.storage_path.split(".").pop() || "jpg";
      const safeName = `${item.brand}-${item.product_name}-${item.client_name || "foto"}`
        .replace(/[^a-z0-9-_]+/gi, "_");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error("No se pudo descargar.");
    }
  };

  const brandLabel = (b: string) => BRANDS.find((x) => x.value === b)?.label || b;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Galería de productos terminados</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo visual organizado por marca y producto. Los asesores pueden descargar fotos para enviar a clientes.
          </p>
        </div>
        {canUpload && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Upload className="h-4 w-4 mr-1" /> Subir fotos</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Subir fotos a galería</DialogTitle>
                <DialogDescription>
                  Las fotos quedarán catalogadas por marca y producto. Puedes subir varias a la vez.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Marca *</Label>
                    <Select value={form.brand} onValueChange={(v) => setForm({ ...form, brand: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BRANDS.map((b) => (
                          <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Producto *</Label>
                    <Input
                      placeholder="Ej. Shoulder, Termo 600ml, Labios"
                      value={form.product_name}
                      onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Cliente (opcional)</Label>
                    <Input
                      placeholder="Nombre del cliente"
                      value={form.client_name}
                      onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Logo / referencia (opcional)</Label>
                    <Input
                      placeholder="Ej. Coca-Cola v2"
                      value={form.logo_reference}
                      onChange={(e) => setForm({ ...form, logo_reference: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    rows={2}
                    placeholder="Observaciones del producto"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Fotos *</Label>
                  <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-primary/40 px-4 py-3 hover:bg-primary/5 w-full justify-center">
                    <Camera className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {files.length > 0 ? `${files.length} archivo(s) seleccionado(s)` : "Seleccionar fotos"}
                    </span>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                  </label>
                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {files.map((f, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{f.name}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>Cancelar</Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                  Subir {files.length > 0 ? `(${files.length})` : ""}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={brandTab} onValueChange={(v) => { setBrandTab(v); setProductFilter("all"); }}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              {BRANDS.map((b) => (
                <TabsTrigger key={b.value} value={b.value}>{b.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Producto</Label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger><SelectValue placeholder="Todos los productos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los productos</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cliente, logo, notas..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Cargando galería...
        </div>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No hay fotos en esta selección.</p>
            {canUpload && <p className="text-xs mt-1">Sube la primera con el botón "Subir fotos".</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([key, list]) => {
            const [brand, product] = key.split("::");
            return (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="outline">{brandLabel(brand)}</Badge>
                    <span>{product}</span>
                    <span className="text-xs text-muted-foreground font-normal">({list.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {list.map((it) => (
                      <div key={it.id} className="group relative rounded-md border overflow-hidden bg-muted/30">
                        <button
                          type="button"
                          className="block w-full aspect-square overflow-hidden"
                          onClick={() => setPreviewItem(it)}
                        >
                          <img
                            src={it.photo_url}
                            alt={`${it.product_name} ${it.client_name ?? ""}`}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        </button>
                        <div className="p-2 space-y-1">
                          {it.client_name && (
                            <p className="text-xs font-medium truncate">{it.client_name}</p>
                          )}
                          {it.logo_reference && (
                            <p className="text-[11px] text-muted-foreground truncate">{it.logo_reference}</p>
                          )}
                          <div className="flex items-center justify-between gap-1 pt-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 px-2 text-xs flex-1"
                              onClick={() => handleDownload(it)}
                            >
                              <Download className="h-3 w-3 mr-1" /> Descargar
                            </Button>
                            {(role === "admin" || it.uploaded_by === user?.id) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleDelete(it)}
                                title="Eliminar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewItem} onOpenChange={(o) => { if (!o) setPreviewItem(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewItem && <Badge variant="outline">{brandLabel(previewItem.brand)}</Badge>}
              {previewItem?.product_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {previewItem?.client_name && `Cliente: ${previewItem.client_name}`}
              {previewItem?.logo_reference && ` · Logo: ${previewItem.logo_reference}`}
              {previewItem?.uploaded_by_name && ` · Subido por: ${previewItem.uploaded_by_name}`}
            </DialogDescription>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-3">
              <img
                src={previewItem.photo_url}
                alt={previewItem.product_name}
                className="w-full max-h-[60vh] object-contain rounded-md bg-muted"
              />
              {previewItem.notes && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{previewItem.notes}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewItem(null)}>
                  <X className="h-4 w-4 mr-1" /> Cerrar
                </Button>
                <Button onClick={() => handleDownload(previewItem)}>
                  <Download className="h-4 w-4 mr-1" /> Descargar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
