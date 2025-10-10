import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { AnimatedLogo } from "./AnimatedLogo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavigationProps {
  user: any;
  isAdmin: boolean;
  onAdminClick: () => void;
  onLoginClick: () => void;
}

export const Navigation = ({ user, isAdmin, onAdminClick, onLoginClick }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
  };

  const scrollToSection = (sectionId: string) => {
    // If not on home page, navigate there first
    if (location.pathname !== '/') {
      navigate('/');
      // Wait for navigation to complete before scrolling
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileMenuOpen(false);
  };

  const handleLogoClick = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNotesClick = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to access your notes',
      });
      onLoginClick();
    } else {
      navigate('/notes');
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: "Home", id: "home" },
    { label: "Notes", action: handleNotesClick },
    { label: "Features", id: "features" },
    { label: "Pricing", id: "pricing" },
    { label: "FAQs", id: "faqs" },
  ];
const handleWaitlistClick = () => {
  if (location.pathname === "/scheduler") {
    // On scheduler page → scroll to bottom
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  } else {
    // On homepage → scroll to waitlist section
    const waitlistSection = document.getElementById("waitlist");
    if (waitlistSection) {
      waitlistSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // fallback if element doesn't exist
      navigate("/#waitlist");
    }
  }

  setMobileMenuOpen(false);
};




  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-xl bg-background/30 border-b border-white/10">
      <div className="container mx-auto h-full flex items-center justify-between px-4 md:px-6">
        <AnimatedLogo onClick={handleLogoClick} />
        
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => {
                if (link.action) {
                  link.action();
                } else if (link.id) {
                  scrollToSection(link.id);
                }
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </button>
          ))}
        </nav>
        
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Button
            onClick={handleWaitlistClick}
            variant="default"
            size="sm"
          >
            Join Waitlist
          </Button>
          
          {user ? (
            <>
              {isAdmin && (
                <Button
                  onClick={onAdminClick}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              )}
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <Button
              onClick={onLoginClick}
              variant="ghost"
              size="sm"
            >
              Login
            </Button>
          )}
        </div>

        {/* Mobile Actions */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <div className="flex flex-col gap-6 mt-8">
                {/* Mobile Navigation Links */}
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <button
                      key={link.label}
                      onClick={() => {
                        if (link.action) {
                          link.action();
                        } else if (link.id) {
                          scrollToSection(link.id);
                        }
                      }}
                      className="text-left text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </button>
                  ))}
                </nav>

                {/* Mobile CTA */}
                <Button
                  onClick={() => {
                    handleWaitlistClick();
                    ;
                  }}
                  variant="default"
                  className="w-full"
                >
                  Join Waitlist
                </Button>

                {/* Mobile Auth Buttons */}
                {user ? (
                  <>
                    {isAdmin && (
                      <Button
                        onClick={() => {
                          onAdminClick();
                          setMobileMenuOpen(false);
                        }}
                        variant="outline"
                        className="w-full gap-2"
                      >
                        <Shield className="w-4 h-4" />
                        Admin Panel
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      variant="ghost"
                      className="w-full gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      onLoginClick();
                      setMobileMenuOpen(false);
                    }}
                    variant="ghost"
                    className="w-full"
                  >
                    Login
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
