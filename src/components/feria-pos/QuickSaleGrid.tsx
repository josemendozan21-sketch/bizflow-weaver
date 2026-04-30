import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Trash2, ShoppingCart, Check } from "lucide-react";
import type { FeriaInventory, FeriaSale } from "@/hooks/useFerias";
import { useAddFeriaSale } from "@/hooks/useFerias";

interface CartLine {
  inventory_id: string;
  brand: string;
  product_name: string;
  unit_price: number;
  quantity: number;
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
  const add = useAddFeriaSale();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");

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

  const cartTotal = cart.reduce((s, l) => s + l.unit_price * l.quantity, 0);

  const addToCart = (it: FeriaInventory) => {
    const inCart = cart.find((c) => c.inventory_id === it.id)?.quantity || 0;
    if (inCart >= remainingMap[it.id]) return;
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.inventory_id === it.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { inventory_id: it.id, brand: it.brand, product_name: it.product_name, unit_price: it.unit_price, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.inventory_id === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.inventory_id !== id));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    for (const line of cart) {
      await add.mutateAsync({
        feria_id: feriaId,
        brand: line.brand,
        product_name: line.product_name,
        quantity: line.quantity,
        unit_price: line.unit_price,
        total_amount: line.unit_price * line.quantity,
        payment_method: paymentMethod,
        client_name: null,
        notes: null,
      });
    }
    setCart([]);
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
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {inventory.map((it) => {
          const remaining = remainingMap[it.id];
          const disabled = remaining <= 0;
          return (
            <button
              key={it.id}
              disabled={disabled}
              onClick={() => addToCart(it)}
              className={`text-left rounded-lg border bg-card p-3 hover:border-primary transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.98]"}`}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="font-medium text-sm leading-tight">{it.product_name}</p>
                <Badge variant="outline" className="capitalize text-[10px]">{it.brand}</Badge>
              </div>
              <p className="text-lg font-bold mt-2">${it.unit_price.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Disponibles: <span className={remaining === 0 ? "text-destructive" : remaining <= 3 ? "text-amber-600" : ""}>{remaining}</span>
              </p>
            </button>
          );
        })}
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
              <div key={l.inventory_id} className="flex items-center justify-between gap-2 text-sm">
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
            ))}
            <div className="border-t pt-3 mt-3 space-y-2">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${cartTotal.toLocaleString()}</span>
              </div>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="datafono">Datáfono</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={handleCheckout} disabled={add.isPending}>
                <Check className="mr-2 h-4 w-4" /> Cobrar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}