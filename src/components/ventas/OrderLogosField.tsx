import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Plus, Trash2 } from "lucide-react";

export interface LogoEntry {
  id: string;
  file: File | null;
  name: string;
}

export function makeLogoEntry(): LogoEntry {
  return { id: crypto.randomUUID(), file: null, name: "" };
}

function LogoRow({
  entry,
  index,
  canRemove,
  accept,
  onChange,
  onRemove,
}: {
  entry: LogoEntry;
  index: number;
  canRemove: boolean;
  accept: string;
  onChange: (patch: Partial<LogoEntry>) => void;
  onRemove: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!entry.file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(entry.file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [entry.file]);

  const isImage = useMemo(
    () => !!entry.file && entry.file.type.startsWith("image/"),
    [entry.file],
  );

  return (
    <div className="rounded-md border border-input bg-background p-3">
      <div className="flex items-start gap-3">
        <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`logo_file_${entry.id}`}>Archivo del logo *</Label>
            <Input
              id={`logo_file_${entry.id}`}
              type="file"
              accept={accept}
              onChange={(e) => onChange({ file: e.target.files?.[0] || null })}
              className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary"
            />
            {entry.file && (
              <p className="truncate text-xs text-muted-foreground">✓ {entry.file.name}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`logo_name_${entry.id}`}>Nombre o referencia *</Label>
            <Input
              id={`logo_name_${entry.id}`}
              value={entry.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={index === 0 ? "Ej: Logo Coca-Cola v2" : "Ej: Escudo del colegio"}
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          {entry.file && (
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded border bg-muted/40">
              {isImage && objectUrl ? (
                <img
                  src={objectUrl}
                  alt={entry.name || `Logo ${index + 1}`}
                  className="max-h-14 max-w-14 object-contain"
                />
              ) : (
                <FileText className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            disabled={!canRemove}
            title={canRemove ? "Eliminar este logo" : "El pedido debe tener al menos un logo"}
            aria-label={`Eliminar logo ${index + 1}`}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OrderLogosField({
  logos,
  onChange,
  accept = "image/*,.pdf,.svg,.ai",
}: {
  logos: LogoEntry[];
  onChange: (next: LogoEntry[]) => void;
  accept?: string;
}) {
  const update = (id: string, patch: Partial<LogoEntry>) =>
    onChange(logos.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Logos del pedido ({logos.length})
          </p>
          <p className="text-xs text-muted-foreground">
            Agregue tantos logos como lleve la marcación. Cada uno necesita archivo y nombre.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => onChange([...logos, makeLogoEntry()])}
        >
          <Plus className="h-4 w-4" /> Agregar logo
        </Button>
      </div>

      <div className="space-y-3">
        {logos.map((entry, i) => (
          <LogoRow
            key={entry.id}
            entry={entry}
            index={i}
            accept={accept}
            canRemove={logos.length > 1}
            onChange={(patch) => update(entry.id, patch)}
            onRemove={() => onChange(logos.filter((l) => l.id !== entry.id))}
          />
        ))}
      </div>
    </div>
  );
}
