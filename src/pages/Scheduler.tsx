import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Brain, CheckCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Scheduler = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient orbs background */}
      <div className="fixed inset-0 -z-10">
        <div className="gradient-orb gradient-orb-1"></div>
        <div className="gradient-orb gradient-orb-2"></div>
        <div className="gradient-orb gradient-orb-3"></div>
      </div>

      <Navigation 
        user={user}
        isAdmin={isAdmin}
        onAdminClick={() => {}}
        onLoginClick={() => navigate("/")}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 pt-24 pb-12">
        <Button
          variant="ghost"
          className="mb-8 backdrop-blur-sm bg-background/30"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="max-w-5xl mx-auto text-center space-y-12 animate-fade-in">
          <div className="inline-block">
            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer mb-6 text-glow">
              AI Course Scheduler
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 animate-pulse"></div>
          </div>

          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <p className="text-lg font-medium text-primary">Under Construction</p>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Revolutionary AI-powered scheduling coming soon. Get ready for the future of academic planning.
          </p>

          {/* Enhanced Blurred Preview */}
          <div className="relative rounded-3xl overflow-hidden bg-background/40 backdrop-blur-2xl border border-white/20 p-12 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 backdrop-blur-[100px]"></div>
            
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>

            <div className="relative space-y-8 blur-[8px] select-none pointer-events-none">
              {/* Mock scheduler interface with better visual hierarchy */}
              <div className="flex gap-4 items-center">
                <div className="flex-1 h-14 bg-white/20 rounded-xl backdrop-blur-sm border border-white/10"></div>
                <div className="w-40 h-14 bg-gradient-to-r from-primary/40 to-accent/40 rounded-xl animate-pulse"></div>
              </div>
              
              <div className="grid grid-cols-7 gap-3">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-white/10 rounded-lg border border-white/20 hover:bg-white/20 transition-all animate-pulse"
                    style={{ animationDelay: `${i * 50}ms` }}
                  ></div>
                ))}
              </div>

              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 bg-gradient-to-r from-primary/30 via-accent/30 to-secondary/30 rounded-xl border border-white/10 animate-shimmer"
                    style={{ animationDelay: `${i * 200}ms` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Enhanced Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {[
              { 
                icon: Brain,
                title: "Smart Conflict Detection", 
                desc: "AI automatically identifies and resolves scheduling conflicts in real-time" 
              },
              { 
                icon: CheckCircle,
                title: "Preference Learning", 
                desc: "Adapts to your unique scheduling preferences and patterns over time" 
              },
              { 
                icon: Calendar,
                title: "One-Click Export", 
                desc: "Seamlessly export your optimized schedule to any calendar app" 
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-8 rounded-2xl bg-background/40 backdrop-blur-xl border border-white/10 hover:border-primary/50 hover:bg-background/60 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20"
              >
                <feature.icon className="w-12 h-12 mb-4 text-primary group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-xl mb-3 text-glow">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            className="mt-12 px-10 py-7 text-lg rounded-full bg-gradient-to-r from-primary to-accent hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/30"
            onClick={() => navigate("/")}
          >
            <Sparkles className="mr-2 w-5 h-5" />
            Notify Me When Ready
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Scheduler;
