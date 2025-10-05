import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

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
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="py-24 px-4 bg-muted/30">
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
      <footer className="mt-24 border-t pt-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2">Kairos</h3>
              <p className="text-muted-foreground">Your AI-Powered Academic Companion</p>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <button onClick={scrollToTop} className="hover:text-primary transition-colors">
                Privacy Policy
              </button>
              <button onClick={scrollToTop} className="hover:text-primary transition-colors">
                Terms of Service
              </button>
              <button onClick={scrollToTop} className="hover:text-primary transition-colors">
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
