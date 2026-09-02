import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PackageCheck } from "lucide-react";
import { useFeriaShipments, useCreateFeriaShipment, type FeriaShipment } from "@/hooks/useFeriaShipments";
import { useFeriaSales } from "@/hooks/useFerias";

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function FeriaReturnPanel({ feriaId, canManage }: { feriaId: string; canManage: boolean }) {
  const { data: shipments = [] } = useFeriaShipments(feriaId);
  const { data: sales = [] } = useFeriaSales(feriaId);
  const create = useCreateFeriaShipment();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);

  const confirmedEntrada = shipments.find((s) => s.direction === "entrada" && s.status === "confirmada");

  const soldByProduct = useMemo(() => {
    return sales.reduce<Record<string, number>>((acc, s: any) => {
      const k = norm(String(s.product_name ?? ""));
      acc[k] = (acc[k] || 0) + Number(s.quantity || 0);
      return acc;
    }, {});
  }, [sales]);

  // Consolidado de todas las salidas confirmadas (sin importar salida 1, 2, 3…)
  const rows = useMemo(() => {
    const map = new Map<string, { key: string; item_name: string; brand: string; logo: string | null; stock_item_id: string | null; sent: number }>();
    shipments
      .filter((s: FeriaShipment) => s.direction === "salida" && s.status === "confirmada")
      .forEach((s) => s.items.forEach((it) => {
        const key = `${it.brand}|${norm(it.item_name)}`;
        const prev = map.get(key);
        if (prev) prev.sent += it.quantity;
        else map.set(key, {
          key,
          item_name: it.item_name,
          brand: it.brand,
          logo: it.logo,
          stock_item_id: it.stock_item_id,
          sent: it.quantity,
        });
      }));
    return Array.from(map.values()).map((r) => {
      const sold = soldByProduct[norm(r.item_name)] || 0;
      const suggested = Math.max(r.sent - sold, 0);
      return { ...r, sold, suggested };
    }).sort((a, b) => a.item_name.localeCompare(b.item_name, "es"));
  }, [shipments, soldByProduct]);

  const value = (key: string, suggested: number) => (touched && qty[key] !== undefined ? qty[key] : suggested);

  const totals = useMemo(() => {
    const ret = rows.reduce((a, r) => a + value(r.key, r.suggested), 0);
    return {
      sent: rows.reduce((a, r) => a + r.sent, 0),
      sold: rows.reduce((a, r) => a + r.sold, 0),
      returned: ret,
    };
  }, [rows, qty, touched]);

  const missing = Math.max(totals.sent - totals.sold - totals.returned, 0);

  const submit = async () => {
    const items = rows
      .map((r) => ({
        stock_item_id: r.stock_item_id,
        item_name: r.item_name,
        brand: r.brand,
        logo: r.logo,
        quantity: value(r.key, r.suggested),
      }))
      .filter((i) => i.quantity > 0);
    await create.mutateAsync({ feria_id: feriaId, direction: "entrada", notes: notes || null, items });
    setQty({});
    setTouched(false);
    setNotes("");
  };

  if (confirmedEntrada) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-emerald-600" />
          <h3 className="font-semibold">Entrada de retorno</h3>
          <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-400">Confirmada</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(confirmedEntrada.confirmed_at).toLocaleString("es-CO")} · {confirmedEntrada.confirmed_by_name ?? "—"}
        </p>
        <div className="rounded-md border overflow-auto max-h-72">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Retornado</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {confirmedEntrada.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="text-xs">{it.item_name}</TableCell>
                  <TableCell className="text-right text-xs">{it.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <PackageCheck className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Entrada de retorno</h3>
        <Badge variant="outline" className="text-[10px]">Una sola entrada por feria</Badge>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Aún no hay salidas confirmadas para retornar.</p>
      ) : (
        <>
          <div className="rounded-md border overflow-auto max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">Enviado</TableHead>
                  <TableHead className="text-right">Vendido</TableHead>
                  <TableHead className="text-right">Retorna</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell className="text-xs">{r.item_name}</TableCell>
                    <TableCell className="text-xs capitalize">{r.brand}</TableCell>
                    <TableCell className="text-right text-xs">{r.sent}</TableCell>
                    <TableCell className="text-right text-xs">{r.sold}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        max={r.sent}
                        disabled={!canManage}
                        className="w-24 h-8 ml-auto"
                        value={value(r.key, r.suggested)}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(Number(e.target.value) || 0, r.sent));
                          setTouched(true);
                          setQty((prev) => ({ ...prev, [r.key]: v }));
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Enviado: <b className="text-foreground">{totals.sent}</b></span>
            <span>Vendido: <b className="text-foreground">{totals.sold}</b></span>
            <span>Retorna: <b className="text-foreground">{totals.returned}</b></span>
            <span>Faltante: <b className={missing > 0 ? "text-destructive" : "text-foreground"}>{missing}</b></span>
          </div>

          {canManage && (
            <>
              <Textarea rows={2} placeholder="Notas del retorno (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={submit} disabled={create.isPending || totals.returned === 0}>
                  {create.isPending ? "Confirmando…" : "Confirmar entrada y sumar a bodega"}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}
