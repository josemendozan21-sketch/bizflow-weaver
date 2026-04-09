import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateLogoRequest, uploadLogoFile } from "@/hooks/useLogoRequests";
import { useToast } from "@/hooks/use-toast";

export function CreateRequestDialog() {
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [comments, setComments] = useState("");
  const [instructions, setInstructions] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const createRequest = useCreateLogoRequest();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se aceptan archivos de imagen.", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!clientName.trim() || !brand.trim() || !product.trim() || !logoFile || !user) {
      toast({ title: "Campos requeridos", description: "Completa cliente, marca, producto y logo.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const logoUrl = await uploadLogoFile(logoFile, "originals");
      await createRequest.mutateAsync({
        client_name: clientName.trim(),
        brand: brand.trim(),
        product: product.trim(),
        original_logo_url: logoUrl,
        client_comments: comments.trim() || undefined,
        additional_instructions: instructions.trim() || undefined,
        advisor_id: user.id,
        advisor_name: user.email || "Asesor",
      });
      setOpen(false);
      resetForm();
    } catch {
      // handled by mutation
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setClientName("");
    setBrand("");
    setProduct("");
    setComments("");
    setInstructions("");
    setLogoFile(null);
    setLogoPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Nueva solicitud</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva solicitud de diseño</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del cliente" />
            </div>
            <div className="space-y-1.5">
              <Label>Marca *</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej: Sweatspot" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Producto *</Label>
            <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Ej: Softflask 250ml" />
          </div>
          <div className="space-y-1.5">
            <Label>Logo del cliente *</Label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {logoPreview ? (
              <div className="space-y-2">
                <div className="border rounded-lg p-3 bg-muted/30 flex items-center justify-center">
                  <img src={logoPreview} alt="Logo" className="max-h-24 object-contain" />
                </div>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="w-full">Cambiar logo</Button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Clic para subir logo (PNG, JPG)</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Comentarios del cliente</Label>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Observaciones del cliente sobre el diseño..." rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Instrucciones adicionales</Label>
            <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Ej: Agregar Instagram, cambiar texto, frase adicional..." rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={uploading} className="w-full">
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</> : "Crear solicitud"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
