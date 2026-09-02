import { Badge } from "@/components/ui/badge";
import { canonicalTipo, cleanReferenceName, type ReferenceTipo } from "@/lib/referenceCatalog";

interface ReferenceLabelProps {
  name: string;
  tipo?: ReferenceTipo | string | null;
  marcado?: boolean | null;
  showMarked?: boolean;
  className?: string;
}

/**
 * Etiqueta única de referencia usada en todas las áreas:
 * nombre limpio + badge de tipo (Frío/Térmico) + marcado/sin marcar.
 */
export default function ReferenceLabel({
  name,
  tipo,
  marcado,
  showMarked = false,
  className,
}: ReferenceLabelProps) {
  const t = canonicalTipo(typeof tipo === "string" ? tipo : tipo || "");
  return (
    <span className={`inline-flex items-center gap-1.5 ${className || ""}`}>
      <span className="font-medium">{cleanReferenceName(name)}</span>
      {t && (
        <Badge variant="outline" className="text-[10px] font-normal">
          {t === "Frío" ? "❄️ Frío" : "🔥 Térmico"}
        </Badge>
      )}
      {showMarked &&
        (marcado ? (
          <Badge variant="secondary" className="text-[10px]">CON LOGO</Badge>
        ) : (
          <Badge className="text-[10px] bg-blue-600 hover:bg-blue-700">MARCABLE</Badge>
        ))}
    </span>
  );
}
