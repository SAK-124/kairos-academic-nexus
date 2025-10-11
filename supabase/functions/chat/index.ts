import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveGeminiKey } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawPayload = (await req.json().catch(() => null)) as unknown;
    const payloadRecord =
      rawPayload && typeof rawPayload === 'object'
        ? (rawPayload as Record<string, unknown>)
        : {};

    const incoming = Array.isArray(payloadRecord.messages)
      ? payloadRecord.messages
      : payloadRecord.message
        ? [{ role: 'user', content: String(payloadRecord.message) }]
        : [];

    type NormalizedMessage = { role: 'system' | 'user' | 'assistant'; content?: unknown };

    const normalizeMessage = (value: unknown): NormalizedMessage | null => {
      if (typeof value === 'object' && value !== null) {
        const role = (value as { role?: string }).role;
        if (role === 'system' || role === 'user' || role === 'assistant') {
          return { role, content: (value as { content?: unknown }).content };
        }
      }
      return null;
    };

    const normalizedMessages = incoming
      .map((message) => normalizeMessage(message))
      .filter((message): message is NormalizedMessage => message !== null);

    if (!normalizedMessages.length) {
      return new Response(
        JSON.stringify({ error: 'No prompt provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const GEMINI_API_KEY = await resolveGeminiKey();

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    const baseSystemPrompt = `You are Kairos, an AI academic companion designed to help students plan their courses and manage their academic life. You are knowledgeable, supportive, and provide practical guidance on course selection, scheduling, and academic success.`;

    const systemMessages = normalizedMessages.filter((msg) => msg.role === 'system');
    const conversation = normalizedMessages.filter((msg) => msg.role !== 'system');

    const systemInstruction = [baseSystemPrompt]
      .concat(systemMessages.map((msg) => String(msg.content ?? '')))
      .filter(Boolean)
      .join('\n\n');

    const contents = conversation.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(msg.content ?? '') }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            role: 'system',
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig: {
            temperature: typeof payloadRecord.temperature === 'number' ? payloadRecord.temperature : 0.6,
            maxOutputTokens: 1200,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI service unavailable' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    const firstCandidate = candidates.length > 0 && typeof candidates[0] === 'object' ? candidates[0] as Record<string, unknown> : null;
    
    const content = firstCandidate?.content;
    const contentObj = (typeof content === 'object' && content !== null) 
      ? content as Record<string, unknown> 
      : null;

    const parts = contentObj && Array.isArray(contentObj.parts)
      ? (contentObj.parts as Array<{ text?: string }>)
      : [];
      
    const replyText = parts
      .map((part) => part?.text ?? '')
      .filter((text) => text && text.length)
      .join('\n');
    const reply = replyText || 'I apologize, but I could not generate a helpful response.';

    return new Response(
      JSON.stringify({ reply }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error: unknown) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
