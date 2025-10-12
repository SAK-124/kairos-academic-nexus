// /functions/admin/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

serve(async (req) => {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return new Response("Unauthorized", { status: 401 });

  const user = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => (r.ok ? r.json() : null));

  if (!user?.id) return new Response("Unauthorized", { status: 401 });

  const { data: me, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !me?.is_admin) return new Response("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "ensure-schema") {
    try {
      const ensureUrl = new URL("../../scripts/db/ensure.sql", import.meta.url);
      const sql = await fetch(ensureUrl).then((res) => res.text());
      const { error: rpcErr } = await supabase.rpc("exec_sql", { q: sql });
      if (rpcErr) {
        return new Response(rpcErr.message, { status: 500 });
      }
      return new Response("ok");
    } catch (fnError) {
      const message = fnError instanceof Error ? fnError.message : "Failed to run ensure.sql";
      return new Response(message, { status: 500 });
    }
  }

  return new Response("unknown action", { status: 400 });
});
