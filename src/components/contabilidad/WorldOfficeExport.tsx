import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getOrderPaidAmount, isOrderFullyPaid } from "@/hooks/useOrders";
import { buildInvoices, invoiceRows, toTsv, bogotaDate, isPendingForWo, type WoOrder, type WoSettings, type WoInvoice } from "@/lib/wo/woExport";
import { canInvoiceOrder } from "@/lib/invoiceRules";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Copy, CheckCircle2, Undo2 } from "lucide-react";
import { toast } from "sonner";

const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
const db = supabase as any;
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/** Carga filas por id en tandas para no exceder el tamaño de la consulta. */
async function byIds(ids: string[], load: (chunk: string[]) => PromiseLike<{ data: any[] | null; error: unknown }>) {
  const out: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await load(ids.slice(i, i + 200));
    if (error) throw error;
    out.push(...(data ?? []));
  }
  return out;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export default function WorldOfficeExport() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const today = bogotaDate(new Date().toISOString());
  const [mode, setMode] = useState<"pendientes" | "dia">("pendientes");
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState("todos");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overrideDraft, setOverrideDraft] = useState<Record<string, string>>({});

  const { data: cfg } = useQuery({
    queryKey: ["wo-config"],
    queryFn: async () => {
      const [s, a, p] = await Promise.all([
        db.from("wo_settings").select("*").eq("id", 1).maybeSingle(),
        db.from("wo_advisor_ids").select("advisor_id, wo_vendor_id"),
        db.from("wo_product_codes").select("app_product, wo_code"),
      ]);
      return {
        settings: s.data as WoSettings,
        vendors: Object.fromEntries((a.data ?? []).map((r: any) => [r.advisor_id, r.wo_vendor_id])) as Record<string, string>,
        products: Object.fromEntries((p.data ?? []).map((r: any) => [r.app_product, r.wo_code])) as Record<string, string>,
      };
    },
  });

  const { data: dayData, isLoading } = useQuery({
    queryKey: ["wo-day", mode, day],
    queryFn: async () => {
      let orders: any[];
      if (mode === "dia") {
        const start = new Date(`${day}T05:00:00Z`).toISOString();
        const end = new Date(new Date(start).getTime() + 86400000).toISOString();
        orders = await fetchAllRows<any>((f, t) => db.from("orders").select("*")
          .gte("created_at", start).lt("created_at", end).neq("production_status", "cancelado")
          .order("created_at").order("id").range(f, t));
      } else {
        orders = await fetchAllRows<any>((f, t) => db.from("orders").select("*")
          .neq("production_status", "cancelado").or("invoice_status.is.null,invoice_status.neq.facturado")
          .order("created_at").order("id").range(f, t));
      }
      const ids = orders.map((o: any) => o.id);
      const [pays, items] = await Promise.all([
        byIds(ids, (c) => db.from("order_payments").select("order_id, method").in("order_id", c)),
        byIds(ids, (c) => db.from("wo_export_items").select("order_id, status").in("order_id", c).neq("status", "devuelto")),
      ]);
      return { orders, pays, exported: new Map<string, string>(items.map((i: any) => [i.order_id, i.status])) };
    },
  });

  const { data: history } = useQuery({
    queryKey: ["wo-history"],
    queryFn: async () => {
      const { data } = await db.from("wo_export_items")
        .select("id, order_id, link_number, status, wo_invoice_number, return_reason, created_at, export_id, wo_exports(created_by_name, sale_date), orders(order_code, client_name, created_at)")
        .order("created_at", { ascending: false }).limit(150);
      return data ?? [];
    },
  });

  const pendingOrders = useMemo(
    () => (dayData ? dayData.orders.filter((o: any) => isPendingForWo(o, dayData.exported)) : []),
    [dayData],
  );
  const monthCounts = useMemo(() => {
    const m = new Map<string, number>();
    pendingOrders.forEach((o: any) => { const k = bogotaDate(o.created_at).slice(0, 7); m.set(k, (m.get(k) ?? 0) + 1); });
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [pendingOrders]);

  const invoices = useMemo<WoInvoice[]>(() => {
    if (!dayData || !cfg?.settings) return [];
    const methods = new Map<string, string[]>();
    dayData.pays.forEach((p: any) => methods.set(p.order_id, [...(methods.get(p.order_id) ?? []), p.method]));
    const list: WoOrder[] = pendingOrders
      .filter((o: any) => mode === "dia" || month === "todos" || bogotaDate(o.created_at).startsWith(month))
      .map((o: any) => ({ ...o, paid_amount: getOrderPaidAmount(o), payment_methods: methods.get(o.id) ?? [] }));
    return buildInvoices(list, cfg.settings, cfg.vendors, cfg.products, today).map((inv) => {
      const blocked: any = inv.orders.find((o: any) => !canInvoiceOrder(o, isOrderFullyPaid(o)));
      if (!blocked) return inv;
      const reason = blocked.sale_type === "menor" ? "Venta detal sin pago completo" : "Falta el documento (RUT) del cliente";
      return { ...inv, missing: [...new Set([...inv.missing, reason])] };
    });
  }, [dayData, cfg, pendingOrders, mode, month, today]);

  const alreadyExported = dayData ? dayData.orders.filter((o: any) => dayData.exported.has(o.id)).length : 0;
  const invoicedOutside = dayData && mode === "dia"
    ? dayData.orders.filter((o: any) => o.invoice_status === "facturado" && !dayData.exported.has(o.id)).length : 0;
  const ready = invoices.filter((i) => i.missing.length === 0);
  const chosen = ready.filter((i) => selected.has(i.key));

  const refresh = () => { qc.invalidateQueries({ queryKey: ["wo-day"] }); qc.invalidateQueries({ queryKey: ["wo-history"] }); qc.invalidateQueries({ queryKey: ["wo-config"] }); };

  async function saveOverride(product: string) {
    const code = overrideDraft[product]?.trim();
    if (!code) return;
    const { error } = await db.from("wo_product_codes").upsert({ app_product: product, wo_code: code, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success("Código guardado"); refresh();
  }

  async function registerExport(invs: WoInvoice[]) {
    const { data: exp, error } = await db.from("wo_exports").insert({
      sale_date: mode === "dia" ? day : today, order_count: invs.reduce((s, i) => s + i.orders.length, 0),
      created_by: user?.id, created_by_name: user?.email,
    }).select("id").single();
    if (error) throw error;
    const rows = invs.flatMap((i) => i.orders.map((o) => ({ export_id: exp.id, order_id: o.id, link_number: i.link })));
    const { error: e2 } = await db.from("wo_export_items").insert(rows);
    if (e2) { await db.from("wo_exports").delete().eq("id", exp.id); throw new Error("Alguna venta ya fue exportada. Recarga la lista."); }
  }

  async function handleDownload() {
    if (!chosen.length || !cfg) return;
    try {
      const buf = await (await fetch("/templates/wo-factura-venta.xlsx")).arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const { headers, items, payments } = invoiceRows(chosen, cfg.settings);
      const fill = (name: string, rows: unknown[][]) => {
        const ws = wb.getWorksheet(name)!;
        for (let r = ws.rowCount; r >= 2; r--) ws.spliceRows(r, 1);
        rows.forEach((row, idx) => {
          const xr = ws.getRow(idx + 2);
          row.forEach((v, c) => {
            const cell = xr.getCell(c + 1);
            cell.value = (v ?? null) as any;
            if (v instanceof Date) cell.numFmt = "dd/mm/yyyy;@";
          });
          xr.commit();
        });
      };
      fill("Encabezados", headers);
      fill("Movimientos de Inventarios", items);
      fill("Detalles del Pago", payments);
      const out = await wb.xlsx.writeBuffer();
      await registerExport(chosen);
      downloadBlob(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `WO_FacturasVenta_${mode === "dia" ? day : `pendientes_${today}`}.xlsx`);
      toast.success(`${chosen.length} facturas exportadas. Confírmalas cuando WO las acepte.`);
      setSelected(new Set()); refresh();
    } catch (e: any) { toast.error(e.message ?? "No se pudo exportar"); }
  }

  async function copySheet(kind: "headers" | "items" | "payments") {
    if (!chosen.length || !cfg) return;
    const rows = invoiceRows(chosen, cfg.settings)[kind];
    await navigator.clipboard.writeText(toTsv(rows));
    toast.success("Filas copiadas. Pégalas en la fila 2 de la hoja correspondiente.");
  }

  async function registerCopied() {
    try { await registerExport(chosen); toast.success("Marcadas como exportadas"); setSelected(new Set()); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function setStatus(id: string, orderId: string, status: "confirmado" | "devuelto") {
    const patch: any = { status, updated_by_name: user?.email, updated_at: new Date().toISOString() };
    if (status === "confirmado") patch.wo_invoice_number = window.prompt("Número de factura en WO (opcional)") || null;
    else {
      const reason = window.prompt("Motivo para devolver a pendiente (obligatorio)");
      if (!reason) return;
      patch.return_reason = reason;
    }
    const { error } = await db.from("wo_export_items").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    if (status === "confirmado") {
      // Al cargar en WO la venta queda facturada y sale de «Pendientes por facturar».
      const { error: e2 } = await db.from("orders").update({
        invoice_status: "facturado", invoice_date: today,
        ...(patch.wo_invoice_number ? { invoice_number: patch.wo_invoice_number } : {}),
      }).eq("id", orderId);
      if (e2) toast.error(`Cargue confirmado, pero no se pudo marcar la venta como facturada: ${e2.message}`);
    }
    refresh();
  }

  const missingProducts = [...new Set(invoices.flatMap((i) => i.orders.map((o) => o.product ?? "")).filter((p) =>
    invoices.some((i) => i.missing.includes(`Código WO del producto "${p}"`))))];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Exportar ventas a World Office</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={mode} onValueChange={(v) => { setMode(v as "pendientes" | "dia"); setSelected(new Set()); }}>
            <TabsList>
              <TabsTrigger value="pendientes">Pendientes por facturar</TabsTrigger>
              <TabsTrigger value="dia">Por día de venta</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-end gap-3">
            {mode === "dia" ? (
              <div><Label>Día de venta</Label><Input type="date" value={day} onChange={(e) => { setDay(e.target.value); setSelected(new Set()); }} className="w-44" /></div>
            ) : (
              <div>
                <Label>Mes de la venta</Label>
                <Select value={month} onValueChange={(v) => { setMonth(v); setSelected(new Set()); }}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los meses ({pendingOrders.length})</SelectItem>
                    {monthCounts.map(([m, n]) => <SelectItem key={m} value={m}>{monthLabel(m)} ({n})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Badge variant="secondary">{ready.length} listas</Badge>
            <Badge variant="destructive">{invoices.length - ready.length} incompletas</Badge>
            {mode === "dia" && <Badge variant="outline">{alreadyExported} ya exportadas</Badge>}
            {mode === "dia" && invoicedOutside > 0 && <Badge variant="outline">{invoicedOutside} ya facturadas en WO</Badge>}
          </div>
          {mode === "pendientes" && (
            <p className="text-xs text-muted-foreground">
              Ventas sin factura y sin exportar, de la más antigua a la más reciente. Las que ya se facturaron a mano en WO o ya se exportaron no aparecen. Las facturas salen con la fecha de hoy ({today}).
            </p>
          )}
          {cfg?.settings && (
            <p className="text-xs text-muted-foreground">
              Empresa {cfg.settings.empresa} · Prefijo {cfg.settings.prefijo} · Bodega {cfg.settings.bodega} · Saldo a "{cfg.settings.credito_name}" · Transferencias a {cfg.settings.transfer_payment_name} · Efectivo a {cfg.settings.cash_payment_name}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleDownload} disabled={!chosen.length}><Download className="h-4 w-4 mr-1" />Descargar plantilla WO ({chosen.length})</Button>
            <Button size="sm" variant="outline" onClick={() => copySheet("headers")} disabled={!chosen.length}><Copy className="h-4 w-4 mr-1" />Copiar Encabezados</Button>
            <Button size="sm" variant="outline" onClick={() => copySheet("items")} disabled={!chosen.length}><Copy className="h-4 w-4 mr-1" />Copiar Movimientos</Button>
            <Button size="sm" variant="outline" onClick={() => copySheet("payments")} disabled={!chosen.length}><Copy className="h-4 w-4 mr-1" />Copiar Pagos</Button>
            <Button size="sm" variant="ghost" onClick={registerCopied} disabled={!chosen.length}>Marcar copiadas como exportadas</Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-8"><Checkbox checked={ready.length > 0 && chosen.length === ready.length} onCheckedChange={(v) => setSelected(v ? new Set(ready.map((i) => i.key)) : new Set())} /></TableHead>
                <TableHead>Pedido</TableHead><TableHead>Fecha venta</TableHead><TableHead>Cliente</TableHead><TableHead>Total factura</TableHead>
                <TableHead>Pagado</TableHead><TableHead>Saldo (CxC)</TableHead><TableHead>Forma</TableHead><TableHead>Vence</TableHead><TableHead>Estado</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={10}>Cargando…</TableCell></TableRow>}
                {!isLoading && invoices.length === 0 && <TableRow><TableCell colSpan={10} className="text-muted-foreground">{mode === "dia" ? "No hay ventas pendientes para este día." : "No hay ventas pendientes por facturar."}</TableCell></TableRow>}
                {invoices.map((i) => (
                  <TableRow key={i.key}>
                    <TableCell><Checkbox disabled={i.missing.length > 0} checked={selected.has(i.key)} onCheckedChange={(v) => { const n = new Set(selected); v ? n.add(i.key) : n.delete(i.key); setSelected(n); }} /></TableCell>
                    <TableCell className="whitespace-nowrap">{i.orders.map((o) => o.order_code).join(", ")}</TableCell>
                    <TableCell className="whitespace-nowrap">{bogotaDate(i.orders[0].created_at)}</TableCell>
                    <TableCell>{i.orders[0].client_name}<div className="text-xs text-muted-foreground">{i.clientId}</div></TableCell>
                    <TableCell>{money(i.total)}</TableCell>
                    <TableCell>{money(i.paid)}</TableCell>
                    <TableCell>{money(i.total - i.paid)}</TableCell>
                    <TableCell>{i.headerPayment}</TableCell>
                    <TableCell className="whitespace-nowrap">{i.dueDate ?? "—"}</TableCell>
                    <TableCell className="min-w-[220px]">
                      {i.missing.length === 0 ? <Badge variant="secondary">Lista</Badge> : (
                        <ul className="text-xs text-destructive list-disc pl-4">{i.missing.map((m) => <li key={m}>{m}</li>)}</ul>
                      )}
                      {i.warnings.map((w) => <div key={w} className="text-xs text-muted-foreground">{w}</div>)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {missingProducts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Productos sin código WO</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {missingProducts.map((p) => (
              <div key={p} className="flex flex-wrap items-center gap-2">
                <span className="text-sm min-w-[200px]">{p}</span>
                <Input className="w-56" placeholder="Código en WO (ej. MW-Muela)" value={overrideDraft[p] ?? ""} onChange={(e) => setOverrideDraft({ ...overrideDraft, [p]: e.target.value })} />
                <Button size="sm" variant="outline" onClick={() => saveOverride(p)}>Guardar</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Historial de exportaciones</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Exportado</TableHead><TableHead>Pedido</TableHead><TableHead>Día venta</TableHead><TableHead>Por</TableHead><TableHead>Estado</TableHead><TableHead>Factura WO</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {(history ?? []).map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="whitespace-nowrap">{new Date(h.created_at).toLocaleString("es-CO")}</TableCell>
                  <TableCell>{h.orders?.order_code} <span className="text-xs text-muted-foreground">{h.orders?.client_name}</span></TableCell>
                  <TableCell>{h.orders?.created_at ? bogotaDate(h.orders.created_at) : h.wo_exports?.sale_date}</TableCell>
                  <TableCell className="text-xs">{h.wo_exports?.created_by_name}</TableCell>
                  <TableCell>
                    <Badge variant={h.status === "confirmado" ? "secondary" : h.status === "devuelto" ? "destructive" : "outline"}>
                      {h.status === "exportado" ? "Por confirmar" : h.status === "confirmado" ? "Contabilizada" : "Devuelta"}
                    </Badge>
                    {h.return_reason && <div className="text-xs text-muted-foreground">{h.return_reason}</div>}
                  </TableCell>
                  <TableCell>{h.wo_invoice_number ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {h.status === "exportado" && (<>
                      <Button size="sm" variant="ghost" onClick={() => setStatus(h.id, h.order_id, "confirmado")}><CheckCircle2 className="h-4 w-4 mr-1" />Confirmar cargue</Button>
                      <Button size="sm" variant="ghost" onClick={() => setStatus(h.id, h.order_id, "devuelto")}><Undo2 className="h-4 w-4 mr-1" />Devolver</Button>
                    </>)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
