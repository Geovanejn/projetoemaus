import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StreakBadgeProps {
  days: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function FlameIcon({ size, isActive }: { size: "sm" | "md" | "lg"; isActive: boolean }) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <svg 
      viewBox="0 0 24 24" 
      className={cn(sizeClasses[size])}
    >
      <defs>
        <linearGradient id="flameGradientActive" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FF9600" />
          <stop offset="50%" stopColor="#FF6B00" />
          <stop offset="100%" stopColor="#FF4500" />
        </linearGradient>
        <linearGradient id="flameGradientInactive" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#CECECE" />
          <stop offset="100%" stopColor="#E5E5E5" />
        </linearGradient>
        <filter id="flameShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor={isActive ? "#FF6B00" : "#AFAFAF"} floodOpacity="0.4"/>
        </filter>
      </defs>
      <path
        d="M12 2c0 3-2 5-3 7s1 4 1 4c-2-1-4-3-4-6 0-4 3-5 3-5s-1 3 1 5c1-2 2-5 2-5zm-4 14c0 2 2 4 4 4s4-2 4-4c0-1-.5-2-1-3-.5 1-2 2-3 2s-2.5-1-3-2c-.5 1-1 2-1 3zm8-6c0 2-2 4-4 4s-4-2-4-4c0-1 .5-2 1-3 .5 1 2 2 3 2s2.5-1 3-2c.5 1 1 2 1 3z"
        fill={isActive ? "url(#flameGradientActive)" : "url(#flameGradientInactive)"}
        filter="url(#flameShadow)"
      />
      {isActive && (
        <>
          <path
            d="M10 8c-.5-1 0-2 1-2.5"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
    </svg>
  );
}

export function StreakBadge({ 
  days, 
  className,
  size = "md",
  showLabel = true
}: StreakBadgeProps) {
  const textClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  const isActive = days > 0;

  return (
    <motion.div 
      initial={false}
      animate={isActive ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex items-center gap-1",
        className
      )}
      data-testid="streak-badge"
    >
      <FlameIcon size={size} isActive={isActive} />
      <span 
        className={cn(
          "font-bold",
          textClasses[size],
          isActive ? "text-[#FF9600]" : "text-muted-foreground"
        )}
      >
        {days}
      </span>
      {showLabel && (
        <span className={cn("text-muted-foreground font-medium", textClasses[size])}>
          {days === 1 ? "dia" : "dias"}
        </span>
      )}
    </motion.div>
  );
}
