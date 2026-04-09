import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOFTFLASK_SIZES: Record<string, string> = {
  "150ml": "a small 150ml soft flask hydration bottle",
  "250ml": "a medium 250ml soft flask hydration bottle",
  "250ml_jugeton": "a medium 250ml playful/kid-friendly soft flask hydration bottle with rounded fun shape",
  "500ml": "a large 500ml soft flask hydration bottle",
};

const COMPRESA_MOLDES: Record<string, { description: string; imageUrl?: string }> = {
  muela: {
    description: "a tooth/molar-shaped therapeutic warm compress pad (shaped like a large molar tooth, designed to wrap around the jaw)",
    imageUrl: "https://auncgjkpwajfbvcckuny.supabase.co/storage/v1/object/public/molde-templates/muela.png",
  },
  antifaz: {
    description: "an eye mask-shaped therapeutic warm compress pad (contoured sleep/eye mask shape with nose bridge cutout)",
  },
  lumbar: {
    description: "a lumbar/lower-back therapeutic warm compress pad (wide rectangular belt-like shape designed to wrap around the lower back)",
  },
  cuello: {
    description: "a neck wrap therapeutic warm compress pad (U-shaped or crescent-shaped pad designed to drape over shoulders and neck)",
  },
  abdomen: {
    description: "an abdominal therapeutic warm compress pad (large rectangular pad designed to cover the stomach/abdomen area)",
  },
  rodilla: {
    description: "a knee wrap therapeutic warm compress pad (contoured pad designed to wrap around the knee joint)",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { logoBase64, productType, size, molde, observations } = await req.json();

    if (!logoBase64 || !productType) {
      return new Response(JSON.stringify({ error: "Logo y tipo de producto son requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let productDesc = "";

    if (productType === "softflask") {
      const sizeKey = size || "250ml";
      const sizeDesc = SOFTFLASK_SIZES[sizeKey] || SOFTFLASK_SIZES["250ml"];
      productDesc = `${sizeDesc} (Sweatspot brand, flexible running water bottle, translucent/semi-transparent body, sport bite valve cap on top). The bottle is standing upright on a clean white studio background.`;
    } else if (productType === "compresa") {
      const moldeKey = molde || "lumbar";
      const moldeDesc = COMPRESA_MOLDES[moldeKey] || COMPRESA_MOLDES["lumbar"];
      productDesc = `${moldeDesc} (Magical Warmers brand, soft fabric with visible stitching). The compress is laid flat on a clean white studio background.`;
    } else {
      return new Response(JSON.stringify({ error: "Tipo de producto no válido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let extraInstructions = "";
    if (observations) {
      extraInstructions = ` Additional design notes: ${observations}.`;
    }

    const prompt = `Create a professional product mockup photo of ${productDesc} The product has the following client logo/design printed/applied prominently on its surface. The logo should be clearly visible, well-integrated, and respect the printable area of the product. Make it look like a real product photo suitable for a sales presentation. Professional studio lighting, high quality product photography.${extraInstructions}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: logoBase64 } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intenta de nuevo en un momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Contacta al administrador." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating mockup:", error);
    return new Response(JSON.stringify({ error: error.message || "Error generando mockup" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
