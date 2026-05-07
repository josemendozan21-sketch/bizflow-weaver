import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface InventoryRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_area: string;
  brand: string;
  category: string;
  stock_item_id: string | null;
  item_name: string;
  quantity: number;
  reason: string | null;
  status: "pendiente" | "aprobada" | "rechazada";
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useInventoryRequests() {
  const { user, role } = useAuth();
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("inventory_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setRequests((data as unknown as InventoryRequest[]) || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`inv-requests-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_requests" },
        () => fetchAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const createRequest = useCallback(
    async (input: {
      brand: string;
      category: "cuerpos_referencias" | "producto_terminado";
      stock_item_id?: string | null;
      item_name: string;
      quantity: number;
      reason?: string;
      area?: string;
      order_id?: string | null;
      requester_name?: string;
    }) => {
      if (!user) return { success: false, message: "No autenticado" };
      const area = input.area || role || "asesor_comercial";
      const { error } = await supabase.from("inventory_requests" as any).insert({
        requester_id: user.id,
        requester_name: input.requester_name || user.email || "Usuario",
        requester_area: area,
        brand: input.brand,
        category: input.category,
        stock_item_id: input.stock_item_id || null,
        item_name: input.item_name,
        quantity: input.quantity,
        reason: input.reason || null,
        order_id: input.order_id || null,
      } as any);
      if (error) return { success: false, message: error.message };
      return { success: true, message: "Solicitud enviada" };
    },
    [user, role],
  );

  const approve = useCallback(
    async (id: string) => {
      if (!user) return { success: false, message: "No autenticado" };
      const { error } = await supabase
        .from("inventory_requests" as any)
        .update({
          status: "aprobada",
          reviewed_by: user.id,
          reviewed_by_name: user.email || "Inventarios",
        } as any)
        .eq("id", id);
      if (error) return { success: false, message: error.message };
      return { success: true, message: "Aprobada y descontada" };
    },
    [user],
  );

  const reject = useCallback(
    async (id: string, rejection_reason: string) => {
      if (!user) return { success: false, message: "No autenticado" };
      const { error } = await supabase
        .from("inventory_requests" as any)
        .update({
          status: "rechazada",
          rejection_reason,
          reviewed_by: user.id,
          reviewed_by_name: user.email || "Inventarios",
        } as any)
        .eq("id", id);
      if (error) return { success: false, message: error.message };
      return { success: true, message: "Rechazada" };
    },
    [user],
  );

  return { requests, isLoading, refetch: fetchAll, createRequest, approve, reject };
}