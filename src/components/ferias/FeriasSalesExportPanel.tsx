import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useFerias } from "@/hooks/useFerias";

type Row = {
  id: string;
  feria_id: string;
  brand: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string | null;
  client_name: string | null;
  client_document: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
  client_city: string | null;
  notes: string | null;
  sale_date: string;
};

export function FeriasSalesExportPanel() {
  const { data: ferias = [] } = useFerias();
  const [feriaId, setFeriaId] = useState<string>("");
  const [exportPayment, setExportPayment] = useState("all");
  const [exportClient, setExportClient] = useState("all");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["feria_sales_export", feriaId],
    queryFn: async () => {
      if (!feriaId) return [] as Row[];
      const { data, error } = await supabase
        .from("feria_sales")
        .select("*")
        .eq("feria_id", feriaId)
        .order("sale_date", { ascending: true });
      if (error) throw error;
      return (data || []) as Row[];
    },
    enabled: !!feriaId,
  });

  const selectedFeria = ferias.find((f) => f.id === feriaId);

  const exportRows = useMemo(() => {
    return sales.filter((s) => {
      const pm = (s.payment_method || "").toLowerCase();
      const matchesPayment =
        exportPayment === "all" ||
        (exportPayment === "efectivo" && pm === "efectivo") ||
        (exportPayment === "tarjeta" && (pm === "tarjeta" || pm === "datafono" || pm === "datáfono")) ||
        (exportPayment === "bancolombia" && (pm === "bancolombia" || pm === "transferencia"));
      if (!matchesPayment) return false;

      const doc = (s.client_document || "").trim();
      const name = (s.client_name || "").trim();
      const isConsumidorFinal = doc === "222222222222" || name.toLowerCase() === "consumidor final";
      const hasCompleteData = !!(name && doc && s.client_phone && s.client_address);
      if (exportClient === "consumidor_final" && !isConsumidorFinal) return false;
      if (exportClient === "completos" && !hasCompleteData) return false;
      return true;
    });
  }, [sales, exportPayment, exportClient]);

  const totalAmount = useMemo(
    () => exportRows.reduce((a, r) => a + Number(r.total_amount || 0), 0),
    [exportRows]
  );
  const totalUnits = useMemo(
    () => exportRows.reduce((a, r) => a + Number(r.quantity || 0), 0),
    [exportRows]
  );

  const downloadXlsx = () => {
    if (!feriaId) {
      toast.warning("Selecciona una feria");
      return;
    }
    if (exportRows.length === 0) {
      toast.warning("No hay ventas para los filtros seleccionados");
      return;
    }

    const data = exportRows.map((r) => ({
      Fecha: format(new Date(r.sale_date), "yyyy-MM-dd HH:mm"),
      Marca: r.brand,
      Producto: r.product_name,
      Cantidad: r.quantity,
      "Precio unitario": Number(r.unit_price || 0),
      Total: Number(r.total_amount || 0),
      "Método de pago": r.payment_method || "",
      Cliente: r.client_name || "",
      Documento: r.client_document || "",
      Teléfono: r.client_phone || "",
      Email: r.client_email || "",
      Dirección: r.client_address || "",
      Ciudad: r.client_city || "",
      Notas: r.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 18 }, { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 14 }, { wch: 14 },
      { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 24 }, { wch: 28 }, { wch: 14 }, { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");

    const resumen = [
      ["Feria", selectedFeria?.name || ""],
      ["Ciudad", selectedFeria?.city || ""],
      ["Fechas", `${selectedFeria?.start_date || ""} a ${selectedFeria?.end_date || ""}`],
      ["Filtro método de pago", exportPayment],
      ["Filtro cliente", exportClient],
      [],
      ["Ventas (líneas)", exportRows.length],
      ["Unidades", totalUnits],
      ["Total", totalAmount],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
    wsResumen["!cols"] = [{ wch: 24 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    const safeName = (selectedFeria?.name || "feria").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const suffix = [exportPayment, exportClient].filter((x) => x !== "all").join("_");
    XLSX.writeFile(wb, `ventas_${safeName}${suffix ? "_" + suffix : ""}.xlsx`);
    toast.success(`${exportRows.length} venta(s) exportadas`);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Descargar ventas de una feria (Excel)</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <Label className="text-xs">Feria</Label>
          <Select value={feriaId} onValueChange={setFeriaId}>
            <SelectTrigger><SelectValue placeholder="Selecciona una feria" /></SelectTrigger>
            <SelectContent>
              {ferias.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name} — {f.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Método de pago</Label>
          <Select value={exportPayment} onValueChange={setExportPayment}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="tarjeta">Tarjeta / Datáfono</SelectItem>
              <SelectItem value="bancolombia">Bancolombia / Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tipo de cliente</Label>
          <Select value={exportClient} onValueChange={setExportClient}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completos">Con todos los datos</SelectItem>
              <SelectItem value="consumidor_final">Consumidor Final</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={downloadXlsx} className="gap-2" disabled={isLoading || !feriaId}>
          <Download className="h-4 w-4" />
          Descargar Excel ({exportRows.length})
        </Button>
      </div>
      {feriaId && (
        <p className="text-xs text-muted-foreground">
          {exportRows.length} venta(s) · {totalUnits} unidad(es) · Total ${Math.round(totalAmount).toLocaleString("es-CO")}
        </p>
      )}
    </Card>
  );
}