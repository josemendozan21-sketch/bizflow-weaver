import { supabase } from "@/integrations/supabase/client";

interface OrderLogoData {
  brand: "Magical Warmers" | "Sweatspot";
  clientName: string;
  product: string;
  advisorId: string;
  advisorName: string;
  logoFile: File;
  clientComments?: string;
  additionalInstructions?: string;
}

/**
 * Uploads the logo file and creates a design request automatically
 * when a new wholesale order includes a logo.
 */
export async function createLogoRequestFromOrder(data: OrderLogoData): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Upload logo to storage
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

    // 2. Create logo request
    const { error: insertError } = await supabase.from("logo_requests").insert({
      brand: data.brand,
      client_name: data.clientName,
      product: data.product,
      advisor_id: data.advisorId,
      advisor_name: data.advisorName,
      original_logo_url: urlData.publicUrl,
      client_comments: data.clientComments || null,
      additional_instructions: data.additionalInstructions || null,
      status: "pendiente_diseno",
    });

    if (insertError) {
      console.error("Error creating logo request:", insertError);
      return { success: false, message: `Error al crear solicitud de diseño: ${insertError.message}` };
    }

    return { success: true, message: "Solicitud de diseño creada automáticamente." };
  } catch (err: any) {
    console.error("Unexpected error creating logo request:", err);
    return { success: false, message: err.message || "Error inesperado" };
  }
}
