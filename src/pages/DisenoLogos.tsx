import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Image, Loader2, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PRODUCTS = [
  { value: "softflask", label: "Softflask", description: "Botella de hidratación flexible" },
  { value: "compresa", label: "Compresas Magical Warmers", description: "Compresa térmica terapéutica" },
];

const DisenoLogos = () => {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>("softflask");
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Por favor selecciona un archivo de imagen.", variant: "destructive" });
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
      const { data, error } = await supabase.functions.invoke("generate-mockup", {
        body: { logoBase64, productType: selectedProduct },
      });

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
    link.download = `mockup-${selectedProduct}-${Date.now()}.png`;
    link.click();
  };

  const handleReset = () => {
    setLogoPreview(null);
    setLogoBase64(null);
    setMockupUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Diseño de Mockups</h1>
        <p className="text-muted-foreground">Genera mockups de productos con el logo del cliente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-6">
          {/* Logo upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Logo del cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {logoPreview ? (
                <div className="space-y-3">
                  <div className="border rounded-lg p-4 bg-muted/30 flex items-center justify-center">
                    <img src={logoPreview} alt="Logo" className="max-h-32 max-w-full object-contain" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="w-full">
                    Cambiar logo
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Haz clic para subir el logo</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG o SVG (máx. 5 MB)</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Seleccionar producto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedProduct} onValueChange={(v) => { setSelectedProduct(v); setMockupUrl(null); }}>
                {PRODUCTS.map((p) => (
                  <div key={p.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/20 transition-colors">
                    <RadioGroupItem value={p.value} id={p.value} className="mt-0.5" />
                    <Label htmlFor={p.value} className="cursor-pointer flex-1">
                      <span className="font-medium text-foreground">{p.label}</span>
                      <span className="block text-xs text-muted-foreground">{p.description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button onClick={handleGenerate} disabled={!logoBase64 || generating} className="flex-1">
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Image className="mr-2 h-4 w-4" />
                  Generar mockup
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={generating}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right: Result */}
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
                    <Download className="mr-2 h-4 w-4" />
                    Descargar
                  </Button>
                  <Button onClick={handleGenerate} variant="secondary" className="flex-1" disabled={!logoBase64}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerar
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
