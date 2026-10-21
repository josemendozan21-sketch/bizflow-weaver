import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { SettlementsView } from "@/components/commissions/SettlementsView";
import { CommissionPanel } from "@/components/commissions/CommissionPanel";

export default function MisLiquidaciones() {
  const { user } = useAuth() as any;
  const { data: orders = [] } = useOrders();
  if (!user?.id) return null;
  const mine = orders.filter((o) => o.advisor_id === user.id);
  return (
    <div className="space-y-6">
      <CommissionPanel orders={mine} mode="asesor" advisorId={user.id} />
      <SettlementsView orders={mine} mode="asesor" advisorId={user.id} />
    </div>
  );
}
