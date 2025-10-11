import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  clearGeminiKeyCache,
  encryptSecret,
  loadAiConfigRecord,
  saveAiConfigRecord,
  summarizeAiConfig,
} from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const extractToken = (header: string | null) => header?.match(/^Bearer\s+(.*)$/i)?.[1]?.trim() ?? null;

const isAdminUser = (user: any) => {
  if (!user) return false;
  const appRoles = Array.isArray(user.app_metadata?.roles) ? user.app_metadata.roles : [];
  return (
    user.app_metadata?.role === "admin" ||
    user.app_metadata?.is_admin === true ||
    user.user_metadata?.role === "admin" ||
    user.user_metadata?.is_admin === true ||
    appRoles.includes("admin")
  );
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const authHeader = req.headers.get("Authorization");
    const token = extractToken(authHeader);

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!isAdminUser(user)) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (req.method === "GET") {
      const record = await loadAiConfigRecord(supabaseClient);
      const summary = summarizeAiConfig(record);
      return new Response(
        JSON.stringify({ config: summary }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const providedKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const provider = typeof body.provider === "string" && body.provider.trim().length
      ? body.provider.trim()
      : undefined;
    const model = typeof body.model === "string" && body.model.trim().length
      ? body.model.trim()
      : undefined;

    const existing = await loadAiConfigRecord(supabaseClient);
    const existingContent = (existing?.content ?? {}) as Record<string, any>;

    const secret = Deno.env.get("AI_CONFIG_SECRET");
    if (!secret) {
      return new Response(
        JSON.stringify({ error: "AI_CONFIG_SECRET is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let encryptedKey = existingContent.encryptedKey as string | undefined;
    let keyPreview = existingContent.keyPreview as string | null | undefined;

    if (providedKey) {
      encryptedKey = await encryptSecret(providedKey, secret);
      keyPreview = `${providedKey.slice(0, 4)}…${providedKey.slice(-4)}`;
      clearGeminiKeyCache();
    }

    if (!encryptedKey) {
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const content = {
      ...existingContent,
      encryptedKey,
      keyPreview,
      provider: provider ?? existingContent.provider ?? "gemini",
      model: model ?? existingContent.model ?? "gemini-2.0-flash-lite",
    };

    await saveAiConfigRecord(supabaseClient, {
      content,
      updatedBy: user.id,
    });

    const summary = summarizeAiConfig({ content, updated_at: new Date().toISOString(), updated_by: user.id });

    return new Response(
      JSON.stringify({ message: "AI configuration updated", config: summary }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("ai-config error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
