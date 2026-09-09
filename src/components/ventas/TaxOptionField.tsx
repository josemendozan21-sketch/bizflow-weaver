import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { IVA_RATE } from "@/lib/tax";

const money = (n: number) => `$${(Number(n) || 0).toLocaleString("es-CO")}`;

/**
 * Selector de IVA para ventas al por mayor + desglose del pedido.
 * El IVA se calcula únicamente sobre la base de productos; envío, cobro de
 * logo, molde y costos adicionales son conceptos independientes.
 */
export function TaxOptionField({
  includesTax,
  onChange,
  productsSubtotal,
  ivaAmount,
  otherConcepts = 0,
  total,
}: {
  includesTax: boolean;
  onChange: (v: boolean) => void;
  productsSubtotal: number;
  ivaAmount: number;
  otherConcepts?: number;
  total: number;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          ¿El precio ingresado incluye IVA? <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={includesTax ? "si" : "no"}
          onValueChange={(v) => onChange(v === "si")}
          className="flex flex-col gap-2 sm:flex-row sm:gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="si" id="iva-si" />
            <Label htmlFor="iva-si" className="font-normal cursor-pointer">Sí, incluye IVA</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="no" id="iva-no" />
            <Label htmlFor="iva-no" className="font-normal cursor-pointer">No, no incluye IVA</Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          El {IVA_RATE}% se calcula solo sobre el valor de los productos. El envío y los costos
          adicionales se manejan aparte.
        </p>
      </div>

      <div className="space-y-1 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal productos</span>
          <span>{money(productsSubtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">IVA {IVA_RATE}%</span>
          <span>{money(ivaAmount)}</span>
        </div>
        {otherConcepts > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Otros conceptos</span>
            <span>{money(otherConcepts)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold pt-1 border-t">
          <span>Total del pedido</span>
          <span>{money(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default TaxOptionField;
