import { Calendar, Brain, Users, Target, Sparkles } from "lucide-react";

const benefits = [
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "AI-generated conflict-free schedules ranked by best fit",
  },
  {
    icon: Brain,
    title: "AI Notes",
    description: "Smart formatting, canvas mode, and semantic search",
  },
  {
    icon: Target,
    title: "Dynamic Planning",
    description: "Instant recalculation when sections fill up",
  },
  {
    icon: Users,
    title: "Collaboration",
    description: "Opt-in study groups with private contact links",
  },
  {
    icon: Sparkles,
    title: "Instructor Intel",
    description: "AI-generated faculty reviews and performance metrics",
  },
];

export const ValueSection = () => {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
          Everything You Need to <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Excel</span>
        </h2>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
          {benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="group p-6 bg-card rounded-xl border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
              style={{
                animationDelay: `${idx * 100}ms`,
              }}
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <benefit.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold mb-2">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
