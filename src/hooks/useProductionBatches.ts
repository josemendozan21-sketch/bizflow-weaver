import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BatchStatus = "abierto" | "en_proceso" | "finalizado" | "recibido";

export interface ProductionBatch {
  id: string;
  batch_number: number;
  ref_key: string;
  brand: string;
  category: string;
  stock_item_id: string | null;
  item_name: string;
  product_type: string | null;
  color: string | null;
  logo: string | null;
  target_quantity: number;
  produced_quantity: number | null;
  received_quantity: number | null;
  status: BatchStatus;
  started_at: string | null;
  started_by_name: string | null;
  finished_at: string | null;
  finished_by_name: string | null;
  received_at: string | null;
  received_by_name: string | null;
  return_reason: string | null;
  returned_at: string | null;
  returned_by_name: string | null;
  return_count: number | null;
  created_at: string;
}


export interface ProductionBatchItem {
  id: string;
  batch_id: string;
  order_id: string | null;
  order_code: string | null;
  client_name: string | null;
  quantity: number;
  created_at: string;
}

export function useProductionBatches() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [items, setItems] = useState<ProductionBatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const [{ data: b }, { data: i }] = await Promise.all([
      supabase
        .from("production_batches" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("production_batch_items" as any)
        .select("*")
        .order("created_at", { ascending: true })
        .limit(2000),
    ]);
    setBatches((b as unknown as ProductionBatch[]) || []);
    setItems((i as unknown as ProductionBatchItem[]) || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`prod-batches-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "production_batches" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "production_batch_items" }, () => fetchAll())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const call = useCallback(
    async (fn: string, params: Record<string, unknown>, fallback: string) => {
      const { data, error } = await supabase.rpc(fn as any, params as any);
      if (error) return { success: false, message: error.message };
      const res = data as unknown as { ok: boolean; message?: string };
      if (!res?.ok) return { success: false, message: res?.message || fallback };
      await fetchAll();
      return { success: true, message: fallback };
    },
    [fetchAll],
  );

  const startBatch = useCallback(
    (id: string) => call("start_production_batch", { _batch_id: id }, "Producción iniciada"),
    [call],
  );

  const finishBatch = useCallback(
    (id: string, produced: number) =>
      call("finish_production_batch", { _batch_id: id, _produced: produced }, "Lote finalizado"),
    [call],
  );

  const receiveBatch = useCallback(
    (id: string, received: number) =>
      call("receive_production_batch", { _batch_id: id, _received: received }, "Recepción confirmada"),
    [call],
  );

  const itemsOf = useCallback((batchId: string) => items.filter((i) => i.batch_id === batchId), [items]);

  return { batches, items, itemsOf, isLoading, refetch: fetchAll, startBatch, finishBatch, receiveBatch };
}
