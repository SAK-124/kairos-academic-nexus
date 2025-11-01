import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveGeminiKey } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-pro"; // fixed from -exp to supported model
const DEFAULT_TEMPERATURE = 0.4;

type IncomingRole = "system" | "user" | "assistant" | "model";

type IncomingMessage = {
  role?: IncomingRole | null;
  content?: unknown;
};

type NormalizedMessage = {
  role: IncomingRole;
  content: string;
};

const extractText = (payload: Record<string, unknown>) => {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const candidate =
    candidates.length > 0 && typeof candidates[0] === "object"
      ? (candidates[0] as Record<string, unknown>)
      : null;

  const content = candidate?.content;
  const contentObj =
    content && typeof content === "object" ? (content as Record<string, unknown>) : null;
  const parts = contentObj && Array.isArray(contentObj.parts)
    ? (contentObj.parts as Array<{ text?: string }>)
    : [];

  return parts
    .map((part) => part?.text ?? "")
    .filter((value) => Boolean(value && value.trim().length))
    .join("\n");
};

const normalizeMessage = (message: IncomingMessage | null | undefined): NormalizedMessage | null => {
  if (!message || typeof message !== "object") {
    return null;
  }

  const role = message.role;
  if (role !== "system" && role !== "user" && role !== "assistant" && role !== "model") {
    return null;
  }

  const content = message.content;
  if (typeof content !== "string") {
    return null;
  }

  return { role, content };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];
  const messages = rawMessages
    .map((message) => normalizeMessage(message as IncomingMessage))
    .filter((message): message is NormalizedMessage => message !== null);

  if (!messages.length) {
    return new Response(
      JSON.stringify({ error: "No messages supplied" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const systemMessages = messages.filter((message) => message.role === "system");
  const conversation = messages.filter((message) => message.role !== "system");

  if (!conversation.length) {
    return new Response(
      JSON.stringify({ error: "Conversation messages are required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const model = typeof payload.model === "string" && payload.model.trim().length
    ? payload.model.trim()
    : DEFAULT_MODEL;

  const temperature = typeof payload.temperature === "number"
    ? payload.temperature
    : DEFAULT_TEMPERATURE;

  const responseMimeType =
    payload.responseMimeType === "application/json" ? "application/json" : "text/plain";

  const GEMINI_API_KEY = await resolveGeminiKey();

  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Gemini API key is not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const contents = conversation.map((message) => ({
    role: message.role === "assistant" ? "model" : message.role,
    parts: [{ text: message.content }],
  }));

  const systemInstruction = systemMessages
    .map((message) => message.content)
    .filter((content) => content.trim().length)
    .join("\n\n");

  try {
    const response = await fetch(
      `${API_ENDPOINT}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: systemInstruction
            ? {
                role: "system",
                parts: [{ text: systemInstruction }],
              }
            : undefined,
          contents,
          generationConfig: {
            responseMimeType,
            temperature,
          },
        }),
      },
    );

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const errorMessage =
        typeof data?.error === "object" && data.error !== null
          ? (data.error as { message?: string }).message
          : null;

      return new Response(
        JSON.stringify({ error: errorMessage ?? "Gemini request failed" }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const text = extractText(data);

    if (responseMimeType === "application/json") {
      if (!text.trim().length) {
        return new Response(
          JSON.stringify({ error: "Gemini returned an empty response" }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      try {
        const parsed = JSON.parse(text) as unknown;
        return new Response(
          JSON.stringify({ text, json: parsed }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } catch (_parseError) {
        return new Response(
          JSON.stringify({ error: "Gemini returned invalid JSON", text }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({ text }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("gemini-generate error", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error contacting Gemini" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
