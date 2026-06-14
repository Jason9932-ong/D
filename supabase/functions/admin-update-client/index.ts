// D.STUDIO — admin-only Edge Function to update a client's email / password.
// Changing another user's auth email or password requires the service_role key,
// which must never live in the browser. This function runs server-side, verifies
// the caller is an admin, then performs the update with the Admin API.
//
// Deploy:  supabase functions deploy admin-update-client
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided
//  automatically by the Edge runtime.)

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // 1. Identify the caller from their JWT.
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await caller.auth.getUser();
    if (uErr || !user) return json({ error: "Not authenticated" }, 401);

    // 2. Confirm the caller is an admin (RLS lets a user read their own profile).
    const { data: prof } = await caller.from("profiles").select("role").eq("id", user.id).single();
    if (!prof || prof.role !== "admin") return json({ error: "Not an admin" }, 403);

    // 3. Perform the update with the service-role (admin) client.
    const { userId, email, password, full_name } = await req.json();
    if (!userId) return json({ error: "userId is required" }, 400);

    const admin = createClient(url, service);
    const attrs: Record<string, unknown> = {};
    if (email) { attrs.email = email; attrs.email_confirm = true; }
    if (password) attrs.password = password;
    if (Object.keys(attrs).length) {
      const { error } = await admin.auth.admin.updateUserById(userId, attrs);
      if (error) return json({ error: error.message }, 400);
    }
    // Keep the profile row in sync (display name + email).
    const patch: Record<string, unknown> = {};
    if (typeof full_name === "string") patch.full_name = full_name;
    if (email) patch.email = email;
    if (Object.keys(patch).length) await admin.from("profiles").update(patch).eq("id", userId);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
