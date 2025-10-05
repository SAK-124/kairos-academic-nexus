import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const AuthModal = ({ open, onOpenChange, onSuccess, onClose }: AuthModalProps) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      login(email);
      toast({
        title: "Welcome to Kairos!",
        description: "You've successfully signed in",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Authentication failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open ?? true} onOpenChange={onClose ? () => onClose() : onOpenChange}>
      <DialogContent className="sm:max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Join Kairos
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Enter your IBA email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-12"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Continue"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Used by 20+ IBA students and growing daily
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
