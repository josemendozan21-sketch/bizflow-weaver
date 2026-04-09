import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Image, Loader2, Download, RefreshCw, Droplets, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SOFTFLASK_SIZES = [
  { value: "150ml", label: "150 ml" },
  { value: "250ml", label: "250 ml" },
  { value: "250ml_jugeton", label: "250 ml Juguetón" },
  { value: "500ml", label: "500 ml" },
];

const COMPRESA_MOLDES = [
  { value: "muela", label: "Muela" },
  { value: "antifaz", label: "Antifaz" },
  { value: "lumbar", label: "Lumbar" },
  { value: "cuello", label: "Cuello" },
  { value: "abdomen", label: "Abdomen" },
  { value: "rodilla", label: "Rodilla" },
];

const DisenoLogos = () => {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [productType, setProductType] = useState<string>("softflask");
  const [softflaskSize, setSoftflaskSize] = useState<string>("250ml");
  const [compresaMolde, setCompresaMolde] = useState<string>("lumbar");
  const [observations, setObservations] = useState<string>("");
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Por favor selecciona un archivo de imagen (PNG o JPG).", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "La imagen no debe superar 5 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      setLogoBase64(base64);
      setMockupUrl(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!logoBase64) {
      toast({ title: "Logo requerido", description: "Sube un logo antes de generar el mockup.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setMockupUrl(null);
    try {
      const body: Record<string, string> = { logoBase64, productType };
      if (productType === "softflask") body.size = softflaskSize;
      if (productType === "compresa") body.molde = compresaMolde;
      if (observations.trim()) body.observations = observations.trim();

      const { data, error } = await supabase.functions.invoke("generate-mockup", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMockupUrl(data.imageUrl);
      toast({ title: "¡Mockup generado!", description: "El mockup se ha creado exitosamente." });
    } catch (err: any) {
      console.error("Error generating mockup:", err);
      toast({ title: "Error", description: err.message || "No se pudo generar el mockup.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!mockupUrl) return;
    const link = document.createElement("a");
    link.href = mockupUrl;
    link.download = `mockup-${productType}-${Date.now()}.png`;
    link.click();
  };

  const handleReset = () => {
    setLogoPreview(null);
    setLogoBase64(null);
    setMockupUrl(null);
    setObservations("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Diseño de Mockups</h1>
        <p className="text-muted-foreground">Genera mockups de productos con el logo del cliente para presentaciones comerciales</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column – controls */}
        <div className="space-y-5">
          {/* 1 · Logo upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4" /> 1. Logo del cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleFileChange} className="hidden" />
              {logoPreview ? (
                <div className="space-y-3">
                  <div className="border rounded-lg p-4 bg-muted/30 flex items-center justify-center">
                    <img src={logoPreview} alt="Logo" className="max-h-28 max-w-full object-contain" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="w-full">Cambiar logo</Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                >
                  <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Haz clic para subir el logo</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG o JPG (máx. 5 MB)</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2 · Product type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="h-4 w-4" /> 2. Tipo de producto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={productType}
                onValueChange={(v) => { setProductType(v); setMockupUrl(null); }}
                className="grid grid-cols-2 gap-3"
              >
                <div className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${productType === "softflask" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                  <RadioGroupItem value="softflask" id="softflask" className="sr-only" />
                  <Label htmlFor="softflask" className="cursor-pointer text-center">
                    <Droplets className="h-8 w-8 mx-auto mb-1 text-primary" />
                    <span className="font-medium text-sm block">Softflask</span>
                    <span className="text-xs text-muted-foreground">Sweatspot</span>
                  </Label>
                </div>
                <div className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${productType === "compresa" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                  <RadioGroupItem value="compresa" id="compresa" className="sr-only" />
                  <Label htmlFor="compresa" className="cursor-pointer text-center">
                    <Flame className="h-8 w-8 mx-auto mb-1 text-primary" />
                    <span className="font-medium text-sm block">Compresas</span>
                    <span className="text-xs text-muted-foreground">Magical Warmers</span>
                  </Label>
                </div>
              </RadioGroup>

              {/* 3 · Conditional options */}
              {productType === "softflask" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tamaño</Label>
                  <Select value={softflaskSize} onValueChange={setSoftflaskSize}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOFTFLASK_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {productType === "compresa" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Molde</Label>
                  <Select value={compresaMolde} onValueChange={setCompresaMolde}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPRESA_MOLDES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4 · Observations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">3. Observaciones del diseño (opcional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ej: Usar colores de marca, logo centrado, fondo oscuro..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button onClick={handleGenerate} disabled={!logoBase64 || generating} className="flex-1">
              {generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
              ) : (
                <><Image className="mr-2 h-4 w-4" /> Generar mockup</>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={generating} title="Limpiar todo">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right column – result */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            {generating ? (
              <div className="text-center space-y-3 py-12">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Generando mockup con IA...</p>
                <p className="text-xs text-muted-foreground">Esto puede tardar unos segundos</p>
              </div>
            ) : mockupUrl ? (
              <div className="space-y-4 w-full">
                <div className="border rounded-lg overflow-hidden bg-muted/10">
                  <img src={mockupUrl} alt="Mockup generado" className="w-full h-auto object-contain max-h-[500px]" />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleDownload} variant="outline" className="flex-1">
                    <Download className="mr-2 h-4 w-4" /> Descargar
                  </Button>
                  <Button onClick={handleGenerate} variant="secondary" className="flex-1" disabled={!logoBase64}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Regenerar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Image className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sube un logo y selecciona un producto para generar el mockup</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DisenoLogos;
