import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface OrderSummaryProduct {
  title: string;
  isGift?: boolean;
  details: Array<{ label: string; value: string }>;
}

export interface OrderSummary {
  brandLabel: string;
  saleTypeLabel: string;
  cliente: Array<{ label: string; value: string }>;
  productos: OrderSummaryProduct[];
  pago: Array<{ label: string; value: string }>;
  opciones?: Array<{ label: string; value: string }>;
  archivos?: Array<{ label: string; value: string }>;
  observaciones?: string;
  totalLabel: string;
  totalValue: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  summary: OrderSummary | null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right font-medium">{value}</span>
    </div>
  );
}

export function OrderConfirmationDialog({ open, onOpenChange, onConfirm, isSubmitting, summary }: Props) {
  if (!summary) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirmar pedido</DialogTitle>
          <DialogDescription>
            Revisa todos los datos antes de crear el pedido. Si algo no es correcto, cancela y corrige el formulario.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{summary.brandLabel}</Badge>
          <Badge variant="outline">{summary.saleTypeLabel}</Badge>
        </div>

        <ScrollArea className="max-h-[55vh] pr-3 -mr-3">
          <div className="space-y-4">
            <Section title="Cliente">
              {summary.cliente.map((r) => <Row key={r.label} {...r} />)}
            </Section>

            <Section title={`Productos (${summary.productos.length})`}>
              <div className="space-y-3">
                {summary.productos.map((p, idx) => (
                  <div key={idx} className={`rounded-md border p-2.5 space-y-1 ${p.isGift ? "border-amber-300 bg-amber-50/40" : "border-border bg-background"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{p.title}</span>
                      {p.isGift && (
                        <Badge variant="outline" className="border-amber-400 text-amber-700 text-xs">🎁 Obsequio</Badge>
                      )}
                    </div>
                    {p.details.map((d) => <Row key={d.label} {...d} />)}
                  </div>
                ))}
              </div>
            </Section>

            {summary.opciones && summary.opciones.length > 0 && (
              <Section title="Opciones">
                {summary.opciones.map((r) => <Row key={r.label} {...r} />)}
              </Section>
            )}

            <Section title="Pago y entrega">
              {summary.pago.map((r) => <Row key={r.label} {...r} />)}
            </Section>

            {summary.archivos && summary.archivos.length > 0 && (
              <Section title="Archivos adjuntos">
                {summary.archivos.map((r) => <Row key={r.label} {...r} />)}
              </Section>
            )}

            {summary.observaciones && (
              <Section title="Observaciones">
                <p className="text-sm text-foreground whitespace-pre-wrap">{summary.observaciones}</p>
              </Section>
            )}
          </div>
        </ScrollArea>

        <div className="rounded-md border border-primary/40 bg-primary/5 p-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{summary.totalLabel}</span>
          <span className="text-lg font-bold text-foreground">{summary.totalValue}</span>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Volver y editar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Confirmar y crear pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}