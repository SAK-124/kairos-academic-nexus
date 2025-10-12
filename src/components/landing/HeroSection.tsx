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
  onCTAClick?: (route: string) => void;
}

interface HeroContent {
  headline?: string;
  description?: string;
  cta_text?: string;
}

interface ButtonMapping {
  enabled: boolean;
  hover_text?: string | null;
  route?: string | null;
}

type ContentSectionRow = {
  content: HeroContent;
};

type ButtonMappingRow = ButtonMapping & {
  id?: string;
  button_id?: string;
};

type ButtonMappingUpdate = Partial<Pick<ButtonMappingRow, "enabled" | "hover_text" | "route">>;

const DEFAULT_BUTTON_MAPPING: ButtonMapping = {
  enabled: true,
  hover_text: "",
  route: "/scheduler",
};

const mergeButtonMapping = (current: ButtonMapping, next?: ButtonMappingUpdate): ButtonMapping => ({
  enabled: typeof next?.enabled === "boolean" ? next.enabled : current.enabled,
  hover_text: next?.hover_text ?? current.hover_text,
  route: next?.route ?? current.route,
});

export const HeroSection = ({ onCTAClick }: HeroSectionProps) => {
  const [content, setContent] = useState<HeroContent | null>(null);
  const [buttonMapping, setButtonMapping] = useState<ButtonMapping>(DEFAULT_BUTTON_MAPPING);
  const [isLoaded, setIsLoaded] = useState(false);
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
          const newRow = payload.new as Partial<ContentSectionRow> | null;
          if (newRow?.content) {
            setContent(newRow.content);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "button_mappings", filter: "button_id=eq.hero_cta" },
        (payload) => {
          const newMapping = payload.new as Partial<ButtonMappingRow> | null;
          if (newMapping) {
            setButtonMapping((prev) => mergeButtonMapping(prev, newMapping));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadContent = async () => {
    try {
      const { data: heroData } = await supabase
        .from("content_sections")
        .select("content")
        .eq("section_name", "hero")
        .single();

      const { data: buttonData } = await supabase
        .from("button_mappings")
        .select("enabled, hover_text, route")
        .eq("button_id", "hero_cta")
        .single();

      if (heroData?.content) {
        setContent(heroData.content as HeroContent);
      }

      setButtonMapping((prev) => mergeButtonMapping(prev, buttonData ?? undefined));
    } finally {
      setIsLoaded(true);
    }
  };

  const handleCTAClick = () => {
    if (!isLoaded || !buttonMapping.enabled) return;

    const targetRoute = buttonMapping.route?.trim() || "/";

    if (onCTAClick) {
      onCTAClick(targetRoute);
      return;
    }

    if (targetRoute.startsWith("http")) {
      window.open(targetRoute, "_blank", "noopener,noreferrer");
    } else {
      navigate(targetRoute);
    }
  };

  return (
    <section
      id="home"
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
          {content?.headline || "Your AI-Powered Academic Companion"}
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          {content?.description ||
            "Transform chaos into clarity. Smart scheduling, intelligent notes, and seamless collaboration—all in one place."}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
          <Button
            onClick={() => {
              const section = document.getElementById("waitlist");
              section?.scrollIntoView({ behavior: "smooth" });
            }}
            size="lg"
            variant="default"
            className="h-14 px-8 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 group"
          >
            Join Waitlist!
          </Button>
          {isLoaded ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleCTAClick}
                    size="lg"
                    disabled={!buttonMapping.enabled}
                    className="h-14 px-8 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 group"
                  >
                    {content?.cta_text || "Start Planning"}
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
          ) : (
            <div className="h-14 w-48 rounded-full bg-muted/60 animate-pulse" aria-hidden />
          )}
        </div>
      </div>
    </section>
  );
};
