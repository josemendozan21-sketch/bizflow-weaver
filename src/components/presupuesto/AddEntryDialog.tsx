import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, DollarSign, Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAddBudgetEntry } from "@/hooks/useMonthlyBudget";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  kind: "ingreso" | "egreso";
  category: string;
  defaultDescription?: string;
}

export function AddEntryDialog({ open, onOpenChange, budgetId, kind, category, defaultDescription }: Props) {
  const add = useAddBudgetEntry();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setDescription(defaultDescription ?? "");
  }, [open, defaultDescription]);

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Ingrese un monto válido"); return; }

    setUploading(true);
    try {
      let proofUrl: string | null = null;
      if (proofFile) {
        const ext = proofFile.name.split(".").pop();
        const path = `${budgetId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("budget-receipts")
          .upload(path, proofFile);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("budget-receipts").getPublicUrl(path);
        proofUrl = data.publicUrl;
      }

      await add.mutateAsync({
        budget_id: budgetId,
        kind,
        category,
        description: description.trim() || null,
        amount: val,
        entry_date: entryDate,
        proof_url: proofUrl,
      });
      toast.success("Movimiento registrado");
      setAmount("");
      setDescription("");
      setProofFile(null);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Registrar {kind} — {category}
          </DialogTitle>
          <DialogDescription>
            Agrega un movimiento real para esta categoría.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Monto *</Label>
            <Input
              type="number"
              min="0"
              placeholder="Ej: 500000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              placeholder="Detalle del movimiento"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Soporte (opcional)</Label>
            <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-primary/40 px-4 py-3 hover:bg-primary/5 transition-colors w-full justify-center">
              <Camera className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {proofFile ? proofFile.name : "Adjuntar comprobante"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={uploading || add.isPending}>
            {(uploading || add.isPending) ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <DollarSign className="h-4 w-4 mr-1" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}