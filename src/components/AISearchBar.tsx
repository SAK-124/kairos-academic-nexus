import { useState } from "react";
import { MessageCircle, Send, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const AISearchBar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: { message: userMessage },
      });

      if (error) throw error;

      if (data?.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-all duration-300 animate-float"
          aria-label="Open AI chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      ) : (
        <div className="fixed bottom-6 right-6 z-40 w-[400px] h-[80px] backdrop-blur-xl bg-background/80 border border-white/10 rounded-full shadow-2xl flex items-center px-6 gap-3 animate-scale-in transition-all duration-500">
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Minimize chat"
          >
            <Minus className="w-5 h-5" />
          </button>
          
          <div className="flex-1 flex items-center gap-2">
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
              disabled={isLoading} 
              size="icon"
              className="rounded-full h-10 w-10 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {messages.length > 0 && (
            <div className="absolute bottom-full right-0 mb-4 w-[400px] max-h-[400px] backdrop-blur-xl bg-background/95 border border-white/10 rounded-3xl shadow-2xl p-4">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-primary/20 ml-8"
                          : "bg-accent/20 mr-8"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="text-sm text-muted-foreground animate-pulse p-3">
                      Kairos is thinking...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </>
  );
};
