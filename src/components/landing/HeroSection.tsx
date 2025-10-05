import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeroSectionProps {
  onCTAClick: () => void;
}

export const HeroSection = ({ onCTAClick }: HeroSectionProps) => {
  const [content, setContent] = useState<any>({ headline: "", description: "", cta_text: "" });
  const [buttonMapping, setButtonMapping] = useState<any>({ enabled: true, hover_text: "", route: "/" });
  const navigate = useNavigate();

  useEffect(() => {
    loadContent();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("hero-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "content_sections", filter: "section_name=eq.hero" },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            setContent((payload.new as any).content);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "button_mappings", filter: "button_id=eq.hero_cta" },
        (payload) => {
          if (payload.new) {
            setButtonMapping(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadContent = async () => {
    const { data: heroData } = await supabase
      .from("content_sections")
      .select("content")
      .eq("section_name", "hero")
      .single();

    const { data: buttonData } = await supabase
      .from("button_mappings")
      .select("*")
      .eq("button_id", "hero_cta")
      .single();

    if (heroData) setContent(heroData.content);
    if (buttonData) setButtonMapping(buttonData);
  };

  const handleCTAClick = () => {
    // Always navigate to scheduler when button is clicked
    navigate("/scheduler");
  };

  return (
    <section
      id="hero"
      className="min-h-screen flex items-center justify-center px-4 animate-dissolve relative overflow-hidden"
    >
      {/* Pulsating Background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 animate-pulsate"
          style={{ background: "var(--gradient-pulsating)" }}
        />
      </div>

      <div className="max-w-4xl text-center space-y-8 relative z-10">
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent leading-tight animate-shimmer">
          {content.headline || "Your AI-Powered Academic Companion"}
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          {content.description || "Transform chaos into clarity. Smart scheduling, intelligent notes, and seamless collaboration—all in one place."}
        </p>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleCTAClick}
                size="lg"
                disabled={!buttonMapping.enabled}
                className="h-14 px-8 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 group"
              >
                {buttonMapping.text || content.cta_text || "Start Planning"}
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </TooltipTrigger>
            {buttonMapping.hover_text && (
              <TooltipContent>
                <p>{buttonMapping.hover_text}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </section>
  );
};
