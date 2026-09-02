import { supabase } from "@/integrations/supabase/client";

interface OrderLogoData {
  brand: "Magical Warmers" | "Sweatspot";
  clientName: string;
  logoName?: string;
  product: string;
  advisorId: string;
  advisorName: string;
  logoFile?: File | null;
  logoFile2?: File | null;
  logoName2?: string;
  extraLogos?: Array<{ file: File | null; name: string }>;
  orderCode?: string;
  clientComments?: string;
  additionalInstructions?: string;
}

/**
 * Uploads the logo file and creates a design request automatically
 * when a new wholesale order includes a logo.
 */
export async function createLogoRequestFromOrder(
  data: OrderLogoData,
): Promise<{ success: boolean; message: string; logoUrl?: string; logoUrl2?: string; extraLogoUrls?: string[]; requestId?: string }> {
  try {
    // 1. Upload logo to storage if a file was provided.
    // If only personalization text exists (no file), we still create a design
    // request so the design team can build the artwork from scratch.
    let publicUrl = "";
    if (data.logoFile && data.logoFile.size > 0) {
      const ext = data.logoFile.name.split(".").pop();
      const path = `originals/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("logo-files")
        .upload(path, data.logoFile);

      if (uploadError) {
        console.error("Error uploading logo:", uploadError);
        return { success: false, message: `Error al subir el logo: ${uploadError.message}` };
      }

      const { data: urlData } = supabase.storage.from("logo-files").getPublicUrl(path);
      publicUrl = urlData.publicUrl;
    } else {
      // Sentinel value used when no original artwork is provided. The design
      // team will see this request and build the logo based on the
      // personalization text / instructions.
      publicUrl = "PENDIENTE_DISENO_DESDE_CERO";
    }

    // 1b. Upload second logo if provided
    let publicUrl2: string | null = null;
    if (data.logoFile2 && data.logoFile2.size > 0) {
      const ext2 = data.logoFile2.name.split(".").pop();
      const path2 = `originals/${crypto.randomUUID()}.${ext2}`;
      const { error: uploadError2 } = await supabase.storage
        .from("logo-files")
        .upload(path2, data.logoFile2);
      if (uploadError2) {
        console.error("Error uploading second logo:", uploadError2);
        return { success: false, message: `Error al subir el segundo logo: ${uploadError2.message}`, logoUrl: publicUrl };
      }
      const { data: urlData2 } = supabase.storage.from("logo-files").getPublicUrl(path2);
      publicUrl2 = urlData2.publicUrl;
    }

    // 1c. Upload any additional logos (3rd onwards)
    const extraLogos: Array<{ name: string | null; url: string }> = [];
    for (const extra of data.extraLogos || []) {
      if (!extra.file || extra.file.size === 0) continue;
      const extN = extra.file.name.split(".").pop();
      const pathN = `originals/${crypto.randomUUID()}.${extN}`;
      const { error: upErrN } = await supabase.storage.from("logo-files").upload(pathN, extra.file);
      if (upErrN) {
        console.error("Error uploading extra logo:", upErrN);
        continue;
      }
      const { data: urlN } = supabase.storage.from("logo-files").getPublicUrl(pathN);
      extraLogos.push({ name: extra.name || null, url: urlN.publicUrl });
    }

    // 2. Create logo request
    const { data: insertedReq, error: insertError } = await supabase.from("logo_requests").insert({
      brand: data.brand,
      client_name: data.clientName,
      logo_name: [data.logoName, data.logoName2].filter(Boolean).join(" + ") || null,
      product: data.product,
      advisor_id: data.advisorId,
      advisor_name: data.advisorName,
      original_logo_url: publicUrl,
      original_logo_url_2: publicUrl2,
      extra_logos: extraLogos,
      client_comments: [data.orderCode ? `Pedido ${data.orderCode}` : "", data.clientComments || ""].filter(Boolean).join(" | ") || null,
      additional_instructions: data.additionalInstructions || null,
      status: "pendiente_diseno",
    }).select("id").single();

    if (insertError) {
      console.error("Error creating logo request:", insertError);
      return { success: false, message: `Error al crear solicitud de diseño: ${insertError.message}`, logoUrl: publicUrl, logoUrl2: publicUrl2 || undefined, extraLogoUrls: extraLogos.map((l) => l.url) };
    }

    const message = data.logoFile && data.logoFile.size > 0
      ? "Solicitud de diseño creada automáticamente."
      : "Solicitud de diseño creada (sin logo: el equipo lo construirá desde la personalización).";
    return { success: true, message, logoUrl: publicUrl, logoUrl2: publicUrl2 || undefined, extraLogoUrls: extraLogos.map((l) => l.url), requestId: insertedReq?.id as string | undefined };
  } catch (err: any) {
    console.error("Unexpected error creating logo request:", err);
    return { success: false, message: err.message || "Error inesperado" };
  }
}
