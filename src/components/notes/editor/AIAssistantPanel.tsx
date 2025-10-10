import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Layers, MessageCircle, ClipboardCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIAssistantPanelProps {
  noteId: string;
}

export function AIAssistantPanel({ noteId }: AIAssistantPanelProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const quickActions = [
    { id: 'summarize', label: 'Summarize', icon: Sparkles, description: 'Get a concise summary' },
    { id: 'flashcards', label: 'Flashcards', icon: Layers, description: 'Generate study cards' },
    { id: 'qa', label: 'Ask Question', icon: MessageCircle, description: 'Ask about your notes' },
    { id: 'quiz', label: 'Practice Quiz', icon: ClipboardCheck, description: 'Test your knowledge' },
  ];

  const handleAction = async (actionId: string) => {
    setActiveAction(actionId);
    setResponse('');
    
    if (actionId !== 'qa') {
      await processAction(actionId);
    }
  };

  const processAction = async (actionId: string) => {
    try {
      setIsLoading(true);
      setResponse('');

      // Get note content
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .select('plain_text, content')
        .eq('id', noteId)
        .single();

      if (noteError) throw noteError;

      const noteContent = note.plain_text || '';

      // Call edge function with streaming
      const { data, error } = await supabase.functions.invoke('note-assistant', {
        body: {
          noteId,
          noteContent,
          action: actionId,
          userInput: userInput || undefined,
        },
      });

      if (error) throw error;

      setResponse(data.response);
    } catch (error: any) {
      console.error('AI error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process AI request',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!userInput.trim()) return;
    await processAction('qa');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          AI Assistant
        </h3>
        <p className="text-sm text-muted-foreground">
          Get help with your notes using AI
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              onClick={() => handleAction(action.id)}
              variant={activeAction === action.id ? 'secondary' : 'outline'}
              className="h-auto flex-col gap-2 p-3 hover:scale-105 transition-transform"
            >
              <Icon className="w-5 h-5" />
              <div className="text-center">
                <div className="text-xs font-semibold">{action.label}</div>
                <div className="text-[10px] text-muted-foreground">{action.description}</div>
              </div>
            </Button>
          );
        })}
      </div>

      {activeAction && (
        <div className="flex-1 flex flex-col">
          {activeAction === 'qa' && !response && (
            <div className="mb-4">
              <Textarea
                placeholder="Ask a question about your notes..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="min-h-[100px]"
              />
              <Button
                onClick={handleSubmitQuestion}
                disabled={isLoading || !userInput.trim()}
                className="w-full mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Ask Question'
                )}
              </Button>
            </div>
          )}

          <ScrollArea className="flex-1 border border-border/40 rounded-lg p-4 bg-card/50">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : response ? (
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm">{response}</pre>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Select an action above to get started
              </div>
            )}
          </ScrollArea>

          {response && (
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(response)}
              >
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveAction(null);
                  setResponse('');
                  setUserInput('');
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
