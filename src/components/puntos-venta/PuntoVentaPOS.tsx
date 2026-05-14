import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Plus, Minus, Trash2, Search, UserCheck, ImageIcon, Tag } from "lucide-react";
import { CartItem, CONSUMIDOR_FINAL, PosProduct, useRegisterPosSale } from "@/hooks/usePuntosVenta";
import { toast } from "sonner";

type Props = { locationId: string; products: PosProduct[] };

export function PuntoVentaPOS({ locationId, products }: Props) {
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [clientName, setClientName] = useState("");
  const [clientDoc, setClientDoc] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const sale = useRegisterPosSale(locationId);

  const available = useMemo(
    () => products.filter((p) => p.active && Number(p.available) > 0),
    [products]
  );

  const brands = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of available) {
      const b = (p.brand ?? "Sin marca").trim();
      map.set(b, (map.get(b) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [available]);

  const filtered = useMemo(
    () =>
      available
        .filter((p) => !selectedBrand || (p.brand ?? "Sin marca").trim() === selectedBrand)
        .filter(
          (p) =>
            !search ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.brand ?? "").toLowerCase().includes(search.toLowerCase())
        ),
    [available, selectedBrand, search]
  );

  const total = cart.reduce((a, b) => a + Number(b.product.sale_price) * b.quantity, 0);

  const addToCart = (p: PosProduct) => {
    setCart((prev) => {
      const found = prev.find((c) => c.product.id === p.id);
      if (found) {
        if (found.quantity + 1 > Number(p.available)) {
          toast.error("Sin stock suficiente");
          return prev;
        }
        return prev.map((c) =>
          c.product.id === p.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product: p, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.flatMap((c) => {
        if (c.product.id !== id) return [c];
        const newQty = c.quantity + delta;
        if (newQty <= 0) return [];
        if (newQty > Number(c.product.available)) {
          toast.error("Sin stock suficiente");
          return [c];
        }
        return [{ ...c, quantity: newQty }];
      })
    );
  };

  const removeItem = (id: string) =>
    setCart((prev) => prev.filter((c) => c.product.id !== id));

  const handleConfirm = async () => {
    if (cart.length === 0) {
      toast.error("Agrega productos");
      return;
    }
    try {
      await sale.mutateAsync({
        items: cart,
        payment_method: paymentMethod,
        client_name: clientName || undefined,
        client_document: clientDoc || undefined,
        client_email: clientEmail || undefined,
        notes: notes || undefined,
      });
      toast.success(`Venta registrada por $${total.toLocaleString()}`);
      setCart([]);
      setClientName("");
      setClientDoc("");
      setClientEmail("");
      setNotes("");
    } catch (e: any) {
      toast.error(e.message ?? "Error al registrar venta");
    }
  };

  const setConsumidorFinal = () => {
    setClientName(CONSUMIDOR_FINAL.client_name);
    setClientDoc(CONSUMIDOR_FINAL.client_document);
    setClientEmail(CONSUMIDOR_FINAL.client_email);
    toast.success("Datos de Consumidor Final cargados");
  };

  const isSearching = search.trim().length > 0;

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos disponibles</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            {selectedBrand && (
              <Button variant="outline" size="sm" onClick={() => { setSelectedBrand(null); setSearch(""); }}>
                ← Marcas
              </Button>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          {selectedBrand && !isSearching && (
            <Badge variant="outline" className="mt-1 w-fit">{selectedBrand}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay productos disponibles.</p>
          ) : isSearching ? (
            filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay productos que coincidan.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="text-left p-3 rounded-md border hover:border-primary hover:bg-accent transition"
                  >
                    <div className="aspect-square w-full mb-2 rounded bg-muted overflow-hidden flex items-center justify-center">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      )}
                    </div>
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    {p.brand && <p className="text-xs text-muted-foreground truncate">{p.brand}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-sm">${Number(p.sale_price).toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs">{Number(p.available)}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : !selectedBrand ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {brands.map(([brand, count]) => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className="rounded-lg border p-4 text-left transition hover:bg-accent hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm truncate">{brand}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{count} producto{count !== 1 ? "s" : ""}</p>
                </button>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay productos disponibles.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="text-left p-3 rounded-md border hover:border-primary hover:bg-accent transition"
                >
                  <div className="aspect-square w-full mb-2 rounded bg-muted overflow-hidden flex items-center justify-center">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  {p.brand && <p className="text-xs text-muted-foreground truncate">{p.brand}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-sm">${Number(p.sale_price).toLocaleString()}</span>
                    <Badge variant="outline" className="text-xs">{Number(p.available)}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-5 w-5 text-primary" /> Carrito ({cart.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin items</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {cart.map((c) => (
                <div key={c.product.id} className="flex items-center gap-2 p-2 rounded-md border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${Number(c.product.sale_price).toLocaleString()} × {c.quantity}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQty(c.product.id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm w-6 text-center">{c.quantity}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQty(c.product.id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(c.product.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center border-t pt-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold">${total.toLocaleString()}</span>
          </div>

          <div>
            <Label>Cliente (opcional)</Label>
            <div className="flex gap-2">
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
              <Button type="button" size="sm" variant="outline" onClick={setConsumidorFinal} title="Consumidor final">
                <UserCheck className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Cédula / NIT</Label>
              <Input value={clientDoc} onChange={(e) => setClientDoc(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Método de pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="nequi">Nequi</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleConfirm} disabled={sale.isPending || cart.length === 0} className="w-full">
            {sale.isPending ? "Registrando..." : `Cobrar $${total.toLocaleString()}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
