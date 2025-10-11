import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type InterestLevel = "casual" | "serious" | "urgent";

export const WaitlistForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    phone_number: "",
    university: "",
    graduation_year: "",
    interest_level: "casual" as InterestLevel,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.full_name) {
      toast({
        title: "Required Fields Missing",
        description: "Please provide your name and email.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("early_access_signups")
        .insert([formData]);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already registered!",
            description: "This email is already on our waitlist.",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Success! 🎉",
          description: "You're on the waitlist! We'll notify you when we launch.",
        });
        setFormData({
          email: "",
          full_name: "",
          phone_number: "",
          university: "",
          graduation_year: "",
          interest_level: "casual",
        });
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
    <div className="p-8 rounded-2xl bg-background/60 backdrop-blur-xl border border-primary/20 shadow-2xl">
      <div className="text-center mb-6">
        <Mail className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h3 className="text-2xl font-bold mb-2">Join the Waitlist</h3>
        <p className="text-muted-foreground">
          Be the first to know when we launch. Get early access and exclusive features.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            type="text"
            placeholder="Full Name *"
            value={formData.full_name}
            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            className="bg-background/50 backdrop-blur-sm border-primary/20"
            required
          />
          <Input
            type="email"
            placeholder="Email Address *"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="bg-background/50 backdrop-blur-sm border-primary/20"
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Input
            type="tel"
            placeholder="Phone Number"
            value={formData.phone_number}
            onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
            className="bg-background/50 backdrop-blur-sm border-primary/20"
          />
          <Input
            type="text"
            placeholder="University"
            value={formData.university}
            onChange={(e) => setFormData(prev => ({ ...prev, university: e.target.value }))}
            className="bg-background/50 backdrop-blur-sm border-primary/20"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Input
            type="text"
            placeholder="Graduation Year"
            value={formData.graduation_year}
            onChange={(e) => setFormData(prev => ({ ...prev, graduation_year: e.target.value }))}
            className="bg-background/50 backdrop-blur-sm border-primary/20"
          />
          <select
            value={formData.interest_level}
            onChange={(e) => {
              const value = e.target.value as InterestLevel;
              setFormData((prev) => ({ ...prev, interest_level: value }));
            }}
            className="flex h-10 w-full rounded-md border border-primary/20 bg-background/50 backdrop-blur-sm px-3 py-2 text-sm"
          >
            <option value="casual">Just Exploring</option>
            <option value="serious">Very Interested</option>
            <option value="urgent">Need It Now!</option>
          </select>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-accent hover:scale-105 transition-all duration-300"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Joining..." : (
            <>
              <Sparkles className="mr-2 w-5 h-5" />
              Join Waitlist
            </>
          )}
        </Button>
      </form>
    </div>
  );
};
