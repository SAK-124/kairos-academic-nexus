import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveGeminiKey } from "../_shared/ai-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const buildWebSearchQuery = (input: string) => {
  return input
    .split(/[\s,]+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .join(' ');
};

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, filters, useAI } = await req.json();
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

    let searchTerms = query;

    // Use AI to extract key search terms
    if (useAI && query) {
      try {
        const geminiApiKey = await resolveGeminiKey({ supabaseUrl, serviceRoleKey });
        if (!geminiApiKey) {
          throw new Error('Gemini API key is not configured');
        }
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
      const normalisedTerms = buildWebSearchQuery(searchTerms);
      if (normalisedTerms) {
        dbQuery = dbQuery.textSearch('plain_text_search', normalisedTerms, { type: 'websearch' });
      }
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
  } catch (error) {
    console.error('Error in search-notes:', error);
    return new Response(JSON.stringify({ error: toErrorMessage(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
