import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const CONSUMIDOR_FINAL = {
  client_name: "Consumidor Final",
  client_document: "1234567891",
  client_email: "afadf12323@gmail.com",
  client_phone: "",
  client_address: "Calle 123 # 45-65",
  client_city: "Bogotá",
};

export async function uploadPosProductPhoto(file: File, locationId: string) {
  const compressed = await compressImage(file, 600, 0.65);
  const path = `${locationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from("pos-product-photos")
    .upload(path, compressed, { upsert: false, contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  const { data } = supabase.storage.from("pos-product-photos").getPublicUrl(path);
  return data.publicUrl;
}

/** Resize + re-encode an image client-side to keep uploads small and fast. */
async function compressImage(file: File, maxSize = 900, quality = 0.8): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Build a thumbnail URL using Supabase Storage image transforms (falls back gracefully). */
export function thumbUrl(publicUrl: string | null | undefined, width = 320): string | null {
  if (!publicUrl) return null;
  if (publicUrl.includes("/storage/v1/object/public/")) {
    return publicUrl.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") +
      `?width=${width}&quality=70&resize=cover`;
  }
  return publicUrl;
}

export async function uploadPosCashProof(file: File, locationId: string) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${locationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("pos-cash-proofs")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("pos-cash-proofs").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPosSaleProof(file: File, locationId: string) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${locationId}/sales/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("pos-cash-proofs")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("pos-cash-proofs").getPublicUrl(path);
  return data.publicUrl;
}

export type PosCashWithdrawal = {
  id: string;
  location_id: string;
  amount: number;
  concept: string;
  movement_type: "retiro" | "consignacion";
  requested_by: string;
  requested_by_name: string | null;
  proof_url: string | null;
  status: "pendiente" | "aprobado" | "rechazado";
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
};

export type PosLocation = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  status: string;
  notes: string | null;
  cash_base: number;
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
  client_email: string | null;
  client_document: string | null;
  client_address?: string | null;
  client_city?: string | null;
  discount: number;
  payment_method: string | null;
  total_amount: number;
  total_cost: number;
  notes: string | null;
  recorded_by: string;
  recorded_by_name: string | null;
  sale_date: string;
  payment_proof_url?: string | null;
  merchandise_photo_url?: string | null;
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
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchInterval: 30000,
    staleTime: 0,
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

export function usePosCashWithdrawals(locationId: string | null) {
  return useQuery({
    queryKey: ["pos_cash_withdrawals", locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_cash_withdrawals" as any)
        .select("*")
        .eq("location_id", locationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as PosCashWithdrawal[]) ?? [];
    },
  });
}

export function useCreateCashWithdrawal(locationId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      amount: number;
      concept: string;
      proof_url?: string | null;
      notes?: string;
      movement_type?: "retiro" | "consignacion";
    }) => {
      const { error } = await supabase.from("pos_cash_withdrawals" as any).insert({
        location_id: locationId,
        amount: input.amount,
        concept: input.concept,
        movement_type: input.movement_type ?? "retiro",
        proof_url: input.proof_url ?? null,
        notes: input.notes ?? null,
        requested_by: user!.id,
        requested_by_name: user!.email,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos_cash_withdrawals", locationId] }),
  });
}

export function useDecideCashWithdrawal(locationId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; status: "aprobado" | "rechazado"; rejection_reason?: string }) => {
      const { error } = await supabase
        .from("pos_cash_withdrawals" as any)
        .update({
          status: input.status,
          rejection_reason: input.rejection_reason ?? null,
          approved_by: user!.id,
          approved_by_name: user!.email,
          approved_at: new Date().toISOString(),
        } as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos_cash_withdrawals", locationId] }),
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

export function useAttachPosSaleProof(locationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ saleId, url }: { saleId: string; url: string }) => {
      const { error } = await supabase
        .from("pos_sales")
        .update({ payment_proof_url: url } as any)
        .eq("id", saleId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos_sales", locationId] }),
  });
}

export function useAttachPosSaleMerchandise(locationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ saleId, url }: { saleId: string; url: string }) => {
      const { error } = await supabase
        .from("pos_sales")
        .update({ merchandise_photo_url: url } as any)
        .eq("id", saleId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos_sales", locationId] }),
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
      client_email?: string;
      client_document?: string;
      client_address?: string;
      client_city?: string;
      customer_id?: string | null;
      discount?: number;
      split?: { method: string; amount: number };
      notes?: string;
      override_unit_prices?: Record<string, number>;
      payment_proof_url?: string | null;
      merchandise_photo_url?: string | null;
    }) => {
      const priceFor = (id: string, fallback: number) =>
        input.override_unit_prices && input.override_unit_prices[id] != null
          ? Number(input.override_unit_prices[id])
          : Number(fallback);
      const subtotal = input.items.reduce(
        (a, b) => a + priceFor(b.product.id, b.product.sale_price) * b.quantity,
        0
      );
      const discount = Math.max(0, Number(input.discount ?? 0));
      const total_amount = Math.max(0, subtotal - discount);
      const total_cost = input.items.reduce(
        (a, b) => a + Number(b.product.avg_cost) * b.quantity,
        0
      );

      // Build payment_method label (supports split)
      const paymentLabel =
        input.split && input.split.amount > 0 && input.split.amount < total_amount
          ? `${input.payment_method}+${input.split.method}`
          : input.payment_method;

      const splitNote =
        input.split && input.split.amount > 0 && input.split.amount < total_amount
          ? `Pago mixto: ${input.payment_method} $${(total_amount - input.split.amount).toLocaleString()} + ${input.split.method} $${input.split.amount.toLocaleString()}`
          : null;
      const finalNotes = [input.notes ?? null, splitNote].filter(Boolean).join(" | ") || null;

      const { data: sale, error: sErr } = await supabase
        .from("pos_sales")
        .insert({
          location_id: locationId,
          client_name: input.client_name ?? null,
          client_phone: input.client_phone ?? null,
          client_email: input.client_email ?? null,
          client_document: input.client_document ?? null,
          client_address: input.client_address ?? null,
          client_city: input.client_city ?? null,
          customer_id: input.customer_id ?? null,
          discount,
          payment_method: paymentLabel,
          total_amount,
          total_cost,
          notes: finalNotes,
          recorded_by: user!.id,
          recorded_by_name: user!.email,
          payment_proof_url: input.payment_proof_url ?? null,
          merchandise_photo_url: input.merchandise_photo_url ?? null,
        } as any)
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
        unit_price: priceFor(it.product.id, it.product.sale_price),
        unit_cost: Number(it.product.avg_cost),
        line_total: priceFor(it.product.id, it.product.sale_price) * it.quantity,
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
