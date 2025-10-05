export const AnimatedLogo = () => {
  return (
    <div className="flex items-center gap-2 group cursor-pointer">
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        className="animate-float"
      >
        <defs>
          <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="animate-shimmer" style={{ stopColor: "hsl(var(--primary))" }} />
            <stop offset="50%" style={{ stopColor: "hsl(var(--accent))" }} />
            <stop offset="100%" className="animate-shimmer" style={{ stopColor: "hsl(var(--primary))" }} />
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
          className="transition-all duration-500 group-hover:stroke-[3]"
        />
      </svg>
      <span className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-shimmer group-hover:scale-105 transition-transform">
        Kairos
      </span>
    </div>
  );
};
