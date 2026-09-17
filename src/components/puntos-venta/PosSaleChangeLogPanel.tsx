import { useMemo } from "react";
import ChangeLogPanel, { type ChangeLogRow } from "@/components/shared/ChangeLogPanel";
import { usePosSaleAuditLog } from "@/hooks/usePosSaleAuditLog";

const FIELD_LABEL: Record<string, string> = {
  payment_method: "Método de pago",
  total_amount: "Total",
  discount: "Descuento",
  client_name: "Cliente",
  client_document: "Cédula / NIT",
  notes: "Notas",
};

const PAYMENT_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  nequi: "Nequi",
  bancolombia: "Bancolombia",
  davivienda: "Davivienda",
  link_pago: "Link de pago",
  transferencia: "Transferencia",
  otro: "Otro",
};

const money = (v: string) => `$${Math.round(Number(v) || 0).toLocaleString("es-CO")}`;

const VALUE_FMT: Record<string, (v: string) => string> = {
  total_amount: money,
  discount: money,
  payment_method: (v) => PAYMENT_LABEL[v] ?? v,
};

const fmtValue = (field: string | null, v: string | null) => {
  if (v === null || v === "") return null;
  const f = field ? VALUE_FMT[field] : undefined;
  return f ? f(v) : v;
};

export default function PosSaleChangeLogPanel({ locationId }: { locationId: string }) {
  const { data: entries = [], isLoading } = usePosSaleAuditLog(locationId);

  const rows: ChangeLogRow[] = useMemo(
    () =>
      entries.map((e) => ({
        id: e.id,
        changed_at: e.changed_at,
        changed_by_email: e.changed_by_email,
        action: e.action === "delete" ? "eliminacion" : "edicion",
        entity: `N° ${(e.sale_id ?? "").slice(0, 8).toUpperCase()}`,
        entity_note: null,
        context: `${e.client_name || "Sin cliente"} · ${money(String(e.total_amount ?? 0))}`,
        field: e.field,
        old_value: fmtValue(e.field, e.old_value),
        new_value: fmtValue(e.field, e.new_value),
      })),
    [entries],
  );

  return (
    <ChangeLogPanel
      title="Historial de cambios de ventas"
      rows={rows}
      isLoading={isLoading}
      fieldLabels={FIELD_LABEL}
      entityHeader="Factura"
      contextHeader="Cliente · Total"
      exportFileName="historial_ventas_punto"
      searchPlaceholder="Buscar factura, cliente o usuario…"
    />
  );
}
