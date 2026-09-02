import { Badge } from "@/components/ui/badge";
import { type CommissionStatus } from "@/lib/commissions";

const STATUS_PRESENTATION: Record<CommissionStatus, { label: string; className: string }> = {
  total: {
    label: "Comisión total",
    className: "border-emerald-700 bg-emerald-600 text-primary-foreground",
  },
  parcial: {
    label: "Parcial (abono)",
    className: "border-sky-700 bg-sky-600 text-primary-foreground",
  },
  pendiente: {
    label: "Pendiente",
    className: "border-amber-600 bg-amber-500 text-foreground",
  },
  excluido: {
    label: "Excluido",
    className: "border-border bg-muted text-muted-foreground",
  },
};

interface Props {
  status: CommissionStatus;
}

export function CommissionStatusBadge({ status }: Props) {
  const presentation = STATUS_PRESENTATION[status];

  return (
    <Badge
      className={`inline-flex w-fit max-w-full shrink-0 whitespace-nowrap px-2 py-1 text-[11px] leading-none ${presentation.className}`}
    >
      {presentation.label}
    </Badge>
  );
}