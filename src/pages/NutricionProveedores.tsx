import { useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Truck, Package, Tag, Camera, ImageIcon, Loader2 } from "lucide-react";
import { usePosLocations, usePosProducts, useUpsertPosProduct, uploadPosProductPhoto } from "@/hooks/usePuntosVenta";
import { toast } from "sonner";

const NUTRITION_BRAND = "Sweatspot Nutrición";

export default function NutricionProveedores() {
  const [params] = useSearchParams();
  const locationId = params.get("location") ?? "";
  const { data: locations = [] } = usePosLocations();
  const { data: products = [] } = usePosProducts(locationId || null);
  const location = locations.find((l) => l.id === locationId);
  const [selected, setSelected] = useState<string | null>(null);
  const upsert = useUpsertPosProduct(locationId);
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>, product: any) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !locationId) return;
    setUploadingId(product.id);
    try {
      const url = await uploadPosProductPhoto(file, locationId);
      await upsert.mutateAsync({
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
      setUploadingId(null);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, typeof products>();
    for (const p of products) {
      if ((p.brand ?? "").trim() !== NUTRITION_BRAND) continue;
      const sup = (p.supplier ?? "Sin proveedor").trim() || "Sin proveedor";
      if (!map.has(sup)) map.set(sup, [] as any);
      (map.get(sup) as any).push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  const current = selected ? grouped.find(([s]) => s === selected) : null;

  return (
    <div className="space-y-4 p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Proveedores de Nutrición
          </h1>
          <p className="text-xs text-muted-foreground">
            {location ? `${location.name} · ${location.city}` : "Punto de venta"}
          </p>
        </div>
        {selected ? (
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Todos los proveedores
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link to="/puntos-venta"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Link>
          </Button>
        )}
      </div>

      {grouped.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No hay productos de nutrición registrados.
        </Card>
      ) : !current ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {grouped.map(([supplier, items]) => {
            return (
              <button
                key={supplier}
                onClick={() => setSelected(supplier)}
                className="rounded-lg border p-4 text-left transition hover:bg-accent hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm truncate">{supplier}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {items.length} producto{items.length !== 1 ? "s" : ""}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" /> {current[0]}
              </span>
              <Badge variant="outline" className="text-xs">{current[1].length} productos</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(current[1] as any[]).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                <div className="h-12 w-12 rounded bg-muted overflow-hidden flex items-center justify-center flex-shrink-0 mr-2">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  {p.notes && <p className="text-[10px] text-muted-foreground truncate">{p.notes}</p>}
                </div>
                <div className="text-right pl-2">
                  <p className="text-xs font-semibold">${Number(p.sale_price).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                    <Package className="h-3 w-3" />{Number(p.available)} {p.unit}
                  </p>
                </div>
                <div className="pl-2">
                  <input
                    ref={(el) => (inputsRef.current[p.id] = el)}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handlePhoto(e, p)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => inputsRef.current[p.id]?.click()}
                    disabled={uploadingId === p.id}
                    title={p.photo_url ? "Cambiar foto" : "Subir foto"}
                  >
                    {uploadingId === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}