import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_COLORS, type LogoRequestStatus } from "@/hooks/useLogoRequests";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: LogoRequestStatus }) {
  return (
    <Badge variant="secondary" className={cn("text-xs font-medium", STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
