import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft, PackageCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import DebouncedSearchInput from "@/components/inventory/DebouncedSearchInput";

interface StockRow {
  id: string;
  name: string;
  brand: string;
  category: string;
  available: number;
  unit: string;
}

interface TransferRow {
  id: string;
  item_name: string;
  brand: string;
  quantity: number;
  status: string;
  created_at: string;
  location_id: string;
  created_by_name: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente de recibir",
  despachado: "Despachado",
  recibido: "Recibido",
  cancelado: "Cancelado",
};

/**
 * Asignaciones de Bodega hacia un punto de venta.
 * El descuento de Bodega y la entrada al punto se hacen de forma atómica
 * al confirmar la recepción (RPC receive_pos_transfer).
 */
export default function BodegaTransfersPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const [stockItemId, setStockItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ["pos_locations_min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pos_locations").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const { data: stock = [] } = useQuery({
    queryKey: ["stock_items_for_transfer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_items")
        .select("id,name,brand,category,available,unit")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as StockRow[];
    },
  });

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["pos_central_transfers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_central_transfers")
        .select("id,item_name,brand,quantity,status,created_at,location_id,created_by_name")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as TransferRow[];
    },
  });

  const stockOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = q
      ? stock.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.brand ?? "").toLowerCase().includes(q) ||
            (s.category ?? "").toLowerCase().includes(q),
        )
      : stock;
    return pool.slice(0, 60);
  }, [stock, search]);

  const selected = stock.find((s) => s.id === stockItemId);

  const createTransfer = async () => {
    const qty = Number(quantity);
    if (!locationId || !stockItemId || !qty || qty <= 0) {
      toast({ title: "Faltan datos", description: "Elige punto, referencia y cantidad.", variant: "destructive" });
      return;
    }
    if (selected && qty > Number(selected.available)) {
      toast({
        title: "Sin stock suficiente",
        description: `Bodega tiene ${selected.available} unidades de "${selected.name}".`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("pos_central_transfers").insert({
      location_id: locationId,
      stock_item_id: stockItemId,
      item_name: selected?.name ?? "",
      brand: selected?.brand ?? "",
      quantity: qty,
      status: "pendiente",
      created_by: auth.user?.id ?? null,
    } as never);
    setSaving(false);
    if (error) {
      toast({ title: "No se pudo crear la asignación", description: error.message, variant: "destructive" });
      return;
    }
    setQuantity("");
    setStockItemId("");
    qc.invalidateQueries({ queryKey: ["pos_central_transfers"] });
    toast({ title: "Asignación creada", description: "Queda pendiente de recibir en el punto." });
  };

  const receive = async (id: string) => {
    const { data, error } = await supabase.rpc("receive_pos_transfer", { _transfer_id: id });
    if (error) {
      toast({ title: "Error al recibir", description: error.message, variant: "destructive" });
      return;
    }
    const res = (data ?? {}) as { success?: boolean; message?: string };
    if (!res.success) {
      toast({ title: "No se pudo recibir", description: res.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["pos_central_transfers"] });
    qc.invalidateQueries({ queryKey: ["stock_items_for_transfer"] });
    qc.invalidateQueries({ queryKey: ["warehouse_punto92_products"] });
    toast({ title: "Recibido", description: "Se descontó de Bodega y se sumó al punto." });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Asignar mercancía de Bodega a un punto</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Punto</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger><SelectValue placeholder="Elegir punto" /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Referencia de Bodega</Label>
            <DebouncedSearchInput value={search} onChange={setSearch} placeholder="Buscar referencia…" />
            <Select value={stockItemId} onValueChange={setStockItemId}>
              <SelectTrigger><SelectValue placeholder="Elegir referencia" /></SelectTrigger>
              <SelectContent>
                {stockOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.brand} · {s.available} disp.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Cantidad</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <Button size="sm" onClick={createTransfer} disabled={saving}>
          {saving ? "Guardando…" : "Crear asignación"}
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Asignaciones</h3>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando…</p>
        ) : (
          <div className="max-h-[480px] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Punto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                      Sin asignaciones
                    </TableCell>
                  </TableRow>
                ) : transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{t.item_name} <span className="text-muted-foreground">· {t.brand}</span></TableCell>
                    <TableCell className="text-xs">{locations.find((l) => l.id === t.location_id)?.name ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs font-medium">{Number(t.quantity).toLocaleString("es-CO")}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === "recibido" ? "secondary" : "outline"} className="text-[10px]">
                        {STATUS_LABEL[t.status] ?? t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.status === "pendiente" || t.status === "despachado" ? (
                        <Button size="sm" variant="outline" onClick={() => receive(t.id)}>
                          Confirmar recepción
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
