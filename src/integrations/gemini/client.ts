import { supabase } from '@/integrations/supabase/client';

const GEMINI_MODEL = 'gemini-2.5-pro';

interface GeminiMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

interface GenerateOptions {
  responseMimeType?: 'text/plain' | 'application/json';
  temperature?: number;
}

const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';

const DIRECT_KEY_CANDIDATES = [
  'VITE_GEMINI_API_KEY',
  'VITE_GEMINI_API_KEY_FALLBACK',
  'VITE_GEMINI_PRIMARY_API_KEY',
  'VITE_GEMINI_SECONDARY_API_KEY',
  'VITE_PUBLIC_GEMINI_API_KEY',
];

const getDirectApiKey = () => {
  for (const keyName of DIRECT_KEY_CANDIDATES) {
    const value = (import.meta.env as Record<string, string | undefined>)[keyName];
    if (value && value.trim().length) {
      return value;
    }
  }
  return null;
};

const toContent = (messages: GeminiMessage[]) =>
  messages.map(({ role, content }) => ({
    role,
    parts: [{ text: content }],
  }));

const extractText = (payload: any) => {
  const candidate = payload?.candidates?.[0];
  if (!candidate) return '';
  const parts = candidate.content?.parts || [];
  return parts
    .map((part: any) => part.text)
    .filter(Boolean)
    .join('\n');
};

async function callDirectGemini(
  apiKey: string,
  messages: GeminiMessage[],
  options: GenerateOptions
) {
  const response = await fetch(
    `${API_ENDPOINT}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: toContent(messages),
        generationConfig: {
          responseMimeType: options.responseMimeType ?? 'text/plain',
          temperature: options.temperature ?? 0.4,
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Gemini request failed');
  }

  if (options.responseMimeType === 'application/json') {
    const text = extractText(data);
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('Gemini returned invalid JSON');
    }
  }

  return extractText(data);
}

async function callEdgeFunction(
  messages: GeminiMessage[],
  options: GenerateOptions
) {
  const { data, error } = await supabase.functions.invoke('gemini-generate', {
    body: {
      messages,
      responseMimeType: options.responseMimeType ?? 'text/plain',
      temperature: options.temperature ?? 0.4,
      model: GEMINI_MODEL,
    },
  });

  if (error) {
    throw new Error(error.message ?? 'Gemini request failed');
  }

  if (!data) {
    throw new Error('Gemini returned an empty response');
  }

  if ((options.responseMimeType ?? 'text/plain') === 'application/json') {
    if ('json' in data && data.json !== undefined) {
      return data.json;
    }
    throw new Error('Gemini returned invalid JSON');
  }

  return data.text ?? '';
}

export async function generateGeminiResponse(
  messages: GeminiMessage[],
  options: GenerateOptions = {}
) {
  // Always use edge function to ensure backend GEMINI_API_KEY is used
  return callEdgeFunction(messages, options);
}

export const GeminiClient = {
  chat(messages: GeminiMessage[]) {
    return generateGeminiResponse(messages, { responseMimeType: 'text/plain' });
  },
  json(messages: GeminiMessage[]) {
    return generateGeminiResponse(messages, { responseMimeType: 'application/json' });
  },
};

export type { GeminiMessage };
