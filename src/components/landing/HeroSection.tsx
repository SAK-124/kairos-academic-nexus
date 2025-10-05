import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface HeroSectionProps {
  onCTAClick: () => void;
}

export const HeroSection = ({ onCTAClick }: HeroSectionProps) => {
  return (
    <section 
      id="hero"
      className="min-h-screen flex items-center justify-center px-4 animate-dissolve"
      style={{
        background: "var(--gradient-hero)",
      }}
    >
      <div className="max-w-4xl text-center space-y-8">
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent leading-tight">
          Your AI-Powered Academic Companion
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          Transform chaos into clarity. Smart scheduling, intelligent notes, and seamless collaboration—all in one place.
        </p>
        <Button 
          onClick={onCTAClick}
          size="lg"
          className="h-14 px-8 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 group"
        >
          Start Planning
          <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </section>
  );
};
