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
          From Chaos to <span className="text-primary">Clarity</span>
        </h2>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div
            className={`transition-opacity duration-500 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="bg-muted p-8 rounded-xl border shadow-[var(--elevation-1)]">
              <h3 className="text-2xl font-bold mb-4 text-destructive">Before Kairos</h3>
...
            </div>
          </div>
          <div
            className={`transition-opacity duration-500 delay-150 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="bg-card p-8 rounded-xl border shadow-[var(--elevation-2)]">
              <h3 className="text-2xl font-bold mb-4 text-primary">
                With Kairos
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">✓</div>
                  <span>AI-generated optimal schedules</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">✓</div>
                  <span>Automatic conflict resolution</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">✓</div>
                  <span>Instant schedule adjustments</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">✓</div>
                  <span>Smart unified note system</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">✓</div>
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
