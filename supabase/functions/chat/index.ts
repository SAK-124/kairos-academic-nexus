import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const incoming = Array.isArray(payload?.messages)
      ? payload.messages
      : payload?.message
        ? [{ role: 'user', content: String(payload.message) }]
        : [];

    if (!incoming.length) {
      return new Response(
        JSON.stringify({ error: 'No prompt provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const baseSystemPrompt = `You are Kairos, an AI academic companion designed to help students plan their courses and manage their academic life. You are knowledgeable, supportive, and provide practical guidance on course selection, scheduling, and academic success.`;

    const systemMessages = incoming.filter((msg: any) => msg.role === 'system');
    const conversation = incoming.filter((msg: any) => msg.role !== 'system');

    const systemInstruction = [baseSystemPrompt]
      .concat(systemMessages.map((msg: any) => String(msg.content ?? '')))
      .filter(Boolean)
      .join('\n\n');

    const contents = conversation.map((msg: any) => ({
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
            temperature: typeof payload?.temperature === 'number' ? payload.temperature : 0.6,
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

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts
      ?.map((part: any) => part.text)
      .filter(Boolean)
      .join('\n')
      || 'I apologize, but I could not generate a helpful response.';

    return new Response(
      JSON.stringify({ reply }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
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
