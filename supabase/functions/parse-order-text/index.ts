import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, brand } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Texto muy corto para interpretar." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Eres un asistente que extrae datos de pedidos de texto libre. El texto puede venir de un mensaje de WhatsApp, un correo, o notas rápidas.

Extrae la siguiente información y devuélvela usando la herramienta proporcionada. Si un dato no está presente, déjalo como null.

Marca actual: ${brand === "sweatspot" ? "Sweatspot" : "Magical Warmers"}

Notas importantes:
- "producto" se refiere a la referencia del producto (ej: "Thermo sport", "Mug", "Botella 500ml")
- "tipo" es la variante del producto (ej: "frío", "calor", "sublimación")
- Los colores de gel y tinta pueden estar como "gel azul" o "tinta rosada"
- El NIT/cédula puede venir como "NIT: 900123456-7" o "CC 1234567"
- Si ves múltiples productos/líneas, inclúyelos todos en el array "productos"
- Los valores pueden venir como "$15.000" o "15000" o "15mil"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_order_data",
              description: "Extracts structured order data from free-form text",
              parameters: {
                type: "object",
                properties: {
                  cliente: {
                    type: "object",
                    properties: {
                      nombre: { type: "string", description: "Nombre del cliente o empresa" },
                      cedula_nit: { type: "string", description: "Cédula o NIT" },
                      telefono: { type: "string", description: "Número de contacto" },
                      email: { type: "string", description: "Correo electrónico" },
                      direccion: { type: "string", description: "Dirección de envío" },
                      ciudad: { type: "string", description: "Ciudad" },
                    },
                  },
                  productos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        producto: { type: "string", description: "Nombre/referencia del producto" },
                        tipo: { type: "string", description: "Tipo o variante del producto" },
                        color_gel: { type: "string", description: "Color del gel" },
                        color_tinta: { type: "string", description: "Color de la tinta" },
                        unidades: { type: "number", description: "Cantidad de unidades" },
                        valor_unitario: { type: "number", description: "Precio unitario" },
                        valor_total: { type: "number", description: "Valor total de la línea" },
                      },
                    },
                  },
                  color_silicona: { type: "string", description: "Color de silicona (Sweatspot)" },
                  tamano: { type: "string", description: "Tamaño (Sweatspot: 150ml, 250ml, etc)" },
                  tipo_logo: { type: "string", description: "Tipo de impresión (full o básica)" },
                  referencia: { type: "string", description: "Referencia o molde (Sweatspot)" },
                  personalizacion: { type: "string", description: "Instrucciones de personalización del logo" },
                  observaciones: { type: "string", description: "Notas u observaciones generales" },
                  abono: { type: "number", description: "Monto del abono inicial" },
                  es_recompra: { type: "boolean", description: "Si el cliente ya ha comprado antes y tiene logo" },
                },
                required: ["cliente", "productos"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_order_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intenta en unos segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Error al procesar con IA");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No se pudo interpretar el texto." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-order-text error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
