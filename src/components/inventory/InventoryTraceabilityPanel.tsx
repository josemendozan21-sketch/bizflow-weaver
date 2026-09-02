import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Route, Download, ArrowDownToLine, ArrowUpFromLine, Boxes } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/hooks/useInventory";
import { matchesQuery } from "@/lib/search";

interface TraceMovement {
  id: string;
  recorded_at: string;
  quantity: number;
  movement_kind: string | null;
  direction: string;
  area: string;
  purpose: string | null;
  reason: string | null;
  supplier: string | null;
  requested_by_name: string | null;
  recorded_by_name: string | null;
  order_id: string | null;
  feria_id: string | null;
}

const AREA_LABEL: Record<string, string> = {
  produccion: "Producción",
  estampacion: "Estampación",
  logistica: "Logística",
  asesor_comercial: "Asesor comercial",
  feria: "Feria",
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthsAgoISO = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};

export default function InventoryTraceabilityPanel() {
  const { stockItems } = useInventory();
  const [itemSearch, setItemSearch] = useState("");
  const [stockItemId, setStockItemId] = useState("");
  const [from, setFrom] = useState(monthsAgoISO(3));
  const [to, setTo] = useState(todayISO());
  const [movements, setMovements] = useState<TraceMovement[]>([]);
  const [orders, setOrders] = useState<Record<string, { code: string; client: string; advisor: string }>>({});
  const [ferias, setFerias] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const filteredItems = useMemo(
    () =>
      stockItems
        .filter((s) => matchesQuery([s.name, s.brand, (s as any).product_type, (s as any).color], itemSearch))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 200),
    [stockItems, itemSearch],
  );

  const selected = stockItems.find((s) => s.id === stockItemId) || null;

  useEffect(() => {
    if (!stockItemId) {
      setMovements([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventory_movements")
        .select(
          "id, recorded_at, quantity, movement_kind, direction, area, purpose, reason, supplier, requested_by_name, recorded_by_name, order_id, feria_id",
        )
        .eq("stock_item_id", stockItemId)
        .gte("recorded_at", `${from}T00:00:00`)
        .lte("recorded_at", `${to}T23:59:59`)
        .order("recorded_at", { ascending: true })
        .limit(2000);

      if (cancelled) return;
      if (error) {
        toast.error(`No se pudo cargar la trazabilidad: ${error.message}`);
        setLoading(false);
        return;
      }
      const rows = (data || []) as unknown as TraceMovement[];
      setMovements(rows);

      const orderIds = Array.from(new Set(rows.map((r) => r.order_id).filter(Boolean))) as string[];
      const feriaIds = Array.from(new Set(rows.map((r) => r.feria_id).filter(Boolean))) as string[];

      if (orderIds.length) {
        const { data: ords } = await supabase
          .from("orders")
          .select("id, order_code, client_name, advisor_name")
          .in("id", orderIds);
        if (!cancelled) {
          const map: Record<string, { code: string; client: string; advisor: string }> = {};
          (ords || []).forEach((o: any) => {
            map[o.id] = { code: o.order_code || "—", client: o.client_name || "—", advisor: o.advisor_name || "—" };
          });
          setOrders(map);
        }
      } else setOrders({});

      if (feriaIds.length) {
        const { data: fs } = await supabase.from("ferias").select("id, name").in("id", feriaIds);
        if (!cancelled) {
          const map: Record<string, string> = {};
          (fs || []).forEach((f: any) => { map[f.id] = f.name; });
          setFerias(map);
        }
      } else setFerias({});

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [stockItemId, from, to]);

  const kindOf = (m: TraceMovement) =>
    m.movement_kind || (m.direction === "retorno" ? "entrada" : "salida");
  const isEntry = (m: TraceMovement) => ["entrada", "liberar_reserva"].includes(kindOf(m));

  const totals = useMemo(() => {
    let entradas = 0;
    let salidas = 0;
    movements.forEach((m) => {
      if (isEntry(m)) entradas += Number(m.quantity);
      else salidas += Number(m.quantity);
    });
    return { entradas, salidas };
  }, [movements]);

  const destinationOf = (m: TraceMovement) => {
    if (m.order_id && orders[m.order_id]) {
      const o = orders[m.order_id];
      return { group: `Pedido ${o.code}`, detail: `${o.client} · ${o.advisor}` };
    }
    if (m.feria_id) return { group: `Feria ${ferias[m.feria_id] || ""}`.trim(), detail: "" };
    if (m.supplier) return { group: `Proveedor ${m.supplier}`, detail: "" };
    const area = AREA_LABEL[m.area] || m.area;
    const who = m.requested_by_name || "";
    if (isEntry(m)) return { group: "Entradas a bodega", detail: m.purpose || m.reason || "" };
    if (who && who !== area) return { group: who, detail: m.purpose || m.reason || "" };
    return { group: area || "Sin destino registrado", detail: m.purpose || m.reason || "" };
  };

  const breakdown = useMemo(() => {
    const map = new Map<string, { group: string; detail: string; units: number; count: number }>();
    movements.filter((m) => !isEntry(m)).forEach((m) => {
      const d = destinationOf(m);
      const prev = map.get(d.group);
      if (prev) {
        prev.units += Number(m.quantity);
        prev.count += 1;
      } else {
        map.set(d.group, { group: d.group, detail: d.detail, units: Number(m.quantity), count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.units - a.units);
  }, [movements, orders, ferias]);

  const timeline = useMemo(() => {
    let running = 0;
    return movements.map((m) => {
      running += isEntry(m) ? Number(m.quantity) : -Number(m.quantity);
      return { ...m, running, dest: destinationOf(m) };
    }).reverse();
  }, [movements, orders, ferias]);

  const exportExcel = () => {
    if (!selected || movements.length === 0) return toast.error("Nada que exportar");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        breakdown.map((b) => ({ Destino: b.group, Detalle: b.detail, Movimientos: b.count, Unidades: b.units })),
      ),
      "Resumen destinos",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        timeline.map((m) => ({
          Fecha: new Date(m.recorded_at).toLocaleString("es-CO"),
          Tipo: isEntry(m) ? "Entrada" : "Salida",
          Cantidad: Number(m.quantity),
          Destino: m.dest.group,
          Detalle: m.dest.detail,
          Registró: m.recorded_by_name || "",
          "Saldo acumulado": m.running,
        })),
      ),
      "Línea de tiempo",
    );
    XLSX.writeFile(wb, `trazabilidad_${selected.name.replace(/\s+/g, "_")}_${from}_${to}.xlsx`);
    toast.success("Excel descargado");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Route className="h-5 w-5 text-primary" /> Trazabilidad de inventario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Elige una referencia y un rango de fechas para ver qué entró, a dónde salió y cuánto queda.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label>Referencia / ítem</Label>
              <Input
                placeholder="Buscar referencia..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="mb-2"
              />
              <Select value={stockItemId} onValueChange={setStockItemId}>
                <SelectTrigger><SelectValue placeholder="Selecciona el ítem a rastrear" /></SelectTrigger>
                <SelectContent>
                  {filteredItems.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Sin resultados</div>
                  )}
                  {filteredItems.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.name} · {it.brand}
                      {(it as any).product_type ? ` · ${(it as any).product_type}` : ""} · disp. {it.available}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="trace-from">Desde</Label>
              <Input id="trace-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="trace-to">Hasta</Label>
              <Input id="trace-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => { setFrom(monthsAgoISO(1)); setTo(todayISO()); }}>Último mes</Button>
            <Button variant="outline" size="sm" onClick={() => { setFrom(monthsAgoISO(3)); setTo(todayISO()); }}>3 meses</Button>
            <Button variant="outline" size="sm" onClick={() => { setFrom(monthsAgoISO(12)); setTo(todayISO()); }}>Último año</Button>
            <Button variant="outline" size="sm" onClick={() => { setFrom("2024-01-01"); setTo(todayISO()); }}>Todo</Button>
            <Button size="sm" className="ml-auto" onClick={exportExcel} disabled={!selected || movements.length === 0}>
              <Download className="mr-1 h-4 w-4" /> Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {!selected && (
        <p className="py-8 text-center text-sm text-muted-foreground">Selecciona una referencia para ver su historia.</p>
      )}

      {selected && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <ArrowDownToLine className="h-6 w-6 text-emerald-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Entraron en el rango</p>
                  <p className="text-xl font-bold">{totals.entradas.toLocaleString("es-CO")}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <ArrowUpFromLine className="h-6 w-6 text-orange-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Salieron en el rango</p>
                  <p className="text-xl font-bold">{totals.salidas.toLocaleString("es-CO")}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Boxes className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Disponible hoy</p>
                  <p className="text-xl font-bold">{Number(selected.available).toLocaleString("es-CO")}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">¿A dónde fueron las salidas?</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Destino</TableHead>
                      <TableHead>Detalle</TableHead>
                      <TableHead className="text-right">Movs.</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdown.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Sin salidas en el rango</TableCell></TableRow>
                    )}
                    {breakdown.map((b) => (
                      <TableRow key={b.group}>
                        <TableCell className="font-medium">{b.group}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.detail || "—"}</TableCell>
                        <TableCell className="text-right">{b.count}</TableCell>
                        <TableCell className="text-right font-semibold">{b.units.toLocaleString("es-CO")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Línea de tiempo</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead>Destino / origen</TableHead>
                      <TableHead>Registró</TableHead>
                      <TableHead className="text-right">Saldo acum.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
                    )}
                    {!loading && timeline.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Sin movimientos en el rango</TableCell></TableRow>
                    )}
                    {timeline.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(m.recorded_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={isEntry(m)
                            ? "border-emerald-500/60 text-emerald-700 dark:text-emerald-400"
                            : "border-orange-500/60 text-orange-700 dark:text-orange-400"}>
                            {isEntry(m) ? "Entrada" : "Salida"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{Number(m.quantity).toLocaleString("es-CO")}</TableCell>
                        <TableCell>
                          <span className="font-medium">{m.dest.group}</span>
                          {m.dest.detail && <span className="block text-xs text-muted-foreground">{m.dest.detail}</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.recorded_by_name || "—"}</TableCell>
                        <TableCell className="text-right text-sm">{m.running.toLocaleString("es-CO")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
