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
      className="splash-logo"
      style={{ maxWidth: '450px' }}
    >
      <defs>
        <linearGradient id="splash-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "hsl(250 85% 65%)" }} />
          <stop offset="100%" style={{ stopColor: "hsl(280 75% 68%)" }} />
        </linearGradient>
        
        <filter id="splash-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Logo Symbol */}
      <g transform="translate(50, 50)">
        <circle
          cx="0"
          cy="0"
          r="24"
          fill="none"
          stroke="url(#splash-gradient)"
          strokeWidth="2.5"
          filter="url(#splash-glow)"
          style={{
            strokeDasharray: 150,
            strokeDashoffset: 150,
            animation: 'drawCircle 400ms ease-out forwards'
          }}
        />
        
        <path
          d="M-8 -8 L0 0 L8 -8 M0 0 L0 10"
          stroke="url(#splash-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter="url(#splash-glow)"
          style={{
            strokeDasharray: 40,
            strokeDashoffset: 40,
            animation: 'drawArrow 400ms ease-out 200ms forwards'
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
        fill="transparent"
        stroke="url(#splash-gradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#splash-glow)"
        style={{
          strokeDasharray: 350,
          strokeDashoffset: 350,
          animation: 'drawText 700ms ease-out forwards, fillText 300ms ease-out 500ms forwards'
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
      setTimeout(onComplete, 400);
    }, 900);

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
