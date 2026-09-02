import { useMemo } from "react";
import ChangeLogPanel, { type ChangeLogRow } from "@/components/shared/ChangeLogPanel";
import { useProcessAuditLog } from "@/hooks/useProcessAuditLog";

const FIELD_LABEL: Record<string, string> = {
  registro: "Registro",
  current_stage: "Etapa actual",
  stage_status: "Estado de etapa",
  quantity: "Cantidad",
  final_count: "Conteo final",
  delivery_date: "Fecha de entrega",
  packager_name: "Empacador",
  gel_color: "Color de gel",
  ink_color: "Color de tinta",
  ink_color_2: "Color de tinta 2",
  ink_color_3: "Color de tinta 3",
  glitter_color: "Color de escarcha",
  molde: "Molde",
  thermo_size: "Tamaño de termo",
  silicone_color: "Color de silicona",
  logo_type: "Tipo de logo",
  observations: "Observaciones",
  needs_cuerpos: "Requiere cuerpos",
  has_stock: "Tiene stock",
  stamp_size_status: "Aprobación de tamaño",
  stamp_inkgel_status: "Aprobación tinta/gel",
  completed_at: "Fecha de finalización",
  status: "Estado",
  unidades: "Unidades",
  referencia: "Referencia",
  tipo_plastico: "Tipo de plástico",
  brand: "Marca",
  fabricated_by: "Fabricado por",
  stage: "Etapa",
  operator_name: "Operario",
  started_at: "Inicio",
  ended_at: "Fin",
  tipo: "Tipo",
  medida_cm: "Medida (cm)",
  peso_inicial_g: "Peso inicial (g)",
  peso_final_g: "Peso final (g)",
  cortado_por: "Cortado por",
  montado_por: "Montado por",
  finalizado_por: "Finalizado por",
  notas_inicio: "Notas de inicio",
  notas_final: "Notas finales",
};

const SOURCE_LABEL: Record<string, string> = {
  production_orders: "Orden de producción",
  body_production_tasks: "Tarea de cuerpos",
  production_stage_logs: "Registro de etapa",
  roll_cuts: "Corte de rollo",
};

const BRAND_LABEL: Record<string, string> = {
  magical_warmers: "Magical Warmers",
  magical: "Magical Warmers",
  sweatspot: "Sweatspot",
  ambas: "Ambas",
};

interface Props {
  area?: "produccion" | "estampacion";
  title?: string;
}

export default function ProcessChangeLogPanel({ area, title }: Props) {
  const { data: entries = [], isLoading } = useProcessAuditLog(area);

  const rows: ChangeLogRow[] = useMemo(
    () =>
      entries.map((e) => ({
        id: e.id,
        changed_at: e.changed_at,
        changed_by_email: e.changed_by_email,
        action: e.action,
        entity: e.entity_name || "—",
        entity_note: SOURCE_LABEL[e.table_name] ?? e.table_name,
        context: [
          BRAND_LABEL[(e.brand ?? "").toLowerCase()] ?? e.brand ?? "—",
          e.area === "estampacion" ? "Estampación" : "Producción",
        ].join(" · "),
        order_code: e.order_code,
        field: e.field,
        old_value: e.old_value,
        new_value: e.new_value,
      })),
    [entries],
  );

  const filters = useMemo(
    () => [
      {
        label: "Marca",
        options: { magical_warmers: "Magical Warmers", sweatspot: "Sweatspot" },
        get: (r: ChangeLogRow) => {
          const e = entries.find((x) => x.id === r.id);
          const b = (e?.brand ?? "").toLowerCase();
          return b === "magical" ? "magical_warmers" : b;
        },
      },
      {
        label: "Origen",
        options: SOURCE_LABEL,
        get: (r: ChangeLogRow) => entries.find((x) => x.id === r.id)?.table_name,
      },
    ],
    [entries],
  );

  return (
    <ChangeLogPanel
      title={title ?? "Historial de cambios"}
      rows={rows}
      isLoading={isLoading}
      fieldLabels={FIELD_LABEL}
      entityHeader="Elemento"
      contextHeader="Marca / Área"
      filters={filters}
      showOrderCode
      exportFileName={`historial_cambios_${area ?? "procesos"}`}
      searchPlaceholder="Pedido, cliente, referencia o usuario..."
    />
  );
}
