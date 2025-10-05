import { Star } from "lucide-react";

export const TestimonialSection = () => {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-2xl p-8 md:p-12 shadow-xl border">
          <div className="flex gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 fill-primary text-primary" />
            ))}
          </div>
          <blockquote className="text-2xl md:text-3xl font-medium mb-8 leading-relaxed">
            "Kairos transformed my course planning from a 3-hour nightmare into a 5-minute breeze. The AI scheduling is incredibly smart, and the note-taking features are exactly what I needed."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent" />
            <div>
              <div className="font-bold text-lg">Ahmed K.</div>
              <div className="text-muted-foreground">BBA Student, IBA</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
