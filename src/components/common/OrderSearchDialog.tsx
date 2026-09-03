import { useMemo, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useOrders, getOrderBalance, isOrderFullyPaid, PRODUCTION_STATUS_LABELS } from "@/hooks/useOrders";
import { matchesQuery } from "@/lib/search";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (orderId: string) => void;
}

/** Buscador global de pedidos (Cmd/Ctrl + K). Respeta los permisos de useOrders(). */
export default function OrderSearchDialog({ open, onOpenChange, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const { data: orders = [], isLoading } = useOrders();

  const results = useMemo(() => {
    const base = query.trim()
      ? orders.filter((o) =>
          matchesQuery(
            [o.order_code, o.client_name, o.client_nit, o.product, o.advisor_name, o.brand, o.numero_guia],
            query,
          ),
        )
      : orders;
    return base.slice(0, 40);
  }, [orders, query]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar por número de pedido, cliente, NIT, producto o asesor…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>{isLoading ? "Cargando pedidos…" : "No se encontraron pedidos."}</CommandEmpty>
        <CommandGroup heading={query.trim() ? `${results.length} resultado(s)` : "Pedidos recientes"}>
          {results.map((o) => {
            const paid = isOrderFullyPaid(o);
            const balance = getOrderBalance(o);
            return (
              <CommandItem
                key={o.id}
                value={`${o.order_code ?? ""} ${o.client_name} ${o.product} ${o.advisor_name} ${o.id}`}
                onSelect={() => onSelect(o.id)}
                className="flex items-start gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-primary">{o.order_code || "Sin número"}</span>
                    <span className="font-medium truncate">{o.client_name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {PRODUCTION_STATUS_LABELS[o.production_status] || o.production_status}
                    </Badge>
                    {paid ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">Pagado</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">
                        Saldo ${balance.toLocaleString("es-CO")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {o.product} · {o.quantity} uds · {o.advisor_name}
                  </p>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
