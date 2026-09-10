import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Paperclip } from "lucide-react";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
  hint?: string;
}

const keyOf = (f: File) => `${f.name}:${f.size}`;

/**
 * Adjuntos de apoyo para Diseño. Acumula las selecciones en vez de
 * reemplazarlas, para que el asesor pueda adjuntar en varios momentos.
 */
export function ReferenceFilesInput({
  files,
  onChange,
  label = "Archivos de referencia para Diseño (opcional)",
  hint = "Imágenes o PDF de apoyo para el diseñador. No reemplazan el logo del pedido.",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []).filter((f) => f && f.size > 0);
    if (picked.length > 0) {
      const seen = new Set(files.map(keyOf));
      const merged = [...files];
      for (const f of picked) {
        if (!seen.has(keyOf(f))) {
          seen.add(keyOf(f));
          merged.push(f);
        }
      }
      onChange(merged);
    }
    // Permite volver a elegir el mismo archivo y no pierde los anteriores
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-1.5 rounded-md border border-dashed p-3">
      <Label>{label}</Label>
      <Input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        onChange={handleSelect}
        className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary"
      />
      <p className="text-xs text-muted-foreground">
        {hint} Puedes adjuntar varias veces: los archivos se van sumando.
      </p>
      {files.length > 0 && (
        <ul className="space-y-1 pt-1">
          {files.map((f, i) => (
            <li
              key={`${keyOf(f)}-${i}`}
              className="flex items-center gap-2 rounded bg-muted/40 px-2 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate" title={f.name}>{f.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 shrink-0 p-0"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                aria-label={`Quitar ${f.name}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ReferenceFilesInput;
