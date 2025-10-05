import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
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
import { AdminPanel } from "@/components/AdminPanel";
import { getCurrentUser, logout, isAdmin } from "@/lib/auth";

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser && !showIntro) {
      setShowAuthModal(true);
    }
  }, [showIntro]);

  const handleIntroComplete = () => {
    setShowIntro(false);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      setTimeout(() => setShowAuthModal(true), 300);
    }
  };

  const handleAuthSuccess = () => {
    setUser(getCurrentUser());
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setShowAuthModal(true);
  };

  const handleCTAClick = () => {
    if (!user) {
      setShowAuthModal(true);
    }
  };

  if (showIntro) {
    return <IntroSection onComplete={handleIntroComplete} />;
  }

  return (
    <>
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Kairos
          </h1>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground hidden md:inline">
                  {user.email}
                </span>
                {isAdmin(user) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdminPanel(true)}
                    className="gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Admin
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setShowAuthModal(true)}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        <HeroSection onCTAClick={handleCTAClick} />
        <SocialProofSection />
        <ProblemSection />
        <ValueSection />
        <HowItWorksSection />
        <TestimonialSection />
        <FAQSection />
        <PricingSection />
      </main>

      {/* Modals */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={handleAuthSuccess}
      />

      {showAdminPanel && isAdmin(user) && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </>
  );
};

export default Index;
