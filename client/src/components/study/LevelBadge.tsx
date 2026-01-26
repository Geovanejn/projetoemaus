import { Crown, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LevelBadgeProps {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  className?: string;
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
}

function calculateLevelProgress(currentXP: number, xpForNextLevel: number): number {
  if (xpForNextLevel <= 0) return 100;
  return Math.min(100, Math.floor((currentXP / xpForNextLevel) * 100));
}

function CircularProgress({ progress, size }: { progress: number; size: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { width: 48, stroke: 4, radius: 20 },
    md: { width: 64, stroke: 5, radius: 26 },
    lg: { width: 80, stroke: 6, radius: 34 }
  };
  
  const { width, stroke, radius } = sizes[size];
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg width={width} height={width} className="transform -rotate-90">
      <circle
        cx={width / 2}
        cy={width / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={stroke}
        fill="none"
        className="text-muted/30"
      />
      <motion.circle
        cx={width / 2}
        cy={width / 2}
        r={radius}
        stroke="url(#levelGradient)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{ strokeDasharray: circumference }}
      />
      <defs>
        <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFA500" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FF9600" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LevelBadge({ 
  level, 
  currentXP,
  xpForNextLevel,
  className,
  showProgress = true,
  size = "md"
}: LevelBadgeProps) {
  const progress = calculateLevelProgress(currentXP, xpForNextLevel);
  
  const sizeClasses = {
    sm: { badge: "w-12 h-12", text: "text-lg", icon: "h-3 w-3" },
    md: { badge: "w-16 h-16", text: "text-xl", icon: "h-4 w-4" },
    lg: { badge: "w-20 h-20", text: "text-2xl", icon: "h-5 w-5" }
  };

  const LevelIcon = level >= 10 ? Crown : Star;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)} data-testid="level-badge">
      <div className="relative">
        {showProgress && <CircularProgress progress={progress} size={size} />}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            !showProgress && sizeClasses[size].badge
          )}
        >
          <div className={cn(
            "flex flex-col items-center justify-center rounded-full",
            "bg-gradient-to-br from-[#FFA500] via-[#FF9600] to-[#E68600]",
            "text-white font-bold shadow-lg",
            "border-2 border-[#FFD700]/50",
            showProgress ? "w-[70%] h-[70%]" : sizeClasses[size].badge
          )}>
            <span className={cn("font-black leading-none", sizeClasses[size].text)}>
              {level}
            </span>
          </div>
        </motion.div>
        
        {level >= 10 && (
          <motion.div
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute -top-1 left-1/2 -translate-x-1/2"
          >
            <Crown className={cn(sizeClasses[size].icon, "text-[#FFD700] fill-[#FFD700]")} />
          </motion.div>
        )}
      </div>
      
      {showProgress && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
          <span className="font-medium">{currentXP}</span>
          <span>/</span>
          <span>{xpForNextLevel}</span>
        </div>
      )}
    </div>
  );
}
