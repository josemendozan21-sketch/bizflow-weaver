import { useState } from "react";
import { Check, Copy, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useOrderQuickView } from "@/components/common/OrderQuickView";
import { useAuth } from "@/contexts/AuthContext";
import { canSearchOrders } from "@/lib/orderAccess";

interface OrderCodeBadgeProps {
  code?: string | null;
  lineIndex?: number | null;
  lineCount?: number | null;
  className?: string;
  /** Tamaño compacto para filas de tabla */
  compact?: boolean;
  /** Id del pedido: permite abrir la ficha completa al hacer clic */
  orderId?: string | null;
  /** Desactiva la apertura de la ficha (solo copiar) */
  disableDetail?: boolean;
}

/**
 * Badge unificado con el consecutivo del pedido (ej. MW-AM-01154).
 * Clic = abrir la ficha completa del pedido · ícono (visible en hover) = copiar.
 */
export default function OrderCodeBadge({
  code,
  lineIndex,
  lineCount,
  className,
  compact = false,
  orderId,
  disableDetail = false,
}: OrderCodeBadgeProps) {
  const [copied, setCopied] = useState(false);
  const quickView = useOrderQuickView();
  const { role } = useAuth();
  const canViewDetail = canSearchOrders(role);
  const hasCode = Boolean(code && code.trim());
  const showLine = (lineCount ?? 1) > 1 && !!lineIndex;
  const canOpenDetail = !disableDetail && canViewDetail && !!quickView && (!!orderId || hasCode);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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

  const handleClick = (e: React.MouseEvent) => {
    if (canOpenDetail) {
      e.stopPropagation();
      e.preventDefault();
      quickView!.openOrder({ id: orderId ?? undefined, code });
      return;
    }
    void handleCopy(e);
  };

  const iconSize = compact ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <span
      onClick={handleClick}
      title={
        canOpenDetail
          ? "Clic para ver todos los detalles del pedido"
          : hasCode
            ? "Clic para copiar el número de pedido"
            : "Pedido sin número asignado"
      }
      className={cn(
        "group inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-md border font-mono tracking-tight",
        compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs",
        hasCode || canOpenDetail
          ? "border-primary/30 bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
          : "border-border bg-muted text-muted-foreground",
        className
      )}
    >
      <Hash className={iconSize} />
      {hasCode ? code : "Sin número"}
      {showLine && (
        <span className="font-sans font-normal opacity-70">
          · línea {lineIndex}/{lineCount}
        </span>
      )}
      {hasCode && (
        <button
          type="button"
          onClick={handleCopy}
          title="Copiar número de pedido"
          aria-label="Copiar número de pedido"
          className={cn(
            "ml-0.5 rounded p-0.5 transition-opacity hover:bg-primary/20",
            copied ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100 max-md:opacity-70"
          )}
        >
          {copied ? <Check className={iconSize} /> : <Copy className={iconSize} />}
        </button>
      )}
    </span>
  );
}
