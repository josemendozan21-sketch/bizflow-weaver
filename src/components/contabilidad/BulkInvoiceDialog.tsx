import { useState } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Order } from "@/hooks/useOrders";

export default function BulkInvoiceDialog({ orders, canInvoice, onDone }: { orders: Order[]; canInvoice: (o: Order) => boolean; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const ok = orders.filter(canInvoice);
  const blocked = orders.length - ok.length;

  const save = async () => {
    if (!number.trim()) return toast.error("Escribe el número de factura");
    if (!ok.length) return toast.error("Ningún pedido seleccionado se puede facturar");
    setBusy(true);
    try {
      let url: string | null = null;
      if (file) {
        const path = `bulk_${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("invoice-files").upload(path, file);
        if (error) throw error;
        url = supabase.storage.from("invoice-files").getPublicUrl(path).data.publicUrl;
      }
      const patch: Record<string, unknown> = { invoice_status: "facturado", invoice_number: number.trim(), invoice_date: date };
      if (url) patch.invoice_file_url = url;
      const { error } = await supabase.from("orders").update(patch as any).in("id", ok.map((o) => o.id));
      if (error) throw error;
      toast.success(`${ok.length} pedido(s) facturados con la factura ${number.trim()}`);
      setOpen(false); setNumber(""); setFile(null);
      onDone();
    } catch (e: any) {
      toast.error("No se pudo guardar", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><FileText className="h-4 w-4 mr-1" />Asignar factura ({orders.length})</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Asignar una factura a {ok.length} pedido(s)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {blocked > 0 && <p className="text-sm text-muted-foreground">{blocked} pedido(s) seleccionados no se pueden facturar aún (pago pendiente o falta RUT) y se omitirán.</p>}
          <div><Label>N° de factura</Label><Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Ej. FEVC 1234" /></div>
          <div><Label>Fecha de factura</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Archivo de la factura (opcional)</Label><Input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
          <Button className="w-full" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Marcar como facturados"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
