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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Camera, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  orderId: string;
  clientName: string;
  quantity: number;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
  label?: string;
}

/** Allows uploading the missing "producto terminado" photo on an order
 *  whose production already advanced to "listo" without going through the
 *  empaque completion dialog. Writes into production_orders.
 */
export function MissingFinishedPhotoButton({
  orderId,
  clientName,
  quantity,
  variant = "outline",
  size = "sm",
  label = "Subir foto faltante",
}: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [packagerName, setPackagerName] = useState("");
  const [finalCount, setFinalCount] = useState(String(quantity || ""));
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPackagerName("");
    setFinalCount(String(quantity || ""));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!photoFile || !packagerName.trim() || !finalCount) {
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
      const path = `${orderId}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("finished-products")
        .upload(path, photoFile);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage
        .from("finished-products")
        .getPublicUrl(path);

      // Find the production_order linked to this order
      const { data: po, error: poErr } = await supabase
        .from("production_orders")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();
      if (poErr) throw poErr;
      if (!po) throw new Error("No se encontró el pedido de producción.");

      const { error: updateErr } = await supabase
        .from("production_orders")
        .update({
          finished_photo_url: urlData.publicUrl,
          packager_name: packagerName.trim(),
          final_count: count,
        })
        .eq("id", po.id);
      if (updateErr) throw updateErr;

      // Best-effort: add to product gallery (ignore errors)
      try {
        const { data: authData } = await supabase.auth.getUser();
        await supabase.from("product_gallery").insert({
          order_id: orderId,
          photo_url: urlData.publicUrl,
          client_name: clientName,
          uploaded_by: authData.user?.id ?? null,
          uploaded_by_name: packagerName.trim(),
        } as any);
      } catch {
        /* ignore */
      }

      toast.success("Foto cargada correctamente.");
      queryClient.invalidateQueries({ queryKey: ["production_orders_for_logistics"] });
      queryClient.invalidateQueries({ queryKey: ["production_orders_for_advisor"] });
      queryClient.invalidateQueries({ queryKey: ["production_orders"] });
      reset();
      setOpen(false);
    } catch (err: any) {
      toast.error("Error al subir la foto: " + (err.message || String(err)));
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = !!photoFile && !!packagerName.trim() && !!finalCount && parseInt(finalCount) > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-1.5">
          <Upload className="h-3.5 w-3.5" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir foto de producto terminado</DialogTitle>
          <DialogDescription>
            Registra la foto y conteo de empaque para {clientName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Foto del producto finalizado *</Label>
            <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-primary/40 px-4 py-3 hover:bg-primary/5 transition-colors w-full justify-center">
              <Camera className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {photoFile ? photoFile.name : "Seleccionar foto"}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
            {photoPreview && (
              <img src={photoPreview} alt="Preview" className="rounded-md max-h-40 object-cover w-full" />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="packager">Quién hizo el empaque *</Label>
            <Input id="packager" placeholder="Nombre del empacador" value={packagerName} onChange={(e) => setPackagerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="count">Conteo final de unidades *</Label>
            <Input id="count" type="number" min="1" value={finalCount} onChange={(e) => setFinalCount(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}