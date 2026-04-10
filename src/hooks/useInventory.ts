import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SupabaseStockItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  available: number;
  unit: string;
  min_stock: number;
  product_type: string | null;
  color: string | null;
  logo: string | null;
  sweatspot_category: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseBodyStock {
  id: string;
  brand: string;
  referencia: string;
  available: number;
  created_at: string;
  updated_at: string;
}

export function useInventory() {
  const [stockItems, setStockItems] = useState<SupabaseStockItem[]>([]);
  const [bodyStock, setBodyStock] = useState<SupabaseBodyStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial data
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const [stockRes, bodyRes] = await Promise.all([
      supabase.from("stock_items").select("*"),
      supabase.from("body_stock").select("*"),
    ]);

    if (stockRes.data) setStockItems(stockRes.data as unknown as SupabaseStockItem[]);
    if (bodyRes.data) setBodyStock(bodyRes.data as unknown as SupabaseBodyStock[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("inventory-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_items" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setStockItems((prev) => [...prev, payload.new as unknown as SupabaseStockItem]);
          } else if (payload.eventType === "UPDATE") {
            setStockItems((prev) =>
              prev.map((item) =>
                item.id === (payload.new as any).id ? (payload.new as unknown as SupabaseStockItem) : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setStockItems((prev) => prev.filter((item) => item.id !== (payload.old as any).id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "body_stock" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setBodyStock((prev) => [...prev, payload.new as unknown as SupabaseBodyStock]);
          } else if (payload.eventType === "UPDATE") {
            setBodyStock((prev) =>
              prev.map((item) =>
                item.id === (payload.new as any).id ? (payload.new as unknown as SupabaseBodyStock) : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setBodyStock((prev) => prev.filter((item) => item.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * Discount stock from stock_items by item name.
   * Matches by ILIKE on name. Decrements `available`.
   */
  const discountStock = useCallback(
    async (
      itemName: string,
      amount: number
    ): Promise<{ success: boolean; message: string }> => {
      // Find the item locally first
      const item = stockItems.find(
        (s) => s.name.toLowerCase().includes(itemName.toLowerCase())
      );
      if (!item) {
        return { success: false, message: `Producto "${itemName}" no encontrado en inventario.` };
      }

      const newAvailable = Math.max(0, item.available - amount);
      const { error } = await supabase
        .from("stock_items")
        .update({ available: newAvailable } as any)
        .eq("id", item.id);

      if (error) {
        console.error("Error discounting stock:", error);
        return { success: false, message: `Error al actualizar inventario: ${error.message}` };
      }

      const wasInsufficient = item.available < amount;
      if (wasInsufficient) {
        return {
          success: true,
          message: `⚠️ Stock insuficiente de "${item.name}". Se descontaron ${item.available} de ${amount} requeridos. Reabastecer.`,
        };
      }

      return {
        success: true,
        message: `Se descontaron ${amount} de "${item.name}". Nuevo stock: ${newAvailable}.`,
      };
    },
    [stockItems]
  );

  /**
   * Reserve body stock from body_stock table.
   * Checks available, discounts what's possible, returns result.
   */
  const reserveBodyStock = useCallback(
    async (
      brand: string,
      referencia: string,
      qty: number,
      options?: { clientName?: string; requestedBy?: string }
    ): Promise<{ available: boolean; discounted: number; message: string }> => {
      console.log("reserveBodyStock called:", { brand, referencia, qty });
      console.log("bodyStock available:", bodyStock);

      const item = bodyStock.find(
        (b) =>
          b.brand.toLowerCase() === brand.toLowerCase() && (
            b.referencia.toLowerCase() === referencia.toLowerCase() ||
            b.referencia.toLowerCase().includes(referencia.toLowerCase()) ||
            referencia.toLowerCase().includes(b.referencia.toLowerCase())
          )
      );
      console.log("matched item:", item);

      if (!item || item.available <= 0) {
        // Auto-create supply order when no stock found
        if (options?.requestedBy) {
          await supabase.from("production_supply_orders").insert({
            brand,
            item_name: referencia,
            item_type: "cuerpos",
            quantity_requested: qty,
            unit: "Unidades",
            notes: `Auto-generado por pedido de ${options.clientName || "cliente"}`,
            requested_by: options.requestedBy,
          } as any);
        }
        return {
          available: false,
          discounted: 0,
          message: `Sin stock de cuerpos para "${referencia}" (${brand}). Se requieren ${qty} unidades.`,
        };
      }

      const toDiscount = Math.min(item.available, qty);
      const remaining = qty - toDiscount;
      const newAvailable = item.available - toDiscount;

      const { error } = await supabase
        .from("body_stock")
        .update({ available: newAvailable } as any)
        .eq("id", item.id);

      if (error) {
        console.error("Error reserving body stock:", error);
        return {
          available: false,
          discounted: 0,
          message: `Error al reservar cuerpos: ${error.message}`,
        };
      }

      // If partial stock, also create supply order for remaining
      if (remaining > 0 && options?.requestedBy) {
        await supabase.from("production_supply_orders").insert({
          brand,
          item_name: referencia,
          item_type: "cuerpos",
          quantity_requested: remaining,
          unit: "Unidades",
          notes: `Auto-generado (parcial) por pedido de ${options.clientName || "cliente"}`,
          requested_by: options.requestedBy,
        } as any);
      }

      if (remaining > 0) {
        return {
          available: true,
          discounted: toDiscount,
          message: `Stock parcial de "${referencia}". Descontados: ${toDiscount}, faltan: ${remaining} uds.`,
        };
      }

      return {
        available: true,
        discounted: toDiscount,
        message: `Se reservaron ${toDiscount} uds. de "${referencia}".`,
      };
    },
    [bodyStock]
  );

  /**
   * Add or upsert stock into stock_items.
   * If an item with the same name+category+brand exists, increments available.
   * Otherwise inserts a new row.
   */
  const addStock = useCallback(
    async (
      itemName: string,
      amount: number,
      category: string,
      brand: string,
      unit: string
    ): Promise<{ success: boolean; message: string }> => {
      const existing = stockItems.find(
        (s) =>
          s.name.toLowerCase() === itemName.toLowerCase() &&
          s.category === category &&
          s.brand === brand
      );

      if (existing) {
        const newAvailable = existing.available + amount;
        const { error } = await supabase
          .from("stock_items")
          .update({ available: newAvailable } as any)
          .eq("id", existing.id);

        if (error) {
          return { success: false, message: `Error al actualizar: ${error.message}` };
        }
        return { success: true, message: `Se agregaron ${amount} ${unit} a "${itemName}". Nuevo total: ${newAvailable}.` };
      }

      const { error } = await supabase.from("stock_items").insert({
        name: itemName,
        category,
        brand,
        available: amount,
        unit,
        min_stock: 0,
      } as any);

      if (error) {
        return { success: false, message: `Error al insertar: ${error.message}` };
      }
      return { success: true, message: `Se creó "${itemName}" con ${amount} ${unit}.` };
    },
    [stockItems]
  );

  return {
    stockItems,
    bodyStock,
    isLoading,
    discountStock,
    reserveBodyStock,
    addStock,
    refetch: fetchAll,
  };
}
