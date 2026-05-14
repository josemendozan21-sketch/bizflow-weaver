import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Package, AlertTriangle, Upload, ImageIcon, Tag } from "lucide-react";
import { PosProduct, useUpsertPosProduct, uploadPosProductPhoto } from "@/hooks/usePuntosVenta";
import { toast } from "sonner";

type Props = {
  locationId: string;
  products: PosProduct[];
  canEdit: boolean;
};

export function PuntoInventario({ locationId, products, canEdit }: Props) {
  const [editing, setEditing] = useState<PosProduct | null>(null);
  const [open, setOpen] = useState(false);
  const upsert = useUpsertPosProduct(locationId);

  const handleSave = async (form: Partial<PosProduct> & { name: string; sale_price: number }) => {
    try {
      await upsert.mutateAsync(form);
      toast.success(form.id ? "Producto actualizado" : "Producto creado");
      setOpen(false);
      setEditing(null);
    } catch (e: any) {
      toast.error(e.message ?? "Error al guardar");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" /> Catálogo del punto ({products.length})
        </CardTitle>
        {canEdit && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4 mr-1" /> Nuevo producto
              </Button>
            </DialogTrigger>
            <ProductDialog product={editing} onSave={handleSave} loading={upsert.isPending} locationId={locationId} />
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aún no hay productos en este punto. {canEdit ? "Crea el primero." : ""}
          </p>
        ) : (
          <div className="space-y-2">
            {products.map((p) => {
              const lowStock = Number(p.available) <= Number(p.min_stock) && Number(p.min_stock) > 0;
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-md border">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{p.name}</p>
                      {p.brand && <Badge variant="outline" className="text-xs">{p.brand}</Badge>}
                      {p.supplier && <Badge variant="secondary" className="text-xs">{p.supplier}</Badge>}
                      {lowStock && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertTriangle className="h-3 w-3" /> Bajo
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.category ?? "Sin categoría"} · Costo prom: ${Number(p.avg_cost).toLocaleString()}
                    </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${Number(p.sale_price).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{Number(p.available)} {p.unit}</p>
                  </div>
                  {canEdit && (
                    <Dialog open={open && editing?.id === p.id} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      {editing?.id === p.id && (
                        <ProductDialog product={editing} onSave={handleSave} loading={upsert.isPending} locationId={locationId} />
                      )}
                    </Dialog>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProductDialog({
  product,
  onSave,
  loading,
  locationId,
}: {
  product: PosProduct | null;
  onSave: (f: any) => void;
  loading: boolean;
  locationId: string;
}) {
  const [form, setForm] = useState({
    id: product?.id,
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    supplier: product?.supplier ?? "",
    category: product?.category ?? "",
    sale_price: product?.sale_price ?? 0,
    avg_cost: product?.avg_cost ?? 0,
    available: product?.available ?? 0,
    min_stock: product?.min_stock ?? 0,
    unit: product?.unit ?? "unidades",
    photo_url: product?.photo_url ?? "",
    notes: product?.notes ?? "",
  });
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadPosProductPhoto(file, locationId);
      setForm((f) => ({ ...f, photo_url: url }));
      toast.success("Foto cargada");
    } catch (err: any) {
      toast.error(err.message ?? "Error al subir foto");
    } finally {
      setUploading(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="flex items-center gap-3">
          <div className="h-20 w-20 rounded bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
            {form.photo_url ? (
              <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="h-7 w-7 text-muted-foreground/40" />
            )}
          </div>
          <div className="flex-1">
            <Label className="text-xs">Foto del producto</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="text-xs" />
              {form.photo_url && (
                <Button type="button" size="sm" variant="ghost"
                  onClick={() => setForm({ ...form, photo_url: "" })}>Quitar</Button>
              )}
            </div>
            {uploading && <p className="text-xs text-muted-foreground mt-1">Subiendo…</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Marca</Label>
            <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Proveedor</Label>
            <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          </div>
          <div>
            <Label>Categoría</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Precio venta *</Label>
            <Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })} />
          </div>
          {!product && (
            <>
              <div>
                <Label>Costo unitario</Label>
                <Input type="number" value={form.avg_cost} onChange={(e) => setForm({ ...form, avg_cost: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Stock inicial</Label>
                <Input type="number" value={form.available} onChange={(e) => setForm({ ...form, available: Number(e.target.value) })} />
              </div>
            </>
          )}
          <div>
            <Label>Stock mínimo</Label>
            <Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Unidad</Label>
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(form)} disabled={loading || !form.name || !form.sale_price}>
          {loading ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
