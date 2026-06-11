import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PosSale, PosMovement, PosProduct,
  usePosCashWithdrawals,
} from "@/hooks/usePuntosVenta";
import { TrendingUp, DollarSign, Package, History, Receipt, Banknote, BarChart3, Wallet } from "lucide-react";
import { PuntoVentasDelDia } from "./PuntoVentasDelDia";
import { PuntoRetiros } from "./PuntoRetiros";
import type { InvoiceLocation } from "@/lib/posInvoicePdf";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  sales: PosSale[];
  movements: PosMovement[];
  products: PosProduct[];
  locationId: string;
  location: InvoiceLocation;
  cashBase?: number;
};

function methodMatches(method: string | null | undefined, target: string) {
  return (method ?? "").toLowerCase().split("+").some((p) => p.trim() === target);
}

export function PuntoReportes({ sales, movements, products, locationId, location, cashBase = 0 }: Props) {
  const { data: withdrawals = [] } = usePosCashWithdrawals(locationId);
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = useMemo(() => sales.filter((s) => s.sale_date.slice(0, 10) === today), [sales, today]);
  const totals = useMemo(() => {
    const totalToday = todaySales.reduce((a, b) => a + Number(b.total_amount), 0);
    const totalAll = sales.reduce((a, b) => a + Number(b.total_amount), 0);
    const profitAll = sales.reduce(
      (a, b) => a + (Number(b.total_amount) - Number(b.total_cost)),
      0
    );
    const inventoryValue = products.reduce(
      (a, b) => a + Number(b.available) * Number(b.avg_cost),
      0
    );
    const byMethod = (m: string) =>
      todaySales
        .filter((s) => methodMatches(s.payment_method, m))
        .reduce((a, b) => a + Number(b.total_amount), 0);
    const withdrawalsToday = withdrawals
      .filter((w) => w.status === "aprobado" && w.created_at.slice(0, 10) === today)
      .reduce((a, b) => a + Number(b.amount), 0);
    const efectivo = byMethod("efectivo");
    return {
      totalToday,
      totalAll,
      profitAll,
      inventoryValue,
      efectivo,
      tarjeta: byMethod("tarjeta"),
      nequi: byMethod("nequi"),
      otros: byMethod("transferencia") + byMethod("otro"),
      countToday: todaySales.length,
      withdrawalsToday,
      cashOnHand: cashBase + efectivo - withdrawalsToday,
    };
  }, [sales, products, today, withdrawals, cashBase, todaySales]);

  return (
    <Tabs defaultValue="resumen" className="space-y-4">
      <TabsList>
        <TabsTrigger value="resumen"><BarChart3 className="h-4 w-4 mr-1" /> Resumen</TabsTrigger>
        <TabsTrigger value="ventas-dia"><Receipt className="h-4 w-4 mr-1" /> Ventas del día</TabsTrigger>
        <TabsTrigger value="retiros"><Wallet className="h-4 w-4 mr-1" /> Caja</TabsTrigger>
        
      </TabsList>

      <TabsContent value="resumen" className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<DollarSign className="h-4 w-4" />} label="Ventas hoy" value={`$${totals.totalToday.toLocaleString()}`} sub={`${totals.countToday} ticket(s)`} />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Ventas totales" value={`$${totals.totalAll.toLocaleString()}`} />
        {isAdmin && (
          <Stat icon={<TrendingUp className="h-4 w-4" />} label="Utilidad acumulada" value={`$${totals.profitAll.toLocaleString()}`} />
        )}
        <Stat icon={<Package className="h-4 w-4" />} label="Valor inventario" value={`$${totals.inventoryValue.toLocaleString()}`} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat icon={<Banknote className="h-4 w-4" />} label="Efectivo en caja hoy"
          value={`$${totals.cashOnHand.toLocaleString()}`}
          sub={`Base $${cashBase.toLocaleString()} + Ventas $${totals.efectivo.toLocaleString()} − Retiros $${totals.withdrawalsToday.toLocaleString()}`} />
        <Stat icon={<DollarSign className="h-4 w-4" />} label="Tarjeta hoy"
          value={`$${totals.tarjeta.toLocaleString()}`} />
        <Stat icon={<DollarSign className="h-4 w-4" />} label="Nequi / Transf hoy"
          value={`$${(totals.nequi + totals.otros).toLocaleString()}`} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Métodos de pago hoy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-muted-foreground">Efectivo:</span> <span className="font-bold">${totals.efectivo.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Tarjeta:</span> <span className="font-bold">${totals.tarjeta.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Nequi:</span> <span className="font-bold">${totals.nequi.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Transf./Otro:</span> <span className="font-bold">${totals.otros.toLocaleString()}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-5 w-5" /> Últimas ventas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aún no hay ventas hoy.</p>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {todaySales.map((s) => (
                <div key={s.id} className="flex justify-between items-center text-sm border-b py-2 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">${Number(s.total_amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.sale_date).toLocaleString()} · {s.payment_method ?? "—"}
                      {s.client_name ? ` · ${s.client_name}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{s.recorded_by_name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="ventas-dia">
        <PuntoVentasDelDia sales={sales} location={location} locationId={locationId} />
      </TabsContent>

      <TabsContent value="retiros">
        <PuntoRetiros locationId={locationId} cashBase={cashBase} />
      </TabsContent>
    </Tabs>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <p className="text-lg font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}
