import { useCallback, useMemo, useState } from "react";
import { MessageCircle, Send, Minus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { GeminiClient } from "@/integrations/gemini/client";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT =
  "You are Kairos, a helpful academic co-pilot. Provide concise, encouraging answers tailored to university students.";

export const AISearchBar = () => {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [messages, setMessages] = useLocalStorage<Message[]>("kairos-chat-history", []);

  const hasMessages = messages.length > 0;

  const handleClearHistory = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const conversation = useMemo(() => messages, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    const nextMessages: Message[] = [...conversation, { role: "user", content: userMessage }];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const geminiMessages = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...nextMessages.map((message) => ({
          role: message.role === "assistant" ? ("model" as const) : ("user" as const),
          content: message.content,
        })),
      ];

      const reply = await GeminiClient.chat(geminiMessages);

      if (reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: reply.trim() }]);
      }
    } catch (error: unknown) {
      console.error("Chat error:", error);
      const message = error instanceof Error ? error.message : "Failed to get response";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversation, input, isLoading, setMessages, toast]);

  return (
    <>
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-6 right-6 z-40 p-4 bg-primary text-primary-foreground rounded-full shadow-[var(--elevation-6)] hover:shadow-[var(--elevation-4)] hover:scale-105 transition-all duration-300"
          aria-label="Open AI chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      ) : (
        <div
          className={`fixed z-40 shadow-2xl backdrop-blur-xl border border-white/10 rounded-3xl bg-background/95 transition-all duration-300 flex flex-col ${
            isMobile
              ? "inset-x-4 bottom-4 top-[15vh]"
              : "bottom-6 right-6 w-[420px] h-[520px]"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div>
              <p className="text-sm font-semibold">Kairos AI Copilot</p>
              <p className="text-xs text-muted-foreground">Powered by Gemini with cached context</p>
            </div>
            <div className="flex items-center gap-2">
              {hasMessages && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleClearHistory}
                  aria-label="Clear chat history"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                variant="ghost"
                size="icon"
                aria-label="Minimize chat"
              >
                <Minus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-4 pr-2">
              {conversation.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary/20 ml-auto max-w-[85%]"
                      : "bg-accent/20 mr-auto max-w-[90%]"
                  }`}
                >
                  <MarkdownRenderer content={msg.content} />
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kairos is thinking...
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="px-4 py-3 border-t border-white/10 bg-background/80">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
                placeholder="Ask Kairos anything..."
                disabled={isLoading}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="rounded-full h-10 w-10 shrink-0"
                aria-label="Send message"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {isMobile && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Tip: swipe down or tap the minimize icon to collapse the assistant.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
