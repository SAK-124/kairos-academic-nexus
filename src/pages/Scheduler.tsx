import { Calendar, Clock, FileText, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Scheduler() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Pulsating Background */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0 animate-pulsate"
          style={{ background: "var(--gradient-pulsating)" }}
        />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8"
        >
          ← Back to Home
        </Button>

        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Coming Soon</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              AI Course Scheduler
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We're putting the finishing touches on your intelligent course planning companion
            </p>
          </div>

          {/* Blurred Preview */}
          <div className="relative">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-10 rounded-2xl flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-float">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Almost Ready!</h3>
                <p className="text-muted-foreground max-w-md">
                  Our AI is learning the final optimization algorithms to give you the perfect schedule
                </p>
                <Button size="lg" className="mt-4" onClick={() => navigate("/")}>
                  Notify Me When Ready
                </Button>
              </div>
            </div>

            {/* Mockup Interface */}
            <div className="bg-card border rounded-2xl p-8 space-y-6">
              {/* Top Bar */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-4">
                  <div className="w-32 h-8 bg-primary/20 rounded animate-shimmer" />
                  <div className="w-24 h-8 bg-muted rounded animate-shimmer" />
                </div>
                <div className="w-40 h-10 bg-primary/30 rounded animate-shimmer" />
              </div>

              {/* Main Content Grid */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Sidebar */}
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-primary" />
                      <div className="w-24 h-4 bg-muted rounded" />
                    </div>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-12 bg-background/50 rounded" />
                    ))}
                  </div>
                </div>

                {/* Schedule Grid */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex gap-2 mb-4">
                    {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                      <div key={day} className="flex-1 text-center py-2 bg-muted/30 rounded font-medium">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-16 rounded ${
                          i % 7 === 0 || i % 11 === 0
                            ? "bg-primary/20 animate-shimmer"
                            : "bg-muted/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                {[
                  { icon: Calendar, label: "Courses", value: "6/8" },
                  { icon: Clock, label: "Hours", value: "18" },
                  { icon: Users, label: "Conflicts", value: "0" },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                    <stat.icon className="w-8 h-8 text-primary" />
                    <div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Features Preview */}
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Smart Conflict Detection",
                desc: "AI automatically finds and prevents scheduling conflicts",
              },
              {
                title: "Preference Learning",
                desc: "Learns your preferred days, times, and instructors",
              },
              {
                title: "One-Click Export",
                desc: "Export to PDF, Google Calendar, or iCal format",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 bg-card/50 border rounded-xl hover:shadow-lg transition-shadow"
              >
                <h3 className="font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
