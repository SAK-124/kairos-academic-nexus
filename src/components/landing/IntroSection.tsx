import { useEffect, useState } from "react";

interface IntroSectionProps {
  onComplete: () => void;
}

export const IntroSection = ({ onComplete }: IntroSectionProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 600);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-600 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{
        background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(340 82% 62%))",
      }}
    >
      <div className="text-center space-y-4 animate-scale-in">
        <h1 className="text-7xl font-bold text-white tracking-tight">Kairos</h1>
        <p className="text-white/80 text-lg">Used by 20+ IBA students and growing daily</p>
      </div>
    </div>
  );
};
