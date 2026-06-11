import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Plus, Minus, Trash2, Search, UserCheck, ImageIcon, Tag, Camera, X } from "lucide-react";
import { Loader2 } from "lucide-react";
import { CartItem, CONSUMIDOR_FINAL, PosProduct, useRegisterPosSale, uploadPosSaleProof, useUpsertPosProduct, uploadPosProductPhoto, thumbUrl } from "@/hooks/usePuntosVenta";
import { toast } from "sonner";

type Props = { locationId: string; products: PosProduct[] };
const NUTRITION_BRAND = "Sweatspot Nutrición";

export function PuntoVentaPOS({ locationId, products }: Props) {
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [clientName, setClientName] = useState("");
  const [clientDoc, setClientDoc] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [merchFile, setMerchFile] = useState<File | null>(null);
  const [uploadingMerch, setUploadingMerch] = useState(false);
  const sale = useRegisterPosSale(locationId);
  const upsertProduct = useUpsertPosProduct(locationId);
  const photoInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);

  const handleProductPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    product: PosProduct
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingPhotoId(product.id);
    try {
      const url = await uploadPosProductPhoto(file, locationId);
      await upsertProduct.mutateAsync({
        id: product.id,
        name: product.name,
        brand: product.brand,
        supplier: product.supplier,
        category: product.category,
        sale_price: product.sale_price,
        min_stock: product.min_stock,
        unit: product.unit,
        photo_url: url,
        active: product.active,
        notes: product.notes,
      });
      toast.success("Foto cargada");
    } catch (err: any) {
      toast.error(err.message ?? "Error al subir foto");
    } finally {
      setUploadingPhotoId(null);
    }
  };

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
        .filter((p) => !selectedSupplier || ((p.supplier ?? "Sin proveedor").trim() || "Sin proveedor") === selectedSupplier)
        .filter(
          (p) =>
            !search ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.brand ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (p.supplier ?? "").toLowerCase().includes(search.toLowerCase())
        ),
    [available, selectedBrand, selectedSupplier, search]
  );

  const isNutritionSelected = selectedBrand === NUTRITION_BRAND;

  const nutritionSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, PosProduct[]>();
    for (const p of available) {
      if ((p.brand ?? "Sin marca").trim() !== NUTRITION_BRAND) continue;
      const supplier = (p.supplier ?? "Sin proveedor").trim() || "Sin proveedor";
      if (q && !supplier.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) continue;
      if (!map.has(supplier)) map.set(supplier, []);
      map.get(supplier)?.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [available, search]);

  const total = cart.reduce((a, b) => a + Number(b.product.sale_price) * b.quantity, 0);
  const totalUnits = cart.reduce((a, b) => a + b.quantity, 0);
  // Precios incluyen IVA 19% — desglosamos base e IVA
  const ivaRate = 0.19;
  const base = total / (1 + ivaRate);
  const iva = total - base;
  const fmt = (n: number) =>
    `$${Math.round(n).toLocaleString("es-CO")}`;

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
      let payment_proof_url: string | null = null;
      if (proofFile) {
        setUploadingProof(true);
        try {
          payment_proof_url = await uploadPosSaleProof(proofFile, locationId);
        } finally {
          setUploadingProof(false);
        }
      }
      let merchandise_photo_url: string | null = null;
      if (merchFile) {
        setUploadingMerch(true);
        try {
          merchandise_photo_url = await uploadPosSaleProof(merchFile, locationId);
        } finally {
          setUploadingMerch(false);
        }
      }
      await sale.mutateAsync({
        items: cart,
        payment_method: paymentMethod,
        client_name: clientName || undefined,
        client_document: clientDoc || undefined,
        client_email: clientEmail || undefined,
        client_phone: clientPhone || undefined,
        client_address: clientAddress || undefined,
        client_city: clientCity || undefined,
        notes: notes || undefined,
        payment_proof_url,
        merchandise_photo_url,
      });
      toast.success(`Venta registrada por $${total.toLocaleString()}`);
      setCart([]);
      setClientName("");
      setClientDoc("");
      setClientEmail("");
      setClientPhone("");
      setClientAddress("");
      setClientCity("");
      setNotes("");
      setProofFile(null);
      setMerchFile(null);
    } catch (e: any) {
      toast.error(e.message ?? "Error al registrar venta");
    }
  };

  const setConsumidorFinal = () => {
    setClientName(CONSUMIDOR_FINAL.client_name);
    setClientDoc(CONSUMIDOR_FINAL.client_document);
    setClientEmail(CONSUMIDOR_FINAL.client_email);
    setClientPhone(CONSUMIDOR_FINAL.client_phone);
    setClientAddress(CONSUMIDOR_FINAL.client_address);
    setClientCity(CONSUMIDOR_FINAL.client_city);
    toast.success("Datos de Consumidor Final cargados");
  };

  const isSearching = search.trim().length > 0;

  const goBack = () => {
    if (selectedSupplier) {
      setSelectedSupplier(null);
    } else {
      setSelectedBrand(null);
    }
    setSearch("");
  };

  const renderProducts = () => {
    if (filtered.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-8">No hay productos disponibles.</p>;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="relative text-left p-2 rounded-md border hover:border-primary hover:bg-accent transition"
          >
            <button
              type="button"
              onClick={() => addToCart(p)}
              className="w-full text-left"
            >
              <div className="aspect-square w-full mb-1.5 rounded bg-muted overflow-hidden flex items-center justify-center">
                {p.photo_url ? (
                  <img
                    src={p.photo_url}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    width={120}
                    height={120}
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                )}
              </div>
              <p className="font-medium text-xs leading-tight break-words">{p.name}</p>
              {p.brand && <p className="text-[10px] text-muted-foreground truncate">{p.brand}</p>}
              <div className="flex items-center justify-between mt-1">
                <span className="font-bold text-xs">${Number(p.sale_price).toLocaleString()}</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0">{Number(p.available)}</Badge>
              </div>
            </button>
            <input
              ref={(el) => (photoInputsRef.current[p.id] = el)}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleProductPhoto(e, p)}
            />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute top-1 right-1 h-6 w-6 shadow"
              onClick={(e) => { e.stopPropagation(); photoInputsRef.current[p.id]?.click(); }}
              disabled={uploadingPhotoId === p.id}
              title={p.photo_url ? "Cambiar foto" : "Subir foto"}
            >
              {uploadingPhotoId === p.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Camera className="h-3 w-3" />
              )}
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos disponibles</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            {selectedBrand && (
              <Button variant="outline" size="sm" onClick={goBack}>
                {selectedSupplier ? "← Proveedores" : "← Marcas"}
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
          {selectedBrand && (!isSearching || isNutritionSelected) && (
            <Badge variant="outline" className="mt-1 w-fit">
              {selectedSupplier ? `${selectedBrand} · ${selectedSupplier}` : selectedBrand}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay productos disponibles.</p>
          ) : isNutritionSelected && !selectedSupplier ? (
            nutritionSuppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay proveedores que coincidan.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {nutritionSuppliers.map(([supplier, items]) => (
                  <button
                    key={supplier}
                    onClick={() => { setSelectedSupplier(supplier); setSearch(""); }}
                    className="rounded-lg border p-4 text-left transition hover:bg-accent hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm truncate">{supplier}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{items.length} producto{items.length !== 1 ? "s" : ""}</p>
                  </button>
                ))}
              </div>
            )
          ) : isSearching ? (
            renderProducts()
          ) : !selectedBrand ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {brands.map(([brand, count]) => (
                <button
                  key={brand}
                  onClick={() => { setSelectedBrand(brand); setSelectedSupplier(null); }}
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
            renderProducts()
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
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {cart.map((c) => {
                const lineTotal = Number(c.product.sale_price) * c.quantity;
                return (
                  <div key={c.product.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(Number(c.product.sale_price))} c/u · Subtotal {fmt(lineTotal)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQty(c.product.id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm w-6 text-center font-semibold">{c.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQty(c.product.id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(c.product.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items</span>
              <span className="font-medium">{totalUnits}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal (sin IVA)</span>
              <span className="font-medium">{fmt(base)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA 19%</span>
              <span className="font-medium">{fmt(iva)}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t">
              <span className="text-sm font-semibold">Total a pagar</span>
              <span className="text-2xl font-bold">{fmt(total)}</span>
            </div>
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Teléfono</Label>
              <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            </div>
            <div>
              <Label>Ciudad</Label>
              <Input value={clientCity} onChange={(e) => setClientCity(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Dirección</Label>
            <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
          </div>
          <div>
            <Label>Método de pago</Label>
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
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Soporte de pago (Nequi, Bold, etc.)</Label>
            {proofFile ? (
              <div className="flex items-center justify-between gap-2 p-2 border rounded text-sm">
                <span className="truncate flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary shrink-0" />
                  {proofFile.name}
                </span>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setProofFile(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
            )}
            <p className="text-[10px] text-muted-foreground mt-1">Opcional. Si no lo tienes ahora, lo puedes adjuntar luego en "Ventas del día".</p>
          </div>
          <div>
            <Label>Foto de mercancía entregada</Label>
            {merchFile ? (
              <div className="flex items-center justify-between gap-2 p-2 border rounded text-sm">
                <span className="truncate flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary shrink-0" />
                  {merchFile.name}
                </span>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMerchFile(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setMerchFile(e.target.files?.[0] ?? null)}
              />
            )}
            <p className="text-[10px] text-muted-foreground mt-1">Opcional. Foto de lo que se lleva el cliente. También se puede adjuntar luego.</p>
          </div>
          <Button onClick={handleConfirm} disabled={sale.isPending || uploadingProof || uploadingMerch || cart.length === 0} className="w-full">
            {uploadingProof || uploadingMerch ? "Subiendo foto..." : sale.isPending ? "Registrando..." : `Cobrar ${fmt(total)}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
