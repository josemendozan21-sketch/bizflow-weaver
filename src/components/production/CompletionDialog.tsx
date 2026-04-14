import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompletionDialogProps {
  open: boolean;
  onClose: () => void;
  order: { id: string; client_name: string; quantity: number } | null;
  onConfirm: (data: { photoUrl: string; packagerName: string; finalCount: number }) => void;
}

export function CompletionDialog({ open, onClose, order, onConfirm }: CompletionDialogProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [packagerName, setPackagerName] = useState("");
  const [finalCount, setFinalCount] = useState(order?.quantity?.toString() || "");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!photoFile || !packagerName.trim() || !finalCount || !order) {
      toast.error("Todos los campos son obligatorios.");
      return;
    }
    const count = parseInt(finalCount, 10);
    if (!count || count <= 0) {
      toast.error("Ingrese un conteo válido.");
      return;
    }

    setUploading(true);
    try {
      const ext = photoFile.name.split(".").pop();
      const path = `${order.id}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("finished-products")
        .upload(path, photoFile);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("finished-products")
        .getPublicUrl(path);

      onConfirm({
        photoUrl: urlData.publicUrl,
        packagerName: packagerName.trim(),
        finalCount: count,
      });

      // Reset
      setPhotoFile(null);
      setPhotoPreview(null);
      setPackagerName("");
      setFinalCount("");
    } catch (err: any) {
      toast.error("Error al subir la foto: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = photoFile && packagerName.trim() && finalCount && parseInt(finalCount) > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar empaque</DialogTitle>
          <DialogDescription>
            Complete la información del producto terminado para {order?.client_name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Foto del producto finalizado *</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-primary/40 px-4 py-3 hover:bg-primary/5 transition-colors w-full justify-center">
                <Camera className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {photoFile ? photoFile.name : "Seleccionar foto"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            {photoPreview && (
              <img src={photoPreview} alt="Preview" className="rounded-md max-h-40 object-cover w-full" />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="packager">Quién hizo el empaque *</Label>
            <Input
              id="packager"
              placeholder="Nombre del empacador"
              value={packagerName}
              onChange={(e) => setPackagerName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="count">Conteo final de unidades *</Label>
            <Input
              id="count"
              type="number"
              min="1"
              placeholder="Cantidad empacada"
              value={finalCount}
              onChange={(e) => setFinalCount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Confirmar y finalizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
