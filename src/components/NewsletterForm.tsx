import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const NewsletterForm = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please provide your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("newsletter_signups")
        .insert([{ email, full_name: name || null }]);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already subscribed!",
            description: "This email is already on our mailing list.",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Success! 🎉",
          description: "You're subscribed! We'll keep you updated.",
        });
        setEmail("");
        setName("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 rounded-xl bg-surface-container border border-outline shadow-[var(--elevation-2)]">
      <div className="text-center mb-6">
        <Mail className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h3 className="text-headline-large font-bold mb-2">Stay Updated</h3>
        <p className="text-body-large text-muted-foreground">
          Get notified about new features and updates
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-surface"
        />
        <Input
          type="email"
          placeholder="Email Address *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-surface"
          required
        />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Subscribing..." : "Subscribe to Updates"}
        </Button>
      </form>
    </div>
  );
};
