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
import { Truck } from "lucide-react";

interface DispatchConfirmDialogProps {
  orderId: string;
  clientName: string;
  onConfirm: (id: string, shipping: { transportadora: string; numeroGuia: string }) => void;
}

const DispatchConfirmDialog = ({ orderId, clientName, onConfirm }: DispatchConfirmDialogProps) => {
  const [open, setOpen] = useState(false);
  const [transportadora, setTransportadora] = useState("");
  const [numeroGuia, setNumeroGuia] = useState("");

  const handleConfirm = () => {
    onConfirm(orderId, { transportadora, numeroGuia });
    setOpen(false);
    setTransportadora("");
    setNumeroGuia("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Truck className="h-4 w-4 mr-1" />
          Despachar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar despacho</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Pedido de <span className="font-semibold text-foreground">{clientName}</span>
        </p>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Transportadora</Label>
            <Input
              value={transportadora}
              onChange={(e) => setTransportadora(e.target.value)}
              placeholder="Ej: Servientrega, Coordinadora, TCC"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Número de guía</Label>
            <Input
              value={numeroGuia}
              onChange={(e) => setNumeroGuia(e.target.value)}
              placeholder="Ej: 123456789"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleConfirm}
            disabled={!transportadora.trim() || !numeroGuia.trim()}
          >
            <Truck className="h-4 w-4 mr-1" />
            Marcar como despachado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DispatchConfirmDialog;
