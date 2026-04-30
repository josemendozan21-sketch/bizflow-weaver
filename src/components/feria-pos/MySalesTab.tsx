import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Package } from "lucide-react";
import { format } from "date-fns";
import type { FeriaSale } from "@/hooks/useFerias";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function MySalesTab({ feriaId, sales }: { feriaId: string; sales: FeriaSale[] }) {
  const { user } = useAuth();

  // Need recorded_by to filter; sales hook returns all so we re-fetch with filter
  const { data: mySales = [] } = useQuery({
    queryKey: ["my_feria_sales", feriaId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("feria_sales")
        .select("*")
        .eq("feria_id", feriaId)
        .eq("recorded_by", user.id)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data as FeriaSale[];
    },
    enabled: !!user?.id && !!feriaId,
  });

  const stats = useMemo(() => {
    const total = mySales.reduce((s, x) => s + Number(x.total_amount), 0);
    const units = mySales.reduce((s, x) => s + x.quantity, 0);
    return { total, units, count: mySales.length };
  }, [mySales]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          <div><p className="text-xs text-muted-foreground">Mis ingresos</p><p className="text-lg font-semibold">${stats.total.toLocaleString()}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Package className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Unidades</p><p className="text-lg font-semibold">{stats.units}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div><p className="text-xs text-muted-foreground">Ventas</p><p className="text-lg font-semibold">{stats.count}</p></div>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Cliente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mySales.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Aún no has registrado ventas</TableCell></TableRow>
            ) : mySales.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{format(new Date(s.sale_date), "dd/MM HH:mm")}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-[10px]">{s.brand}</Badge>
                    {s.product_name}
                  </div>
                </TableCell>
                <TableCell className="text-right">{s.quantity}</TableCell>
                <TableCell className="text-right font-medium">${Number(s.total_amount).toLocaleString()}</TableCell>
                <TableCell className="capitalize">{s.payment_method || "—"}</TableCell>
                <TableCell>{s.client_name || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}