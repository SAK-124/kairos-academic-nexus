const GEMINI_MODEL = 'gemini-2.5-pro-exp';

interface GeminiMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

interface GenerateOptions {
  responseMimeType?: 'text/plain' | 'application/json';
  temperature?: number;
}

const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';

const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY.');
  }
  return key;
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

export async function generateGeminiResponse(
  messages: GeminiMessage[],
  options: GenerateOptions = {}
) {
  const apiKey = getApiKey();
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

export const GeminiClient = {
  chat(messages: GeminiMessage[]) {
    return generateGeminiResponse(messages, { responseMimeType: 'text/plain' });
  },
  json(messages: GeminiMessage[]) {
    return generateGeminiResponse(messages, { responseMimeType: 'application/json' });
  },
};

export type { GeminiMessage };
