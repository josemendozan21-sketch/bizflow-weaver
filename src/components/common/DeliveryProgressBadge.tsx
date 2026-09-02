import { PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryProgressBadgeProps {
  quantity?: number | null;
  delivered?: number | null;
  className?: string;
  compact?: boolean;
  /** Muestra el badge aunque no haya entregas parciales registradas */
  showWhenEmpty?: boolean;
}

/**
 * Muestra el avance de entregas parciales de un pedido: "500 / 1.000 · faltan 500".
 */
export default function DeliveryProgressBadge({
  quantity,
  delivered,
  className,
  compact = false,
  showWhenEmpty = false,
}: DeliveryProgressBadgeProps) {
  const total = Number(quantity) || 0;
  const done = Math.min(Number(delivered) || 0, total || Number(delivered) || 0);
  if (!total) return null;
  if (done <= 0 && !showWhenEmpty) return null;

  const pending = Math.max(total - done, 0);
  const pct = total > 0 ? Math.min(Math.round((done / total) * 100), 100) : 0;
  const complete = pending === 0 && done > 0;

  return (
    <span
      title={`Entregadas ${done.toLocaleString("es-CO")} de ${total.toLocaleString("es-CO")} unidades`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border",
        compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs",
        complete
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
          : "border-amber-500/30 bg-amber-500/10 text-amber-600",
        className
      )}
    >
      <PackageCheck className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {done.toLocaleString("es-CO")} / {total.toLocaleString("es-CO")}
      {complete ? (
        <span className="opacity-80">· completo</span>
      ) : (
        <span className="opacity-80">· faltan {pending.toLocaleString("es-CO")} ({pct}%)</span>
      )}
    </span>
  );
}
