import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LOGO_MODE_LABEL, type LogoMode } from "@/lib/logoMode";

const HELP: Record<LogoMode, string> = {
  nuevo: "Se crea una solicitud en Diseño. Producción espera la aprobación.",
  recompra_igual: "Se reutiliza el logo aprobado antes. No pasa por Diseño y Producción puede revelar.",
  recompra_ajuste: "Va a Diseño con el logo anterior como base. Escriba en Observaciones qué se ajusta. Producción no revela hasta la aprobación.",
  sin_logo: "El pedido omite estampación.",
};

export function LogoModeSelector({
  value, onChange, previousBuyer,
}: { value: LogoMode | ""; onChange: (m: LogoMode) => void; previousBuyer?: boolean }) {
  return (
    <div className="space-y-2 rounded-md border border-primary/40 bg-primary/5 p-3">
      <Label className="text-sm font-semibold">¿Cómo va el logo de este pedido? *</Label>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(LOGO_MODE_LABEL) as LogoMode[]).map((m) => (
          <Button key={m} type="button" size="sm" variant={value === m ? "default" : "outline"} onClick={() => onChange(m)}>
            {LOGO_MODE_LABEL[m]}
          </Button>
        ))}
      </div>
      {value ? (
        <p className="text-xs text-muted-foreground">{HELP[value]}</p>
      ) : (
        <p className="text-xs text-destructive">Elija una opción para poder registrar el pedido.</p>
      )}
      {previousBuyer && value === "nuevo" && (
        <p className="text-xs font-medium text-warning-foreground rounded bg-warning/20 px-2 py-1">
          Este cliente ya compró antes. ¿Es recompra? Si el logo es el mismo, elija "Recompra — logo tal cual".
        </p>
      )}
    </div>
  );
}
