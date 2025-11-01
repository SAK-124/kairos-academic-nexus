import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AISearchBar } from "@/components/AISearchBar";
import { Navigation } from "@/components/Navigation";
import { WaitlistSection } from "@/components/landing/WaitlistSection";
import { FooterSection } from "@/components/landing/FooterSection";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = useAdminStatus(user);

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
      {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
    </div>
  );
};

export default Index;
