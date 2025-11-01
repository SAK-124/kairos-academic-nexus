import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Mail, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WaitlistForm } from "../WaitListForm";

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
    <section id="pricing" className="py-24 px-4 bg-muted/50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
          Simple <span className="text-primary">Pricing</span>
        </h2>
        <p className="text-center text-muted-foreground mb-16">Coming Soon</p>
        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className="p-8 bg-card rounded-xl border shadow-[var(--elevation-1)] opacity-60"
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
      
      </section>
  );
};
