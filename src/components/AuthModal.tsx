import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, CheckCircle } from "lucide-react";

interface AuthModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const AuthModal = ({ open, onOpenChange, onSuccess, onClose }: AuthModalProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const { toast } = useToast();

  const handleMagicLink = async (e: React.FormEvent) => {
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
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        if (error.message.includes("rate")) {
          toast({
            title: "Too many requests",
            description: "Please wait a minute and try again",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error sending magic link",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        setEmailSent(true);
        toast({
          title: "Check your email! ✉️",
          description: `We sent a magic link to ${email}`,
        });
      }
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

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!password || password.length < 6) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Try signing in first
      let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // If user doesn't exist, sign them up
      if (error && error.message.includes("Invalid")) {
        const signUpResult = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          }
        });
        data = signUpResult.data;
        error = signUpResult.error;
      }

      if (error) {
        toast({
          title: "Authentication failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        toast({
          title: "Welcome to Kairos!",
          description: "You've successfully signed in",
        });
        if (onOpenChange) onOpenChange(false);
        if (onSuccess) onSuccess();
      }
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
            {emailSent ? "Check Your Email" : "Join Kairos"}
          </DialogTitle>
          {emailSent && (
            <DialogDescription className="flex items-center gap-2 text-base pt-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              We sent a magic link to <strong>{email}</strong>
            </DialogDescription>
          )}
        </DialogHeader>
        
        {!emailSent ? (
          <>
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={mode === "magic" ? "default" : "outline"}
                onClick={() => setMode("magic")}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Magic Link
              </Button>
              <Button
                type="button"
                variant={mode === "password" ? "default" : "outline"}
                onClick={() => setMode("password")}
                className="flex-1"
              >
                Password
              </Button>
            </div>

            {mode === "magic" ? (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
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
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    "Send Magic Link"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  We'll email you a link to sign in instantly
                </p>
              </form>
            ) : (
              <form onSubmit={handlePasswordAuth} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-12"
                  />
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  New users will be automatically registered
                </p>
              </form>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm">
                Click the link in your email to sign in. The link expires in 1 hour.
              </p>
              <p className="text-xs text-muted-foreground">
                Didn't receive it? Check your spam folder.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setEmailSent(false);
                setEmail("");
              }}
              className="w-full"
            >
              Try a different email
            </Button>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          Used by 20+ IBA students and growing daily
        </p>
      </DialogContent>
    </Dialog>
  );
};
