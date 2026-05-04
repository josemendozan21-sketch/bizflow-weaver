import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Printer } from "lucide-react";

interface ShippingLabelDialogProps {
  clientName?: string;
  address?: string;
  city?: string;
  phone?: string;
  advisorName?: string;
  trigger?: React.ReactNode;
}

const ShippingLabelDialog = ({ clientName = "", address = "", city = "", phone = "", advisorName = "", trigger }: ShippingLabelDialogProps) => {
  const [open, setOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState({
    nombre: clientName,
    direccion: address,
    ciudad: city,
    celular: phone,
    observaciones: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleGenerate = () => setShowPreview(true);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=500,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Rótulo de envío</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; padding: 24px; }
        .label { border: 3px solid #000; padding: 24px; max-width: 420px; margin: 0 auto; }
        .header { text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase;
                   border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; letter-spacing: 1px; }
        .row { margin-bottom: 14px; }
        .row-label { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #555; letter-spacing: 0.5px; }
        .row-value { font-size: 16px; font-weight: 600; margin-top: 2px; }
        .obs { font-size: 14px; font-weight: 400; font-style: italic; }
        .divider { border-top: 1px dashed #999; margin: 12px 0; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="label">
        <div class="header">Rótulo de Envío</div>
        <div class="row"><div class="row-label">Destinatario</div><div class="row-value">${form.nombre}</div></div>
        <div class="row"><div class="row-label">Dirección</div><div class="row-value">${form.direccion}</div></div>
        <div class="row"><div class="row-label">Ciudad</div><div class="row-value">${form.ciudad}</div></div>
        <div class="divider"></div>
        <div class="row"><div class="row-label">Celular</div><div class="row-value">${form.celular}</div></div>
        ${form.observaciones ? `<div class="divider"></div><div class="row"><div class="row-label">Observaciones</div><div class="row-value obs">${form.observaciones}</div></div>` : ""}
      </div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleBack = () => setShowPreview(false);

  const resetAndClose = () => {
    setOpen(false);
    setShowPreview(false);
    setForm({ nombre: clientName, direccion: "", ciudad: "", celular: "", observaciones: "" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            Rótulo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generar rótulo de envío</DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nombre del cliente</Label>
              <Input value={form.nombre} onChange={(e) => update("nombre", e.target.value)} placeholder="Nombre completo" />
            </div>
            <div className="space-y-1.5">
              <Label>Dirección completa</Label>
              <Input value={form.direccion} onChange={(e) => update("direccion", e.target.value)} placeholder="Calle, número, barrio" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ciudad</Label>
                <Input value={form.ciudad} onChange={(e) => update("ciudad", e.target.value)} placeholder="Ciudad" />
              </div>
              <div className="space-y-1.5">
                <Label>Celular</Label>
                <Input value={form.celular} onChange={(e) => update("celular", e.target.value)} placeholder="300 000 0000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea value={form.observaciones} onChange={(e) => update("observaciones", e.target.value)} placeholder="Instrucciones de entrega (opcional)" rows={2} />
            </div>
            <Button className="w-full" onClick={handleGenerate} disabled={!form.nombre || !form.direccion || !form.ciudad || !form.celular}>
              Vista previa del rótulo
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Preview */}
            <div className="border-2 border-foreground rounded-md p-5 space-y-3">
              <p className="text-center font-bold text-lg uppercase tracking-wide border-b-2 border-foreground pb-2">
                Rótulo de Envío
              </p>
              <div>
                <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide">Destinatario</p>
                <p className="text-base font-semibold">{form.nombre}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide">Dirección</p>
                <p className="text-base font-semibold">{form.direccion}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide">Ciudad</p>
                <p className="text-base font-semibold">{form.ciudad}</p>
              </div>
              <div className="border-t border-dashed border-muted-foreground/40 pt-2">
                <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide">Celular</p>
                <p className="text-base font-semibold">{form.celular}</p>
              </div>
              {form.observaciones && (
                <div className="border-t border-dashed border-muted-foreground/40 pt-2">
                  <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide">Observaciones</p>
                  <p className="text-sm italic">{form.observaciones}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleBack}>Editar</Button>
              <Button className="flex-1" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Imprimir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShippingLabelDialog;
