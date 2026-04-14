import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParsedOrderData {
  cliente?: {
    nombre?: string | null;
    cedula_nit?: string | null;
    telefono?: string | null;
    email?: string | null;
    direccion?: string | null;
    ciudad?: string | null;
  };
  productos?: Array<{
    producto?: string | null;
    tipo?: string | null;
    color_gel?: string | null;
    color_tinta?: string | null;
    unidades?: number | null;
    valor_unitario?: number | null;
    valor_total?: number | null;
  }>;
  color_silicona?: string | null;
  tamano?: string | null;
  tipo_logo?: string | null;
  referencia?: string | null;
  personalizacion?: string | null;
  observaciones?: string | null;
  abono?: number | null;
  es_recompra?: boolean | null;
}

interface SmartPasteFieldProps {
  brand: "magical" | "sweatspot";
  onDataParsed: (data: ParsedOrderData) => void;
}

export default function SmartPasteField({ brand, onDataParsed }: SmartPasteFieldProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleParse = async () => {
    if (!text.trim() || text.trim().length < 10) {
      toast.error("Texto muy corto", { description: "Pega la información del pedido con más detalle." });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-order-text", {
        body: { text, brand },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error("No se pudo interpretar", { description: data.error });
        return;
      }

      onDataParsed(data.data);
      toast.success("Datos extraídos", { description: "Los campos se han llenado automáticamente. Revisa y ajusta si es necesario." });
      setExpanded(false);
    } catch (err: any) {
      toast.error("Error al procesar", { description: err.message || "Intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-primary">Pegar información del pedido (llenado automático con IA)</span>
        {expanded ? <ChevronUp className="h-4 w-4 text-primary ml-auto" /> : <ChevronDown className="h-4 w-4 text-primary ml-auto" />}
      </button>

      {expanded && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Pega aquí el mensaje del cliente (WhatsApp, correo, notas) y la IA llenará los campos automáticamente
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Ej: Cliente Juan Pérez, NIT 900123456-7, tel 3001234567, Bogotá\nProducto: Thermo Sport frío, gel azul, tinta blanca, 200 unidades a $15.000 c/u\nAbono de $1.500.000"}
              rows={5}
              className="text-sm"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleParse}
            disabled={loading || text.trim().length < 10}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Interpretando..." : "Leer y llenar campos"}
          </Button>
        </>
      )}
    </div>
  );
}
