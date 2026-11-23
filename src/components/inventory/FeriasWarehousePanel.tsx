import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tent, Truck, Ban } from "lucide-react";
import { useFerias, useFeriaInventory, useFeriaSales } from "@/hooks/useFerias";
import { useFeriaShipments, useVoidFeriaShipment } from "@/hooks/useFeriaShipments";
import FeriaShipmentDialog from "@/components/inventory/FeriaShipmentDialog";
import FeriaReturnPanel from "@/components/inventory/FeriaReturnPanel";
import DebouncedSearchInput from "@/components/inventory/DebouncedSearchInput";
import { useAuth } from "@/contexts/AuthContext";
import { feriaStockRow } from "@/lib/feriaStock";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

export default function FeriasWarehousePanel() {
  const { data: ferias = [] } = useFerias();
  const { role } = useAuth();
  const canManage = role === "admin" || role === "inventarios";
  const [feriaId, setFeriaId] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!feriaId && ferias.length > 0) setFeriaId(ferias[0].id);
  }, [ferias, feriaId]);

  const feria = ferias.find((f) => f.id === feriaId);
  const { data: inventory = [] } = useFeriaInventory(feriaId || null);
  const { data: sales = [] } = useFeriaSales(feriaId || null);
  const { data: shipments = [] } = useFeriaShipments(feriaId || null);
  const voidShipment = useVoidFeriaShipment();

  const salidas = shipments.filter((s) => s.direction === "salida");

  const soldByProduct = useMemo(() => {
    return sales.reduce<Record<string, number>>((acc, s: any) => {
      const key = String(s.product_name ?? "").trim().toLowerCase();
      acc[key] = (acc[key] || 0) + Number(s.quantity || 0);
      return acc;
    }, {});
  }, [sales]);

  // Solo cuenta lo que salió con una salida real; lo asignado/planeado no suma.
  const allRows = useMemo(() => {
    return inventory.map((p: any) => {
      const sold = soldByProduct[String(p.product_name).trim().toLowerCase()] || 0;
      return {
        id: p.id,
        name: p.product_name,
        brand: p.brand,
        ...feriaStockRow(p, sold),
        unit_price: Number(p.unit_price || 0),
      };
    });
  }, [inventory, soldByProduct]);

  const plannedOnly = allRows.filter((r) => !r.hasMovement).length;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) =>
      r.hasMovement &&
      (!q ||
        String(r.name).toLowerCase().includes(q) ||
        String(r.brand ?? "").toLowerCase().includes(q)),
    );
  }, [allRows, search]);

  const totals = useMemo(() => ({
    sent: rows.reduce((a, r) => a + r.sent, 0),
    sold: rows.reduce((a, r) => a + r.sold, 0),
    returned: rows.reduce((a, r) => a + r.returned, 0),
    available: rows.reduce((a, r) => a + r.available, 0),
    value: rows.reduce((a, r) => a + r.available * r.unit_price, 0),
  }), [rows]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Tent className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Bodega de ferias</h3>
          <Select value={feriaId} onValueChange={setFeriaId}>
            <SelectTrigger className="w-64 h-9 ml-auto"><SelectValue placeholder="Selecciona una feria" /></SelectTrigger>
            <SelectContent>
              {ferias.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && feriaId && <FeriaShipmentDialog feriaId={feriaId} feriaName={feria?.name} />}
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Enviado</p><p className="text-lg font-semibold">{totals.sent.toLocaleString("es-CO")}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Vendido</p><p className="text-lg font-semibold">{totals.sold.toLocaleString("es-CO")}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Retornado</p><p className="text-lg font-semibold">{totals.returned.toLocaleString("es-CO")}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Disponible</p><p className="text-lg font-semibold">{totals.available.toLocaleString("es-CO")}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Valor disponible</p><p className="text-lg font-semibold">{fmt(totals.value)}</p></Card>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Salidas</h3>
          <Badge variant="outline" className="text-[10px]">{salidas.filter((s) => s.status === "confirmada").length} confirmadas</Badge>
        </div>
        {salidas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Aún no se han registrado salidas para esta feria.</p>
        ) : (
          <div className="space-y-2">
            {salidas.map((s) => (
              <div key={s.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">Salida {s.shipment_number}</span>
                  <Badge variant="outline" className={`text-[10px] ${s.status === "anulada" ? "text-destructive border-destructive/40" : ""}`}>
                    {s.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.confirmed_at).toLocaleString("es-CO")} · {s.confirmed_by_name ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {s.items.reduce((a, i) => a + i.quantity, 0)} uds · {s.items.length} refs
                  </span>
                  {canManage && s.status === "confirmada" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={voidShipment.isPending}
                      onClick={() => {
                        if (confirm(`¿Anular la Salida ${s.shipment_number}? El stock volverá a bodega.`)) voidShipment.mutate(s);
                      }}
                    >
                      <Ban className="h-4 w-4 mr-1 text-destructive" /> Anular
                    </Button>
                  )}
                </div>
                {s.items.length > 0 && (
                  <ul className="mt-2 grid sm:grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                    {s.items.map((it) => (
                      <li key={it.id} className="flex justify-between gap-2">
                        <span className="truncate">{it.item_name}</span>
                        <span className="font-medium text-foreground">{it.quantity}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {s.notes && <p className="mt-2 text-xs italic text-muted-foreground">{s.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {feriaId && <FeriaReturnPanel feriaId={feriaId} canManage={canManage} />}

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tent className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Inventario en feria</h3>
        </div>

        <p className="text-xs text-muted-foreground">
          Solo se muestra lo que salió con una salida confirmada.
          {plannedOnly > 0 && ` ${plannedOnly} referencias asignadas sin salida no se cuentan.`}
        </p>

        <DebouncedSearchInput value={search} onChange={setSearch} placeholder="Buscar producto…" />

        <div className="max-h-[560px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead className="text-right">Enviado</TableHead>
                <TableHead className="text-right">Vendido</TableHead>
                <TableHead className="text-right">Retornado</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                    Aún no hay mercancía enviada a esta feria
                  </TableCell>
                </TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.name}</TableCell>
                  <TableCell className="text-xs capitalize">{r.brand}</TableCell>
                  <TableCell className="text-right text-xs">{r.sent}</TableCell>
                  <TableCell className="text-right text-xs">{r.sold}</TableCell>
                  <TableCell className="text-right text-xs">{r.returned}</TableCell>
                  <TableCell className="text-right text-xs font-medium">{r.available}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
