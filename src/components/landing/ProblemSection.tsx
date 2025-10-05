import { useEffect, useState } from "react";

export const ProblemSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    const element = document.getElementById("problem-section");
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <section id="problem-section" className="py-24 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
          From Chaos to <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Clarity</span>
        </h2>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div
            className={`transition-all duration-1000 ${
              isVisible ? "opacity-100 blur-0" : "opacity-30 blur-lg"
            }`}
          >
            <div className="bg-muted/50 p-8 rounded-xl border border-destructive/20">
              <h3 className="text-2xl font-bold mb-4 text-destructive">Before Kairos</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li>✗ Spreadsheet overwhelm</li>
                <li>✗ Manual conflict checking</li>
                <li>✗ Last-minute schedule changes</li>
                <li>✗ Scattered notes across apps</li>
                <li>✗ Missing instructor insights</li>
              </ul>
            </div>
          </div>
          <div
            className={`transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 blur-0" : "opacity-30 blur-lg"
            }`}
          >
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8 rounded-xl border border-primary/20 shadow-lg">
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                With Kairos
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary">✓</div>
                  <span>AI-generated optimal schedules</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary">✓</div>
                  <span>Automatic conflict resolution</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary">✓</div>
                  <span>Instant schedule adjustments</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary">✓</div>
                  <span>Smart unified note system</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary">✓</div>
                  <span>Instructor intelligence insights</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
