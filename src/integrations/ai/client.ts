import { supabase } from '@/integrations/supabase/client';
import type { FlashcardItem, FlashcardResult, QuizQuestionItem, QuizResult } from '@/types/ai';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type NoteAssistantAction = 'summarize' | 'qa' | 'explain' | 'flashcards' | 'quiz';

type CacheEntry<T> = { value: T; expiresAt: number };

const chatCache = new Map<string, CacheEntry<unknown>>();
const NOTE_CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const CHAT_CACHE_TTL = 1000 * 60; // 1 minute

const normaliseMessages = (messages: ChatMessage[]) =>
  messages
    .filter((message) => message.content.trim().length)
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));

const chatKey = (messages: ChatMessage[]) => JSON.stringify(normaliseMessages(messages));

const unwrapJson = <T>(payload: string | null, fallback: T): T => {
  if (!payload) return fallback;

  const trimmed = payload.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
  if (!trimmed) return fallback;

  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    console.warn('Failed to parse Gemini JSON payload', error);
    return fallback;
  }
};

const callChatFunction = async (messages: ChatMessage[]) => {
  const cacheId = chatKey(messages);
  const cached = chatCache.get(cacheId) as CacheEntry<string> | undefined;

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const { data, error } = await supabase.functions.invoke('chat', {
    body: {
      messages: normaliseMessages(messages),
    },
  });

  if (error) {
    throw new Error(error.message ?? 'Failed to contact AI service');
  }

  const reply = (data?.reply ?? data?.response ?? '').trim();

  if (!reply) {
    throw new Error('Gemini returned an empty response');
  }

  chatCache.set(cacheId, { value: reply, expiresAt: Date.now() + CHAT_CACHE_TTL });
  return reply;
};

const callNoteAssistant = async <T = unknown>(
  action: NoteAssistantAction,
  payload: {
    noteId: string;
    noteContent: string;
    userInput?: string;
    refresh?: boolean;
    existingContent?: unknown;
  },
  fallback: T
): Promise<T> => {
  const cacheId = `${action}::${payload.noteId}::${payload.userInput ?? '__default__'}`;
  const cached = chatCache.get(cacheId) as CacheEntry<T> | undefined;

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const { data, error } = await supabase.functions.invoke('note-assistant', {
    body: {
      action,
      noteId: payload.noteId,
      noteContent: payload.noteContent,
      userInput: payload.userInput,
      refresh: payload.refresh ?? false,
      existingContent: payload.existingContent
        ? JSON.stringify(payload.existingContent)
        : undefined,
    },
  });

  if (error) {
    throw new Error(error.message ?? 'Failed to reach note assistant');
  }

  const responseText = (data?.response ?? '').trim();
  if (!responseText) {
    throw new Error('Note assistant returned an empty response');
  }

  let value: T;
  if (action === 'flashcards' || action === 'quiz') {
    value = unwrapJson<T>(responseText, fallback);
  } else {
    value = responseText as unknown as T;
  }

  chatCache.set(cacheId, { value, expiresAt: Date.now() + NOTE_CACHE_TTL });
  return value;
};

const callFormatter = async (rawText: string) => {
  const cacheId = `format::${rawText.slice(0, 100)}`;
  const cached = chatCache.get(cacheId) as CacheEntry<string> | undefined;

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const { data, error } = await supabase.functions.invoke('format-note', {
    body: { rawText },
  });

  if (error) {
    throw new Error(error.message ?? 'Failed to reach formatting service');
  }

  const formatted = (data?.formatted ?? rawText).trim();
  chatCache.set(cacheId, { value: formatted, expiresAt: Date.now() + NOTE_CACHE_TTL });
  return formatted;
};

export const AiClient = {
  async chat(messages: ChatMessage[]) {
    return callChatFunction(messages);
  },
  async summarizeNote(payload: { noteId: string; noteContent: string }) {
    return callNoteAssistant<string>('summarize', payload, '');
  },
  async answerQuestion(payload: { noteId: string; noteContent: string; question: string }) {
    return callNoteAssistant<string>('qa', { ...payload, userInput: payload.question }, '');
  },
  async explainConcept(payload: { noteId: string; noteContent: string; concept: string }) {
    return callNoteAssistant<string>('explain', { ...payload, userInput: payload.concept }, '');
  },
  async generateFlashcards(payload: {
    noteId: string;
    noteContent: string;
    existing?: FlashcardItem[];
    refresh?: boolean;
  }) {
    const fallback: FlashcardResult = [];
    return callNoteAssistant<FlashcardResult>(
      'flashcards',
      {
        ...payload,
        existingContent: payload.existing ?? undefined,
      },
      fallback
    );
  },
  async generateQuiz(payload: {
    noteId: string;
    noteContent: string;
    existing?: QuizQuestionItem[];
    refresh?: boolean;
  }) {
    const fallback: QuizResult = [];
    return callNoteAssistant<QuizResult>(
      'quiz',
      {
        ...payload,
        existingContent: payload.existing ?? undefined,
      },
      fallback
    );
  },
  async format(rawText: string) {
    return callFormatter(rawText);
  },
};

export type FlashcardResponse = Awaited<ReturnType<typeof AiClient.generateFlashcards>>;
export type QuizResponse = Awaited<ReturnType<typeof AiClient.generateQuiz>>;
