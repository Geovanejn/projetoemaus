import { motion } from "framer-motion";
import { Zap, Target, Clock, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LessonCompleteProps {
  xpEarned: number;
  isPerfect: boolean;
  streakDays: number;
  mistakesCount: number;
  timeSpentSeconds: number;
  onContinue: () => void;
}

function StatBox({ 
  label, 
  value, 
  icon: Icon, 
  color,
  delay 
}: { 
  label: string; 
  value: string | number; 
  icon: LucideIcon; 
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", delay }}
      className="flex-1 rounded-2xl p-3 sm:p-4 text-center min-w-0"
      style={{
        border: `2px solid ${color}`,
        backgroundColor: `${color}10`
      }}
    >
      <p 
        className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2"
        style={{ color }}
      >
        {label}
      </p>
      <div className="flex items-center justify-center gap-1">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" style={{ color }} />
        <span className="text-xl sm:text-2xl font-black" style={{ color }}>
          {value}
        </span>
      </div>
    </motion.div>
  );
}

export function LessonComplete({
  xpEarned,
  isPerfect,
  streakDays,
  mistakesCount,
  timeSpentSeconds,
  onContinue
}: LessonCompleteProps) {
  const minutes = Math.floor(timeSpentSeconds / 60);
  const seconds = timeSpentSeconds % 60;
  const accuracy = Math.max(0, 100 - mistakesCount * 10);
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // No scroll - will be handled by redirect with lesson parameter

  return (
    <div 
      className="min-h-screen bg-background flex flex-col items-center justify-center p-6"
      data-testid="lesson-complete"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative mb-8"
      >
        <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#58CC02] to-[#46A302] flex items-center justify-center shadow-[0_8px_0_0_#3a9902]">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              repeatDelay: 1
            }}
          >
            <Sparkles className="h-20 w-20 text-white" />
          </motion.div>
        </div>
        
        {isPerfect && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="absolute -top-2 -right-2 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-full p-3 shadow-lg border-4 border-white"
          >
            <Target className="h-6 w-6 text-white" />
          </motion.div>
        )}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-black text-[#58CC02] mb-8 text-center"
      >
        {isPerfect ? "Prática concluída!" : "Lição Completa!"}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm flex gap-2 mb-12 px-2"
      >
        <StatBox 
          label="Total de XP" 
          value={xpEarned}
          icon={Zap}
          color="#FFC800"
          delay={0.4}
        />
        <StatBox 
          label="Ótima" 
          value={`${accuracy}%`}
          icon={Target}
          color="#58CC02"
          delay={0.5}
        />
        <StatBox 
          label="Relâmpago" 
          value={timeString}
          icon={Clock}
          color="#1CB0F6"
          delay={0.6}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="w-full max-w-sm space-y-3"
      >
        <Button
          onClick={onContinue}
          className={cn(
            "w-full py-7 text-lg font-black uppercase tracking-wide",
            "bg-gradient-to-r from-[#1CB0F6] to-[#1899D6]",
            "shadow-[0_6px_0_0_#1480B8]",
            "hover:shadow-[0_4px_0_0_#1480B8] hover:translate-y-[2px]",
            "active:shadow-[0_2px_0_0_#1480B8] active:translate-y-[4px]",
            "transition-all duration-100"
          )}
          data-testid="button-continue"
        >
          Continuar
        </Button>
      </motion.div>
    </div>
  );
}
