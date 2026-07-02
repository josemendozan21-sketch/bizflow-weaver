import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Trash2, ShoppingCart, Check, UserCheck } from "lucide-react";
import type { FeriaInventory, FeriaSale } from "@/hooks/useFerias";
import { useFeriaOfflineStore } from "@/stores/feriaOfflineStore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import DebouncedSearchInput from "@/components/inventory/DebouncedSearchInput";
import { Textarea } from "@/components/ui/textarea";

interface CartLine {
  inventory_id: string;
  brand: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  discount_pct: number;
}

export function QuickSaleGrid({
  feriaId,
  inventory,
  sales,
}: {
  feriaId: string;
  inventory: FeriaInventory[];
  sales: FeriaSale[];
}) {
  const enqueue = useFeriaOfflineStore((s) => s.enqueue);
  const { user } = useAuth();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [discount, setDiscount] = useState("");
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientDoc, setClientDoc] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [gift, setGift] = useState<string>("");
  const [giftQty, setGiftQty] = useState<number>(1);
  const [comments, setComments] = useState("");
  const giftOptions = ["Gafas", "Pocket térmico", "Handy", "Pocket frío"];

  const remainingMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of inventory) {
      const sold = sales
        .filter((s) => s.brand === it.brand && s.product_name === it.product_name)
        .reduce((a, b) => a + b.quantity, 0);
      map[it.id] = it.quantity_dispatched - sold;
    }
    return map;
  }, [inventory, sales]);

  const lineSubtotal = (l: CartLine) => l.unit_price * l.quantity;
  const lineNet = (l: CartLine) => lineSubtotal(l) * (1 - (l.discount_pct || 0) / 100);
  const cartSubtotal = cart.reduce((s, l) => s + lineSubtotal(l), 0);
  const cartLineDiscount = cart.reduce((s, l) => s + (lineSubtotal(l) - lineNet(l)), 0);
  const cartTotal = cart.reduce((s, l) => s + lineNet(l), 0);
  const manualDiscount = Math.max(0, parseFloat(discount) || 0);
  const pctDiscount = Math.round((cartTotal * discountPct) / 100);
  const discountValue = Math.max(0, manualDiscount + pctDiscount);
  const finalTotal = Math.max(0, cartTotal - discountValue);

  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter(
      (it) =>
        it.product_name.toLowerCase().includes(q) ||
        it.brand.toLowerCase().includes(q),
    );
  }, [inventory, search]);

  const fillConsumidorFinal = () => {
    setClientName("Consumidor Final");
    setClientDoc("222222222222");
    setClientEmail("consumidorfinal@gmail.com");
    setClientPhone("3111111111");
    setClientAddress("Calle 168 #21-63");
  };

  const addToCart = (it: FeriaInventory) => {
    // Allow oversell — will be flagged on sync
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.inventory_id === it.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { inventory_id: it.id, brand: it.brand, product_name: it.product_name, unit_price: it.unit_price, quantity: 1, discount_pct: 0 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.inventory_id === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const updateLineDiscount = (id: string, pct: number) => {
    setCart((prev) => prev.map((l) => (l.inventory_id === id ? { ...l, discount_pct: pct } : l)));
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.inventory_id !== id));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const noteParts: string[] = [];
    if (clientEmail) noteParts.push(`Email: ${clientEmail}`);
    if (clientDoc) noteParts.push(`Doc: ${clientDoc}`);
    if (clientPhone) noteParts.push(`Cel: ${clientPhone}`);
    if (clientAddress) noteParts.push(`Dir: ${clientAddress}`);
    if (gift) noteParts.push(`Obsequio: ${gift}${giftQty > 1 ? ` x${giftQty}` : ""}`);
    if (cartLineDiscount > 0) noteParts.push(`Desc x producto: $${Math.round(cartLineDiscount).toLocaleString()}`);
    if (discountValue > 0) noteParts.push(`Desc total: $${discountValue.toLocaleString()}`);
    if (comments.trim()) noteParts.push(`Comentario: ${comments.trim()}`);
    const baseNote = noteParts.join(" | ") || null;
    for (const line of cart) {
      // Aplica descuento por producto y distribuye descuento global proporcionalmente
      const lineNetAmount = lineNet(line);
      const globalShare = cartTotal > 0 ? (discountValue * lineNetAmount) / cartTotal : 0;
      const lineTotal = Math.max(0, lineNetAmount - globalShare);
      enqueue({
        feria_id: feriaId,
        brand: line.brand,
        product_name: line.product_name,
        quantity: line.quantity,
        unit_price: line.unit_price,
        total_amount: lineTotal,
        payment_method: paymentMethod,
        client_name: clientName || null,
        notes: baseNote,
        recorded_by: user?.id || null,
      });
    }
    toast.success(navigator.onLine ? "Venta registrada" : "Venta guardada offline — se subirá cuando vuelva internet");
    setCart([]);
    setDiscount("");
    setDiscountPct(0);
    setClientName("");
    setClientEmail("");
    setClientDoc("");
    setClientPhone("");
    setClientAddress("");
    setGift("");
    setGiftQty(1);
    setComments("");
  };

  if (inventory.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        No hay productos despachados aún por logística.
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <DebouncedSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar producto o marca..."
        />
        {filteredInventory.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin resultados.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filteredInventory.map((it) => {
          const remaining = remainingMap[it.id];
          const disabled = remaining <= 0;
          return (
            <button
              key={it.id}
              onClick={() => addToCart(it)}
              className={`text-left rounded-lg border bg-card p-3 hover:border-primary transition-colors active:scale-[0.98] ${disabled ? "border-amber-400" : ""}`}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="font-medium text-sm leading-tight">{it.product_name}</p>
                <Badge variant="outline" className="capitalize text-[10px]">{it.brand}</Badge>
              </div>
              <p className="text-lg font-bold mt-2">${it.unit_price.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Disponibles: <span className={remaining <= 0 ? "text-amber-700 font-semibold" : remaining <= 3 ? "text-amber-600" : ""}>{remaining < 0 ? `${remaining} (sobreventa)` : remaining}</span>
              </p>
            </button>
          );
        })}
        </div>
      </div>

      <Card className="p-4 lg:sticky lg:top-4 self-start">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="h-4 w-4" />
          <h3 className="font-semibold">Carrito</h3>
          {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
        </div>
        {cart.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Toca un producto para agregarlo</p>
        ) : (
          <div className="space-y-2">
            {cart.map((l) => (
              <div key={l.inventory_id} className="border rounded-md p-2 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{l.product_name}</p>
                    <p className="text-xs text-muted-foreground">${l.unit_price.toLocaleString()} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.inventory_id, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-6 text-center font-medium">{l.quantity}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(l.inventory_id, 1)}><Plus className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLine(l.inventory_id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-muted-foreground mr-1">Desc:</span>
                  {[0, 5, 10, 15, 20, 50].map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={(l.discount_pct || 0) === p ? "default" : "outline"}
                      className="h-6 px-1.5 text-[10px]"
                      onClick={() => updateLineDiscount(l.inventory_id, p)}
                    >
                      {p === 0 ? "0" : `${p}%`}
                    </Button>
                  ))}
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={l.discount_pct || ""}
                    placeholder="%"
                    onChange={(e) => updateLineDiscount(l.inventory_id, Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="h-6 w-14 text-[11px] px-1"
                  />
                  {(l.discount_pct || 0) > 0 && (
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      = ${Math.round(lineNet(l)).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="border-t pt-3 mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${Math.round(cartSubtotal).toLocaleString()}</span>
              </div>
              {cartLineDiscount > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Descuento por producto</span>
                  <span>− ${Math.round(cartLineDiscount).toLocaleString()}</span>
                </div>
              )}
              <div>
                <Label className="text-xs">Descuento global rápido</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {[0, 5, 10, 15, 20, 50].map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={discountPct === p ? "default" : "outline"}
                      className="h-7 px-2 text-xs"
                      onClick={() => setDiscountPct(p)}
                    >
                      {p === 0 ? "Sin desc." : `${p}%`}
                    </Button>
                  ))}
                </div>
                {discountPct > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    -${pctDiscount.toLocaleString()} ({discountPct}%)
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Descuento ($)</Label>
                <Input type="number" min={0} value={discount} placeholder="0"
                  onChange={(e) => setDiscount(e.target.value)} className="h-8" />
              </div>
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>${finalTotal.toLocaleString()}</span>
              </div>
              <Button type="button" variant="secondary" size="sm" className="w-full" onClick={fillConsumidorFinal}>
                <UserCheck className="mr-2 h-3 w-3" /> Consumidor Final
              </Button>
              <div>
                <Label className="text-xs">Nombre cliente</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Cédula / NIT</Label>
                <Input value={clientDoc} onChange={(e) => setClientDoc(e.target.value)} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Celular</Label>
                <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Dirección</Label>
                <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Obsequio</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={gift === "" ? "default" : "outline"}
                    className="h-7 px-2 text-xs"
                    onClick={() => { setGift(""); setGiftQty(1); }}
                  >
                    Sin obsequio
                  </Button>
                  {giftOptions.map((g) => (
                    <Button
                      key={g}
                      type="button"
                      size="sm"
                      variant={gift === g ? "default" : "outline"}
                      className="h-7 px-2 text-xs"
                      onClick={() => setGift(g)}
                    >
                      {g}
                    </Button>
                  ))}
                </div>
                {gift && (
                  <div className="flex items-center gap-2 mt-2">
                    <Label className="text-xs whitespace-nowrap">Unidades:</Label>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setGiftQty((q) => Math.max(1, q - 1))}><Minus className="h-3 w-3" /></Button>
                      <span className="w-6 text-center text-sm font-medium">{giftQty}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setGiftQty((q) => q + 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs">Comentarios de la factura</Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Observaciones para esta venta..."
                  className="min-h-[60px] text-sm"
                />
              </div>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="nequi">Nequi</SelectItem>
                  <SelectItem value="bancolombia">Bancolombia</SelectItem>
                  <SelectItem value="davivienda">Davivienda</SelectItem>
                  <SelectItem value="link_pago">Link de pago</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={handleCheckout}>
                <Check className="mr-2 h-4 w-4" /> Cobrar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}