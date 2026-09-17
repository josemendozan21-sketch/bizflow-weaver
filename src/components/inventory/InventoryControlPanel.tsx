import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DebouncedSearchInput from "@/components/inventory/DebouncedSearchInput";

interface ControlRow {
  stock_item_id: string;
  ref_key: string;
  name: string;
  brand: string;
  category: string;
  product_type: string | null;
  disponible_bodega: number;
  en_proceso: number;
  asignado_punto92: number;
  asignado_ferias: number;
  total_controlado: number;
}

const n = (v: number) => Number(v || 0).toLocaleString("es-CO");

/** Control por referencia: dónde está cada unidad controlada desde Bodega. */
export default function InventoryControlPanel() {
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["inventory_control_view"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_control_view")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as ControlRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.brand?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.ref_key?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (a, r) => ({
          bodega: a.bodega + Number(r.disponible_bodega),
          proceso: a.proceso + Number(r.en_proceso),
          punto: a.punto + Number(r.asignado_punto92),
          ferias: a.ferias + Number(r.asignado_ferias),
          total: a.total + Number(r.total_controlado),
        }),
        { bodega: 0, proceso: 0, punto: 0, ferias: 0, total: 0 },
      ),
    [filtered],
  );

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Control por referencia</h3>
      </div>
      <DebouncedSearchInput value={search} onChange={setSearch} placeholder="Buscar referencia, marca o clave…" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
        {[
          ["Disponible Bodega", totals.bodega],
          ["En proceso", totals.proceso],
          ["En la 92", totals.punto],
          ["En ferias", totals.ferias],
          ["Total controlado", totals.total],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-md border p-2">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold">{n(value as number)}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Cargando…</p>
      ) : (
        <div className="max-h-[560px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead className="text-right">Bodega</TableHead>
                <TableHead className="text-right">En proceso</TableHead>
                <TableHead className="text-right">92</TableHead>
                <TableHead className="text-right">Ferias</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                    Sin referencias
                  </TableCell>
                </TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.stock_item_id}>
                  <TableCell className="text-xs">
                    {r.name}
                    {r.product_type ? <span className="text-muted-foreground"> · {r.product_type}</span> : null}
                    <div className="text-[10px] text-muted-foreground">{r.category}</div>
                  </TableCell>
                  <TableCell className="text-xs capitalize">{r.brand}</TableCell>
                  <TableCell className="text-right text-xs font-medium">{n(r.disponible_bodega)}</TableCell>
                  <TableCell className="text-right text-xs">{n(r.en_proceso)}</TableCell>
                  <TableCell className="text-right text-xs">{n(r.asignado_punto92)}</TableCell>
                  <TableCell className="text-right text-xs">{n(r.asignado_ferias)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold">{n(r.total_controlado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
