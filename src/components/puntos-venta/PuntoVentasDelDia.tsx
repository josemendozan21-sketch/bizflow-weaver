import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, FileDown, Package2, Receipt, Camera, ImageIcon, Loader2, Box } from "lucide-react";
import { PosSale, usePosSaleItems, uploadPosSaleProof, useAttachPosSaleProof, useAttachPosSaleMerchandise } from "@/hooks/usePuntosVenta";
import { downloadSalePdf, saleDocType, type InvoiceLocation } from "@/lib/posInvoicePdf";
import { downloadCsvDay, downloadInvoicesZip } from "@/lib/posExports";
import { toast } from "sonner";

type Props = { sales: PosSale[]; location: InvoiceLocation; locationId: string };

export function PuntoVentasDelDia({ sales, location, locationId }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadingMerchId, setUploadingMerchId] = useState<string | null>(null);
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const merchInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const attach = useAttachPosSaleProof(locationId);
  const attachMerch = useAttachPosSaleMerchandise(locationId);

  const handleAttach = async (saleId: string, file: File) => {
    try {
      setUploadingId(saleId);
      const url = await uploadPosSaleProof(file, locationId);
      await attach.mutateAsync({ saleId, url });
      toast.success("Soporte adjuntado");
    } catch (e: any) {
      toast.error(e.message ?? "Error al subir soporte");
    } finally {
      setUploadingId(null);
    }
  };

  const handleAttachMerch = async (saleId: string, file: File) => {
    try {
      setUploadingMerchId(saleId);
      const url = await uploadPosSaleProof(file, locationId);
      await attachMerch.mutateAsync({ saleId, url });
      toast.success("Foto de mercancía adjuntada");
    } catch (e: any) {
      toast.error(e.message ?? "Error al subir foto");
    } finally {
      setUploadingMerchId(null);
    }
  };

  const filtered = useMemo(
    () => sales.filter((s) => s.sale_date.slice(0, 10) === date),
    [sales, date]
  );

  const { data: items = [] } = usePosSaleItems(filtered.map((s) => s.id));
  const itemsBySale = useMemo(() => {
    const m: Record<string, typeof items> = {};
    for (const it of items) (m[it.sale_id] ??= []).push(it);
    return m;
  }, [items]);

  const totals = useMemo(() => {
    let total = 0, factura = 0, remision = 0;
    for (const s of filtered) {
      total += Number(s.total_amount);
      if (saleDocType(s.payment_method) === "factura") factura += Number(s.total_amount);
      else remision += Number(s.total_amount);
    }
    return { total, factura, remision };
  }, [filtered]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Ventas del día
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
            <span className="text-sm text-muted-foreground">
              {filtered.length} venta(s) · Total ${totals.total.toLocaleString()}
              {" · "}DIAN ${totals.factura.toLocaleString()} · Remisión ${totals.remision.toLocaleString()}
            </span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline"
                disabled={filtered.length === 0}
                onClick={() => downloadCsvDay({ sales: filtered, itemsBySale, date })}>
                <FileDown className="h-4 w-4 mr-1" /> CSV del día
              </Button>
              <Button size="sm" variant="outline"
                disabled={!filtered.some((s) => saleDocType(s.payment_method) === "factura")}
                onClick={() => downloadInvoicesZip({ sales: filtered, itemsBySale, location, date, onlyFacturas: true })}>
                <Package2 className="h-4 w-4 mr-1" /> ZIP facturas DIAN
              </Button>
              <Button size="sm" variant="outline"
                disabled={filtered.length === 0}
                onClick={() => downloadInvoicesZip({ sales: filtered, itemsBySale, location, date })}>
                <Package2 className="h-4 w-4 mr-1" /> ZIP todos
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin ventas en esta fecha.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2">Hora</th>
                    <th>Tipo</th>
                    <th>Cliente</th>
                    <th>Items</th>
                    <th className="text-right">Total</th>
                    <th>Pago</th>
                    <th>Soporte</th>
                    <th>Mercancía</th>
                    <th>Vendedor</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const tipo = saleDocType(s.payment_method);
                    const its = itemsBySale[s.id] ?? [];
                    return (
                      <tr key={s.id} className="border-b">
                        <td className="py-2">{new Date(s.sale_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                        <td>
                          <Badge variant={tipo === "factura" ? "default" : "secondary"}>
                            {tipo === "factura" ? "Factura DIAN" : "Remisión"}
                          </Badge>
                        </td>
                        <td>
                          <div className="font-medium">{s.client_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{s.client_document || ""}</div>
                        </td>
                        <td className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {its.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}
                        </td>
                        <td className="text-right font-medium">${Number(s.total_amount).toLocaleString()}</td>
                        <td className="text-xs">{s.payment_method ?? "—"}</td>
                        <td className="text-xs">
                          <input
                            ref={(el) => { inputsRef.current[s.id] = el; }}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleAttach(s.id, f);
                              e.target.value = "";
                            }}
                          />
                          {s.payment_proof_url ? (
                            <div className="flex items-center gap-1">
                              <a href={s.payment_proof_url} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline">
                                <ImageIcon className="h-3.5 w-3.5" /> Ver
                              </a>
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]"
                                onClick={() => inputsRef.current[s.id]?.click()}
                                disabled={uploadingId === s.id}>
                                Cambiar
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]"
                              onClick={() => inputsRef.current[s.id]?.click()}
                              disabled={uploadingId === s.id}>
                              {uploadingId === s.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <><Camera className="h-3 w-3 mr-1" /> Adjuntar</>
                              )}
                            </Button>
                          )}
                        </td>
                        <td className="text-xs">
                          <input
                            ref={(el) => { merchInputsRef.current[s.id] = el; }}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleAttachMerch(s.id, f);
                              e.target.value = "";
                            }}
                          />
                          {s.merchandise_photo_url ? (
                            <div className="flex items-center gap-1">
                              <a href={s.merchandise_photo_url} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline">
                                <ImageIcon className="h-3.5 w-3.5" /> Ver
                              </a>
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]"
                                onClick={() => merchInputsRef.current[s.id]?.click()}
                                disabled={uploadingMerchId === s.id}>
                                Cambiar
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]"
                              onClick={() => merchInputsRef.current[s.id]?.click()}
                              disabled={uploadingMerchId === s.id}>
                              {uploadingMerchId === s.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <><Box className="h-3 w-3 mr-1" /> Foto</>
                              )}
                            </Button>
                          )}
                        </td>
                        <td className="text-xs">{s.recorded_by_name ?? "—"}</td>
                        <td className="text-right">
                          <Button size="sm" variant="ghost"
                            onClick={() => downloadSalePdf({ sale: s, items: its, location })}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}