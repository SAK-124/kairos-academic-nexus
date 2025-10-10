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
    const { query, filters, useAI } = await req.json();
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

    let searchTerms = query;

    // Use AI to extract key search terms
    if (useAI && query) {
      try {
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{
                    text: `Extract 3-5 key search terms from this query: "${query}"\nReturn ONLY the terms, comma-separated, no explanations.`
                  }]
                }
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 100,
              }
            })
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          searchTerms = data.candidates?.[0]?.content?.parts?.[0]?.text || query;
        }
      } catch (error) {
        console.error('AI search enhancement failed:', error);
        // Fall back to original query
      }
    }

    // Build PostgreSQL query
    let dbQuery = supabaseClient
      .from('notes')
      .select('*')
      .eq('user_id', user.id);

    // Full-text search
    if (searchTerms) {
      dbQuery = dbQuery.textSearch('plain_text_search', searchTerms);
    }

    // Apply filters
    if (filters?.courseId) {
      dbQuery = dbQuery.eq('course_id', filters.courseId);
    }
    if (filters?.tags?.length > 0) {
      dbQuery = dbQuery.contains('tags', filters.tags);
    }
    if (filters?.dateRange) {
      dbQuery = dbQuery
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end);
    }

    // Execute query
    const { data: notes, error } = await dbQuery
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return new Response(JSON.stringify({ notes: notes || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in search-notes:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
