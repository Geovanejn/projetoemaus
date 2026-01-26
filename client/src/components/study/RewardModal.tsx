import { motion, AnimatePresence } from "framer-motion";
import { Zap, Star, Flame, Trophy, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Celebration } from "./Celebration";

interface RewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  xpEarned: number;
  streakDays?: number;
  lessonTitle?: string;
  perfectScore?: boolean;
}

function XPCounter({ amount, delay = 0 }: { amount: number; delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay }}
      className="flex items-center gap-2"
    >
      <motion.div
        animate={{ rotate: [0, 15, -15, 0] }}
        transition={{ duration: 0.5, delay: delay + 0.3 }}
        className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full"
      >
        <Zap className="h-6 w-6 text-white fill-white" />
      </motion.div>
      <div className="text-left">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.2 }}
          className="block text-4xl font-black text-amber-500"
        >
          +{amount}
        </motion.span>
        <span className="text-sm font-bold text-muted-foreground">XP</span>
      </div>
    </motion.div>
  );
}

function StreakDisplay({ days, delay = 0 }: { days: number; delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay }}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl border border-orange-500/20"
    >
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 1, delay: delay + 0.3, repeat: Infinity, repeatDelay: 2 }}
      >
        <Flame className="h-6 w-6 text-orange-500 fill-orange-500/30" />
      </motion.div>
      <div>
        <span className="text-lg font-bold text-orange-500">{days}</span>
        <span className="text-sm text-muted-foreground ml-1">
          {days === 1 ? "dia de ofensiva" : "dias de ofensiva"}
        </span>
      </div>
    </motion.div>
  );
}

function PerfectScoreBadge({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay }}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20"
    >
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 2, delay: delay + 0.3, ease: "linear" }}
      >
        <Star className="h-6 w-6 text-purple-500 fill-purple-500/30" />
      </motion.div>
      <span className="text-sm font-bold text-purple-500">Pontuacao Perfeita!</span>
    </motion.div>
  );
}

export function RewardModal({
  isOpen,
  onClose,
  xpEarned,
  streakDays,
  lessonTitle,
  perfectScore
}: RewardModalProps) {
  // XP is authoritative from backend - NO COMPOSITION ON FRONTEND
  const totalXP = xpEarned;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Celebration show={isOpen} type="confetti" />
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className={cn(
                "relative w-full max-w-sm p-6 rounded-3xl pointer-events-auto",
                "bg-gradient-to-b from-card to-background",
                "border border-border shadow-2xl"
              )}
              onClick={(e) => e.stopPropagation()}
              data-testid="reward-modal"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3"
                onClick={onClose}
                data-testid="button-close-reward"
              >
                <X className="h-5 w-5" />
              </Button>

              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-[#58CC02] to-[#46A302] shadow-lg"
                >
                  <Trophy className="h-10 w-10 text-white" />
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl font-black text-foreground mb-1"
                >
                  Lição Concluída!
                </motion.h2>
                
                {lessonTitle && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm text-muted-foreground"
                  >
                    {lessonTitle}
                  </motion.p>
                )}
              </div>

              <div className="flex flex-col items-center gap-4 mb-6">
                <XPCounter amount={totalXP} delay={0.3} />
                
                {streakDays && streakDays > 0 && (
                  <StreakDisplay days={streakDays} delay={0.5} />
                )}
                
                {perfectScore && (
                  <PerfectScoreBadge delay={0.6} />
                )}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  onClick={onClose}
                  className={cn(
                    "w-full h-14 text-lg font-bold",
                    "bg-gradient-to-r from-[#58CC02] to-[#46A302]",
                    "hover:from-[#46A302] hover:to-[#3D8C02]",
                    "shadow-[0_4px_0_0_#3D8C02]",
                    "active:shadow-[0_2px_0_0_#3D8C02] active:translate-y-0.5",
                    "transition-all"
                  )}
                  data-testid="button-continue"
                >
                  Continuar
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
