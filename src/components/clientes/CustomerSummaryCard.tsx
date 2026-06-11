import { Customer } from "@/hooks/useCustomers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, MapPin, ShoppingBag, TrendingUp, Calendar, X, Sparkles } from "lucide-react";

type Props = { customer: Customer; onClear?: () => void; compact?: boolean };

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
const daysAgo = (date: string | null) => {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
};

export function CustomerSummaryCard({ customer, onClear, compact }: Props) {
  const last = daysAgo(customer.last_purchase_at);
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2 relative">
      {onClear && (
        <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-6 w-6" onClick={onClear} title="Quitar cliente">
          <X className="h-3 w-3" />
        </Button>
      )}
      <div className="flex items-start gap-2">
        <User className="h-4 w-4 text-primary mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm leading-tight truncate">{customer.full_name}</p>
            <Badge variant={customer.status === "activo" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">{customer.status}</Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5"><Sparkles className="h-2.5 w-2.5" />{customer.tier}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {customer.document ?? "Sin doc"}{customer.sport ? ` · ${customer.sport}` : ""}
          </p>
        </div>
      </div>
      {!compact && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>}
          {customer.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{customer.city}</span>}
        </div>
      )}
      <div className="grid grid-cols-4 gap-1 text-center pt-1 border-t">
        <div>
          <p className="text-[9px] text-muted-foreground uppercase">Compras</p>
          <p className="text-xs font-bold flex items-center justify-center gap-0.5"><ShoppingBag className="h-3 w-3" />{customer.purchase_count}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground uppercase">Total</p>
          <p className="text-xs font-bold">{fmt(Number(customer.total_spent))}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground uppercase">Ticket prom.</p>
          <p className="text-xs font-bold flex items-center justify-center gap-0.5"><TrendingUp className="h-3 w-3" />{fmt(Number(customer.avg_ticket))}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground uppercase">Última</p>
          <p className="text-xs font-bold flex items-center justify-center gap-0.5"><Calendar className="h-3 w-3" />{last == null ? "—" : last === 0 ? "Hoy" : `${last}d`}</p>
        </div>
      </div>
    </div>
  );
}