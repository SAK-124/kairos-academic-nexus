import { Upload, Settings, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Upload,
    number: "1",
    title: "Upload",
    description: "Drop your course Excel file",
  },
  {
    icon: Settings,
    number: "2",
    title: "Preferences",
    description: "Set your preferred days, times, and instructors",
  },
  {
    icon: CheckCircle,
    number: "3",
    title: "Get Schedule",
    description: "Receive conflict-free schedules ranked by fit",
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="py-24 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
          How It <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Works</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connection lines */}
          <div className="hidden md:block absolute top-1/4 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary via-accent to-secondary" />
          
          {steps.map((step, idx) => (
            <div key={idx} className="relative">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center relative z-10">
                  <step.icon className="w-10 h-10 text-white" />
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-8 h-8 bg-card border-2 border-primary rounded-full flex items-center justify-center text-sm font-bold text-primary">
                  {step.number}
                </div>
                <h3 className="text-2xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
