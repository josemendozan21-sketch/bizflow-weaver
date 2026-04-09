import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type LogoRequestStatus =
  | "pendiente_diseno"
  | "en_revision"
  | "ajustado"
  | "listo_aprobacion"
  | "ajustes_solicitados"
  | "aprobado"
  | "finalizado";

export interface LogoRequest {
  id: string;
  client_name: string;
  brand: string;
  product: string;
  original_logo_url: string;
  client_comments: string | null;
  additional_instructions: string | null;
  advisor_id: string;
  advisor_name: string;
  designer_id: string | null;
  designer_name: string | null;
  adjusted_logo_url: string | null;
  design_notes: string | null;
  advisor_feedback: string | null;
  status: LogoRequestStatus;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useLogoRequests() {
  return useQuery({
    queryKey: ["logo-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logo_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LogoRequest[];
    },
  });
}

export function useCreateLogoRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (req: {
      client_name: string;
      brand: string;
      product: string;
      original_logo_url: string;
      client_comments?: string;
      additional_instructions?: string;
      advisor_id: string;
      advisor_name: string;
    }) => {
      const { data, error } = await supabase
        .from("logo_requests")
        .insert(req)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logo-requests"] });
      toast({ title: "Solicitud creada", description: "La solicitud de diseño ha sido registrada." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateLogoRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<LogoRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from("logo_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logo-requests"] });
      toast({ title: "Actualizado", description: "La solicitud ha sido actualizada." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export async function uploadLogoFile(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("logo-files").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("logo-files").getPublicUrl(path);
  return data.publicUrl;
}

export const STATUS_LABELS: Record<LogoRequestStatus, string> = {
  pendiente_diseno: "Pendiente de diseño",
  en_revision: "En revisión",
  ajustado: "Ajustado",
  listo_aprobacion: "Listo para aprobación",
  ajustes_solicitados: "Ajustes solicitados",
  aprobado: "Aprobado",
  finalizado: "Finalizado",
};

export const STATUS_COLORS: Record<LogoRequestStatus, string> = {
  pendiente_diseno: "bg-yellow-100 text-yellow-800",
  en_revision: "bg-blue-100 text-blue-800",
  ajustado: "bg-purple-100 text-purple-800",
  listo_aprobacion: "bg-indigo-100 text-indigo-800",
  ajustes_solicitados: "bg-orange-100 text-orange-800",
  aprobado: "bg-green-100 text-green-800",
  finalizado: "bg-emerald-100 text-emerald-800",
};
