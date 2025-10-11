import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
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
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WaitlistSection } from "@/components/landing/WaitlistSection";
import { FooterSection } from "@/components/landing/FooterSection";

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
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

  const checkAdminStatus = async (currentUser: User | null | undefined) => {
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
  };

  const handleCTAClick = (route: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (route.startsWith("http")) {
      window.open(route, "_blank", "noopener,noreferrer");
      return;
    }

    if (route === "/scheduler") {
      toast({ title: "Coming Soon!", description: "The scheduler is almost ready." });
      return;
    }

    navigate(route);
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
    <div className="relative min-h-screen">
      {/* Animated gradient orbs background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="gradient-orb gradient-orb-1"></div>
        <div className="gradient-orb gradient-orb-2"></div>
        <div className="gradient-orb gradient-orb-3"></div>
      </div>

      <Navigation 
        user={user}
        isAdmin={isAdmin}
        onAdminClick={() => setShowAdminPanel(true)}
        onLoginClick={() => setShowAuthModal(true)}
      />
      
      <div className="pt-16">
        <HeroSection onCTAClick={handleCTAClick} />
        <SocialProofSection />
        <ProblemSection />
        <ValueSection />
        <HowItWorksSection />
        <TestimonialSection />
        <FAQSection />
        <PricingSection />
        <WaitlistSection />
        <FooterSection />
      </div>

      <AISearchBar />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showAdminPanel && <EnhancedAdminPanel onClose={() => setShowAdminPanel(false)} />}
    </div>
  );
};

export default Index;
