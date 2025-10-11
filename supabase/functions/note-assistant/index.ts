import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveGeminiKey } from "../_shared/ai-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { noteId, noteContent, action, userInput, refresh, existingContent } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.match(/^Bearer\s+(.*)$/i)?.[1]?.trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'summarize':
        systemPrompt = 'You are an expert academic note summarizer. Create concise, bullet-point summaries that capture key concepts, main ideas, and important details. Keep it under 200 words.';
        userPrompt = `Summarize these lecture notes:\n\n${noteContent}`;
        break;
      case 'flashcards':
        if (refresh && existingContent) {
          systemPrompt = 'You are a flashcard generator. Create exactly 10 NEW flashcards that are DIFFERENT from the existing ones. Respond with ONLY a valid JSON array, no markdown formatting or code blocks. If no new content can be generated, respond with: {"error": "NO_NEW_CONTENT"}. Format: [{"id": "1", "question": "...", "answer": "..."}]';
          userPrompt = `Existing flashcards:\n${existingContent}\n\nNotes:\n${noteContent}\n\nGenerate 10 NEW different flashcards from these notes.`;
        } else {
          systemPrompt = 'You are a flashcard generator. Create exactly 10 flashcards. Respond with ONLY a valid JSON array, no markdown formatting or code blocks. Format: [{"id": "1", "question": "...", "answer": "..."}, {"id": "2", "question": "...", "answer": "..."}, ...]';
          userPrompt = `Generate exactly 10 flashcards from these notes:\n\n${noteContent}`;
        }
        break;
      case 'qa':
        systemPrompt = 'You are a helpful academic tutor. Answer questions about the student\'s notes clearly and concisely. Use examples when helpful.';
        userPrompt = `Notes:\n${noteContent}\n\nQuestion: ${userInput}`;
        break;
      case 'explain':
        systemPrompt = 'You are an expert educator. Explain concepts from notes in simple terms with examples and analogies.';
        userPrompt = `Explain this concept from my notes:\n\n${userInput}\n\nContext:\n${noteContent}`;
        break;
      case 'quiz':
        if (refresh && existingContent) {
          systemPrompt = 'You are a quiz generator. Create exactly 10 NEW multiple-choice questions that are DIFFERENT from existing ones. Respond with ONLY a valid JSON array, no markdown formatting or code blocks. If no new content can be generated, respond with: {"error": "NO_NEW_CONTENT"}. Format: [{"id": "1", "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A) ..."}]';
          userPrompt = `Existing questions:\n${existingContent}\n\nNotes:\n${noteContent}\n\nGenerate 10 NEW different quiz questions.`;
        } else {
          systemPrompt = 'You are a quiz generator. Create exactly 10 multiple-choice questions with 4 options each. Respond with ONLY a valid JSON array, no markdown formatting or code blocks. Format: [{"id": "1", "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A) ..."}, ...]';
          userPrompt = `Create exactly 10 quiz questions from these notes:\n\n${noteContent}`;
        }
        break;
      default:
        throw new Error('Invalid action');
    }

    const geminiApiKey = await resolveGeminiKey({ supabaseUrl, serviceRoleKey });

    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'Gemini API key is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const model = action === 'summarize' || action === 'qa' 
      ? 'gemini-2.0-flash-lite' 
      : 'gemini-2.0-flash';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';

    // Log interaction
    const { error: logError } = await supabaseClient.from('ai_interactions').insert({
      user_id: user.id,
      note_id: noteId,
      interaction_type: action,
      prompt: userPrompt,
      response: aiResponse,
      model: model,
    });

    if (logError) {
      console.error('Failed to log AI interaction:', logError.message);
    }

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in note-assistant:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
