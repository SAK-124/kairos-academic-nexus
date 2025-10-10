import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, FileText, HelpCircle, Lightbulb, GraduationCap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FlashcardViewer } from '../FlashcardViewer';
import { QuizViewer } from '../QuizViewer';

interface AIAssistantPanelProps {
  noteId: string;
  courseId?: string | null;
  folderId?: string | null;
}

export function AIAssistantPanel({ noteId, courseId, folderId }: AIAssistantPanelProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFlashcardViewer, setShowFlashcardViewer] = useState(false);
  const [showQuizViewer, setShowQuizViewer] = useState(false);
  const { toast } = useToast();

  const cleanJsonResponse = (response: string): string => {
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return cleaned.trim();
  };

  const quickActions = [
    { id: 'summarize', label: 'Summarize', icon: FileText, description: 'Get a concise summary' },
    { id: 'flashcards', label: 'Flashcards', icon: GraduationCap, description: 'Create 10 flashcards' },
    { id: 'qa', label: 'Ask Question', icon: HelpCircle, description: 'Ask about your notes' },
    { id: 'explain', label: 'Explain', icon: Lightbulb, description: 'Explain a concept' },
    { id: 'quiz', label: 'Quiz Me', icon: Sparkles, description: 'Create 10 quiz questions' },
  ];

  const handleAction = (actionId: string) => {
    setActiveAction(actionId);
    setResponse('');
    setUserInput('');
    if (actionId !== 'qa' && actionId !== 'explain') {
      processAction(actionId);
    }
  };

  const processAction = async (actionId: string, refresh = false) => {
    setIsLoading(true);
    try {
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .select('plain_text, course_id, folder_id')
        .eq('id', noteId)
        .single();

      if (noteError) throw noteError;

      const requestBody: any = {
        noteId,
        noteContent: noteData.plain_text,
        action: actionId,
        userInput: userInput,
      };

      if (refresh) {
        requestBody.refresh = true;
        if (actionId === 'flashcards') {
          const existing = flashcards.map(f => `Q: ${f.question}`).join('\n');
          requestBody.existingContent = existing;
        } else if (actionId === 'quiz') {
          const existing = quizQuestions.map(q => q.question).join('\n');
          requestBody.existingContent = existing;
        }
      }

      const { data, error } = await supabase.functions.invoke('note-assistant', {
        body: requestBody,
      });

      if (error) throw error;

      if (actionId === 'flashcards') {
        try {
          const cleanedResponse = typeof data.response === 'string' ? cleanJsonResponse(data.response) : JSON.stringify(data.response);
          const parsed = JSON.parse(cleanedResponse);
          
          if (parsed.error === 'NO_NEW_CONTENT') {
            toast({
              title: 'No new content',
              description: 'There is no new content available to generate more flashcards.',
            });
            return;
          }

          const newFlashcards = Array.isArray(parsed) ? parsed : parsed.flashcards || [];
          const combinedFlashcards = refresh ? [...flashcards, ...newFlashcards] : newFlashcards;
          
          setFlashcards(combinedFlashcards);

          // Save to database
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('study_materials').insert({
              user_id: user.id,
              note_id: noteId,
              course_id: noteData.course_id || courseId,
              folder_id: noteData.folder_id || folderId,
              type: 'flashcard',
              content: { flashcards: combinedFlashcards },
            });
          }

          setShowFlashcardViewer(true);
        } catch (parseError) {
          console.error('Error parsing flashcards:', parseError);
          setResponse(data.response);
        }
      } else if (actionId === 'quiz') {
        try {
          const cleanedResponse = typeof data.response === 'string' ? cleanJsonResponse(data.response) : JSON.stringify(data.response);
          const parsed = JSON.parse(cleanedResponse);
          
          if (parsed.error === 'NO_NEW_CONTENT') {
            toast({
              title: 'No new content',
              description: 'There is no new content available to generate more questions.',
            });
            return;
          }

          const newQuestions = Array.isArray(parsed) ? parsed : parsed.questions || [];
          const combinedQuestions = refresh ? [...quizQuestions, ...newQuestions] : newQuestions;
          
          setQuizQuestions(combinedQuestions);

          // Save to database
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('study_materials').insert({
              user_id: user.id,
              note_id: noteId,
              course_id: noteData.course_id || courseId,
              folder_id: noteData.folder_id || folderId,
              type: 'quiz',
              content: { questions: combinedQuestions },
            });
          }

          setShowQuizViewer(true);
        } catch (parseError) {
          console.error('Error parsing quiz:', parseError);
          setResponse(data.response);
        }
      } else {
        setResponse(data.response);
      }
    } catch (error: any) {
      console.error('Error in AI assistant:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process request',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMore = async () => {
    if (activeAction) {
      await processAction(activeAction, true);
    }
  };

  return (
    <div className="w-80 border-l border-border/40 bg-card/50 backdrop-blur flex flex-col">
      <div className="p-4 border-b border-border/40">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Assistant
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Enhance your notes with AI
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2 mb-6">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant={activeAction === action.id ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => handleAction(action.id)}
              disabled={isLoading}
            >
              <action.icon className="w-4 h-4 mr-2" />
              <div className="flex-1 text-left">
                <div>{action.label}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
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
              onClick={() => processAction(activeAction)}
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

        {response && !showFlashcardViewer && !showQuizViewer && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border/40">
            <pre className="whitespace-pre-wrap text-sm">{response}</pre>
          </div>
        )}

        {isLoading && !showFlashcardViewer && !showQuizViewer && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </ScrollArea>

      {showFlashcardViewer && (
        <FlashcardViewer
          flashcards={flashcards}
          onClose={() => setShowFlashcardViewer(false)}
          onGenerateMore={handleGenerateMore}
          isGenerating={isLoading}
        />
      )}

      {showQuizViewer && (
        <QuizViewer
          questions={quizQuestions}
          onClose={() => setShowQuizViewer(false)}
          onGenerateMore={handleGenerateMore}
          isGenerating={isLoading}
        />
      )}
    </div>
  );
}
