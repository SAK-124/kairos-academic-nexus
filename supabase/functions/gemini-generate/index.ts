import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MODEL = "google/gemini-2.5-flash";

type IncomingRole = "system" | "user" | "assistant";

type IncomingMessage = {
  role?: IncomingRole | null;
  content?: unknown;
};

type NormalizedMessage = {
  role: IncomingRole;
  content: string;
};

const normalizeMessage = (message: IncomingMessage | null | undefined): NormalizedMessage | null => {
  if (!message || typeof message !== "object") {
    return null;
  }

  const role = message.role;
  if (role !== "system" && role !== "user" && role !== "assistant") {
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

  const model = typeof payload.model === "string" && payload.model.trim().length
    ? payload.model.trim()
    : DEFAULT_MODEL;

  const responseMimeType =
    payload.responseMimeType === "application/json" ? "application/json" : "text/plain";

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY is not configured");
    return new Response(
      JSON.stringify({ error: "AI service is not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: responseMimeType === "application/json" 
          ? { type: "json_object" }
          : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ error: "AI request failed" }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    const choices = Array.isArray(data.choices) ? data.choices : [];
    const firstChoice = choices[0] as Record<string, unknown> | undefined;
    const message = firstChoice?.message as Record<string, unknown> | undefined;
    const text = (typeof message?.content === "string" ? message.content : "") || "";

    if (responseMimeType === "application/json") {
      if (!text.trim().length) {
        return new Response(
          JSON.stringify({ error: "AI returned an empty response" }),
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
          JSON.stringify({ error: "AI returned invalid JSON", text }),
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
    console.error("gemini-generate error:", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error contacting AI service" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
