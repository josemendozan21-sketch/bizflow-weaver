import OrderCodeBadge from "@/components/common/OrderCodeBadge";
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
import { openSignedUrl } from "@/lib/signedUrl";
import OrderDisputeDialog from "@/components/ventas/OrderDisputeDialog";
import PaymentConsistencyPanel from "@/components/contabilidad/PaymentConsistencyPanel";
import CommissionAdjustmentPanel from "@/components/contabilidad/CommissionAdjustmentPanel";

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


interface Candidate {
  order: Order;
  issue: string;
}

function buildCandidates(orders: Order[], disputedIds: Set<string>): Candidate[] {
  const out: Candidate[] = [];
  const groups = new Map<string, Order[]>();

  for (const o of orders) {
    const total = Number((o as any).total_amount) || 0;
    const abono = Number((o as any).abono) || 0;
    const gift = String((o as any).payment_method || "").toLowerCase() === "obsequio";
    if (disputedIds.has(o.id)) continue;

    if (total <= 0 && !gift) {
      out.push({ order: o, issue: "Pedido en $0 sin marcar como obsequio" });
      continue;
    }
    if (abono > total + 1) {
      out.push({ order: o, issue: "Abono mayor al valor del pedido" });
      continue;
    }
    if (
      total > 0 &&
      (o as any).invoice_status === "facturado" &&
      !(o as any).invoice_date
    ) {
      out.push({ order: o, issue: "Facturado sin fecha de factura" });
      continue;
    }
    const g = (o as any).group_number;
    if (g) {
      const key = `${g}|${(o as any).client_name || ""}|${total}`;
      const arr = groups.get(key) || [];
      arr.push(o);
      groups.set(key, arr);
    }
  }

  for (const arr of groups.values()) {
    if (arr.length > 1 && Number((arr[0] as any).total_amount) > 0) {
      for (const o of arr) {
        out.push({ order: o, issue: "Posible pedido duplicado (mismo grupo, cliente y valor)" });
      }
    }
  }

  return out;
}

export default function DisputesPanel({ orders }: Props) {
  const { role, user } = useAuth();
  const canResolve = role === "admin" || role === "contabilidad";
  const { data: disputes = [], isLoading } = useOrderDisputes();
  const resolve = useResolveOrderDispute();
  const [tab, setTab] = useState<DisputeStatus | "todas">("pendiente");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const orderMap = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const disputedIds = useMemo(
    () => new Set(disputes.filter((d) => d.status !== "rechazada").map((d) => d.order_id)),
    [disputes]
  );

  const myOrders = useMemo(
    () => (canResolve ? orders : orders.filter((o) => o.advisor_id === user?.id)),
    [orders, canResolve, user?.id]
  );

  const candidates = useMemo(
    () => buildCandidates(myOrders, disputedIds),
    [myOrders, disputedIds]
  );

  const [search, setSearch] = useState("");
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return myOrders
      .filter((o) =>
        [
          (o as any).order_code,
          o.client_name,
          (o as any).product,
          o.advisor_name,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
      .slice(0, 25);
  }, [myOrders, search]);

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
    <div className="space-y-4">
    <CommissionAdjustmentPanel advisorFilter={canResolve ? undefined : (user?.email ?? undefined)} />
    <PaymentConsistencyPanel orders={myOrders} canFix={canResolve} />
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
                      <TableCell className="text-xs">
                        <OrderCodeBadge code={o?.order_code} orderId={o?.id} compact />
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
                          <button
                            type="button"
                            onClick={() => openSignedUrl(d.evidence_url!)}
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Ver soporte
                          </button>
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pedidos por conciliar</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Pedidos detectados con posibles inconsistencias de valor. Envía la solicitud
            de corrección para que quede registrada y contabilidad la apruebe.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay pedidos con inconsistencias detectadas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Asesor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Inconsistencia</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.slice(0, 100).map((c) => (
                    <TableRow key={`${c.order.id}-${c.issue}`}>
                      <TableCell className="text-xs">
                        <OrderCodeBadge code={(c.order as any).order_code} orderId={c.order.id} compact />
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {c.order.client_name}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                        {c.order.advisor_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(Number((c.order as any).total_amount) || 0)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline">{c.issue}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <OrderDisputeDialog
                          orderId={c.order.id}
                          orderCode={(c.order as any).order_code}
                          clientName={c.order.client_name}
                          currentAmount={Number((c.order as any).total_amount) || 0}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="space-y-2 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              ¿No aparece el pedido? Búscalo por número, cliente o producto y envía la
              solicitud de corrección.
            </p>
            <Input
              placeholder="Buscar pedido por N°, cliente o producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
            {searchResults.length > 0 && (
              <div className="rounded-md border divide-y">
                {searchResults.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate">
                        <OrderCodeBadge code={(o as any).order_code} orderId={o.id} compact className="mr-2" />
                        {o.client_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(o as any).product} · {fmt(Number((o as any).total_amount) || 0)}
                      </p>
                    </div>
                    <OrderDisputeDialog
                      orderId={o.id}
                      orderCode={(o as any).order_code}
                      clientName={o.client_name}
                      currentAmount={Number((o as any).total_amount) || 0}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
