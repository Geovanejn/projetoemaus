import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface HeartsDisplayProps {
  current: number;
  max: number;
  nextRefillMinutes?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  showInfinite?: boolean;
}

function HeartIcon({ filled, size }: { filled: boolean; size: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <svg 
      viewBox="0 0 24 24" 
      className={cn(sizeClasses[size], "transition-all duration-300")}
    >
      <defs>
        <linearGradient id="heartGradientFilled" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FF4B4B" />
          <stop offset="100%" stopColor="#E62E2E" />
        </linearGradient>
        <linearGradient id="heartGradientEmpty" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E5E5E5" />
          <stop offset="100%" stopColor="#CECECE" />
        </linearGradient>
        <filter id="heartShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor={filled ? "#E62E2E" : "#AFAFAF"} floodOpacity="0.3"/>
        </filter>
      </defs>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? "url(#heartGradientFilled)" : "url(#heartGradientEmpty)"}
        filter="url(#heartShadow)"
      />
      {filled && (
        <path
          d="M8 8c0-1 .5-2 1.5-2.5"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

export function HeartsDisplay({ 
  current, 
  max, 
  nextRefillMinutes,
  className,
  size = "md",
  showInfinite = false
}: HeartsDisplayProps) {
  const textClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  if (showInfinite) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <HeartIcon filled={true} size={size} />
        <span className={cn("font-bold text-[#FF4B4B]", textClasses[size])}>
          Infinito
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)} data-testid="hearts-display">
      <div className="flex items-center">
        {Array.from({ length: max }).map((_, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={i < current ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            className="-ml-1 first:ml-0"
          >
            <HeartIcon 
              filled={i < current} 
              size={size}
            />
          </motion.div>
        ))}
      </div>
      {nextRefillMinutes !== undefined && current < max && (
        <span 
          className={cn("text-muted-foreground font-medium", textClasses[size])} 
          data-testid="text-refill-timer"
        >
          {nextRefillMinutes}min
        </span>
      )}
    </div>
  );
}
