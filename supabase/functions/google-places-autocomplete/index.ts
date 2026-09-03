const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!API_KEY) {
    // Sin llave configurada: el frontend cae al modo "escribir libremente".
    return json({ disabled: true, suggestions: [] });
  }

  try {
    const { action, input, placeId, sessionToken } = await req.json();

    if (action === "details") {
      if (!placeId) return json({ error: "placeId requerido" }, 400);
      const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es&regionCode=CO`;
      const res = await fetch(url, {
        headers: {
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": "formattedAddress,addressComponents,shortFormattedAddress",
        },
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[places details]", res.status, JSON.stringify(data));
        return json({ error: "No se pudo obtener el detalle de la dirección" }, 502);
      }
      const comps: Array<{ longText: string; shortText: string; types: string[] }> =
        data.addressComponents ?? [];
      const pick = (type: string) => comps.find((c) => c.types?.includes(type))?.longText ?? "";
      const city =
        pick("locality") || pick("administrative_area_level_2") || pick("postal_town");
      const department = pick("administrative_area_level_1");
      const street = [pick("route"), pick("street_number")].filter(Boolean).join(" ");
      return json({
        address: data.shortFormattedAddress || street || data.formattedAddress || "",
        formattedAddress: data.formattedAddress ?? "",
        city,
        department,
      });
    }

    const q = String(input ?? "").trim();
    if (q.length < 3) return json({ suggestions: [] });

    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "X-Goog-Api-Key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: q,
        languageCode: "es",
        regionCode: "CO",
        includedRegionCodes: ["co"],
        sessionToken: sessionToken || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[places autocomplete]", res.status, JSON.stringify(data));
      return json({ error: "No se pudo consultar direcciones", suggestions: [] }, 502);
    }

    const suggestions = (data.suggestions ?? [])
      .filter((s: any) => s.placePrediction)
      .map((s: any) => ({
        placeId: s.placePrediction.placeId,
        primary: s.placePrediction.structuredFormat?.mainText?.text ?? s.placePrediction.text?.text ?? "",
        secondary: s.placePrediction.structuredFormat?.secondaryText?.text ?? "",
        text: s.placePrediction.text?.text ?? "",
      }));

    return json({ suggestions });
  } catch (e) {
    console.error("[google-places-autocomplete]", e);
    return json({ error: "Error inesperado", suggestions: [] }, 500);
  }
});
