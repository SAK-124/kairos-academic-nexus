import { useEffect, useState } from "react";

interface IntroSectionProps {
  onComplete: () => void;
}

export const IntroSection = ({ onComplete }: IntroSectionProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<"enter" | "pulse" | "exit">("enter");

  useEffect(() => {
    // Enter phase
    const enterTimer = setTimeout(() => {
      setPhase("pulse");
    }, 500);

    // Pulse phase
    const pulseTimer = setTimeout(() => {
      setPhase("exit");
    }, 2000);

    // Exit phase
    const exitTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 600);
    }, 2500);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(pulseTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-600 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Animated gradient orbs background - matching main page */}
      <div className="fixed inset-0 -z-10">
        <div className="gradient-orb gradient-orb-1"></div>
        <div className="gradient-orb gradient-orb-2"></div>
        <div className="gradient-orb gradient-orb-3"></div>
      </div>
      <div
        className={`text-center space-y-6 ${
          phase === "enter"
            ? "animate-scale-in"
            : phase === "pulse"
            ? "animate-float"
            : "animate-dissolve"
        }`}
      >
        <h1 className="text-8xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent text-glow">
          Kairos
        </h1>
        <p className="text-white/90 text-xl font-medium animate-fade-in">
          Used by 20+ IBA students and growing daily
        </p>
        <div className="flex gap-3 justify-center">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-white/70 animate-pulsate"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
