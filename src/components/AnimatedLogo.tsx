interface AnimatedLogoProps {
  onClick?: () => void;
}

export const AnimatedLogo = ({ onClick }: AnimatedLogoProps) => {
  return (
    <div onClick={onClick} className="flex items-center gap-2 group cursor-pointer">
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        className="animate-float"
      >
        <defs>
          <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "hsl(250 85% 65%)" }} />
            <stop offset="100%" style={{ stopColor: "hsl(280 75% 68%)" }} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="url(#logo-gradient)"
          strokeWidth="2"
          filter="url(#glow)"
          className="transition-all duration-500 group-hover:stroke-[3]"
        />
        <path
          d="M12 12 L20 20 L28 12 M20 20 L20 28"
          stroke="url(#logo-gradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter="url(#glow)"
          className="transition-all duration-500 group-hover:stroke-[3] group-hover:rotate-12"
        />
      </svg>
      <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent transition-transform group-hover:scale-105">
        Kairos
      </span>
    </div>
  );
};
