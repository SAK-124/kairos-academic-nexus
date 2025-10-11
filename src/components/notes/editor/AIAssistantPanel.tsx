import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, FileText, HelpCircle, Lightbulb, GraduationCap, Loader2, RefreshCcw, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AiClient } from '@/integrations/ai/client';
import type { FlashcardItem, FlashcardResult, QuizQuestionItem, QuizResult } from '@/types/ai';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface AIAssistantPanelProps {
  noteId: string;
  courseId?: string | null;
  folderId?: string | null;
  onShowFlashcards: (flashcards: FlashcardItem[]) => void;
  onShowQuiz: (questions: QuizQuestionItem[]) => void;
  onGeneratingChange: (isGenerating: boolean) => void;
}

type FlashcardCache = { type: 'flashcards'; data: FlashcardItem[] };
type QuizCache = { type: 'quiz'; data: QuizQuestionItem[] };
type CacheValue = string | FlashcardCache | QuizCache;

const isFlashcardResult = (value: FlashcardResult): value is FlashcardItem[] => Array.isArray(value);

const extractFlashcards = (value: FlashcardResult): FlashcardItem[] => {
  if (isFlashcardResult(value)) {
    return value;
  }
  if (value && typeof value === 'object' && Array.isArray(value.flashcards)) {
    return value.flashcards;
  }
  return [];
};

const isQuizResult = (value: QuizResult): value is QuizQuestionItem[] => Array.isArray(value);

const extractQuizQuestions = (value: QuizResult): QuizQuestionItem[] => {
  if (isQuizResult(value)) {
    return value;
  }
  if (value && typeof value === 'object' && Array.isArray(value.questions)) {
    return value.questions;
  }
  return [];
};

const isFlashcardCache = (value: CacheValue | undefined): value is FlashcardCache =>
  typeof value === 'object' && value !== null && (value as FlashcardCache).type === 'flashcards';

const isQuizCache = (value: CacheValue | undefined): value is QuizCache =>
  typeof value === 'object' && value !== null && (value as QuizCache).type === 'quiz';

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
    if (actionId === 'flashcards' && isFlashcardCache(value)) {
      onShowFlashcards(value.data);
      setResponse('Generated flashcards are ready in the study panel.');
    } else if (actionId === 'quiz' && isQuizCache(value)) {
      onShowQuiz(value.data);
      setResponse('Generated quiz questions are available in the study panel.');
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

      if (actionId === 'flashcards') {
        const cachedValue = resultCache.current.get(cacheKey);
        const response = await AiClient.generateFlashcards({
          noteId,
          noteContent,
          existing: isFlashcardCache(cachedValue) ? cachedValue.data : undefined,
          refresh,
        });

        const flashcards = extractFlashcards(response);

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
        const cachedValue = resultCache.current.get(cacheKey);
        const response = await AiClient.generateQuiz({
          noteId,
          noteContent,
          existing: isQuizCache(cachedValue) ? cachedValue.data : undefined,
          refresh,
        });

        const questions = extractQuizQuestions(response);

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

      let textResponse = '';
      switch (actionId) {
        case 'summarize':
          textResponse = await AiClient.summarizeNote({ noteId, noteContent });
          break;
        case 'qa':
          textResponse = await AiClient.answerQuestion({ noteId, noteContent, question: userInput });
          break;
        case 'explain':
          textResponse = await AiClient.explainConcept({ noteId, noteContent, concept: userInput });
          break;
        default:
          textResponse = await AiClient.chat([
            { role: 'system', content: 'You are Kairos, an academic assistant.' },
            { role: 'user', content: userInput || 'Help me organize my notes.' },
          ]);
      }

      const sanitized = textResponse?.trim() || 'No response generated yet.';
      setCachedResponse(actionId, cacheKey, sanitized);
    } catch (error: unknown) {
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
