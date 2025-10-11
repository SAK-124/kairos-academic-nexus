import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, FileText, HelpCircle, Lightbulb, GraduationCap, Loader2, RefreshCcw, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GeminiClient, type GeminiMessage } from '@/integrations/gemini/client';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { FlashcardItem, QuizQuestionItem } from '@/types/ai';

interface AIAssistantPanelProps {
  noteId: string;
  courseId?: string | null;
  folderId?: string | null;
  onShowFlashcards: (flashcards: FlashcardItem[]) => void;
  onShowQuiz: (questions: QuizQuestionItem[]) => void;
  onGeneratingChange: (isGenerating: boolean) => void;
}

type CacheValue = string | { type: 'flashcards'; data: any[] } | { type: 'quiz'; data: any[] };

export function AIAssistantPanel({ noteId, courseId, folderId, onShowFlashcards, onShowQuiz, onGeneratingChange }: AIAssistantPanelProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const resultCache = useRef(new Map<string, CacheValue>());

  const quickActions = [
    { id: 'summarize', label: 'Summarize', icon: FileText, description: 'Get a concise summary' },
    { id: 'flashcards', label: 'Flashcards', icon: GraduationCap, description: 'Create 10 flashcards' },
    { id: 'qa', label: 'Ask Question', icon: HelpCircle, description: 'Ask about your notes' },
    { id: 'explain', label: 'Explain', icon: Lightbulb, description: 'Explain a concept' },
    { id: 'quiz', label: 'Quiz Me', icon: Sparkles, description: 'Create 10 quiz questions' },
  ];

  const hasCachedResult = (actionId: string) => {
    const prefix = `${actionId}::`;
    return Array.from(resultCache.current.keys()).some((key) => key.startsWith(prefix));
  };

  const setCachedResponse = (actionId: string, cacheKey: string, value: CacheValue) => {
    resultCache.current.set(cacheKey, value);
    
    if (typeof value === 'object' && 'type' in value) {
      if (actionId === 'flashcards' && value.type === 'flashcards') {
        onShowFlashcards(value.data);
        setResponse('Generated flashcards are ready in the study panel.');
      } else if (actionId === 'quiz' && value.type === 'quiz') {
        onShowQuiz(value.data);
        setResponse('Generated quiz questions are available in the study panel.');
      }
    } else if (typeof value === 'string') {
      setResponse(value);
    }
  };

  const handleAction = (actionId: string) => {
    setActiveAction(actionId);
    setResponse('');
    setUserInput('');
    if (actionId !== 'qa' && actionId !== 'explain') {
      void processAction(actionId);
    }
  };

  const buildMessages = (actionId: string, noteContent: string): GeminiMessage[] => {
    const baseSystem = 'You are Kairos, an academic assistant who writes in clear, student-friendly language.';
    switch (actionId) {
      case 'summarize':
        return [
          { role: 'system' as const, content: `${baseSystem} Provide structured markdown.` },
          {
            role: 'user' as const,
            content: `Summarize the following note in 4-6 bullet points and a "Key Takeaway" section. Use markdown headings.

${noteContent}`,
          },
        ];
      case 'qa':
        return [
          { role: 'system' as const, content: `${baseSystem} Answer based only on the provided note.` },
          {
            role: 'user' as const,
            content: `Here is the note content:
${noteContent}

Question: ${userInput}. Provide a helpful answer with supporting points.`,
          },
        ];
      case 'explain':
        return [
          { role: 'system' as const, content: `${baseSystem} Teach with analogies when useful.` },
          {
            role: 'user' as const,
            content: `Explain the following concept from the note so that a busy college student can understand it quickly:
${userInput}

Here is the relevant note context:
${noteContent}`,
          },
        ];
      case 'flashcards':
        return [
          { role: 'system' as const, content: `${baseSystem} Return strict JSON only.` },
          {
            role: 'user' as const,
            content: `Create 10 spaced-repetition friendly flashcards from this note. Return JSON like {
  "flashcards": [
    { "question": "...", "answer": "..." }
  ]
}. Questions should be concise and answers should be short.`,
          },
          { role: 'user' as const, content: noteContent },
        ];
      case 'quiz':
        return [
          { role: 'system' as const, content: `${baseSystem} Return strict JSON only.` },
          {
            role: 'user' as const,
            content: `Generate 10 quiz questions with "question", "answer", and "choices" (array with the correct answer included). Return JSON like {
  "questions": [
    { "question": "...", "answer": "...", "choices": ["..."] }
  ]
}.`,
          },
          { role: 'user' as const, content: noteContent },
        ];
      default:
        return [];
    }
  };

  const processAction = async (actionId: string, refresh = false) => {
    if (!noteId) return;

    const cacheKey = `${actionId}::${userInput.trim() || '__default__'}`;
    if (!refresh && resultCache.current.has(cacheKey)) {
      const cached = resultCache.current.get(cacheKey)!;
      setCachedResponse(actionId, cacheKey, cached);
      return;
    }

    setIsLoading(true);
    onGeneratingChange(true);
    try {
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .select('plain_text, course_id, folder_id')
        .eq('id', noteId)
        .single();

      if (noteError) throw noteError;

      const noteContent = noteData?.plain_text || 'No note content provided yet.';
      const messages = buildMessages(actionId, noteContent);

      if (!messages.length) {
        throw new Error('Unable to process this request.');
      }

      if (actionId === 'flashcards') {
        const result = await GeminiClient.json(messages);
        const flashcards = Array.isArray(result)
          ? result
          : Array.isArray(result?.flashcards)
            ? result.flashcards
            : [];

        if (!flashcards.length) {
          toast({
            title: 'No flashcards generated',
            description: 'Try selecting a different portion of your notes.',
          });
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('study_materials').insert({
            user_id: user.id,
            note_id: noteId,
            course_id: noteData.course_id || courseId,
            folder_id: noteData.folder_id || folderId,
            type: 'flashcard',
            content: flashcards,
          });
        }

        const cachePayload: CacheValue = { type: 'flashcards', data: flashcards };
        setCachedResponse(actionId, cacheKey, cachePayload);
        return;
      }

      if (actionId === 'quiz') {
        const result = await GeminiClient.json(messages);
        const questions = Array.isArray(result)
          ? result
          : Array.isArray(result?.questions)
            ? result.questions
            : [];

        if (!questions.length) {
          toast({
            title: 'No quiz generated',
            description: 'Try refreshing or adjusting your notes.',
          });
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('study_materials').insert({
            user_id: user.id,
            note_id: noteId,
            course_id: noteData.course_id || courseId,
            folder_id: noteData.folder_id || folderId,
            type: 'quiz',
            content: questions,
          });
        }

        const cachePayload: CacheValue = { type: 'quiz', data: questions };
        setCachedResponse(actionId, cacheKey, cachePayload);
        return;
      }

      const textResponse = await GeminiClient.chat(messages);
      const sanitized = textResponse?.trim() || 'No response generated yet.';
      setCachedResponse(actionId, cacheKey, sanitized);
    } catch (error: any) {
      console.error('Error in AI assistant:', error);
      const message = error instanceof Error ? error.message : 'Failed to process request';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      onGeneratingChange(false);
    }
  };

  return (
    <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border/40 bg-card/50 backdrop-blur flex flex-col">
      <div className="p-4 border-b border-border/40 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Assistant
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Enhance your notes with AI
          </p>
        </div>
        {activeAction && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => void processAction(activeAction, true)}
            disabled={isLoading}
          >
            <RefreshCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4 space-y-4">
        <div className="grid grid-cols-1 gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant={activeAction === action.id ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => handleAction(action.id)}
              disabled={isLoading && activeAction !== action.id}
            >
              <action.icon className="w-4 h-4 mr-2" />
              <div className="flex-1 text-left">
                <div>{action.label}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
              {hasCachedResult(action.id) && (
                <History className="w-3 h-3 text-muted-foreground" />
              )}
            </Button>
          ))}
        </div>

        {(activeAction === 'qa' || activeAction === 'explain') && (
          <div className="space-y-4">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={
                activeAction === 'qa'
                  ? 'Ask a question about your notes...'
                  : 'What concept would you like explained?'
              }
              rows={4}
            />
            <Button
              className="w-full"
              onClick={() => void processAction(activeAction, false)}
              disabled={!userInput.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        )}

        {response && (
          <div className="mt-2 p-4 rounded-lg bg-muted/50 border border-border/40">
            <MarkdownRenderer content={response} className="text-sm" />
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
