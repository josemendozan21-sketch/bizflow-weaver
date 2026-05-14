import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, FileDown, Package2, Receipt } from "lucide-react";
import { PosSale, usePosSaleItems } from "@/hooks/usePuntosVenta";
import { downloadSalePdf, saleDocType, type InvoiceLocation } from "@/lib/posInvoicePdf";
import { downloadCsvDay, downloadInvoicesZip } from "@/lib/posExports";

type Props = { sales: PosSale[]; location: InvoiceLocation };

export function PuntoVentasDelDia({ sales, location }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

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