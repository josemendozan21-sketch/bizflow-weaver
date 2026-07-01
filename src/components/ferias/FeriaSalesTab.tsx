import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Minus, DollarSign, ShoppingBag, Package, Search, ShoppingCart, UserCheck } from "lucide-react";
import { useFeriaSales, useAddFeriaSale, useDeleteFeriaSale, useFeriaInventory, type FeriaInventory } from "@/hooks/useFerias";
import { format } from "date-fns";
import { toast } from "sonner";

type CartLine = {
  key: string;
  brand: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  discountPct: number;
};

const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 50] as const;
const CLIENTE_MOSTRADOR = "Cliente de mostrador";
const CONSUMIDOR_FINAL = {
  name: "Consumidor Final",
  document: "222222222222",
  email: "",
  phone: "",
  address: "",
  city: "Bogotá",
};

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function FeriaSalesTab({ feriaId }: { feriaId: string }) {
  const { data: sales = [] } = useFeriaSales(feriaId);
  const { data: inventory = [] } = useFeriaInventory(feriaId);
  const add = useAddFeriaSale();
  const del = useDeleteFeriaSale();

  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [clientName, setClientName] = useState("");
  const [clientDoc, setClientDoc] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const stats = useMemo(() => {
    const total = sales.reduce((s, x) => s + Number(x.total_amount), 0);
    const units = sales.reduce((s, x) => s + x.quantity, 0);
    const byProduct = sales.reduce<Record<string, number>>((acc, s) => {
      acc[s.product_name] = (acc[s.product_name] || 0) + s.quantity;
      return acc;
    }, {});
    const top = Object.entries(byProduct).sort((a, b) => b[1] - a[1])[0];
    return { total, units, count: sales.length, top };
  }, [sales]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory.filter((p) => {
      if (brandFilter !== "all" && p.brand !== brandFilter) return false;
      if (!q) return true;
      return (
        p.product_name.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q)
      );
    });
  }, [inventory, search, brandFilter]);

  const addToCart = (p: FeriaInventory) => {
    setCart((prev) => {
      const key = `${p.brand}::${p.product_name}`;
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) => (c.key === key ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [
        ...prev,
        {
          key,
          brand: p.brand,
          product_name: p.product_name,
          unit_price: Number(p.unit_price) || 0,
          quantity: 1,
          discountPct: 0,
        },
      ];
    });
  };

  const addCustomToCart = () => {
    const q = search.trim();
    if (!q) return;
    const key = `custom::${q}`;
    setCart((prev) => {
      if (prev.find((c) => c.key === key)) return prev;
      return [
        ...prev,
        { key, brand: brandFilter === "all" ? "otro" : brandFilter, product_name: q, unit_price: 0, quantity: 1, discountPct: 0 },
      ];
    });
    setSearch("");
  };

  const updateQty = (key: string, delta: number) =>
    setCart((prev) =>
      prev.flatMap((c) => {
        if (c.key !== key) return [c];
        const q = c.quantity + delta;
        return q <= 0 ? [] : [{ ...c, quantity: q }];
      })
    );

  const updatePrice = (key: string, price: number) =>
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, unit_price: Math.max(0, price) } : c)));

  const setLineDiscount = (key: string, pct: number) =>
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, discountPct: clampPct(pct) } : c)));

  const removeLine = (key: string) => setCart((prev) => prev.filter((c) => c.key !== key));

  const totals = useMemo(() => {
    const bruto = cart.reduce((a, c) => a + c.unit_price * c.quantity, 0);
    const neto = cart.reduce((a, c) => a + Math.round(c.unit_price * (1 - c.discountPct / 100)) * c.quantity, 0);
    return { bruto, neto, descuento: Math.max(0, bruto - neto), units: cart.reduce((a, c) => a + c.quantity, 0) };
  }, [cart]);

  const setConsumidorFinal = () => {
    setClientName(CONSUMIDOR_FINAL.name);
    setClientDoc(CONSUMIDOR_FINAL.document);
    setClientEmail(CONSUMIDOR_FINAL.email);
    setClientPhone(CONSUMIDOR_FINAL.phone);
    setClientAddress(CONSUMIDOR_FINAL.address);
    setClientCity(CONSUMIDOR_FINAL.city);
    toast.success("Datos de Consumidor Final cargados");
  };

  const clearClient = () => {
    setClientName("");
    setClientDoc("");
    setClientEmail("");
    setClientPhone("");
    setClientAddress("");
    setClientCity("");
  };

  const handleConfirm = async () => {
    if (cart.length === 0) {
      toast.error("Agrega productos al carrito");
      return;
    }
    setSubmitting(true);
    try {
      for (const c of cart) {
        const unit = Math.round(c.unit_price * (1 - c.discountPct / 100));
        await add.mutateAsync({
          feria_id: feriaId,
          brand: c.brand,
          product_name: c.product_name,
          quantity: c.quantity,
          unit_price: unit,
          total_amount: unit * c.quantity,
          payment_method: paymentMethod || null,
          client_name: clientName || CLIENTE_MOSTRADOR,
          client_document: clientDoc || null,
          client_email: clientEmail || null,
          client_phone: clientPhone || null,
          client_address: clientAddress || null,
          client_city: clientCity || null,
          notes: c.discountPct > 0 ? `[Desc ${c.discountPct}%] ${notes}`.trim() : (notes || null),
        });
      }
      toast.success(`Venta registrada por ${fmt(totals.neto)}`);
      setCart([]);
      clearClient();
      setNotes("");
    } catch (e: any) {
      toast.error(e.message ?? "Error al registrar venta");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Ingresos</p><p className="text-lg font-semibold">{fmt(stats.total)}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><ShoppingBag className="h-5 w-5 text-blue-600" /><div><p className="text-xs text-muted-foreground">Ventas</p><p className="text-lg font-semibold">{stats.count}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><Package className="h-5 w-5 text-purple-600" /><div><p className="text-xs text-muted-foreground">Unidades</p><p className="text-lg font-semibold">{stats.units}</p></div></div></Card>
        <Card className="p-4"><div><p className="text-xs text-muted-foreground">Más vendido</p><p className="text-sm font-semibold truncate">{stats.top ? `${stats.top[0]} (${stats.top[1]})` : "—"}</p></div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* PRODUCTOS */}
        <Card className="p-4 lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Productos disponibles</h3>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                <SelectItem value="magical">Magical</SelectItem>
                <SelectItem value="sweatspot">Sweatspot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto por nombre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length === 1) {
                  addToCart(filtered[0]);
                  setSearch("");
                }
              }}
              className="pl-9"
            />
          </div>

          {search.trim() && filtered.length === 0 && (
            <Button variant="outline" size="sm" onClick={addCustomToCart}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Agregar "{search.trim()}" como producto libre
            </Button>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[440px] overflow-auto pr-1">
            {filtered.length === 0 ? (
              <p className="col-span-full text-sm text-muted-foreground text-center py-8">
                No hay productos. Escribe uno y agrégalo como libre.
              </p>
            ) : filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                className="text-left p-2 rounded-md border hover:border-primary hover:bg-accent transition"
              >
                <p className="text-sm font-medium leading-tight break-words">{p.product_name}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <Badge variant="outline" className="text-[10px] capitalize">{p.brand}</Badge>
                  <span className="text-xs font-bold">{fmt(Number(p.unit_price))}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* CARRITO */}
        <Card className="p-4 lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Carrito ({cart.length})</h3>
          </div>

          <div className="space-y-2 rounded-md border p-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Datos del cliente</Label>
              <Button variant="outline" size="sm" onClick={setConsumidorFinal} title="Consumidor Final" className="h-7">
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                Consumidor Final
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Nombre / Razón social" value={clientName} onChange={(e) => setClientName(e.target.value)} className="h-8 text-xs" />
              <Input placeholder="Cédula / NIT" value={clientDoc} onChange={(e) => setClientDoc(e.target.value)} className="h-8 text-xs" />
              <Input placeholder="Celular" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="h-8 text-xs" />
              <Input placeholder="Email" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="h-8 text-xs" />
              <Input placeholder="Dirección" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="h-8 text-xs" />
              <Input placeholder="Ciudad" value={clientCity} onChange={(e) => setClientCity(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin items</p>
            ) : cart.map((c) => {
              const lineNet = Math.round(c.unit_price * (1 - c.discountPct / 100)) * c.quantity;
              return (
                <div key={c.key} className="rounded-md border p-2 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight break-words">{c.product_name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{c.brand}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeLine(c.key)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(c.key, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{c.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(c.key, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input
                      type="number"
                      value={c.unit_price || ""}
                      onChange={(e) => updatePrice(c.key, parseFloat(e.target.value) || 0)}
                      placeholder="Precio"
                      className="h-8 text-xs"
                    />
                    <span className="text-sm font-semibold whitespace-nowrap">{fmt(lineNet)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-muted-foreground mr-1">Desc:</span>
                    {DISCOUNT_OPTIONS.map((d) => (
                      <Button
                        key={d}
                        size="sm"
                        variant={c.discountPct === d ? "default" : "outline"}
                        className="h-6 px-2 text-[10px]"
                        onClick={() => setLineDiscount(c.key, d)}
                      >
                        {d}%
                      </Button>
                    ))}
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={c.discountPct || ""}
                      onChange={(e) => setLineDiscount(c.key, parseFloat(e.target.value) || 0)}
                      className="h-6 w-14 text-[10px]"
                      placeholder="%"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span>{totals.units}</span></div>
            {totals.descuento > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Descuento</span><span>-{fmt(totals.descuento)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-1"><span>Total</span><span>{fmt(totals.neto)}</span></div>
          </div>

          <div className="space-y-2">
            <div>
              <Label className="text-xs">Pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="datafono">Datáfono</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button className="w-full" size="lg" disabled={submitting || cart.length === 0} onClick={handleConfirm}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Registrar venta {totals.neto > 0 ? fmt(totals.neto) : ""}
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Sin ventas registradas</TableCell></TableRow>
            ) : sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{format(new Date(s.sale_date), "dd/MM HH:mm")}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{s.brand}</Badge></TableCell>
                <TableCell>{s.product_name}</TableCell>
                <TableCell className="text-right">{s.quantity}</TableCell>
                <TableCell className="text-right font-medium">{fmt(Number(s.total_amount))}</TableCell>
                <TableCell className="capitalize">{s.payment_method || "—"}</TableCell>
                <TableCell>{s.client_name || "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: s.id, feria_id: feriaId })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
