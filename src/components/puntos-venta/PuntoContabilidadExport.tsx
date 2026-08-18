import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet } from "lucide-react";
import { PosSale, usePosSaleItems, usePosCashWithdrawals } from "@/hooks/usePuntosVenta";
import { exportPosReportXlsx } from "@/lib/accountingExports";
import { toast } from "sonner";

type Props = { sales: PosSale[]; locationId: string; locationName: string };

function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function PuntoContabilidadExport({ sales, locationId, locationName }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today);

  const { data: withdrawals = [] } = usePosCashWithdrawals(locationId);

  const filtered = useMemo(
    () => sales
      .filter((s) => s.sale_date.slice(0, 10) >= from && s.sale_date.slice(0, 10) <= to)
      .sort((a, b) => a.sale_date.localeCompare(b.sale_date)),
    [sales, from, to]
  );
  const { data: items = [] } = usePosSaleItems(filtered.map((s) => s.id));

  const filteredWithdrawals = useMemo(
    () => withdrawals.filter((w) => w.created_at.slice(0, 10) >= from && w.created_at.slice(0, 10) <= to),
    [withdrawals, from, to]
  );

  const total = filtered.reduce((a, s) => a + Number(s.total_amount), 0);

  const handleExport = () => {
    if (filtered.length === 0 && filteredWithdrawals.length === 0) {
      toast.error("No hay movimientos en el rango seleccionado");
      return;
    }
    exportPosReportXlsx({
      locationName,
      from,
      to,
      sales: filtered as any,
      items: items as any,
      withdrawals: filteredWithdrawals as any,
    });
    toast.success("Reporte descargado");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" /> Descargar reporte contable
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-auto" />
          </div>
          <Button onClick={handleExport}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel del periodo
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} venta(s) · Total ${total.toLocaleString("es-CO")} ·{" "}
          {filteredWithdrawals.length} movimiento(s) de caja del punto.
        </p>
        <p className="text-xs text-muted-foreground">
          El archivo incluye: Ventas (con cliente, método de pago, costo y utilidad), Detalle por producto,
          Resumen diario y Caja del punto (retiros y consignaciones).
        </p>
      </CardContent>
    </Card>
  );
}
