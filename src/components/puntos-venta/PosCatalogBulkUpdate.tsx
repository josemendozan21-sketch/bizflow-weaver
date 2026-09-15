import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import JSZip from "jszip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Upload, Loader2, FileSpreadsheet, AlertTriangle, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadPosProductPhoto, type PosProduct } from "@/hooks/usePuntosVenta";
import {
  buildCatalogDiff,
  downloadCatalogTemplate,
  norm,
  parseCatalogFile,
  type CatalogDiff,
  type CatalogDiffEntry,
  type CatalogProduct,
} from "@/lib/posCatalogTemplate";

const fileKey = (name: string) => norm(name.split("/").pop() ?? name);

export default function PosCatalogBulkUpdate({
  locationId,
  locationName,
  products,
}: {
  locationId: string;
  locationName: string;
  products: PosProduct[];
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [diff, setDiff] = useState<CatalogDiff | null>(null);
  const [photos, setPhotos] = useState<Map<string, File>>(new Map());
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");

  const catalog: CatalogProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand ?? null,
    category: (p as any).category ?? null,
    supplier: (p as any).supplier ?? null,
    reference: (p as any).reference ?? null,
    sub_reference: (p as any).sub_reference ?? null,
    sale_price: Number(p.sale_price) || 0,
    available: Number(p.available) || 0,
    unit: p.unit ?? "unidades",
    active: p.active !== false,
    photo_url: (p as any).photo_url ?? null,
  }));

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const { rows, errors } = parseCatalogFile(buf);
      if (rows.length === 0 && errors.length === 0) {
        toast.error("El archivo no tiene filas de productos");
        return;
      }
      setDiff(buildCatalogDiff(rows, errors, catalog));
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo leer el archivo");
    }
  };

  const handlePhotos = async (files: File[]) => {
    const map = new Map(photos);
    for (const f of files) {
      if (f.name.toLowerCase().endsWith(".zip")) {
        try {
          const zip = await JSZip.loadAsync(f);
          const entries = Object.values(zip.files).filter(
            (z) => !z.dir && /\.(jpe?g|png|webp|heic)$/i.test(z.name),
          );
          for (const z of entries) {
            const blob = await z.async("blob");
            const name = z.name.split("/").pop() ?? z.name;
            map.set(fileKey(name), new File([blob], name, { type: blob.type || "image/jpeg" }));
          }
        } catch {
          toast.error(`No se pudo abrir ${f.name}`);
        }
      } else if (f.type.startsWith("image/")) {
        map.set(fileKey(f.name), f);
      }
    }
    setPhotos(map);
    toast.success(`${map.size} imagen${map.size === 1 ? "" : "es"} lista${map.size === 1 ? "" : "s"} para asignar`);
  };

  const photoPlan = useMemo(() => {
    const matched: { entry: CatalogDiffEntry; file: File }[] = [];
    const missing: CatalogDiffEntry[] = [];
    if (!diff) return { matched, missing, extra: [] as string[] };
    const used = new Set<string>();
    for (const e of [...diff.updates, ...diff.creates]) {
      const wanted = e.parsed.photo_file;
      if (!wanted) continue;
      const f = photos.get(fileKey(wanted));
      if (f) {
        matched.push({ entry: e, file: f });
        used.add(fileKey(wanted));
      } else {
        missing.push(e);
      }
    }
    const extra = Array.from(photos.keys()).filter((k) => !used.has(k));
    return { matched, missing, extra };
  }, [diff, photos]);

  const closeDialog = () => {
    setDiff(null);
    setPhotos(new Map());
    setProgress("");
  };

  const apply = async () => {
    if (!diff) return;
    setSaving(true);
    try {
      const photoUrlByRow = new Map<number, string>();
      if (photoPlan.matched.length > 0) {
        let done = 0;
        for (const { entry, file } of photoPlan.matched) {
          setProgress(`Subiendo fotos ${++done}/${photoPlan.matched.length}…`);
          try {
            const url = await uploadPosProductPhoto(file, locationId);
            photoUrlByRow.set(entry.row, url);
          } catch {
            toast.error(`No se pudo subir la foto de ${entry.name}`);
          }
        }
      }

      setProgress("Guardando catálogo…");
      const toUpdate = [...diff.updates, ...diff.deactivations];
      for (const u of toUpdate) {
        const photoUrl = photoUrlByRow.get(u.row);
        const { error } = await supabase
          .from("pos_products")
          .update({
            category: u.parsed.category,
            supplier: u.parsed.supplier,
            reference: u.parsed.reference,
            sub_reference: u.parsed.sub_reference,
            sale_price: u.parsed.sale_price,
            available: u.parsed.available,
            unit: u.parsed.unit,
            active: u.parsed.active,
            ...(photoUrl ? { photo_url: photoUrl } : {}),
          })
          .eq("id", u.product!.id);
        if (error) throw error;
      }
      if (diff.creates.length > 0) {
        const { error } = await supabase.from("pos_products").insert(
          diff.creates.map((c) => ({
            location_id: locationId,
            name: c.parsed.name,
            brand: c.parsed.brand,
            category: c.parsed.category,
            supplier: c.parsed.supplier,
            reference: c.parsed.reference,
            sub_reference: c.parsed.sub_reference,
            sale_price: c.parsed.sale_price,
            available: c.parsed.available,
            avg_cost: 0,
            unit: c.parsed.unit,
            active: c.parsed.active,
            photo_url: photoUrlByRow.get(c.row) ?? null,
          })),
        );
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["pos_products", locationId] });
      await qc.invalidateQueries({ queryKey: ["pos_product_audit_log", locationId] });
      toast.success(
        `Catálogo actualizado: ${toUpdate.length} actualizados, ${diff.creates.length} nuevos, ${photoUrlByRow.size} fotos`,
      );
      closeDialog();
    } catch (e: any) {
      toast.error(e?.message ?? "Error al guardar los cambios");
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  const total = diff ? diff.updates.length + diff.creates.length + diff.deactivations.length : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-5 w-5 text-primary" /> Actualizar catálogo con Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Descarga el archivo con los productos actuales, corrige nombres, marcas, proveedor, precios y
          existencias, y vuelve a subirlo. Si quieres cambiar fotos, escribe el nombre del archivo en la
          columna "Foto nueva" y adjunta las imágenes. Antes de guardar verás un resumen de todo lo que va a
          cambiar.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCatalogTemplate(catalog, locationName)}>
            <Download className="mr-1 h-4 w-4" /> Descargar plantilla
          </Button>
          <Button size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" /> Subir Excel
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) handleFile(f);
            }}
          />
        </div>
      </CardContent>

      <Dialog open={!!diff} onOpenChange={(v) => !v && !saving && closeDialog()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Revisa los cambios antes de guardar</DialogTitle>
          </DialogHeader>

          {diff && (
            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{diff.updates.length} actualizaciones</Badge>
                <Badge variant="outline">{diff.creates.length} nuevos</Badge>
                <Badge variant="outline">{diff.deactivations.length} desactivados</Badge>
                <Badge variant="outline">{diff.unchanged} sin cambios</Badge>
                {diff.errors.length > 0 && (
                  <Badge variant="destructive">{diff.errors.length} con error</Badge>
                )}
              </div>

              {(photoPlan.matched.length > 0 || photoPlan.missing.length > 0 || photos.size > 0) && (
                <div className="rounded-md border p-3">
                  <p className="mb-2 flex items-center gap-1 text-sm font-medium">
                    <ImageIcon className="h-4 w-4 text-primary" /> Fotos
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{photoPlan.matched.length} se asignan</Badge>
                    {photoPlan.missing.length > 0 && (
                      <Badge variant="destructive">{photoPlan.missing.length} sin la imagen adjunta</Badge>
                    )}
                    {photoPlan.extra.length > 0 && (
                      <Badge variant="secondary">{photoPlan.extra.length} imágenes sin usar</Badge>
                    )}
                  </div>
                  {photoPlan.missing.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Falta adjuntar: {photoPlan.missing.map((m) => m.parsed.photo_file).join(", ")}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    disabled={saving}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <ImageIcon className="mr-1 h-4 w-4" /> Adjuntar imágenes o .zip
                  </Button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    multiple
                    accept="image/*,.zip"
                    className="hidden"
                    onChange={(e) => {
                      const fs = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      if (fs.length) handlePhotos(fs);
                    }}
                  />
                </div>
              )}

              {diff.errors.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                  <p className="mb-1 flex items-center gap-1 text-sm font-medium text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Filas que no se aplicarán
                  </p>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {diff.errors.map((e, i) => (
                      <li key={i}>Fila {e.row}: {e.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {diff.updates.length > 0 && (
                <Section title="Se actualizan">
                  {diff.updates.map((u) => (
                    <div key={`u-${u.row}`} className="border-b py-1.5 text-xs last:border-0">
                      <p className="font-medium">{u.name} <span className="text-muted-foreground">· {u.brand || "Sin marca"}</span></p>
                      {u.changes.map((c) => (
                        <p key={c.field} className="text-muted-foreground">
                          {c.label}: <span className="line-through">{c.from}</span> → <span className="font-semibold text-foreground">{c.to}</span>
                        </p>
                      ))}
                    </div>
                  ))}
                </Section>
              )}

              {diff.creates.length > 0 && (
                <Section title="Se crean">
                  {diff.creates.map((c) => (
                    <p key={`c-${c.row}`} className="border-b py-1.5 text-xs last:border-0">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground">
                        {" "}· {c.brand || "Sin marca"} · ${Math.round(c.parsed.sale_price).toLocaleString("es-CO")} · {c.parsed.available} und
                      </span>
                    </p>
                  ))}
                </Section>
              )}

              {diff.deactivations.length > 0 && (
                <Section title="Se desactivan">
                  {diff.deactivations.map((d) => (
                    <p key={`d-${d.row}`} className="border-b py-1.5 text-xs last:border-0">
                      {d.name} <span className="text-muted-foreground">· {d.brand || "Sin marca"}</span>
                    </p>
                  ))}
                </Section>
              )}
            </div>
          )}

          <DialogFooter className="items-center gap-2">
            {progress && <span className="mr-auto text-xs text-muted-foreground">{progress}</span>}
            <Button variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button>
            <Button onClick={apply} disabled={saving || total === 0}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Confirmar {total > 0 ? `(${total})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold">{title}</p>
      <div className="rounded-md border px-3">{children}</div>
    </div>
  );
}
