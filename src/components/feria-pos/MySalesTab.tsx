import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Package, CloudOff, AlertTriangle, Check as CheckIcon, Pencil } from "lucide-react";
import { format } from "date-fns";
import type { FeriaSale } from "@/hooks/useFerias";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFeriaOfflineStore, pendingSalesForFeria } from "@/stores/feriaOfflineStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function MySalesTab({ feriaId, sales }: { feriaId: string; sales: FeriaSale[] }) {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FeriaSale | null>(null);
  const [form, setForm] = useState({
    client_name: "", client_document: "", client_phone: "", client_email: "",
    product_name: "", quantity: 1, unit_price: 0,
    payment_method: "efectivo", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      client_name: s.client_name ?? "",
      client_document: s.client_document ?? "",
      client_phone: s.client_phone ?? "",
      client_email: s.client_email ?? "",
      product_name: s.product_name ?? "",
      quantity: Number(s.quantity ?? 1),
      unit_price: Number(s.unit_price ?? 0),
      payment_method: s.payment_method ?? "efectivo",
      notes: s.notes ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const total_amount = Number(form.quantity) * Number(form.unit_price);
      const { error } = await supabase.from("feria_sales").update({
        ...form,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
        total_amount,
      }).eq("id", editing.id);
      if (error) throw error;
      toast.success("Venta actualizada");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["my_feria_sales"] });
      qc.invalidateQueries({ queryKey: ["feria_sales"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const pendingAll = useFeriaOfflineStore((s) => s.pendingSales);
  const myPending = pendingSalesForFeria(feriaId, pendingAll).filter(
    (p) => isAdmin || (p.recorded_by || null) === (user?.id || null)
  );

  // Need recorded_by to filter; sales hook returns all so we re-fetch with filter
  const { data: mySales = [] } = useQuery({
    queryKey: ["my_feria_sales", feriaId, user?.id, isAdmin],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from("feria_sales")
        .select("*")
        .eq("feria_id", feriaId)
        .order("sale_date", { ascending: false });
      if (!isAdmin) query = query.eq("recorded_by", user.id);
      const { data, error } = await query;
      if (error) throw error;
      return data as FeriaSale[];
    },
    enabled: !!user?.id && !!feriaId,
  });

  const stats = useMemo(() => {
    const notSynced = myPending.filter((p) => p.status !== "synced");
    const total = mySales.reduce((s, x) => s + Number(x.total_amount), 0)
      + notSynced.reduce((s, x) => s + Number(x.total_amount), 0);
    const units = mySales.reduce((s, x) => s + x.quantity, 0)
      + notSynced.reduce((s, x) => s + x.quantity, 0);
    return { total, units, count: mySales.length + notSynced.length };
  }, [mySales, myPending]);

  // Merge pending (not-yet-synced) + remote, newest first
  const rows = useMemo(() => {
    const pendingRows = myPending
      .filter((p) => p.status !== "synced")
      .map((p) => ({
        id: p.localId,
        sale_date: p.sale_date,
        brand: p.brand,
        product_name: p.product_name,
        quantity: p.quantity,
        total_amount: p.total_amount,
        payment_method: p.payment_method,
        client_name: p.client_name,
        notes: p.notes,
        _pending: p.status,
        _oversold: false,
      }));
    const remoteRows = mySales.map((s) => ({
      ...s,
      _pending: null as string | null,
      _oversold: (s.notes || "").includes("[SOBREVENTA]"),
    }));
    return [...pendingRows, ...remoteRows].sort((a, b) =>
      new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
    );
  }, [mySales, myPending]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          <div><p className="text-xs text-muted-foreground">Mis ingresos</p><p className="text-lg font-semibold">${stats.total.toLocaleString()}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Package className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Unidades</p><p className="text-lg font-semibold">{stats.units}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div><p className="text-xs text-muted-foreground">Ventas</p><p className="text-lg font-semibold">{stats.count}</p></div>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Cliente</TableHead>
              {isAdmin && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-6">Aún no has registrado ventas</TableCell></TableRow>
            ) : rows.map((s) => (
              <TableRow key={s.id} className={s._pending ? "bg-amber-50/40" : ""}>
                <TableCell>{format(new Date(s.sale_date), "dd/MM HH:mm")}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-[10px]">{s.brand}</Badge>
                    {s.product_name}
                    {s._pending === "pending" && (
                      <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-50 text-[10px]">
                        <CloudOff className="h-3 w-3" /> Pendiente
                      </Badge>
                    )}
                    {s._pending === "syncing" && (
                      <Badge variant="outline" className="gap-1 text-blue-700 border-blue-300 bg-blue-50 text-[10px]">
                        <CheckIcon className="h-3 w-3" /> Subiendo
                      </Badge>
                    )}
                    {s._pending === "error" && (
                      <Badge variant="outline" className="gap-1 text-red-700 border-red-300 bg-red-50 text-[10px]">
                        Error — reintentando
                      </Badge>
                    )}
                    {s._oversold && (
                      <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-50 text-[10px]">
                        <AlertTriangle className="h-3 w-3" /> Sobreventa
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{s.quantity}</TableCell>
                <TableCell className="text-right font-medium">${Number(s.total_amount).toLocaleString()}</TableCell>
                <TableCell className="capitalize">{s.payment_method || "—"}</TableCell>
                <TableCell>{s.client_name || "—"}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    {!s._pending && (
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)} title="Editar venta">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar venta</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Producto</Label>
              <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cantidad</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Precio unitario</Label>
                <Input type="number" min={0} value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })} />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">${(form.quantity * form.unit_price).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cliente</Label>
                <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
              </div>
              <div>
                <Label>Documento</Label>
                <Input value={form.client_document} onChange={(e) => setForm({ ...form, client_document: e.target.value })} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Método de pago</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="nequi">Nequi</SelectItem>
                  <SelectItem value="bancolombia">Bancolombia</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}