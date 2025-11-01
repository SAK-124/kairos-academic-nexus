import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Menu, User as UserIcon } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { AnimatedLogo } from "./AnimatedLogo";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavigationProps {
  user: User | null;
  isAdmin: boolean;
  onAdminClick: () => void;
  onLoginClick: () => void;
}

export const Navigation = ({ user, isAdmin, onAdminClick, onLoginClick }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isPublicPage = location.pathname === '/';

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      navigate('/');
    }
  };

  const scrollToSection = (sectionId: string) => {
    if (location.pathname !== '/') {
      navigate('/');
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

  // Public navigation links (landing page)
  const publicNavLinks = [
    { label: "Features", id: "features" },
    { label: "Pricing", id: "pricing" },
    { label: "FAQs", id: "faqs" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-surface border-b border-outline shadow-[var(--elevation-1)]">
      <div className="container mx-auto h-full flex items-center justify-between px-4 md:px-6">
        <AnimatedLogo onClick={handleLogoClick} />
        
        {/* Desktop Navigation - Public Pages Only */}
        {isPublicPage && (
          <nav className="hidden lg:flex items-center gap-6">
            {publicNavLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollToSection(link.id)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>
        )}
        
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium">
                  {user.email}
                </div>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem onClick={onAdminClick}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={onLoginClick} variant="default" size="sm">
              Sign In
            </Button>
          )}
        </div>

        {/* Mobile Menu */}
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
                {isPublicPage && (
                  <nav className="flex flex-col gap-4">
                    {publicNavLinks.map((link) => (
                      <button
                        key={link.label}
                        onClick={() => scrollToSection(link.id)}
                        className="text-left text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </button>
                    ))}
                  </nav>
                )}

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
                    variant="default"
                    className="w-full"
                  >
                    Sign In
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
