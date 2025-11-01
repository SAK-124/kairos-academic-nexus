import { useEffect, useState } from "react";

interface IntroSectionProps {
  onComplete: () => void;
}

const SplashLogo = () => {
  return (
    <svg
      width="100%"
      height="200"
      viewBox="0 0 300 100"
      style={{ maxWidth: '450px' }}
    >
      {/* Logo Symbol */}
      <g transform="translate(50, 50)">
        <circle
          cx="0"
          cy="0"
          r="24"
          fill="none"
          stroke="hsl(220 60% 50%)"
          strokeWidth="2.5"
          style={{
            strokeDasharray: 150,
            strokeDashoffset: 150,
            animation: 'drawLogo 500ms ease-out forwards, fadeInLogo 300ms ease-out forwards'
          }}
        />
        
        <path
          d="M-8 -8 L0 0 L8 -8 M0 0 L0 10"
          stroke="hsl(220 60% 50%)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{
            strokeDasharray: 40,
            strokeDashoffset: 40,
            animation: 'drawLogo 500ms ease-out 150ms forwards'
          }}
        />
      </g>
      
      {/* Kairos Text */}
      <text
        x="150"
        y="60"
        textAnchor="start"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="42"
        fontWeight="bold"
        fill="hsl(220 60% 50%)"
        style={{
          opacity: 0,
          animation: 'fadeInLogo 400ms ease-out 300ms forwards'
        }}
      >
        Kairos
      </text>
    </svg>
  );
};

export const IntroSection = ({ onComplete }: IntroSectionProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 600);

    return () => {
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-400 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <SplashLogo />
    </div>
  );
};
