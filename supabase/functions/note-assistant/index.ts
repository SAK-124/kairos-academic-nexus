import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get('Authorization')!;
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
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
          systemPrompt = 'You are a flashcard generator. Create exactly 10 NEW flashcards that are DIFFERENT from the existing ones. Respond with JSON array ONLY. If no new content can be generated, respond with: {"error": "NO_NEW_CONTENT"}. Format: [{"id": "1", "question": "...", "answer": "..."}]';
          userPrompt = `Existing flashcards:\n${existingContent}\n\nNotes:\n${noteContent}\n\nGenerate 10 NEW different flashcards from these notes.`;
        } else {
          systemPrompt = 'You are a flashcard generator. Create exactly 10 flashcards. Respond with JSON array ONLY. Format: [{"id": "1", "question": "...", "answer": "..."}, {"id": "2", "question": "...", "answer": "..."}, ...]';
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
          systemPrompt = 'You are a quiz generator. Create exactly 10 NEW multiple-choice questions that are DIFFERENT from existing ones. Respond with JSON array ONLY. If no new content can be generated, respond with: {"error": "NO_NEW_CONTENT"}. Format: [{"id": "1", "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A) ..."}]';
          userPrompt = `Existing questions:\n${existingContent}\n\nNotes:\n${noteContent}\n\nGenerate 10 NEW different quiz questions.`;
        } else {
          systemPrompt = 'You are a quiz generator. Create exactly 10 multiple-choice questions with 4 options each. Respond with JSON array ONLY. Format: [{"id": "1", "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A) ..."}, ...]';
          userPrompt = `Create exactly 10 quiz questions from these notes:\n\n${noteContent}`;
        }
        break;
      default:
        throw new Error('Invalid action');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
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
    await supabaseClient.from('ai_interactions').insert({
      user_id: user.id,
      note_id: noteId,
      interaction_type: action,
      prompt: userPrompt,
      response: aiResponse,
      model: model,
    });

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
