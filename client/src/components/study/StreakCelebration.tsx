import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Check, Crown, Star, Sparkles, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StreakCelebrationProps {
  streakDays: number;
  weekProgress: boolean[];
  message?: string;
  onContinue?: () => void;
  className?: string;
}

const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

function getMilestoneInfo(days: number) {
  if (days >= 1000) return { tier: "mythic", label: "MÍTICO", color: "from-violet-500 via-purple-500 to-pink-500", icon: Sparkles, particles: 40, glow: "rgba(168,85,247,0.6)" };
  if (days >= 365) return { tier: "legendary", label: "LENDÁRIO", color: "from-cyan-400 via-blue-500 to-indigo-600", icon: Trophy, particles: 30, glow: "rgba(59,130,246,0.5)" };
  if (days >= 180) return { tier: "epic", label: "ÉPICO", color: "from-indigo-500 via-purple-500 to-pink-500", icon: Crown, particles: 25, glow: "rgba(139,92,246,0.5)" };
  if (days >= 90) return { tier: "rare", label: "RARO", color: "from-purple-500 via-violet-500 to-indigo-500", icon: Star, particles: 20, glow: "rgba(147,51,234,0.4)" };
  if (days >= 60) return { tier: "uncommon", label: "INCOMUM", color: "from-red-500 via-orange-500 to-yellow-500", icon: Crown, particles: 15, glow: "rgba(239,68,68,0.4)" };
  if (days >= 30) return { tier: "special", label: "ESPECIAL", color: "from-orange-500 via-amber-500 to-yellow-500", icon: Zap, particles: 10, glow: "rgba(249,115,22,0.4)" };
  if (days >= 15) return { tier: "notable", label: "NOTÁVEL", color: "from-orange-400 via-orange-500 to-red-500", icon: Flame, particles: 8, glow: "rgba(251,146,60,0.4)" };
  return { tier: "normal", label: null, color: "from-[#FF9600] via-[#FF6B00] to-[#FF4500]", icon: Flame, particles: 0, glow: "rgba(255,150,0,0.4)" };
}

function ParticleEffect({ count, color }: { count: number; color: string }) {
  const particles = useMemo(() => {
    if (count === 0) return [];
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      xOffset: (Math.random() - 0.5) * 200,
      yOffset: (Math.random() - 0.5) * 200 - 50,
      duration: 2 + Math.random() * 2,
      delay: Math.random() * 2,
      repeatDelay: Math.random() * 3,
      colorIndex: i % 3
    }));
  }, [count]);

  if (count === 0) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ 
            opacity: 0, 
            scale: 0,
            x: 0,
            y: 0
          }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1, 0.5],
            x: particle.xOffset,
            y: particle.yOffset
          }}
          transition={{ 
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            repeatDelay: particle.repeatDelay
          }}
          className={cn(
            "absolute left-1/2 top-1/2 w-2 h-2 rounded-full",
            particle.colorIndex === 0 ? "bg-white" : particle.colorIndex === 1 ? "bg-yellow-300" : "bg-orange-400"
          )}
        />
      ))}
    </div>
  );
}

export function StreakCelebration({
  streakDays,
  weekProgress,
  message = "Sua ofensiva começou! Pratique todos os dias pra ela crescer.",
  onContinue,
  className
}: StreakCelebrationProps) {
  const milestone = getMilestoneInfo(streakDays);
  const IconComponent = milestone.icon;
  const isMilestone = milestone.tier !== "normal";

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden",
        "bg-background",
        className
      )}
      data-testid="streak-celebration"
    >
      <ParticleEffect count={milestone.particles} color={milestone.glow} />
      
      {isMilestone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: -30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className={cn(
            "px-4 py-1.5 rounded-full mb-4 font-black text-sm tracking-widest text-white",
            `bg-gradient-to-r ${milestone.color}`
          )}
        >
          {milestone.label}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-2 border-orange-500/30 rounded-2xl px-6 py-5 mb-8 max-w-sm text-center relative shadow-lg"
      >
        <p className="text-foreground font-bold text-lg leading-relaxed">{message}</p>
        <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-r-2 border-b-2 border-orange-500/30 rotate-45" />
      </motion.div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        className="relative mb-6"
      >
        <motion.div
          animate={{ 
            scale: isMilestone ? [1, 1.15, 1] : [1, 1.1, 1],
            rotate: isMilestone ? [0, -8, 8, 0] : [0, -5, 5, 0]
          }}
          transition={{ 
            duration: isMilestone ? 1.5 : 2, 
            repeat: Infinity,
            repeatDelay: isMilestone ? 0.5 : 1
          }}
          className="relative"
        >
          <div 
            className={cn(
              "w-32 h-32 rounded-full flex items-center justify-center",
              `bg-gradient-to-br ${milestone.color}`
            )}
            style={{ boxShadow: `0 0 ${isMilestone ? 80 : 60}px ${milestone.glow}` }}
          >
            <IconComponent className="h-16 w-16 text-white drop-shadow-lg" />
          </div>
          
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.3, isMilestone ? 0.8 : 0.6, 0.3]
            }}
            transition={{ 
              duration: isMilestone ? 1 : 1.5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={cn(
              "absolute inset-0 rounded-full -z-10",
              `bg-gradient-to-br ${milestone.color}`
            )}
          />
          
          {isMilestone && (
            <motion.div
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.2, 0.5, 0.2]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
              className={cn(
                "absolute inset-0 rounded-full -z-20",
                `bg-gradient-to-br ${milestone.color}`
              )}
            />
          )}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.4 }}
        className="text-center mb-8"
      >
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-8xl font-black text-[#FF9600] block mb-2"
          style={{ 
            textShadow: '0 4px 0 #CC7700, 0 6px 10px rgba(255, 150, 0, 0.3)'
          }}
        >
          {streakDays}
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xl font-bold text-[#FF9600]"
        >
          {streakDays === 1 ? "dia de ofensiva" : "dias de ofensiva"}
        </motion.span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex items-center justify-center gap-3 mb-12"
      >
        {dayNames.map((day, index) => {
          const isCompleted = weekProgress[index];
          const isToday = index === new Date().getDay() - 1 || (new Date().getDay() === 0 && index === 6);
          
          return (
            <div key={day} className="flex flex-col items-center gap-2">
              <span className={cn(
                "text-sm font-bold",
                isToday ? "text-[#FF9600]" : "text-muted-foreground"
              )}>
                {day}
              </span>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8 + index * 0.05 }}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  isCompleted 
                    ? "bg-gradient-to-br from-[#FF9600] to-[#FF6B00]" 
                    : "bg-muted"
                )}
              >
                {isCompleted && (
                  <Check className="h-4 w-4 text-white stroke-[3]" />
                )}
              </motion.div>
            </div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="w-full max-w-sm"
      >
        <Button
          onClick={onContinue}
          className={cn(
            "w-full py-6 text-lg font-black uppercase tracking-wide",
            "bg-gradient-to-r from-[#1CB0F6] to-[#1899D6]",
            "shadow-[0_6px_0_0_#1480B8]",
            "hover:shadow-[0_4px_0_0_#1480B8] hover:translate-y-[2px]",
            "active:shadow-[0_2px_0_0_#1480B8] active:translate-y-[4px]",
            "transition-all duration-100"
          )}
          data-testid="button-continue"
        >
          Vou me dedicar
        </Button>
      </motion.div>
    </div>
  );
}
