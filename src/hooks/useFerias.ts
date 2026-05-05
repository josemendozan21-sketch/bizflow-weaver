import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Feria {
  id: string;
  name: string;
  city: string;
  venue: string | null;
  start_date: string;
  end_date: string;
  setup_date: string | null;
  stand_number: string | null;
  stand_size: string | null;
  // Costos detallados
  stand_cost: number;          // Costo Feria
  shipping_cost: number;       // Envío Mercancía
  tickets_cost: number;        // Tiquetes
  advertising_cost: number;    // Publicidad
  merchandise_cost: number;    // Costo de Mercancía
  employees_cost: number;      // Empleados
  lodging_cost: number;        // Viáticos: Hospedaje
  transport_cost: number;      // Viáticos: Transporte
  food_cost: number;           // Viáticos: Alimentación
  other_costs: number;
  assigned_staff: string[] | null;
  materials_needed: string[] | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function calcFeriaTotalCost(f: Feria): number {
  return (f.stand_cost || 0) + (f.shipping_cost || 0) + (f.tickets_cost || 0) +
    (f.advertising_cost || 0) + (f.merchandise_cost || 0) + (f.employees_cost || 0) +
    (f.lodging_cost || 0) + (f.transport_cost || 0) + (f.food_cost || 0) + (f.other_costs || 0);
}

export interface FeriaInventory {
  id: string;
  feria_id: string;
  brand: string;
  product_name: string;
  quantity_assigned: number;
  quantity_returned: number | null;
  quantity_dispatched: number;
  dispatch_status: string;
  unit_price: number;
  unit_cost: number;
  notes: string | null;
}

export interface FeriaSale {
  id: string;
  feria_id: string;
  brand: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string | null;
  client_name: string | null;
  sale_date: string;
  notes: string | null;
}

export interface FeriaDispatchRequest {
  id: string;
  feria_id: string;
  status: string; // pendiente | despachado
  furniture_dispatched: boolean;
  furniture_items: string[] | null;
  dispatch_notes: string | null;
  requested_at: string;
  requested_by: string | null;
  dispatched_at: string | null;
  dispatched_by: string | null;
}

export function useFerias() {
  return useQuery({
    queryKey: ["ferias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ferias")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Feria[];
    },
  });
}

export function useFeriaInventory(feriaId: string | null) {
  return useQuery({
    queryKey: ["feria_inventory", feriaId],
    queryFn: async () => {
      if (!feriaId) return [];
      const { data, error } = await supabase
        .from("feria_inventory")
        .select("*")
        .eq("feria_id", feriaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as FeriaInventory[];
    },
    enabled: !!feriaId,
  });
}

export function useFeriaSales(feriaId: string | null) {
  return useQuery({
    queryKey: ["feria_sales", feriaId],
    queryFn: async () => {
      if (!feriaId) return [];
      const { data, error } = await supabase
        .from("feria_sales")
        .select("*")
        .eq("feria_id", feriaId)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data as FeriaSale[];
    },
    enabled: !!feriaId,
  });
}

export function useCreateFeria() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      input: Omit<Feria, "id" | "created_at" | "updated_at" | "created_by"> & {
        initial_inventory?: Array<{
          brand: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          unit_cost?: number;
        }>;
      }
    ) => {
      const { initial_inventory, ...feriaFields } = input;
      const { data, error } = await supabase
        .from("ferias")
        .insert({ ...feriaFields, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;

      if (initial_inventory && initial_inventory.length > 0 && data?.id) {
        const rows = initial_inventory
          .filter((p) => p.quantity > 0)
          .map((p) => ({
            feria_id: data.id,
            brand: p.brand,
            product_name: p.product_name,
            quantity_assigned: p.quantity,
            quantity_returned: 0,
            quantity_dispatched: 0,
            dispatch_status: "pendiente",
            unit_price: p.unit_price || 0,
            unit_cost: p.unit_cost || 0,
            notes: null,
          }));
        if (rows.length > 0) {
          const { error: invErr } = await supabase.from("feria_inventory").insert(rows);
          if (invErr) {
            toast.error("Feria creada, pero falló la carga de productos: " + invErr.message);
          }
        }
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias"] });
      qc.invalidateQueries({ queryKey: ["feria_inventory"] });
      toast.success("Feria creada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateFeria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Feria> & { id: string }) => {
      const { error } = await supabase.from("ferias").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias"] });
      toast.success("Feria actualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteFeria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ferias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias"] });
      toast.success("Feria eliminada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddFeriaInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<FeriaInventory, "id">) => {
      const { error } = await supabase.from("feria_inventory").insert(input);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["feria_inventory", vars.feria_id] });
      toast.success("Producto asignado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteFeriaInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, feria_id }: { id: string; feria_id: string }) => {
      const { error } = await supabase.from("feria_inventory").delete().eq("id", id);
      if (error) throw error;
      return feria_id;
    },
    onSuccess: (feria_id) => {
      qc.invalidateQueries({ queryKey: ["feria_inventory", feria_id] });
      toast.success("Producto removido");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddFeriaSale() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<FeriaSale, "id" | "sale_date">) => {
      const { error } = await supabase
        .from("feria_sales")
        .insert({ ...input, recorded_by: user?.id });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["feria_sales", vars.feria_id] });
      toast.success("Venta registrada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteFeriaSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, feria_id }: { id: string; feria_id: string }) => {
      const { error } = await supabase.from("feria_sales").delete().eq("id", id);
      if (error) throw error;
      return feria_id;
    },
    onSuccess: (feria_id) => {
      qc.invalidateQueries({ queryKey: ["feria_sales", feria_id] });
      toast.success("Venta eliminada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/* -------------------- Dispatch requests -------------------- */

export function useFeriaDispatchRequest(feriaId: string | null) {
  return useQuery({
    queryKey: ["feria_dispatch_request", feriaId],
    queryFn: async () => {
      if (!feriaId) return null;
      const { data, error } = await supabase
        .from("feria_dispatch_requests")
        .select("*")
        .eq("feria_id", feriaId)
        .maybeSingle();
      if (error) throw error;
      return data as FeriaDispatchRequest | null;
    },
    enabled: !!feriaId,
  });
}

export function useAllDispatchRequests() {
  return useQuery({
    queryKey: ["feria_dispatch_requests_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feria_dispatch_requests")
        .select("*")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data as FeriaDispatchRequest[];
    },
  });
}

export function useCreateDispatchRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (feriaId: string) => {
      const { data, error } = await supabase
        .from("feria_dispatch_requests")
        .upsert(
          { feria_id: feriaId, status: "pendiente", requested_by: user?.id },
          { onConflict: "feria_id" }
        )
        .select()
        .single();
      if (error) throw error;

      await supabase.from("notifications").insert({
        target_role: "logistica",
        title: "Nueva solicitud de feria",
        message: "Una feria envió su solicitud de inventario para despacho.",
        type: "feria_dispatch",
        reference_id: feriaId,
      });
      return data;
    },
    onSuccess: (_d, feriaId) => {
      qc.invalidateQueries({ queryKey: ["feria_dispatch_request", feriaId] });
      qc.invalidateQueries({ queryKey: ["feria_dispatch_requests_all"] });
      toast.success("Solicitud enviada a logística");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useConfirmDispatch() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      feria_id: string;
      lines: { id: string; quantity_dispatched: number }[];
      furniture_dispatched: boolean;
      furniture_items: string[];
      dispatch_notes: string;
    }) => {
      // Update each inventory line
      for (const line of input.lines) {
        const { error } = await supabase
          .from("feria_inventory")
          .update({
            quantity_dispatched: line.quantity_dispatched,
            dispatch_status: "despachado",
          })
          .eq("id", line.id);
        if (error) throw error;
      }
      // Mark request as dispatched
      const { error: rErr } = await supabase
        .from("feria_dispatch_requests")
        .update({
          status: "despachado",
          dispatched_at: new Date().toISOString(),
          dispatched_by: user?.id,
          furniture_dispatched: input.furniture_dispatched,
          furniture_items: input.furniture_items,
          dispatch_notes: input.dispatch_notes || null,
        })
        .eq("feria_id", input.feria_id);
      if (rErr) throw rErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["feria_inventory", vars.feria_id] });
      qc.invalidateQueries({ queryKey: ["feria_dispatch_request", vars.feria_id] });
      qc.invalidateQueries({ queryKey: ["feria_dispatch_requests_all"] });
      toast.success("Despacho confirmado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/* -------------------- POS assignments -------------------- */

export interface FeriaPosAssignment {
  id: string;
  user_id: string;
  feria_id: string;
  assigned_at: string;
}

export function useMyPosAssignment() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_pos_assignment", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("feria_pos_assignments")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as FeriaPosAssignment | null;
    },
    enabled: !!user?.id,
  });
}

export function useAllPosAssignments() {
  return useQuery({
    queryKey: ["pos_assignments_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feria_pos_assignments").select("*");
      if (error) throw error;
      return data as FeriaPosAssignment[];
    },
  });
}

export function useAssignPosUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, feria_id }: { user_id: string; feria_id: string }) => {
      // Remove previous assignments for this user, then insert new one
      await supabase.from("feria_pos_assignments").delete().eq("user_id", user_id);
      const { error } = await supabase
        .from("feria_pos_assignments")
        .insert({ user_id, feria_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos_assignments_all"] });
      toast.success("Feria asignada al usuario POS");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
