import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const [exportDate, setExportDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [exportPayment, setExportPayment] = useState("all");
  const [exportClient, setExportClient] = useState("all");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["ferias_sales_by_day", exportDate],
    queryFn: async () => {
      const start = `${exportDate}T00:00:00`;
      const end = `${exportDate}T23:59:59`;
      const { data, error } = await supabase
        .from("feria_sales")
        .select("*")
        .gte("sale_date", start)
        .lte("sale_date", end)
        .order("sale_date", { ascending: true });
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  const { data: feriasMap = {} } = useQuery({
    queryKey: ["ferias_names"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ferias").select("id, name, city");
      if (error) throw error;
      const map: Record<string, { name: string; city: string }> = {};
      for (const f of data || []) map[(f as any).id] = { name: (f as any).name, city: (f as any).city };
      return map;
    },
  });

  const exportRows = useMemo(() => {
    return sales.filter((s) => {
      // payment filter
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

  const downloadCsv = () => {
    if (exportRows.length === 0) {
      toast.warning("No hay ventas para los filtros seleccionados");
      return;
    }
    const headers = [
      "Fecha", "Feria", "Ciudad", "Marca", "Producto", "Cantidad", "Precio unitario", "Total",
      "Método de pago", "Cliente", "Documento", "Teléfono", "Email", "Dirección", "Ciudad cliente", "Notas",
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [headers.join(",")];
    for (const r of exportRows) {
      const f = feriasMap[r.feria_id];
      lines.push([
        format(new Date(r.sale_date), "yyyy-MM-dd HH:mm"),
        f?.name || r.feria_id,
        f?.city || "",
        r.brand,
        r.product_name,
        r.quantity,
        r.unit_price,
        r.total_amount,
        r.payment_method || "",
        r.client_name || "",
        r.client_document || "",
        r.client_phone || "",
        r.client_email || "",
        r.client_address || "",
        r.client_city || "",
        r.notes || "",
      ].map(escape).join(","));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas_ferias_${exportDate}_${exportPayment}_${exportClient}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Download className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Descargar ventas del día — todas las ferias</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <Label className="text-xs">Fecha</Label>
          <Input type="date" value={exportDate} onChange={(e) => setExportDate(e.target.value)} />
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
        <Button onClick={downloadCsv} className="gap-2" disabled={isLoading}>
          <Download className="h-4 w-4" />
          Descargar CSV ({exportRows.length})
        </Button>
      </div>
    </Card>
  );
}