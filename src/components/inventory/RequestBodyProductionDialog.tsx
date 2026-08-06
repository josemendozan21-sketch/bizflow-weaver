import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Factory } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/hooks/useInventory";
import { toast } from "sonner";

const RequestBodyProductionDialog = () => {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState<string>("magical");
  const [tipoPlastico, setTipoPlastico] = useState<string>("frio");
  const [referencia, setReferencia] = useState<string>("");
  const [unidades, setUnidades] = useState<string>("");
  const [notas, setNotas] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { stockItems } = useInventory();

  const isTermico = (pt?: string | null) => /calor|t[eé]rmico/i.test(pt || "");

  const cuerpos = stockItems.filter(
    (i) =>
      i.brand === brand &&
      i.category === "cuerpos_referencias" &&
      (tipoPlastico === "calor" ? isTermico(i.product_type) : !isTermico(i.product_type))
  );

  const tipoLabel = tipoPlastico === "calor" ? "Térmico" : "Frío";

  const submit = async () => {
    if (!referencia || !unidades || Number(unidades) <= 0) {
      toast.error("Selecciona la referencia y la cantidad");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("body_production_tasks").insert({
      tipo_plastico: tipoPlastico,
      referencia: `${referencia} (${tipoLabel})`,
      unidades: Number(unidades),
      status: "pendiente",
    } as any);

    if (error) {
      toast.error(`No se pudo crear la solicitud: ${error.message}`);
      setSubmitting(false);
      return;
    }

    await supabase.from("notifications").insert({
      target_role: "produccion",
      title: "Nueva solicitud de cuerpos",
      message: `Inventarios solicita producir ${unidades} uds de "${referencia}" (${brand}, ${tipoLabel})${notas ? `. Notas: ${notas}` : ""}`,
      type: "info",
    } as any);

    toast.success("Solicitud enviada a producción");
    setReferencia("");
    setUnidades("");
    setNotas("");
    setOpen(false);
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Factory className="h-4 w-4" /> Solicitar cuerpos a producción
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar producción de cuerpos</DialogTitle>
          <DialogDescription>
            Crea una orden para que el equipo de producción fabrique cuerpos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Marca</Label>
            <Select value={brand} onValueChange={(v) => { setBrand(v); setReferencia(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="magical">Magical Warmers</SelectItem>
                <SelectItem value="sweatspot">Sweatspot</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de plástico</Label>
            <Select value={tipoPlastico} onValueChange={(v) => { setTipoPlastico(v); setReferencia(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="frio">Frío</SelectItem>
                <SelectItem value="calor">Térmico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Referencia</Label>
            <Select value={referencia} onValueChange={setReferencia}>
              <SelectTrigger><SelectValue placeholder="Selecciona una referencia" /></SelectTrigger>
              <SelectContent>
                {cuerpos.length === 0 ? (
                  <SelectItem value="__empty__" disabled>Sin referencias</SelectItem>
                ) : (
                  cuerpos.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name} (stock: {c.available})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unidades a producir</Label>
            <Input type="number" min={1} value={unidades} onChange={(e) => setUnidades(e.target.value)} />
          </div>
          <div>
            <Label>Notas (opcional)</Label>
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Detalles adicionales" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting}>Enviar solicitud</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestBodyProductionDialog;