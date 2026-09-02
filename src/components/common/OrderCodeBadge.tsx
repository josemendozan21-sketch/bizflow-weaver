import { useState } from "react";
import { Check, Copy, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OrderCodeBadgeProps {
  code?: string | null;
  lineIndex?: number | null;
  lineCount?: number | null;
  className?: string;
  /** Tamaño compacto para filas de tabla */
  compact?: boolean;
}

/**
 * Badge unificado con el consecutivo del pedido (ej. MW-AM-01154).
 * Se usa en todas las áreas para identificar un pedido de principio a fin.
 */
export default function OrderCodeBadge({
  code,
  lineIndex,
  lineCount,
  className,
  compact = false,
}: OrderCodeBadgeProps) {
  const [copied, setCopied] = useState(false);
  const hasCode = Boolean(code && code.trim());
  const showLine = (lineCount ?? 1) > 1 && !!lineIndex;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasCode) return;
    try {
      await navigator.clipboard.writeText(code as string);
      setCopied(true);
      toast.success("Número de pedido copiado", { description: code as string });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard no disponible */
    }
  };

  return (
    <span
      onClick={handleCopy}
      title={hasCode ? "Clic para copiar el número de pedido" : "Pedido sin número asignado"}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-mono tracking-tight",
        compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs",
        hasCode
          ? "border-primary/30 bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
          : "border-border bg-muted text-muted-foreground",
        className
      )}
    >
      <Hash className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {hasCode ? code : "Sin número"}
      {showLine && (
        <span className="font-sans font-normal opacity-70">
          · línea {lineIndex}/{lineCount}
        </span>
      )}
      {hasCode &&
        (copied ? (
          <Check className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
        ) : (
          <Copy className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3", "opacity-50")} />
        ))}
    </span>
  );
}
