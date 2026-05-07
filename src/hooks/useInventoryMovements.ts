import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MovementDirection = "entrega" | "retorno";
export type MovementArea = "produccion" | "estampacion" | "logistica" | "asesor_comercial" | "feria";

export interface InventoryMovement {
  id: string;
  stock_item_id: string | null;
  item_name: string;
  brand: string;
  category: string;
  quantity: number;
  direction: MovementDirection;
  area: MovementArea;
  feria_id: string | null;
  reason: string | null;
  order_id: string | null;
  recorded_by: string | null;
  recorded_by_name: string | null;
  recorded_at: string;
  created_at: string;
}

export interface CreateMovementInput {
  stock_item_id: string;
  item_name: string;
  brand: string;
  category: string;
  quantity: number;
  direction: MovementDirection;
  area: MovementArea;
  feria_id?: string | null;
  reason?: string | null;
  order_id?: string | null;
}

export function useInventoryMovements() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("inventory_movements" as any)
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(200);
    setMovements((data as unknown as InventoryMovement[]) || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`inv-movements-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_movements" },
        () => fetchAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const createMovement = useCallback(
    async (input: CreateMovementInput) => {
      if (!user) return { success: false, message: "No autenticado" };
      const { error } = await supabase.from("inventory_movements" as any).insert({
        ...input,
        recorded_by: user.id,
        recorded_by_name: user.email || "Inventarios",
      } as any);
      if (error) return { success: false, message: error.message };
      return { success: true, message: input.direction === "entrega" ? "Entrega registrada" : "Retorno registrado" };
    },
    [user],
  );

  return { movements, isLoading, refetch: fetchAll, createMovement };
}