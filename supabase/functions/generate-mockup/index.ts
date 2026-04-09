import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { logoBase64, productType } = await req.json();

    if (!logoBase64 || !productType) {
      return new Response(JSON.stringify({ error: "Logo y tipo de producto son requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productDescriptions: Record<string, string> = {
      softflask: "a soft flask hydration bottle (flexible running water bottle, translucent/semi-transparent body, sport cap on top). The bottle is standing upright on a clean white studio background.",
      compresa: "a therapeutic warm compress pad (Magical Warmers brand, rectangular fabric heating pad with soft texture). The compress is laid flat on a clean white studio background.",
    };

    const productDesc = productDescriptions[productType];
    if (!productDesc) {
      return new Response(JSON.stringify({ error: "Tipo de producto no válido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompt = `Create a professional product mockup photo of ${productDesc} The product has the following client logo/design printed/applied prominently on its surface. Make it look like a real product photo suitable for a sales presentation. The logo should be clearly visible and well-integrated into the product. Professional studio lighting, high quality product photography.`;

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
              {
                type: "image_url",
                image_url: { url: logoBase64 },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
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
