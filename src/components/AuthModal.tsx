import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  const [authFlow, setAuthFlow] = useState<"signIn" | "signUp">("signIn");
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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        toast({
          title: "Google sign-in failed",
          description: error.message,
          variant: "destructive",
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
      if (authFlow === "signUp") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          }
        });

        if (error) {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
          if (error.message.toLowerCase().includes("registered")) {
            // Encourage switching back to sign-in when the account already exists
            setAuthFlow("signIn");
          }
          return;
        }

        if (data.user) {
          toast({
            title: "Check your email",
            description: "Confirm your address to finish creating your account",
          });
          setEmailSent(true);
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const description = error.message.includes("Email not confirmed")
          ? "Please verify your email before signing in."
          : error.message;

        toast({
          title: "Authentication failed",
          description,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in",
        });
        onSuccess?.();
        onClose?.();
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
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-12 mb-4"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            
            <div className="relative mb-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

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
                      {authFlow === "signIn" ? "Signing in..." : "Creating account..."}
                    </>
                  ) : (
                    authFlow === "signIn" ? "Continue" : "Create account"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center space-y-1">
                  <span className="block">
                    {authFlow === "signIn"
                      ? "Welcome back! Sign in with your email and password."
                      : "We'll send a confirmation link to finish setting up your account."}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAuthFlow(authFlow === "signIn" ? "signUp" : "signIn")}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {authFlow === "signIn" ? "Need an account? Create one" : "Already registered? Sign in instead"}
                  </button>
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
