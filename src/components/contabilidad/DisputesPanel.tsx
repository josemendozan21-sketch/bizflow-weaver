import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ExternalLink, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useOrderDisputes, useResolveOrderDispute, type DisputeStatus } from "@/hooks/useOrderDisputes";
import type { Order } from "@/hooks/useOrders";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  orders: Order[];
}

const STATUS_BADGE: Record<DisputeStatus, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-amber-500" },
  aprobada: { label: "Aprobada", className: "bg-emerald-600" },
  rechazada: { label: "Rechazada", className: "bg-destructive" },
};

function fmt(n: number) {
  return `$${Math.round(n || 0).toLocaleString("es-CO")}`;
}

export default function DisputesPanel({ orders }: Props) {
  const { role } = useAuth();
  const canResolve = role === "admin" || role === "contabilidad";
  const { data: disputes = [], isLoading } = useOrderDisputes();
  const resolve = useResolveOrderDispute();
  const [tab, setTab] = useState<DisputeStatus | "todas">("pendiente");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const orderMap = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const list = useMemo(
    () => (tab === "todas" ? disputes : disputes.filter((d) => d.status === tab)),
    [disputes, tab]
  );

  const counts = useMemo(
    () => ({
      pendiente: disputes.filter((d) => d.status === "pendiente").length,
      aprobada: disputes.filter((d) => d.status === "aprobada").length,
      rechazada: disputes.filter((d) => d.status === "rechazada").length,
    }),
    [disputes]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Conciliación de valores</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Solicitudes de corrección enviadas por los asesores. Al aprobar se actualiza el
              valor del pedido y se recalcula la comisión.
            </p>
          </div>
          <div className="flex gap-1">
            {([
              ["pendiente", `Pendientes (${counts.pendiente})`],
              ["aprobada", `Aprobadas (${counts.aprobada})`],
              ["rechazada", `Rechazadas (${counts.rechazada})`],
              ["todas", "Todas"],
            ] as [DisputeStatus | "todas", string][]).map(([v, label]) => (
              <Button
                key={v}
                size="sm"
                variant={tab === v ? "default" : "outline"}
                onClick={() => setTab(v)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Cargando...</p>
        ) : list.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No hay solicitudes en esta vista.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Asesor</TableHead>
                  <TableHead className="text-right">Valor actual</TableHead>
                  <TableHead className="text-right">Valor propuesto</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  {canResolve && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((d) => {
                  const o = orderMap.get(d.order_id);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(parseISO(d.created_at), "d MMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {o?.order_code || "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {o?.client_name || "—"}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                        {d.requested_by_name || o?.advisor_name || "—"}
                      </TableCell>
                      <TableCell className="text-right">{fmt(Number(d.current_amount))}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmt(Number(d.proposed_amount))}
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <p className="text-xs">{d.reason}</p>
                        {d.evidence_url && (
                          <a
                            href={d.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Ver soporte
                          </a>
                        )}
                        {d.resolution_note && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Respuesta: {d.resolution_note}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[d.status].className}>
                          {STATUS_BADGE[d.status].label}
                        </Badge>
                        {d.resolved_by_name && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {d.resolved_by_name}
                          </p>
                        )}
                      </TableCell>
                      {canResolve && (
                        <TableCell className="text-right">
                          {d.status === "pendiente" ? (
                            <div className="flex flex-col gap-1 items-end">
                              <Input
                                placeholder="Comentario"
                                className="h-8 text-xs w-[160px]"
                                value={notes[d.id] || ""}
                                onChange={(e) =>
                                  setNotes((p) => ({ ...p, [d.id]: e.target.value }))
                                }
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  className="h-8 gap-1"
                                  disabled={resolve.isPending}
                                  onClick={() =>
                                    resolve.mutate({
                                      disputeId: d.id,
                                      approve: true,
                                      note: notes[d.id],
                                    })
                                  }
                                >
                                  <Check className="h-3.5 w-3.5" /> Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1"
                                  disabled={resolve.isPending}
                                  onClick={() =>
                                    resolve.mutate({
                                      disputeId: d.id,
                                      approve: false,
                                      note: notes[d.id],
                                    })
                                  }
                                >
                                  <X className="h-3.5 w-3.5" /> Rechazar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {d.resolved_at
                                ? format(parseISO(d.resolved_at), "d MMM", { locale: es })
                                : "—"}
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
