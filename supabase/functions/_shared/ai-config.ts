import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const AI_CONFIG_SECTION = "ai-config";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

let cachedKey: { value: string; expiresAt: number } | null = null;

const base64FromArray = (input: Uint8Array) => {
  let binary = "";
  input.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const arrayFromBase64 = (input: string) => {
  const binary = atob(input);
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    output[i] = binary.charCodeAt(i);
  }
  return output;
};

const deriveAesKey = async (secret: string) => {
  const secretBytes = encoder.encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", secretBytes);
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
};

export const encryptSecret = async (value: string, secret: string) => {
  const key = await deriveAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value))
  );
  return `${base64FromArray(iv)}.${base64FromArray(ciphertext)}`;
};

export const decryptSecret = async (payload: string, secret: string) => {
  const [ivPart, cipherPart] = payload.split(".");
  if (!ivPart || !cipherPart) {
    throw new Error("Invalid encrypted payload");
  }
  const key = await deriveAesKey(secret);
  const iv = arrayFromBase64(ivPart);
  const ciphertext = arrayFromBase64(cipherPart);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return decoder.decode(plaintext);
};

export const clearGeminiKeyCache = () => {
  cachedKey = null;
};

export const resolveGeminiKey = async (options: { supabaseUrl?: string | null; serviceRoleKey?: string | null } = {}) => {
  const envKey = Deno.env.get("GEMINI_API_KEY");
  if (envKey) {
    return envKey;
  }

  if (cachedKey && cachedKey.expiresAt > Date.now()) {
    return cachedKey.value;
  }

  const secret = Deno.env.get("AI_CONFIG_SECRET");
  if (!secret) {
    return null;
  }

  const supabaseUrl = options.supabaseUrl ?? Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = options.serviceRoleKey ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabaseClient
    .from("content_sections")
    .select("content")
    .eq("section_name", AI_CONFIG_SECTION)
    .maybeSingle();

  if (error) {
    console.error("Failed to load AI configuration", error.message);
    return null;
  }

  const encryptedKey = data?.content?.encryptedKey as string | undefined;
  if (!encryptedKey) {
    return null;
  }

  try {
    const value = await decryptSecret(encryptedKey, secret);
    cachedKey = { value, expiresAt: Date.now() + 1000 * 60 * 5 };
    return value;
  } catch (error) {
    console.error("Failed to decrypt Gemini key", error instanceof Error ? error.message : error);
    return null;
  }
};

export const summarizeAiConfig = (record: {
  content?: Record<string, unknown> | null;
  updated_at?: string | null;
  updated_by?: string | null;
} | null) => {
  const content = (record?.content ?? {}) as Record<string, unknown>;
  return {
    provider: content.provider ?? "gemini",
    model: content.model ?? "gemini-2.0-flash-lite",
    keyPreview: content.keyPreview ?? null,
    updatedAt: record?.updated_at ?? null,
    updatedBy: record?.updated_by ?? null,
  };
};

export const loadAiConfigRecord = async (
  supabaseClient: SupabaseClient
) => {
  const { data, error } = await supabaseClient
    .from("content_sections")
    .select("content, updated_at, updated_by")
    .eq("section_name", AI_CONFIG_SECTION)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
};

export const saveAiConfigRecord = async (
  supabaseClient: SupabaseClient,
  payload: { content: Record<string, unknown>; updatedBy: string }
) => {
  const { error } = await supabaseClient.from("content_sections").upsert({
    section_name: AI_CONFIG_SECTION,
    content: payload.content,
    updated_at: new Date().toISOString(),
    updated_by: payload.updatedBy,
  });

  if (error) {
    throw error;
  }
};
