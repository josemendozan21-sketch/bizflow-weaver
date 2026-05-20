import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useInventory } from "@/hooks/useInventory";
import { useInventoryMovements } from "@/hooks/useInventoryMovements";
import { exportWeeklyInventory, getWeekRange } from "@/lib/exportWeeklyInventory";

export default function WeeklyInventoryExport() {
  const { stockItems } = useInventory();
  const { movements } = useInventoryMovements();
  const [refDate, setRefDate] = useState(() => new Date().toISOString().slice(0, 10));

  const range = getWeekRange(new Date(refDate));

  const handleExport = () => {
    try {
      exportWeeklyInventory(movements, stockItems, range);
      toast.success(`Excel descargado: semana ${range.label}`);
    } catch (e: any) {
      toast.error(e?.message || "Error al exportar");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-5 w-5 text-primary" /> Excel semanal para facturación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Descarga un Excel con resumen, movimientos detallados, stock final por ítem y compras de la semana
          seleccionada. Incluye unidades disponibles y en proceso, listo para cargar al sistema de facturación.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <Label>Cualquier día de la semana</Label>
            <Input type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Semana: <strong>{range.label}</strong> (lun – dom)</p>
          </div>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> Descargar Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}