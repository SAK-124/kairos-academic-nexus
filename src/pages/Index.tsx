import { useState, useEffect } from "react";
import { IntroSection } from "@/components/landing/IntroSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { ValueSection } from "@/components/landing/ValueSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TestimonialSection } from "@/components/landing/TestimonialSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { AuthModal } from "@/components/AuthModal";
import { EnhancedAdminPanel } from "@/components/EnhancedAdminPanel";
import { AISearchBar } from "@/components/AISearchBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      checkAdminStatus(session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    checkAdminStatus(session?.user);
  };

  const checkAdminStatus = async (currentUser: any) => {
    if (!currentUser) {
      setIsAdmin(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
    if (!user) setShowAuthModal(true);
  };

  const handleCTAClick = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      toast({ title: "Coming Soon!", description: "The scheduler is almost ready." });
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A" && isAdmin) {
        setShowAdminPanel(true);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isAdmin]);

  if (showIntro) {
    return <IntroSection onComplete={handleIntroComplete} />;
  }

  return (
    <div className="relative">
      <ThemeToggle />
      {isAdmin && (
        <button
          onClick={() => setShowAdminPanel(true)}
          className="fixed bottom-6 left-6 z-40 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform text-sm font-medium"
        >
          Admin Panel
        </button>
      )}
      <HeroSection onCTAClick={handleCTAClick} />
      <SocialProofSection />
      <ProblemSection />
      <ValueSection />
      <HowItWorksSection />
      <TestimonialSection />
      <FAQSection />
      <PricingSection />
      <AISearchBar />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showAdminPanel && <EnhancedAdminPanel onClose={() => setShowAdminPanel(false)} />}
    </div>
  );
};

export default Index;
