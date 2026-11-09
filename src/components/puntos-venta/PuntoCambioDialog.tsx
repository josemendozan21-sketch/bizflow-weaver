import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PosSale, usePosProducts } from "@/hooks/usePuntosVenta";
import { exchangeSummary, returnableQty } from "@/lib/posExchange";

type Item = { pos_product_id: string | null; product_name: string; quantity: number; unit_price: number };
type Props = { sale: PosSale | null; locationId: string; items: Item[]; onClose: () => void };

const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

export function PuntoCambioDialog({ sale, locationId, items, onClose }: Props) {
  const qc = useQueryClient();
  const { data: products = [] } = usePosProducts(sale ? locationId : null);
  const [ret, setRet] = useState<Record<string, number>>({});
  const [newItems, setNewItems] = useState<{ id: string; quantity: number; unit_price: number }[]>([]);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("efectivo");
  const [settlement, setSettlement] = useState<"saldo_favor" | "devolucion">("saldo_favor");
  const [notes, setNotes] = useState("");

  // Units already returned in earlier exchanges of this sale
  const { data: prevReturned = {} } = useQuery({
    queryKey: ["pos_exchange_prev", sale?.id],
    enabled: !!sale,
    queryFn: async () => {
      const { data: ex } = await supabase.from("pos_sale_exchanges").select("exchange_sale_id").eq("original_sale_id", sale!.id);
      const ids = (ex ?? []).map((e) => e.exchange_sale_id);
      if (!ids.length) return {} as Record<string, number>;
      const { data: its } = await supabase.from("pos_sale_items").select("pos_product_id, quantity").in("sale_id", ids).lt("quantity", 0);
      const m: Record<string, number> = {};
      for (const i of its ?? []) if (i.pos_product_id) m[i.pos_product_id] = (m[i.pos_product_id] ?? 0) - Number(i.quantity);
      return m;
    },
  });

  const original = useMemo(() => {
    const m: Record<string, Item & { sold: number }> = {};
    for (const it of items) {
      if (!it.pos_product_id || Number(it.quantity) <= 0) continue;
      const cur = m[it.pos_product_id];
      m[it.pos_product_id] = { ...it, sold: (cur?.sold ?? 0) + Number(it.quantity) };
    }
    return Object.values(m);
  }, [items]);

  const summary = exchangeSummary(
    original.filter((o) => ret[o.pos_product_id!] > 0).map((o) => ({ quantity: ret[o.pos_product_id!], unit_price: Number(o.unit_price) })),
    newItems,
  );

  const matches = search.trim().length < 2 ? [] : products
    .filter((p) => (p as any).active !== false && p.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);

  const reset = () => { setRet({}); setNewItems([]); setSearch(""); setNotes(""); setMethod("efectivo"); setSettlement("saldo_favor"); };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        original_sale_id: sale!.id,
        returned: Object.entries(ret).filter(([, q]) => q > 0).map(([pos_product_id, quantity]) => ({ pos_product_id, quantity })),
        new_items: newItems.map((n) => ({ pos_product_id: n.id, quantity: n.quantity, unit_price: n.unit_price })),
        payment_method: method,
        settlement,
        notes,
      };
      const { data, error } = await (supabase.rpc as any)("register_pos_exchange", { _payload: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Cambio registrado. Descarga la factura del cambio en la venta de hoy.");
      qc.invalidateQueries({ queryKey: ["pos_products", locationId] });
      qc.invalidateQueries({ queryKey: ["pos_sales", locationId] });
      qc.invalidateQueries({ queryKey: ["pos_movements", locationId] });
      qc.invalidateQueries({ queryKey: ["pos_sale_exchanges", locationId] });
      reset();
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo registrar el cambio"),
  });

  const canSave = Object.values(ret).some((q) => q > 0) && !save.isPending;

  return (
    <Dialog open={!!sale} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cambio de prendas · {sale?.client_name || "Consumidor final"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">1. ¿Qué devuelve el cliente?</Label>
            <div className="mt-2 space-y-2">
              {original.map((o) => {
                const max = returnableQty(o.sold, prevReturned[o.pos_product_id!] ?? 0);
                return (
                  <div key={o.pos_product_id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 min-w-0 truncate">{o.product_name} <span className="text-muted-foreground">({money(o.unit_price)} c/u · puede devolver {max})</span></span>
                    <Input type="number" min={0} max={max} className="w-20" value={ret[o.pos_product_id!] ?? 0}
                      disabled={max === 0}
                      onChange={(e) => setRet({ ...ret, [o.pos_product_id!]: Math.min(max, Math.max(0, Number(e.target.value) || 0)) })} />
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold">2. ¿Qué se lleva?</Label>
            <Input className="mt-2" placeholder="Buscar producto…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {matches.length > 0 && (
              <div className="mt-1 border rounded-md divide-y">
                {matches.map((p) => (
                  <button key={p.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => {
                      setNewItems((cur) => cur.some((c) => c.id === p.id)
                        ? cur.map((c) => c.id === p.id ? { ...c, quantity: c.quantity + 1 } : c)
                        : [...cur, { id: p.id, quantity: 1, unit_price: Number(p.sale_price) }]);
                      setSearch("");
                    }}>
                    {p.name} · {money(p.sale_price)} <span className="text-muted-foreground">({p.available} disp.)</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 space-y-2">
              {newItems.map((n) => {
                const p = products.find((x) => x.id === n.id);
                return (
                  <div key={n.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 min-w-0 truncate">{p?.name}</span>
                    <Input type="number" min={1} className="w-16" value={n.quantity}
                      onChange={(e) => setNewItems(newItems.map((c) => c.id === n.id ? { ...c, quantity: Math.max(1, Number(e.target.value) || 1) } : c))} />
                    <Input type="number" min={0} className="w-28" value={n.unit_price} title="Precio c/u"
                      onChange={(e) => setNewItems(newItems.map((c) => c.id === n.id ? { ...c, unit_price: Math.max(0, Number(e.target.value) || 0) } : c))} />
                    <Button size="sm" variant="ghost" onClick={() => setNewItems(newItems.filter((c) => c.id !== n.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Devuelve</span><span>{money(summary.returnedValue)}</span></div>
            <div className="flex justify-between"><span>Se lleva</span><span>{money(summary.newValue)}</span></div>
            <div className="flex justify-between font-semibold">
              <span>{summary.kind === "cobro" ? "Cliente paga" : summary.kind === "a_favor" ? "A favor del cliente" : "Diferencia"}</span>
              <span>{money(Math.abs(summary.difference))}</span>
            </div>
          </div>

          {summary.kind === "a_favor" && (
            <div>
              <Label>¿Qué se hace con el valor a favor?</Label>
              <Select value={settlement} onValueChange={(v) => setSettlement(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="saldo_favor">Queda como saldo a favor del cliente</SelectItem>
                  <SelectItem value="devolucion">Se le devuelve el dinero</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {(summary.kind === "cobro" || (summary.kind === "a_favor" && settlement === "devolucion")) && (
            <div>
              <Label>{summary.kind === "cobro" ? "Medio de pago de la diferencia" : "Cómo se devuelve el dinero"}</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta / Datáfono</SelectItem>
                  <SelectItem value="nequi">Nequi</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Motivo / nota</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: cambio de talla" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!canSave}>
            {save.isPending ? "Registrando…" : "Registrar cambio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
