import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OrderRequirement {
  id: string;
  order_id: string;
  order_code: string | null;
  brand: string;
  category: string;
  stock_item_id: string | null;
  item_name: string;
  product_type: string | null;
  color: string | null;
  logo: string | null;
  ref_key: string;
  quantity_required: number;
  quantity_covered: number;
  quantity_missing: number;
  status: "pendiente" | "confirmado" | "cancelado";
  confirmed_by_name: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export function useOrderRequirements() {
  const [requirements, setRequirements] = useState<OrderRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("order_requirements" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setRequirements((data as unknown as OrderRequirement[]) || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`order-reqs-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_requirements" },
        () => fetchAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const confirmRequirement = useCallback(
    async (id: string, quantity?: number) => {
      const { data, error } = await supabase.rpc("confirm_order_requirement" as any, {
        _requirement_id: id,
        _confirm_quantity: quantity ?? null,
      });
      if (error) return { success: false, message: error.message };
      const res = data as unknown as { ok: boolean; message?: string; covered?: number; missing?: number };
      if (!res?.ok) return { success: false, message: res?.message || "No se pudo confirmar" };
      await fetchAll();
      return {
        success: true,
        message: `Confirmado: ${res.covered ?? 0} desde inventario, ${res.missing ?? 0} a producción`,
      };
    },
    [fetchAll],
  );

  return { requirements, isLoading, refetch: fetchAll, confirmRequirement };
}
