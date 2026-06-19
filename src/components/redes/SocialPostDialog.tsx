import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload } from "lucide-react";
import type { SocialBrand, SocialPost, SocialStatus } from "@/hooks/useSocialPosts";

const NETWORKS = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "otra", label: "Otra" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  brand: SocialBrand;
  initialDate?: string;
  post?: SocialPost | null;
}

export function SocialPostDialog({ open, onClose, brand, initialDate, post }: Props) {
  const { user } = useAuth();
  const isEdit = !!post;
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [networks, setNetworks] = useState<string[]>([]);
  const [status, setStatus] = useState<SocialStatus>("programado");
  const [isSpecial, setIsSpecial] = useState(false);
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [assetPath, setAssetPath] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    if (post) {
      setTitle(post.title);
      setScheduledDate(post.scheduled_date);
      setDescription(post.description ?? "");
      setHashtags(post.hashtags ?? "");
      setNetworks(post.networks ?? []);
      setStatus(post.status);
      setIsSpecial(post.is_special_date);
      setAssetUrl(post.asset_url);
      setAssetPath(post.asset_path);
    } else {
      setTitle("");
      setScheduledDate(initialDate ?? new Date().toISOString().slice(0, 10));
      setDescription("");
      setHashtags("");
      setNetworks([]);
      setStatus("programado");
      setIsSpecial(false);
      setAssetUrl(null);
      setAssetPath(null);
    }
    setFile(null);
  }, [open, post, initialDate]);

  const toggleNetwork = (id: string) => {
    setNetworks((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!title.trim() || !scheduledDate) {
      toast.error("Título y fecha son obligatorios");
      return;
    }
    setSaving(true);
    try {
      let finalAssetUrl = assetUrl;
      let finalAssetPath = assetPath;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${brand}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("social-media-assets").upload(path, file);
        if (upErr) throw upErr;
        finalAssetPath = path;
        const { data: signed } = await supabase.storage.from("social-media-assets").createSignedUrl(path, 60 * 60 * 24 * 365);
        finalAssetUrl = signed?.signedUrl ?? null;
      }

      const payload = {
        brand,
        title: title.trim(),
        scheduled_date: scheduledDate,
        description: description.trim() || null,
        hashtags: hashtags.trim() || null,
        networks,
        status,
        is_special_date: isSpecial,
        asset_url: finalAssetUrl,
        asset_path: finalAssetPath,
      };

      if (isEdit && post) {
        const { error } = await supabase.from("social_posts").update(payload).eq("id", post.id);
        if (error) throw error;
        toast.success("Publicación actualizada");
      } else {
        const { error } = await supabase.from("social_posts").insert({
          ...payload,
          created_by: user?.id,
          created_by_name: user?.email ?? null,
        });
        if (error) throw error;
        toast.success("Publicación creada");
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Error guardando");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm("¿Eliminar esta publicación?")) return;
    setSaving(true);
    try {
      if (post.asset_path) {
        await supabase.storage.from("social-media-assets").remove([post.asset_path]);
      }
      const { error } = await supabase.from("social_posts").delete().eq("id", post.id);
      if (error) throw error;
      toast.success("Publicación eliminada");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Error eliminando");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar publicación" : "Nueva publicación"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Lanzamiento producto X" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SocialStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="programado">Programado</SelectItem>
                  <SelectItem value="publicado">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Redes sociales</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {NETWORKS.map((n) => (
                <Badge
                  key={n.id}
                  variant={networks.includes(n.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleNetwork(n.id)}
                >
                  {n.label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="special" checked={isSpecial} onCheckedChange={(c) => setIsSpecial(!!c)} />
            <Label htmlFor="special" className="cursor-pointer">⭐ Fecha especial / efeméride</Label>
          </div>
          <div>
            <Label>Descripción / copy</Label>
            <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Texto del post..." />
          </div>
          <div>
            <Label>Hashtags</Label>
            <Textarea rows={2} value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#bionovations #salud" />
          </div>
          <div>
            <Label className="flex items-center gap-2"><Upload className="h-4 w-4" /> Imagen o archivo</Label>
            <Input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {assetUrl && !file && (
              <a href={assetUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline mt-1 inline-block">
                Ver archivo actual
              </a>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          {isEdit && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto">
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
