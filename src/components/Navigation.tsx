import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { AnimatedLogo } from "./AnimatedLogo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NavigationProps {
  user: any;
  isAdmin: boolean;
  onAdminClick: () => void;
  onLoginClick: () => void;
}

export const Navigation = ({ user, isAdmin, onAdminClick, onLoginClick }: NavigationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-xl bg-background/30 border-b border-white/10">
      <div className="container mx-auto h-full flex items-center justify-between px-6">
        <AnimatedLogo />
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          
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
              variant="default"
              size="sm"
            >
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
