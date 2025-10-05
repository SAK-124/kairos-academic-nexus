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
    const { message } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log("Received message:", message);

    const systemPrompt = `You are Kairos, an AI academic companion designed to help students plan their courses and manage their academic life. You are knowledgeable, supportive, and provide practical guidance on course selection, scheduling, and academic success.

Key features of the Kairos platform:
- AI-powered course scheduling with conflict detection
- Personalized course recommendations based on student preferences and history
- GPA tracking and academic performance insights
- Study planning and deadline management
- Integration with university course catalogs

When helping students:
- Ask clarifying questions about their major, interests, and academic goals
- Provide specific, actionable advice
- Be encouraging and supportive
- Keep responses concise and helpful`;

    // Google Gemini API request format
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: message }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { 
            status: 429, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data = await response.json();
    console.log("Gemini response received");

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I apologize, but I couldn't generate a response. Please try again.";

    return new Response(
      JSON.stringify({ reply }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in chat function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
