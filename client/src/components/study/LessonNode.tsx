import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Star, 
  Trophy, 
  Lock, 
  Check,
  Sparkles,
  Heart as HeartIcon,
  Crown,
  Headphones,
  RefreshCw,
  Dumbbell
} from "lucide-react";
import { StartButton } from "./StartButton";

export type LessonStatus = "locked" | "available" | "in_progress" | "completed";
export type LessonType = "intro" | "study" | "meditation" | "challenge" | "review" | "practice" | "listening";

interface LessonNodeProps {
  id: number;
  title: string;
  type: LessonType;
  status: LessonStatus;
  xpReward: number;
  isBonus?: boolean;
  position: "left" | "center" | "right";
  onClick?: () => void;
  showConnector?: boolean;
  isLast?: boolean;
  showStartButton?: boolean;
}

const typeIcons = {
  intro: BookOpen,
  study: Star,
  meditation: HeartIcon,
  challenge: Trophy,
  review: Crown,
  practice: RefreshCw,
  listening: Headphones
};

const nodeColors = {
  completed: {
    bg: "#58CC02",
    shadow: "#46A302",
    inner: "#7BD937",
    ring: "rgba(88, 204, 2, 0.3)"
  },
  available: {
    bg: "#58CC02",
    shadow: "#46A302",
    inner: "#7BD937",
    ring: "rgba(88, 204, 2, 0.5)"
  },
  in_progress: {
    bg: "#1CB0F6",
    shadow: "#1899D6",
    inner: "#49C0F8",
    ring: "rgba(28, 176, 246, 0.4)"
  },
  locked: {
    bg: "#E5E5E5",
    shadow: "#CECECE",
    inner: "#F0F0F0",
    ring: "transparent"
  }
};

const bonusColors = {
  bg: "#FFA500",
  shadow: "#CC8400",
  inner: "#FFB733",
  ring: "rgba(255, 165, 0, 0.5)"
};

export function LessonNode({
  id,
  title,
  type,
  status,
  xpReward,
  isBonus = false,
  position,
  onClick,
  showConnector = true,
  isLast = false,
  showStartButton = false
}: LessonNodeProps) {
  const Icon = typeIcons[type] || Star;
  const baseColors = nodeColors[status];
  const colors = isBonus && status !== "locked" ? bonusColors : baseColors;
  
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isAvailable = status === "available";
  const isInProgress = status === "in_progress";

  const positionOffset = {
    left: -48,
    center: 0,
    right: 48
  };

  return (
    <div 
      className="relative flex flex-col items-center"
      style={{ transform: `translateX(${positionOffset[position]}px)` }}
      data-testid={`lesson-node-${id}`}
    >
      {showStartButton && (isAvailable || isInProgress) && (
        <StartButton 
          onClick={onClick}
          position={position === "left" ? "right" : position === "right" ? "left" : "right"}
        />
      )}
      
      <motion.button
        whileHover={!isLocked ? { scale: 1.08, y: -4 } : undefined}
        whileTap={!isLocked ? { scale: 0.92, y: 4 } : undefined}
        onClick={!isLocked ? onClick : undefined}
        disabled={isLocked}
        className={cn(
          "relative flex items-center justify-center",
          "w-[80px] h-[80px] rounded-full",
          "transition-all duration-150 ease-out",
          !isLocked && "cursor-pointer",
          isLocked && "cursor-not-allowed"
        )}
        style={{
          backgroundColor: colors.bg,
          boxShadow: `0 8px 0 0 ${colors.shadow}, 0 0 0 4px ${colors.ring}`,
        }}
        data-testid={`button-lesson-${id}`}
      >
        <div 
          className="absolute rounded-full flex items-center justify-center"
          style={{
            inset: '6px',
            background: `linear-gradient(180deg, ${colors.inner} 0%, ${colors.bg} 100%)`,
          }}
        >
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
            }}
          />
          
          {isLocked ? (
            <Lock className="h-9 w-9 text-[#AFAFAF] relative z-10" />
          ) : isCompleted ? (
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white/30"
            >
              <Check className="h-8 w-8 text-white stroke-[3.5]" />
            </motion.div>
          ) : (
            <Icon className="h-9 w-9 text-white relative z-10" />
          )}
        </div>

        {isBonus && !isLocked && (
          <motion.div 
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            className="absolute -top-2 -right-2 bg-gradient-to-br from-[#FFE55C] to-[#FFC800] rounded-full p-2 shadow-lg border-2 border-white z-20"
          >
            <Sparkles className="h-4 w-4 text-[#8B6914]" />
          </motion.div>
        )}

        {(isAvailable || isInProgress) && (
          <>
            <motion.div
              animate={{ 
                scale: [1, 1.12, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full border-4 border-white/60"
            />
            
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  `0 0 0 0 ${colors.ring}`,
                  `0 0 0 20px transparent`,
                  `0 0 0 0 transparent`
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          </>
        )}
      </motion.button>

      {isCompleted && (
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
          className="absolute -bottom-1 px-3 py-1 rounded-full z-10"
          style={{
            background: 'linear-gradient(180deg, #FFD700 0%, #FFC800 100%)',
            boxShadow: '0 3px 0 0 #CC9F00',
            border: '2px solid #FFE55C'
          }}
        >
          <span className="text-[#7A5C00] text-xs font-black">
            +{xpReward} XP
          </span>
        </motion.div>
      )}

      <motion.span 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={cn(
          "mt-5 text-sm font-bold text-center max-w-[100px] leading-tight",
          isLocked && "text-muted-foreground/50",
          (isAvailable || isInProgress) && "text-[#58CC02]",
          isCompleted && "text-foreground"
        )}
        data-testid={`text-lesson-title-${id}`}
      >
        {title}
      </motion.span>

      {status !== "locked" && (
        <div className="flex items-center gap-0.5 mt-1">
          {[1, 2, 3].map((star) => (
            <Star 
              key={star}
              className={cn(
                "h-3 w-3",
                isCompleted ? "text-[#FFD700] fill-[#FFD700]" : "text-muted-foreground/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
