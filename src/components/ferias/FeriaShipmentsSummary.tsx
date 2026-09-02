import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, PackageCheck } from "lucide-react";
import { useFeriaShipments } from "@/hooks/useFeriaShipments";

/** Vista de solo lectura de las salidas y la entrada de retorno registradas por inventario. */
export default function FeriaShipmentsSummary({ feriaId }: { feriaId: string }) {
  const { data: shipments = [] } = useFeriaShipments(feriaId);
  if (shipments.length === 0) return null;

  const salidas = shipments.filter((s) => s.direction === "salida");
  const entrada = shipments.find((s) => s.direction === "entrada" && s.status === "confirmada");

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Truck className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Movimientos de bodega</h3>
        <Badge variant="outline" className="text-[10px]">Solo lectura</Badge>
      </div>

      {salidas.map((s) => (
        <div key={s.id} className="rounded-md border p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm">Salida {s.shipment_number}</span>
            <Badge variant="outline" className={`text-[10px] ${s.status === "anulada" ? "text-destructive border-destructive/40" : ""}`}>{s.status}</Badge>
            <span className="text-muted-foreground">
              {new Date(s.confirmed_at).toLocaleString("es-CO")} · {s.confirmed_by_name ?? "—"}
            </span>
            <span className="ml-auto text-muted-foreground">
              {s.items.reduce((a, i) => a + i.quantity, 0)} uds · {s.items.length} refs
            </span>
          </div>
        </div>
      ))}

      {entrada && (
        <div className="rounded-md border p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <PackageCheck className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-sm">Entrada de retorno</span>
            <span className="text-muted-foreground">
              {new Date(entrada.confirmed_at).toLocaleString("es-CO")} · {entrada.confirmed_by_name ?? "—"}
            </span>
            <span className="ml-auto text-muted-foreground">
              {entrada.items.reduce((a, i) => a + i.quantity, 0)} uds retornadas
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
