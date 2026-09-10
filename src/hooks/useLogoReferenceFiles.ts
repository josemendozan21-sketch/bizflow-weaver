import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LogoReferenceFile {
  id: string;
  logo_request_id: string | null;
  order_id: string | null;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  /** "creacion" (al crear el pedido) | "modificacion" (al pedir cambios) */
  stage: string;
  note: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

/** Archivos de apoyo/guía para Diseño. Nunca reemplazan el logo del pedido. */
export function useLogoReferenceFiles(params: {
  requestId?: string | null;
  orderId?: string | null;
  enabled?: boolean;
}) {
  const { requestId, orderId, enabled = true } = params;
  return useQuery({
    queryKey: ["logo-reference-files", requestId ?? null, orderId ?? null],
    enabled: enabled && (!!requestId || !!orderId),
    queryFn: async () => {
      let q = supabase.from("logo_reference_files").select("*").order("created_at", { ascending: false });
      q = requestId ? q.eq("logo_request_id", requestId) : q.eq("order_id", orderId!);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as LogoReferenceFile[];
    },
  });
}

export function useInvalidateReferenceFiles() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["logo-reference-files"] });
}

/** Sube archivos de referencia al bucket de logos y los registra. */
export async function uploadReferenceFiles(params: {
  files: File[];
  requestId?: string | null;
  orderId?: string | null;
  stage: "creacion" | "modificacion";
  note?: string | null;
  userId?: string | null;
  userName?: string | null;
}): Promise<{ uploaded: number; failed: number }> {
  const valid = (params.files || []).filter((f) => f && f.size > 0);
  let uploaded = 0;
  let failed = 0;

  for (const file of valid) {
    const declared = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : undefined;
    const ext = declared && /^[a-z0-9]+$/.test(declared) ? declared : "file";
    const path = `references/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("logo-files").upload(path, file, {
      contentType: file.type || undefined,
    });
    if (upErr) {
      console.error("Error subiendo archivo de referencia:", upErr);
      failed += 1;
      continue;
    }
    const { data: urlData } = supabase.storage.from("logo-files").getPublicUrl(path);
    const { error: insErr } = await supabase.from("logo_reference_files").insert({
      logo_request_id: params.requestId || null,
      order_id: params.orderId || null,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type || null,
      stage: params.stage,
      note: params.note || null,
      uploaded_by: params.userId || null,
      uploaded_by_name: params.userName || null,
    });
    if (insErr) {
      console.error("Error registrando archivo de referencia:", insErr);
      failed += 1;
      continue;
    }
    uploaded += 1;
  }

  return { uploaded, failed };
}
