import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrderPayments, useDeleteOrderPayment } from "@/hooks/useOrderPayments";
import { openSignedUrl } from "@/lib/signedUrl";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  orderId: string;
  total: number;
}

export function PaymentsList({ orderId, total }: Props) {
  const { data: payments = [], isLoading } = useOrderPayments(orderId);
  const { role } = useAuth();
  const del = useDeleteOrderPayment();
  const canDelete = role === "admin" || role === "contabilidad";

  const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const balance = Math.max(total - paid, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Abonados: <span className="font-medium text-foreground">${paid.toLocaleString("es-CO")}</span>
          {total > 0 && (
            <span className="ml-2">
              · Saldo:{" "}
              <span className={`font-medium ${balance > 0 ? "text-destructive" : "text-green-700"}`}>
                ${balance.toLocaleString("es-CO")}
              </span>
            </span>
          )}
        </span>
        <span className="text-muted-foreground">{payments.length} abono(s)</span>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando abonos…</p>
      ) : payments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sin abonos registrados aún.</p>
      ) : (
        <ul className="space-y-1.5">
          {payments.map((p) => (
            <li
              key={p.id}
              className="rounded-md border bg-background px-2.5 py-2 text-xs flex items-start justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">
                    ${Number(p.amount).toLocaleString("es-CO")}
                  </span>
                  <span className="text-muted-foreground">
                    {format(new Date(p.payment_date), "d MMM yyyy", { locale: es })}
                  </span>
                  {p.method && (
                    <span className="text-muted-foreground">· {p.method}</span>
                  )}
                </div>
                {p.notes && <p className="text-muted-foreground mt-0.5">{p.notes}</p>}
                {p.recorded_by_name && (
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                    Registrado por {p.recorded_by_name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {p.proof_url && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => openSignedUrl(p.proof_url!)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("¿Eliminar este abono?")) {
                        del.mutate({ id: p.id, order_id: orderId });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}