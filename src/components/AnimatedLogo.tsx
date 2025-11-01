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
      >
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          className="transition-all duration-300 group-hover:stroke-[2.5]"
        />
        <path
          d="M12 12 L20 20 L28 12 M20 20 L20 28"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="transition-all duration-300"
        />
      </svg>
      <span className="text-2xl font-bold text-foreground transition-transform group-hover:scale-105">
        Kairos
      </span>
    </div>
  );
};
