import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFeriaOfflineStore } from "@/stores/feriaOfflineStore";
import { toast } from "sonner";

/**
 * Background sync for offline feria sales.
 * Retries every 20s when there are pendings AND the browser reports online.
 * Also runs immediately on 'online' event.
 */
export function useOfflineSalesSync() {
  const qc = useQueryClient();
  const running = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const runOnce = async () => {
      if (running.current) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const store = useFeriaOfflineStore.getState();
      const queue = store.pendingSales.filter(
        (s) => s.status === "pending" || s.status === "error"
      );
      if (queue.length === 0) return;
      running.current = true;
      let ok = 0;
      let oversells = 0;
      let failed = 0;
      const touchedFerias = new Set<string>();

      for (const sale of queue) {
        if (cancelled) break;
        useFeriaOfflineStore.getState().markSyncing(sale.localId);
        try {
          // Insert the sale
          const { data: inserted, error } = await supabase
            .from("feria_sales")
            .insert({
              feria_id: sale.feria_id,
              brand: sale.brand,
              product_name: sale.product_name,
              quantity: sale.quantity,
              unit_price: sale.unit_price,
              total_amount: sale.total_amount,
              payment_method: sale.payment_method,
              client_name: sale.client_name,
              notes: sale.notes,
              sale_date: sale.sale_date,
              recorded_by: sale.recorded_by,
            })
            .select("id")
            .single();

          if (error) throw error;

          // Check for oversell
          const [{ data: invRow }, { data: soldRows }] = await Promise.all([
            supabase
              .from("feria_inventory")
              .select("quantity_dispatched")
              .eq("feria_id", sale.feria_id)
              .eq("brand", sale.brand)
              .eq("product_name", sale.product_name)
              .maybeSingle(),
            supabase
              .from("feria_sales")
              .select("quantity")
              .eq("feria_id", sale.feria_id)
              .eq("brand", sale.brand)
              .eq("product_name", sale.product_name),
          ]);

          const totalSold = (soldRows || []).reduce(
            (a: number, r: { quantity: number }) => a + Number(r.quantity),
            0
          );
          const dispatched = Number(invRow?.quantity_dispatched || 0);
          const oversold = totalSold > dispatched;

          if (oversold) {
            const newNotes = `[SOBREVENTA] ${sale.notes || ""}`.trim();
            await supabase
              .from("feria_sales")
              .update({ notes: newNotes })
              .eq("id", inserted!.id);
            // Notify logistics
            await supabase.from("notifications").insert({
              target_role: "logistica",
              title: "Sobreventa en feria",
              message: `Se vendió ${sale.quantity} uds de "${sale.product_name}" (${sale.brand}) por encima del stock despachado (vendidas ${totalSold} / despachadas ${dispatched}).`,
              type: "warning",
              reference_id: sale.feria_id,
            });
            oversells++;
          }

          useFeriaOfflineStore
            .getState()
            .markSynced(sale.localId, inserted!.id, oversold);
          touchedFerias.add(sale.feria_id);
          ok++;
        } catch (err: any) {
          useFeriaOfflineStore.getState().markError(sale.localId, err?.message || "Error");
          failed++;
        }
      }

      running.current = false;
      touchedFerias.forEach((fid) => {
        qc.invalidateQueries({ queryKey: ["feria_sales", fid] });
        qc.invalidateQueries({ queryKey: ["feria_inventory", fid] });
        qc.invalidateQueries({ queryKey: ["my_feria_sales", fid] });
      });

      if (ok > 0) {
        const parts = [`${ok} ventas sincronizadas`];
        if (oversells > 0) parts.push(`${oversells} sobreventa(s)`);
        toast.success(parts.join(" · "));
        // Auto-limpiar los ya sincronizados a los 5 segundos
        setTimeout(() => useFeriaOfflineStore.getState().clearSynced(), 5000);
      }
      if (failed > 0 && ok === 0) {
        toast.error(`No se pudieron subir ${failed} ventas. Reintentaremos automáticamente.`);
      }
    };

    // Try immediately on mount
    runOnce();

    // Retry every 20s
    const interval = setInterval(runOnce, 20000);

    // Retry on connection resumed
    const onOnline = () => runOnce();
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
    };
  }, [qc]);
}