import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PosLocation = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  status: string;
  notes: string | null;
};

export type PosProduct = {
  id: string;
  location_id: string;
  name: string;
  brand: string | null;
  supplier: string | null;
  category: string | null;
  sale_price: number;
  avg_cost: number;
  available: number;
  min_stock: number;
  unit: string;
  photo_url: string | null;
  active: boolean;
  notes: string | null;
};

export type PosSale = {
  id: string;
  location_id: string;
  client_name: string | null;
  client_phone: string | null;
  payment_method: string | null;
  total_amount: number;
  total_cost: number;
  notes: string | null;
  recorded_by: string;
  recorded_by_name: string | null;
  sale_date: string;
};

export type PosSaleItem = {
  id: string;
  sale_id: string;
  pos_product_id: string | null;
  product_name: string;
  brand: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  line_total: number;
};

export type PosMovement = {
  id: string;
  location_id: string;
  pos_product_id: string | null;
  product_name: string;
  direction: "entrada" | "salida";
  source: string;
  quantity: number;
  unit_cost: number | null;
  unit_price: number | null;
  supplier: string | null;
  notes: string | null;
  recorded_by_name: string | null;
  created_at: string;
};

export function usePosLocations() {
  return useQuery({
    queryKey: ["pos_locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pos_locations").select("*").order("name");
      if (error) throw error;
      return (data as PosLocation[]) ?? [];
    },
  });
}

export function useMyPosLocation() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pos_my_assignment", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_location_assignments")
        .select("location_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.location_id as string | undefined;
    },
  });
}

export function usePosProducts(locationId: string | null) {
  return useQuery({
    queryKey: ["pos_products", locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_products")
        .select("*")
        .eq("location_id", locationId!)
        .order("name");
      if (error) throw error;
      return (data as PosProduct[]) ?? [];
    },
  });
}

export function usePosSales(locationId: string | null) {
  return useQuery({
    queryKey: ["pos_sales", locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_sales")
        .select("*")
        .eq("location_id", locationId!)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return (data as PosSale[]) ?? [];
    },
  });
}

export function usePosSaleItems(saleIds: string[]) {
  return useQuery({
    queryKey: ["pos_sale_items", saleIds.join(",")],
    enabled: saleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_sale_items")
        .select("*")
        .in("sale_id", saleIds);
      if (error) throw error;
      return (data as PosSaleItem[]) ?? [];
    },
  });
}

export function usePosMovements(locationId: string | null) {
  return useQuery({
    queryKey: ["pos_movements", locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_inventory_movements")
        .select("*")
        .eq("location_id", locationId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as PosMovement[]) ?? [];
    },
  });
}

export function useUpsertPosProduct(locationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PosProduct> & { name: string; sale_price: number }) => {
      if (input.id) {
        const { data, error } = await supabase
          .from("pos_products")
          .update({
            name: input.name,
            brand: input.brand ?? null,
            supplier: input.supplier ?? null,
            category: input.category ?? null,
            sale_price: input.sale_price,
            min_stock: input.min_stock ?? 0,
            unit: input.unit ?? "unidades",
            photo_url: input.photo_url ?? null,
            active: input.active ?? true,
            notes: input.notes ?? null,
          })
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("pos_products")
        .insert({
          location_id: locationId,
          name: input.name,
          brand: input.brand ?? null,
          supplier: input.supplier ?? null,
          category: input.category ?? null,
          sale_price: input.sale_price,
          avg_cost: input.avg_cost ?? 0,
          available: input.available ?? 0,
          min_stock: input.min_stock ?? 0,
          unit: input.unit ?? "unidades",
          photo_url: input.photo_url ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos_products", locationId] }),
  });
}

export function useRegisterPosEntry(locationId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      product_id: string;
      quantity: number;
      unit_cost: number;
      supplier?: string;
      source?: "compra_externa" | "ajuste";
      notes?: string;
    }) => {
      // Get current product
      const { data: product, error: pErr } = await supabase
        .from("pos_products")
        .select("*")
        .eq("id", input.product_id)
        .single();
      if (pErr) throw pErr;
      const p = product as PosProduct;

      // Recalculate weighted average cost
      const newAvailable = Number(p.available) + input.quantity;
      const newAvgCost =
        newAvailable > 0
          ? (Number(p.avg_cost) * Number(p.available) + input.unit_cost * input.quantity) /
            newAvailable
          : input.unit_cost;

      const { error: uErr } = await supabase
        .from("pos_products")
        .update({ available: newAvailable, avg_cost: newAvgCost })
        .eq("id", input.product_id);
      if (uErr) throw uErr;

      const { error: mErr } = await supabase.from("pos_inventory_movements").insert({
        location_id: locationId,
        pos_product_id: input.product_id,
        product_name: p.name,
        direction: "entrada",
        source: input.source ?? "compra_externa",
        quantity: input.quantity,
        unit_cost: input.unit_cost,
        supplier: input.supplier ?? null,
        notes: input.notes ?? null,
        recorded_by: user?.id,
        recorded_by_name: user?.email,
      });
      if (mErr) throw mErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos_products", locationId] });
      qc.invalidateQueries({ queryKey: ["pos_movements", locationId] });
    },
  });
}

export type CartItem = {
  product: PosProduct;
  quantity: number;
};

export function useRegisterPosSale(locationId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      items: CartItem[];
      payment_method: string;
      client_name?: string;
      client_phone?: string;
      notes?: string;
    }) => {
      const total_amount = input.items.reduce(
        (a, b) => a + Number(b.product.sale_price) * b.quantity,
        0
      );
      const total_cost = input.items.reduce(
        (a, b) => a + Number(b.product.avg_cost) * b.quantity,
        0
      );

      const { data: sale, error: sErr } = await supabase
        .from("pos_sales")
        .insert({
          location_id: locationId,
          client_name: input.client_name ?? null,
          client_phone: input.client_phone ?? null,
          payment_method: input.payment_method,
          total_amount,
          total_cost,
          notes: input.notes ?? null,
          recorded_by: user!.id,
          recorded_by_name: user!.email,
        })
        .select()
        .single();
      if (sErr) throw sErr;

      // Insert sale items
      const itemsPayload = input.items.map((it) => ({
        sale_id: sale.id,
        pos_product_id: it.product.id,
        product_name: it.product.name,
        brand: it.product.brand,
        quantity: it.quantity,
        unit_price: Number(it.product.sale_price),
        unit_cost: Number(it.product.avg_cost),
        line_total: Number(it.product.sale_price) * it.quantity,
      }));
      const { error: iErr } = await supabase.from("pos_sale_items").insert(itemsPayload);
      if (iErr) throw iErr;

      // Update stock & log movements per item
      for (const it of input.items) {
        const newAvail = Number(it.product.available) - it.quantity;
        const { error: upErr } = await supabase
          .from("pos_products")
          .update({ available: newAvail })
          .eq("id", it.product.id);
        if (upErr) throw upErr;
        const { error: mErr } = await supabase.from("pos_inventory_movements").insert({
          location_id: locationId,
          pos_product_id: it.product.id,
          product_name: it.product.name,
          direction: "salida",
          source: "venta",
          quantity: it.quantity,
          unit_cost: Number(it.product.avg_cost),
          unit_price: Number(it.product.sale_price),
          reference_id: sale.id,
          recorded_by: user!.id,
          recorded_by_name: user!.email,
        });
        if (mErr) throw mErr;
      }

      return sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos_products", locationId] });
      qc.invalidateQueries({ queryKey: ["pos_sales", locationId] });
      qc.invalidateQueries({ queryKey: ["pos_movements", locationId] });
    },
  });
}
