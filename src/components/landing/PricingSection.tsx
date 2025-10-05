import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Mail, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const tiers = [
  {
    name: "Free",
    features: ["Basic scheduling", "3 courses max", "Standard support"],
  },
  {
    name: "Pro",
    features: ["Unlimited courses", "AI notes", "Priority support", "Instructor intel"],
  },
  {
    name: "Team",
    features: ["Everything in Pro", "Study groups", "Analytics", "Admin controls"],
  },
];

export const PricingSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFooterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.full_name) {
      toast({
        title: "Required Fields",
        description: "Please provide your name and email.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from("early_access_signups")
      .insert([formData]);

    setIsSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Already registered!",
          description: "This email is already on our waitlist.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to join waitlist. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Success!",
        description: "You're on the waitlist. We'll notify you at launch!",
      });
      setFormData({ email: "", full_name: "" });
    }
  };

  return (
    <section id="pricing" className="py-24 px-4 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
          Simple <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Pricing</span>
        </h2>
        <p className="text-center text-muted-foreground mb-16">Coming Soon</p>
        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className="p-8 bg-card rounded-2xl border shadow-sm opacity-60"
            >
              <h3 className="text-2xl font-bold mb-6">{tier.name}</h3>
              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button disabled className="w-full" variant="outline">
                Coming Soon
              </Button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Early Access Signup Section */}
      <div className="mt-16 max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl p-8 md:p-12 border border-primary/20 shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Join Early Access
            </h3>
            <p className="text-muted-foreground">
              Be among the first to experience Kairos. Get exclusive early access and special launch benefits.
            </p>
          </div>
          
          <form onSubmit={handleFooterSignup} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Full Name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                required
                disabled={isSubmitting}
                className="bg-background/50"
              />
              <Input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                disabled={isSubmitting}
                className="bg-background/50"
              />
            </div>
            <Button 
              type="submit" 
              size="lg" 
              className="w-full bg-gradient-to-r from-primary to-accent"
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
      </div>

      <footer className="mt-24 border-t pt-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2">Kairos</h3>
              <p className="text-muted-foreground">Your AI-Powered Academic Companion</p>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <button onClick={() => navigate("/privacy")} className="hover:text-primary transition-colors">
                Privacy Policy
              </button>
              <button onClick={() => navigate("/terms")} className="hover:text-primary transition-colors">
                Terms of Service
              </button>
              <button onClick={() => navigate("/contact")} className="hover:text-primary transition-colors">
                Contact
              </button>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-muted-foreground">
            © 2025 Kairos. All rights reserved.
          </div>
        </div>
      </footer>
    </section>
  );
};
