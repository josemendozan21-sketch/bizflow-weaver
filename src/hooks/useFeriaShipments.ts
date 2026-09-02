import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FeriaShipmentItem {
  id: string;
  shipment_id: string;
  stock_item_id: string | null;
  item_name: string;
  brand: string;
  logo: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
}

export interface FeriaShipment {
  id: string;
  feria_id: string;
  shipment_number: number;
  direction: "salida" | "entrada";
  status: "confirmada" | "anulada";
  notes: string | null;
  confirmed_by: string | null;
  confirmed_by_name: string | null;
  confirmed_at: string;
  created_at: string;
  items: FeriaShipmentItem[];
}

export interface ShipmentItemInput {
  stock_item_id: string | null;
  item_name: string;
  brand: string;
  logo?: string | null;
  quantity: number;
  unit_price?: number;
  unit_cost?: number;
}

export function useFeriaShipments(feriaId: string | null) {
  return useQuery({
    queryKey: ["feria_shipments", feriaId],
    enabled: !!feriaId,
    queryFn: async (): Promise<FeriaShipment[]> => {
      if (!feriaId) return [];
      const { data, error } = await supabase
        .from("feria_shipments" as any)
        .select("*, items:feria_shipment_items(*)")
        .eq("feria_id", feriaId)
        .order("shipment_number", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as FeriaShipment[]).map((s) => ({
        ...s,
        items: s.items ?? [],
      }));
    },
  });
}

/** Crea una salida o la entrada de retorno, descontando/sumando stock vía inventory_movements. */
export function useCreateFeriaShipment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      feria_id: string;
      direction: "salida" | "entrada";
      notes?: string | null;
      items: ShipmentItemInput[];
    }) => {
      const items = input.items.filter((i) => i.quantity > 0);
      if (items.length === 0) throw new Error("Selecciona al menos un producto con cantidad");

      // Consecutivo por feria + dirección
      const { data: existing, error: exErr } = await supabase
        .from("feria_shipments" as any)
        .select("shipment_number, status, direction")
        .eq("feria_id", input.feria_id)
        .eq("direction", input.direction);
      if (exErr) throw exErr;

      if (input.direction === "entrada" && (existing ?? []).some((s: any) => s.status === "confirmada")) {
        throw new Error("Esta feria ya tiene una entrada de retorno confirmada");
      }

      const nextNumber =
        Math.max(0, ...(existing ?? []).map((s: any) => Number(s.shipment_number) || 0)) + 1;

      const { data: shipment, error } = await supabase
        .from("feria_shipments" as any)
        .insert({
          feria_id: input.feria_id,
          direction: input.direction,
          shipment_number: nextNumber,
          status: "confirmada",
          notes: input.notes || null,
          confirmed_by: user?.id ?? null,
          confirmed_by_name: user?.email ?? "Inventarios",
        } as any)
        .select()
        .single();
      if (error) throw error;
      const shipmentId = (shipment as any).id as string;

      // Movimientos de inventario (el trigger process_inventory_movement ajusta stock_items)
      const movementKind = input.direction === "salida" ? "salida" : "entrada";
      const label = input.direction === "salida" ? `Salida ${nextNumber} a feria` : "Retorno de feria";

      for (const it of items) {
        const { error: movErr } = await supabase.from("inventory_movements" as any).insert({
          stock_item_id: it.stock_item_id,
          item_name: it.item_name,
          brand: it.brand,
          category: "producto_terminado",
          quantity: it.quantity,
          direction: input.direction === "salida" ? "entrega" : "retorno",
          movement_kind: movementKind,
          area: "feria",
          feria_id: input.feria_id,
          purpose: label,
          reason: input.notes || label,
          logo: it.logo ?? null,
          recorded_by: user?.id ?? null,
          recorded_by_name: user?.email ?? "Inventarios",
        } as any);
        if (movErr) {
          // rollback del despacho para no dejar registros a medias
          await supabase.from("feria_shipments" as any).delete().eq("id", shipmentId);
          throw new Error(`${it.item_name}: ${movErr.message}`);
        }
      }

      const { error: itemsErr } = await supabase.from("feria_shipment_items" as any).insert(
        items.map((it) => ({
          shipment_id: shipmentId,
          stock_item_id: it.stock_item_id,
          item_name: it.item_name,
          brand: it.brand,
          logo: it.logo ?? null,
          quantity: it.quantity,
          unit_price: it.unit_price ?? 0,
          unit_cost: it.unit_cost ?? 0,
        })) as any,
      );
      if (itemsErr) throw itemsErr;

      return { shipmentId, nextNumber };
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["feria_shipments", vars.feria_id] });
      qc.invalidateQueries({ queryKey: ["feria_inventory", vars.feria_id] });
      toast.success(
        vars.direction === "salida"
          ? `Salida ${res.nextNumber} confirmada y descontada de bodega`
          : "Entrada de retorno confirmada y sumada a bodega",
      );
    },
    onError: (e: any) => toast.error(e.message || "No se pudo registrar el movimiento"),
  });
}

/** Anula una salida/entrada revirtiendo el stock. */
export function useVoidFeriaShipment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (shipment: FeriaShipment) => {
      const reverseKind = shipment.direction === "salida" ? "entrada" : "salida";
      for (const it of shipment.items) {
        const { error } = await supabase.from("inventory_movements" as any).insert({
          stock_item_id: it.stock_item_id,
          item_name: it.item_name,
          brand: it.brand,
          category: "producto_terminado",
          quantity: it.quantity,
          direction: shipment.direction === "salida" ? "retorno" : "entrega",
          movement_kind: reverseKind,
          area: "feria",
          feria_id: shipment.feria_id,
          purpose: `Anulación ${shipment.direction} ${shipment.shipment_number} de feria`,
          reason: `Anulación de ${shipment.direction} ${shipment.shipment_number}`,
          logo: it.logo ?? null,
          recorded_by: user?.id ?? null,
          recorded_by_name: user?.email ?? "Inventarios",
        } as any);
        if (error) throw error;
      }

      // borrar items dispara el trigger que descuenta lo sincronizado en feria_inventory
      const { error: delErr } = await supabase
        .from("feria_shipment_items" as any)
        .delete()
        .eq("shipment_id", shipment.id);
      if (delErr) throw delErr;

      const { error: updErr } = await supabase
        .from("feria_shipments" as any)
        .update({ status: "anulada" } as any)
        .eq("id", shipment.id);
      if (updErr) throw updErr;
    },
    onSuccess: (_d, shipment) => {
      qc.invalidateQueries({ queryKey: ["feria_shipments", shipment.feria_id] });
      qc.invalidateQueries({ queryKey: ["feria_inventory", shipment.feria_id] });
      toast.success("Movimiento anulado y stock revertido");
    },
    onError: (e: any) => toast.error(e.message || "No se pudo anular"),
  });
}
