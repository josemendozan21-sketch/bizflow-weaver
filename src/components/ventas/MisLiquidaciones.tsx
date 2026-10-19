import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { SettlementsView } from "@/components/commissions/SettlementsView";

export default function MisLiquidaciones() {
  const { user } = useAuth() as any;
  const { data: orders = [] } = useOrders();
  if (!user?.id) return null;
  return <SettlementsView orders={orders.filter((o) => o.advisor_id === user.id)} mode="asesor" advisorId={user.id} />;
}
