import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MovementDirection = "entrega" | "retorno";
export type MovementArea = "produccion" | "estampacion" | "logistica" | "asesor_comercial" | "feria";
export type MovementKind = "entrada" | "salida" | "reserva" | "liberar_reserva";

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
  requested_by_name?: string | null;
  purpose?: string | null;
  movement_kind?: MovementKind;
  supplier?: string | null;
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
  requested_by_name?: string | null;
  purpose?: string | null;
  movement_kind?: MovementKind;
  supplier?: string | null;
}

// Shared module-level cache so multiple components see the same data
let cachedMovements: InventoryMovement[] = [];
const listeners = new Set<(m: InventoryMovement[]) => void>();
const notify = () => listeners.forEach((l) => l(cachedMovements));

export function useInventoryMovements() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<InventoryMovement[]>(cachedMovements);
  const [isLoading, setIsLoading] = useState(cachedMovements.length === 0);
  const mounted = useRef(true);

  const fetchAll = useCallback(async () => {
    if (mounted.current) setIsLoading(true);
    const { data } = await supabase
      .from("inventory_movements" as any)
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(200);
    cachedMovements = (data as unknown as InventoryMovement[]) || [];
    notify();
    if (mounted.current) setIsLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const listener = (m: InventoryMovement[]) => setMovements(m);
    listeners.add(listener);
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
      mounted.current = false;
      listeners.delete(listener);
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const createMovement = useCallback(
    async (input: CreateMovementInput) => {
      if (!user) return { success: false, message: "No autenticado" };
      const { data, error } = await supabase
        .from("inventory_movements" as any)
        .insert({
          ...input,
          recorded_by: user.id,
          recorded_by_name: user.email || "Inventarios",
        } as any)
        .select()
        .single();
      if (error) return { success: false, message: error.message };
      if (data) {
        cachedMovements = [data as unknown as InventoryMovement, ...cachedMovements];
        notify();
      }
      // Also refetch in background to stay in sync
      fetchAll();
      return { success: true, message: input.direction === "entrega" ? "Entrega registrada" : "Retorno registrado" };
    },
    [user, fetchAll],
  );

  return { movements, isLoading, refetch: fetchAll, createMovement };
}