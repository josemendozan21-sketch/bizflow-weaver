import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type ParsedRow = {
  brand: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string | null;
  sale_date: string;
  client_name: string | null;
  client_document: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
  client_city: string | null;
  notes: string | null;
  error: string | null;
};

const TEMPLATE_HEADERS = [
  "Producto", "Unidades", "Precio unitario", "Marca", "Medio de pago", "Fecha",
  "Cliente", "Documento", "Telefono", "Email", "Direccion", "Ciudad", "Notas",
];

const norm = (s: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const pick = (row: Record<string, any>, keys: string[]) => {
  for (const k of Object.keys(row)) {
    if (keys.includes(norm(k))) {
      const v = row[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
  }
  return "";
};

const toNumber = (v: string) => {
  if (!v) return NaN;
  const cleaned = v.replace(/[$\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  return Number(cleaned);
};

const parseDate = (v: string): string => {
  if (!v) return new Date().toISOString();
  const n = Number(v);
  if (!isNaN(n) && n > 20000 && n < 60000) {
    // Excel serial date
    return new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString();
  }
  const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12).toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

export function FeriaBulkSalesUpload({ feriaId }: { feriaId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      ["Pocket Térmico", 2, 45000, "magical", "efectivo", "31/07/2026", "Consumidor Final", "222222222222", "", "", "", "Bogotá", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, "plantilla_ventas_feria.xlsx");
  };

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "", raw: false });
      const parsed: ParsedRow[] = raw.map((r) => {
        const product = pick(r, ["producto", "product", "nombre", "nombre del producto", "item", "descripcion"]);
        const qtyStr = pick(r, ["unidades", "cantidad", "qty", "quantity", "unidades vendidas"]);
        const priceStr = pick(r, ["precio unitario", "precio", "valor unitario", "precio de venta", "unit price", "valor"]);
        const qty = toNumber(qtyStr);
        const price = toNumber(priceStr);
        let error: string | null = null;
        if (!product) error = "Falta el producto";
        else if (!qty || isNaN(qty) || qty <= 0) error = "Unidades inválidas";
        else if (isNaN(price) || price < 0) error = "Precio inválido";
        return {
          brand: (pick(r, ["marca", "brand"]) || "otro").toLowerCase(),
          product_name: product,
          quantity: isNaN(qty) ? 0 : Math.round(qty),
          unit_price: isNaN(price) ? 0 : price,
          total_amount: (isNaN(qty) ? 0 : qty) * (isNaN(price) ? 0 : price),
          payment_method: pick(r, ["medio de pago", "metodo de pago", "pago", "forma de pago"]) || null,
          sale_date: parseDate(pick(r, ["fecha", "fecha de venta", "date"])),
          client_name: pick(r, ["cliente", "nombre cliente", "razon social"]) || null,
          client_document: pick(r, ["documento", "cedula", "nit", "cedula / nit", "documento/nit"]) || null,
          client_phone: pick(r, ["telefono", "celular", "phone"]) || null,
          client_email: pick(r, ["email", "correo"]) || null,
          client_address: pick(r, ["direccion", "address"]) || null,
          client_city: pick(r, ["ciudad", "city"]) || null,
          notes: pick(r, ["notas", "observaciones", "nota"]) || null,
          error,
        };
      }).filter((r) => r.product_name || r.quantity || r.unit_price);

      if (parsed.length === 0) {
        toast.error("El archivo no tiene filas válidas. Revisa los encabezados.");
        return;
      }
      setRows(parsed);
      setFileName(file.name);
    } catch (e: any) {
      toast.error("No se pudo leer el archivo: " + (e.message ?? ""));
    }
  };

  const valid = rows.filter((r) => !r.error);
  const invalid = rows.filter((r) => r.error);
  const totalUnits = valid.reduce((a, r) => a + r.quantity, 0);
  const totalAmount = valid.reduce((a, r) => a + r.total_amount, 0);

  const confirmUpload = async () => {
    if (valid.length === 0) { toast.error("No hay filas válidas para cargar"); return; }
    setSaving(true);
    try {
      const payload = valid.map((r) => ({
        feria_id: feriaId,
        brand: r.brand,
        product_name: r.product_name,
        quantity: r.quantity,
        unit_price: r.unit_price,
        total_amount: r.total_amount,
        payment_method: r.payment_method,
        sale_date: r.sale_date,
        client_name: r.client_name || "Cliente de mostrador",
        client_document: r.client_document,
        client_phone: r.client_phone,
        client_email: r.client_email,
        client_address: r.client_address,
        client_city: r.client_city,
        notes: [`[Carga masiva]`, r.notes].filter(Boolean).join(" "),
        recorded_by: user?.id ?? null,
      }));
      for (let i = 0; i < payload.length; i += 200) {
        const { error } = await supabase.from("feria_sales").insert(payload.slice(i, i + 200) as any);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["feria_sales", feriaId] });
      qc.invalidateQueries({ queryKey: ["feria_inventory", feriaId] });
      toast.success(`${valid.length} venta(s) cargadas por ${fmt(totalAmount)}`);
      setRows([]);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      toast.error("Error al cargar: " + (e.message ?? ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Carga masiva de ventas</h3>
          <p className="text-xs text-muted-foreground">
            Sube un Excel o CSV con: Producto, Unidades y Precio unitario (las demás columnas son opcionales).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" /> Plantilla
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Subir archivo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      </div>

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{fileName}</Badge>
            <Badge variant="outline">{valid.length} filas válidas</Badge>
            {invalid.length > 0 && (
              <Badge variant="outline" className="text-destructive border-destructive/40">
                {invalid.length} con error
              </Badge>
            )}
            <Badge variant="outline">{totalUnits} unidades</Badge>
            <Badge variant="outline">{fmt(totalAmount)}</Badge>
          </div>

          <div className="max-h-72 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Uds</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} className={r.error ? "bg-destructive/5" : undefined}>
                    <TableCell className="text-xs">{r.product_name || "—"}</TableCell>
                    <TableCell className="text-right text-xs">{r.quantity}</TableCell>
                    <TableCell className="text-right text-xs">{fmt(r.unit_price)}</TableCell>
                    <TableCell className="text-right text-xs font-medium">{fmt(r.total_amount)}</TableCell>
                    <TableCell className="text-xs">{r.payment_method ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {r.error ? <span className="text-destructive">{r.error}</span> : "OK"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2">
            <Button onClick={confirmUpload} disabled={saving || valid.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Cargar {valid.length} venta(s)
            </Button>
            <Button variant="ghost" onClick={() => { setRows([]); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}