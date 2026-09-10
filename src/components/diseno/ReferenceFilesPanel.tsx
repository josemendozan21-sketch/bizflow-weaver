import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Download, ExternalLink, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoPreview } from "./LogoPreview";
import { useLogoReferenceFiles } from "@/hooks/useLogoReferenceFiles";

interface Props {
  requestId?: string | null;
  orderId?: string | null;
  title?: string;
}

/** Archivos de apoyo que el asesor adjunta para guiar a Diseño. */
export function ReferenceFilesPanel({ requestId, orderId, title = "Archivos de referencia del cliente" }: Props) {
  const { data: files = [] } = useLogoReferenceFiles({ requestId, orderId });

  if (files.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" /> {title} ({files.length})
      </p>
      <p className="text-[11px] text-muted-foreground">
        Sirven como guía. No reemplazan el logo original ni el ajustado.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {files.map((f) => (
          <div key={f.id} className="space-y-1.5 rounded-md border bg-muted/20 p-2">
            <LogoPreview url={f.file_url} alt={f.file_name || "Referencia"} />
            <p className="truncate text-xs" title={f.file_name || ""}>{f.file_name || "Archivo"}</p>
            <p className="text-[11px] text-muted-foreground">
              {f.stage === "modificacion" ? "Solicitud de modificación" : "Al crear el pedido"} ·{" "}
              {format(new Date(f.created_at), "d MMM yyyy", { locale: es })}
              {f.uploaded_by_name ? ` · ${f.uploaded_by_name}` : ""}
            </p>
            {f.note && <p className="text-[11px] italic text-muted-foreground">{f.note}</p>}
            <div className="flex flex-wrap gap-3">
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                <a href={f.file_url} target="_blank" rel="noopener noreferrer">
                  Abrir <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                <a href={f.file_url} download={f.file_name || undefined}>
                  Descargar <Download className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReferenceFilesPanel;
