import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Remove accents/diacritics for reliable comparison */
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export type StockStatus = "ok" | "bajo" | "critico";

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

export function getStockStatus(item: SupabaseStockItem): StockStatus {
  if (item.min_stock <= 0) return "ok";
  if (item.available <= item.min_stock * 0.3) return "critico";
  if (item.available <= item.min_stock) return "bajo";
  return "ok";
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
      .channel(`inventory-realtime-${Math.random().toString(36).slice(2)}`)
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
   */
  const discountStock = useCallback(
    async (
      itemName: string,
      amount: number
    ): Promise<{ success: boolean; message: string }> => {
      const { data: freshItems } = await supabase
        .from("stock_items")
        .select("*");

      const searchPool = (freshItems as unknown as SupabaseStockItem[]) || stockItems;
      const normalizedName = normalize(itemName);

      // Try exact match first, then partial match (both directions)
      let item = searchPool.find(
        (s) => normalize(s.name) === normalizedName
      );
      if (!item) {
        item = searchPool.find(
          (s) => normalize(s.name).includes(normalizedName) || normalizedName.includes(normalize(s.name))
        );
      }

      if (!item) {
        console.warn(`[discountStock] No match for "${itemName}" among:`, searchPool.map(s => s.name));
        return { success: false, message: `Producto "${itemName}" no encontrado en inventario.` };
      }

      // El descuento automático lo aplica el sistema (función segura en la base de
      // datos): no depende de los permisos de edición del usuario y nunca deja el
      // inventario en negativo. Queda registrado en la bitácora de inventario.
      const { data: res, error } = await supabase.rpc("consume_stock_item" as any, {
        _item_id: item.id,
        _amount: amount,
        _reason: `Consumo automático — ${itemName}`,
      } as any);

      if (error) {
        return { success: false, message: `Error al actualizar inventario: ${error.message}` };
      }

      const result = (res || {}) as { applied?: number; shortfall?: number; new_available?: number };
      if ((result.shortfall ?? 0) > 0) {
        return {
          success: true,
          message: `⚠️ Stock insuficiente de "${item.name}". Se descontaron ${result.applied ?? 0} de ${amount} requeridos. Reabastecer.`,
        };
      }

      return {
        success: true,
        message: `Se descontaron ${amount} de "${item.name}". Nuevo stock: ${result.new_available ?? 0}.`,
      };
    },
    [stockItems]
  );

  /**
   * Reserve body stock from body_stock table.
   */
  const reserveBodyStock = useCallback(
    async (
      brand: string,
      referencia: string,
      qty: number,
      options?: { clientName?: string; requestedBy?: string }
    ): Promise<{ available: boolean; discounted: number; message: string }> => {
      const { data: freshBodyStock } = await supabase
        .from("body_stock")
        .select("*")
        .ilike("brand", brand);

      const stockToSearch = (freshBodyStock as unknown as SupabaseBodyStock[]) || bodyStock;

      const normalizedRef = normalize(referencia);
      const normalizedBrand = normalize(brand);

      // Detect product_type suffix in referencia (e.g. "Multiusos (Térmico)")
      const typeMatch = referencia.match(/\(([^)]+)\)\s*$/);
      const refType = typeMatch ? normalize(typeMatch[1]) : "";
      const isTermico = /(termico|calor)/.test(refType);
      const isFrio = /frio/.test(refType);

      const brandPool = stockToSearch.filter(
        (b) => normalize(b.brand) === normalizedBrand,
      );

      // 1) Exact match first
      let item = brandPool.find((b) => normalize(b.referencia) === normalizedRef);
      // 2) Then fuzzy, but respecting product_type when present
      if (!item) {
        item = brandPool.find((b) => {
          const bn = normalize(b.referencia);
          const bIsTermico = /(termico|calor)/.test(bn);
          const bIsFrio = /frio/.test(bn);
          if (isTermico && !bIsTermico) return false;
          if (isFrio && !bIsFrio) return false;
          if (!isTermico && !isFrio && (bIsTermico || bIsFrio)) return false;
          return bn.includes(normalizedRef) || normalizedRef.includes(bn);
        });
      }

      if (!item) {
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

      // Clamp: never reserve more than what's available. If stock is 0 or negative,
      // discount nothing and request the full quantity from production.
      const currentAvailable = Math.max(item.available, 0);
      const toDiscount = Math.min(currentAvailable, qty);
      const remaining = qty - toDiscount;
      const newAvailable = item.available - toDiscount;

      const { error } = await supabase
        .from("body_stock")
        .update({ available: newAvailable } as any)
        .eq("id", item.id);

      if (error) {
        return {
          available: false,
          discounted: 0,
          message: `Error al reservar cuerpos: ${error.message}`,
        };
      }

      // Also discount from stock_items (cuerpos_referencias) to keep UI in sync
      const refBase = referencia.replace(/\s*\(.*?\)\s*$/, "").trim();
      const normalizedRefBase = normalize(refBase);
      const { data: stockItemsForBrand } = await supabase
        .from("stock_items")
        .select("*")
        .eq("brand", brand)
        .eq("category", "cuerpos_referencias");

      if (stockItemsForBrand) {
        const pool = stockItemsForBrand as unknown as SupabaseStockItem[];
        // Filter by product_type when the referencia carried a type marker
        const typed = pool.filter((si) => {
          const pt = normalize(si.product_type || "");
          if (isTermico) return /(termico|calor)/.test(pt);
          if (isFrio) return /frio/.test(pt);
          return true;
        });
        const candidates = typed.length > 0 ? typed : pool;
        const matchingStockItem =
          candidates.find((si) => normalize(si.name) === normalizedRefBase) ||
          candidates.find(
            (si) =>
              normalize(si.name).includes(normalizedRefBase) ||
              normalizedRefBase.includes(normalize(si.name)),
          );
        if (matchingStockItem) {
          await supabase.rpc("consume_stock_item" as any, {
            _item_id: matchingStockItem.id,
            _amount: qty,
            _reason: `Reserva de cuerpos — ${referencia}`,
          } as any);
        }
      }

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
          available: toDiscount > 0,
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

  /**
   * Add a new stock item (for CategorizedInventoryPanel).
   */
  const addStockItem = useCallback(
    async (item: {
      brand: string;
      category: string;
      name: string;
      available: number;
      unit: string;
      min_stock: number;
      product_type?: string | null;
      color?: string | null;
      logo?: string | null;
      sweatspot_category?: string | null;
    }): Promise<{ success: boolean; message: string }> => {
      if (item.available < 0 || item.min_stock < 0) {
        return { success: false, message: "Las cantidades no pueden ser negativas." };
      }
      const { error } = await supabase.from("stock_items").insert({
        name: item.name,
        category: item.category,
        brand: item.brand,
        available: item.available,
        unit: item.unit,
        min_stock: item.min_stock,
        product_type: item.product_type || null,
        color: item.color || null,
        logo: item.logo || null,
        sweatspot_category: item.sweatspot_category || null,
      } as any);

      if (error) {
        return { success: false, message: `Error al insertar: ${error.message}` };
      }
      return { success: true, message: `Se creó "${item.name}" exitosamente.` };
    },
    []
  );

  /**
   * Update a stock item by ID.
   */
  const updateStockItem = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        brand?: string;
        unit?: string;
        available?: number;
        min_stock?: number;
        logo?: string | null;
        product_type?: string | null;
      }

    ): Promise<{ success: boolean; message: string }> => {
      if (typeof updates.available === "number" && updates.available < 0) {
        return {
          success: false,
          message: "La cantidad disponible no puede ser negativa. Registra una entrada para reabastecer.",
        };
      }
      if (typeof updates.min_stock === "number" && updates.min_stock < 0) {
        return { success: false, message: "El mínimo no puede ser negativo." };
      }
      const { error } = await supabase
        .from("stock_items")
        .update(updates as any)
        .eq("id", id);

      if (error) {
        return { success: false, message: `Error al actualizar: ${error.message}` };
      }
      return { success: true, message: "Inventario actualizado." };
    },
    []
  );

  /**
   * Delete a stock item by ID.
   */
  const deleteStockItem = useCallback(
    async (id: string): Promise<{ success: boolean; message: string }> => {
      const { error } = await supabase
        .from("stock_items")
        .delete()
        .eq("id", id);

      if (error) {
        return { success: false, message: `Error al eliminar: ${error.message}` };
      }
      return { success: true, message: "Ítem eliminado." };
    },
    []
  );

  return {
    stockItems,
    bodyStock,
    isLoading,
    discountStock,
    reserveBodyStock,
    addStock,
    addStockItem,
    updateStockItem,
    deleteStockItem,
    getStockStatus,
    refetch: fetchAll,
  };
}
