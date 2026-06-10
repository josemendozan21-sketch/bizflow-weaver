import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LOCATION_92 = "73050f3b-1c8e-44f1-9d0d-94772216c100";

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n || 0);

interface Row {
  product_name: string;
  brand: string | null;
  units: number;
  revenue: number;
}

export function TopProductsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      const { data: sales } = await supabase
        .from("pos_sales")
        .select("id")
        .eq("location_id", LOCATION_92)
        .gte("sale_date", start.toISOString());

      const ids = (sales ?? []).map((s: any) => s.id);
      if (ids.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: items } = await supabase
        .from("pos_sale_items")
        .select("product_name, brand, quantity, line_total")
        .in("sale_id", ids);

      const map = new Map<string, Row>();
      for (const it of items ?? []) {
        const key = `${it.product_name}__${it.brand ?? ""}`;
        const cur = map.get(key) ?? {
          product_name: it.product_name,
          brand: it.brand,
          units: 0,
          revenue: 0,
        };
        cur.units += Number(it.quantity || 0);
        cur.revenue += Number(it.line_total || 0);
        map.set(key, cur);
      }
      setRows(
        Array.from(map.values())
          .sort((a, b) => b.units - a.units)
          .slice(0, 10),
      );
      setLoading(false);
    })();
  }, []);

  const monthLabel = new Date().toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Productos más rotados — Punto 92
          <Badge variant="secondary" className="ml-auto capitalize text-xs">
            {monthLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay ventas registradas este mes.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div
                key={`${r.product_name}-${i}`}
                className="flex items-center justify-between gap-3 text-sm border-b last:border-0 pb-2 last:pb-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 text-xs text-muted-foreground tabular-nums">
                    {i + 1}.
                  </span>
                  <span className="font-medium truncate">{r.product_name}</span>
                  {r.brand && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      {r.brand}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs">{r.units} uds</span>
                  <span className="font-semibold text-emerald-700 tabular-nums">
                    {fmtCOP(r.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}