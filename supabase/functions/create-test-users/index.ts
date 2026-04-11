import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const testUsers = [
    { email: "asesor1@prueba.com", password: "Asesor123!", displayName: "Asesor Comercial 1", role: "asesor_comercial" },
    { email: "asesor2@prueba.com", password: "Asesor123!", displayName: "Asesor Comercial 2", role: "asesor_comercial" },
    { email: "asesor3@prueba.com", password: "Asesor123!", displayName: "Asesor Comercial 3", role: "asesor_comercial" },
    { email: "contabilidad@prueba.com", password: "Conta123!", displayName: "Contabilidad", role: "contabilidad" },
    { email: "estampacion@prueba.com", password: "Estam123!", displayName: "Estampación", role: "estampacion" },
    { email: "produccion@prueba.com", password: "Produc123!", displayName: "Producción", role: "produccion" },
    { email: "visual@prueba.com", password: "Visual123!", displayName: "Usuario Visual", role: "usuario_visual" },
    { email: "admin@prueba.com", password: "Admin123!", displayName: "Administrador", role: "admin" },
    { email: "disenador@prueba.com", password: "Diseno123!", displayName: "Diseñador", role: "disenador" },
    { email: "logistica@prueba.com", password: "Log123!", displayName: "Logística", role: "logistica" },
  ];

  const results = [];

  for (const u of testUsers) {
    // Create user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { display_name: u.displayName },
    });

    if (authError) {
      results.push({ email: u.email, status: "error", message: authError.message });
      continue;
    }

    const userId = authData.user.id;

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: u.role });

    if (roleError) {
      results.push({ email: u.email, status: "user_created_role_failed", message: roleError.message });
    } else {
      results.push({ email: u.email, status: "ok", role: u.role });
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
