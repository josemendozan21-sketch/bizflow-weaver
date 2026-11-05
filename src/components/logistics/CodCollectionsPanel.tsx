import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { getOrderBalance, type Order } from "@/hooks/useOrders";
import { Upload, CheckCircle2, XCircle, Download } from "lucide-react";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const norm = (s: unknown) => String(s ?? "").replace(/\s|-/g, "").toUpperCase();

type Mode = { received: boolean } | null;

export default function CodCollectionsPanel({ orders, canEdit }: { orders: Order[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const [carrier, setCarrier] = useState("todas");
  const [status, setStatus] = useState<"pendiente" | "cobrado" | "no_cobrado">("pendiente");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const cod = useMemo(
    () => orders.filter((o) => o.payment_method === "contra_entrega" && ["despachado", "entregado"].includes(o.production_status)),
    [orders],
  );
  const codStatus = (o: Order) => {
    const s = (o as any).cod_confirmation as string | null;
    return s === "cobrado" || s === "no_cobrado" ? s : "pendiente";
  };
  const carriers = useMemo(() => Array.from(new Set(cod.map((o) => o.transportadora).filter(Boolean))) as string[], [cod]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return cod
      .filter((o) => codStatus(o) === status)
      .filter((o) => carrier === "todas" || o.transportadora === carrier)
      .filter((o) => {
        const d = (o.dispatched_at || o.created_at || "").slice(0, 10);
        return (!from || d >= from) && (!to || d <= to);
      })
      .filter((o) => !s || `${o.order_code || ""} ${o.client_name} ${o.numero_guia || ""}`.toLowerCase().includes(s))
      .sort((a, b) => (a.dispatched_at || "").localeCompare(b.dispatched_at || ""));
  }, [cod, status, carrier, from, to, q]);

  const pendingTotal = cod.filter((o) => codStatus(o) === "pendiente").reduce((s, o) => s + getOrderBalance(o), 0);
  const selRows = rows.filter((o) => sel.has(o.id));
  const selTotal = selRows.reduce((s, o) => s + getOrderBalance(o), 0);

  const toggle = (id: string) => {
    const n = new Set(sel);
    n.has(id) ? n.delete(id) : n.add(id);
    setSel(n);
  };

  const importGuides = async (f: File) => {
    const wb = XLSX.read(await f.arrayBuffer());
    const guides = new Set<string>();
    wb.SheetNames.forEach((sn) => {
      const data = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1 });
      data.forEach((r) => (r || []).forEach((c) => { const v = norm(c); if (v.length >= 5) guides.add(v); }));
    });
    const matched = rows.filter((o) => o.numero_guia && guides.has(norm(o.numero_guia)));
    setSel(new Set(matched.map((o) => o.id)));
    toast.success(`${matched.length} pedido(s) encontrados por N° de guía en la liquidación`);
  };

  const exportList = () => {
    const data = rows.map((o) => ({
      Transportadora: o.transportadora || "", "N° Guía": o.numero_guia || "", Pedido: o.order_code || "",
      Cliente: o.client_name, "Fecha despacho": (o.dispatched_at || "").slice(0, 10), "Valor a cobrar": getOrderBalance(o),
      "Estado (cobrado / devuelto)": "", "Fecha cobro": "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contraentrega");
    XLSX.writeFile(wb, `contraentrega_${status}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const submit = async () => {
    if (!mode) return;
    if (!mode.received && !note.trim()) return toast.error("Escribe el motivo");
    setBusy(true);
    try {
      let proofUrl: string | null = null;
      if (file) {
        const path = `cod/${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("payment-proofs").upload(path, file);
        if (error) throw error;
        proofUrl = path;
      }
      const { data, error } = await (supabase as any).rpc("register_cod_collection", {
        _order_ids: selRows.map((o) => o.id), _received: mode.received, _payment_date: date,
        _reason: note.trim() || null, _proof_url: proofUrl,
      });
      if (error) throw error;
      toast.success(mode.received ? `${data.updated} pedido(s) quedaron pagados (${fmt(data.amount)})` : `${data.updated} pedido(s) marcados como no cobrados`);
      setMode(null); setNote(""); setFile(null); setSel(new Set());
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error("No se pudo guardar", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Cobros contraentrega</CardTitle>
          <Badge variant="secondary">Por confirmar: {cod.filter((o) => codStatus(o) === "pendiente").length} · {fmt(pendingTotal)}</Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Select value={status} onValueChange={(v: any) => { setStatus(v); setSel(new Set()); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Por confirmar</SelectItem>
              <SelectItem value="cobrado">Cobrados</SelectItem>
              <SelectItem value="no_cobrado">No cobrados / devueltos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={carrier} onValueChange={setCarrier}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las transportadoras</SelectItem>
              {carriers.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Despachado desde" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Despachado hasta" />
          <Input className="col-span-2" placeholder="Buscar cliente, pedido o guía" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportList}><Download className="h-4 w-4 mr-1" />Descargar lista</Button>
          {canEdit && status === "pendiente" && (
            <>
              <Button size="sm" variant="outline" asChild>
                <label className="cursor-pointer"><Upload className="h-4 w-4 mr-1" />Seleccionar desde liquidación (Excel)
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importGuides(f); e.target.value = ""; }} />
                </label>
              </Button>
              <Button size="sm" disabled={!selRows.length} onClick={() => setMode({ received: true })}>
                <CheckCircle2 className="h-4 w-4 mr-1" />Registrar cobro ({selRows.length} · {fmt(selTotal)})
              </Button>
              <Button size="sm" variant="destructive" disabled={!selRows.length} onClick={() => setMode({ received: false })}>
                <XCircle className="h-4 w-4 mr-1" />No cobrado / devuelto
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {canEdit && status === "pendiente" && (
                  <TableHead className="w-8">
                    <Checkbox checked={rows.length > 0 && selRows.length === rows.length} onCheckedChange={(c) => setSel(c ? new Set(rows.map((o) => o.id)) : new Set())} />
                  </TableHead>
                )}
                <TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Transportadora</TableHead>
                <TableHead>Guía</TableHead><TableHead>Despacho</TableHead><TableHead className="text-right">Valor a cobrar</TableHead>
                {status !== "pendiente" && <TableHead>Registro</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Sin pedidos</TableCell></TableRow>}
              {rows.map((o) => (
                <TableRow key={o.id}>
                  {canEdit && status === "pendiente" && <TableCell><Checkbox checked={sel.has(o.id)} onCheckedChange={() => toggle(o.id)} /></TableCell>}
                  <TableCell><OrderCodeBadge code={o.order_code} compact /></TableCell>
                  <TableCell className="whitespace-nowrap">{o.client_name}</TableCell>
                  <TableCell>{o.transportadora || "—"}</TableCell>
                  <TableCell>{o.numero_guia || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{(o.dispatched_at || "").slice(0, 10) || "—"}</TableCell>
                  <TableCell className="text-right">{status === "cobrado" ? fmt(o.total_amount || 0) : fmt(getOrderBalance(o))}</TableCell>
                  {status !== "pendiente" && (
                    <TableCell className="text-xs text-muted-foreground">
                      {(o as any).cod_confirmed_by_name || "—"} · {((o as any).cod_confirmed_at || "").slice(0, 10)}
                      {(o as any).cod_reason ? ` · ${(o as any).cod_reason}` : ""}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!mode} onOpenChange={(v) => !v && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode?.received ? `Registrar cobro de ${selRows.length} pedido(s) · ${fmt(selTotal)}` : `Marcar ${selRows.length} pedido(s) como no cobrados`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {mode?.received && (
              <div><Label>Fecha del cobro / liquidación</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            )}
            <div><Label>{mode?.received ? "Nota (opcional, ej. N° de liquidación)" : "Motivo (obligatorio)"}</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <div><Label>Soporte (liquidación o extracto)</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
            <Button className="w-full" disabled={busy} onClick={submit}>{busy ? "Guardando…" : "Confirmar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
