import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSounds } from "@/hooks/use-sounds";

interface StreakIncrementAnimationProps {
  previousStreak: number;
  newStreak: number;
  onComplete: () => void;
  className?: string;
}

export function StreakIncrementAnimation({
  previousStreak,
  newStreak,
  onComplete,
  className
}: StreakIncrementAnimationProps) {
  const [displayNumber, setDisplayNumber] = useState(previousStreak);
  const [animationPhase, setAnimationPhase] = useState<"counting" | "complete">("counting");
  const [showButton, setShowButton] = useState(false);
  const { sounds } = useSounds();
  const hasPlayedSound = useRef(false);

  useEffect(() => {
    if (!hasPlayedSound.current) {
      sounds.streak();
      hasPlayedSound.current = true;
    }

    const steps = Math.abs(newStreak - previousStreak);
    
    if (steps <= 0) {
      setDisplayNumber(newStreak);
      setAnimationPhase("complete");
      sounds.achievement();
      setTimeout(() => setShowButton(true), 500);
      return;
    }

    const countDuration = 1500;
    const stepDuration = countDuration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const newNumber = previousStreak + currentStep;
      setDisplayNumber(newNumber);
      
      if (newNumber >= newStreak) {
        clearInterval(interval);
        setAnimationPhase("complete");
        sounds.achievement();
        setTimeout(() => setShowButton(true), 500);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [previousStreak, newStreak, sounds]);

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center p-6",
        "bg-background/95 backdrop-blur-sm",
        className
      )}
      data-testid="streak-increment-animation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-muted-foreground mb-4 font-medium"
        >
          Mantenha a Chama do Evangelho Acesa
        </motion.p>

        <motion.div
          className="relative mb-8"
          animate={animationPhase === "complete" ? {
            scale: [1, 1.2, 1],
          } : {}}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, -5, 5, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              repeatDelay: 0.5
            }}
            className="relative inline-block"
          >
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#FF9600] via-[#FF6B00] to-[#FF4500] flex items-center justify-center shadow-[0_0_60px_rgba(255,150,0,0.5)]">
              <Flame className="h-16 w-16 text-white drop-shadow-lg" />
            </div>
            
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.4, 0.7, 0.4]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FF9600] to-[#FF4500] -z-10"
            />
          </motion.div>
        </motion.div>

        <div className="relative h-32 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={displayNumber}
              initial={{ y: 50, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -50, opacity: 0, scale: 0.8 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
              className="text-8xl font-black text-[#FF9600] absolute"
              style={{ 
                textShadow: '0 4px 0 #CC7700, 0 8px 15px rgba(255, 150, 0, 0.4)'
              }}
            >
              {displayNumber}
            </motion.span>
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <span className="text-2xl font-bold text-[#FF9600]">
            {displayNumber === 1 ? "dia de ofensiva" : "dias de ofensiva"}
          </span>
        </motion.div>

        <AnimatePresence>
          {showButton && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-sm"
            >
              <Button
                onClick={onComplete}
                className={cn(
                  "w-full py-6 text-lg font-black uppercase tracking-wide",
                  "bg-gradient-to-r from-[#1CB0F6] to-[#1899D6]",
                  "shadow-[0_6px_0_0_#1480B8]",
                  "hover:shadow-[0_4px_0_0_#1480B8] hover:translate-y-[2px]",
                  "active:shadow-[0_2px_0_0_#1480B8] active:translate-y-[4px]",
                  "transition-all duration-100"
                )}
                data-testid="button-continue-streak"
              >
                Continuar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {animationPhase === "complete" && (
        <>
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                opacity: 1, 
                scale: 0,
                x: 0,
                y: 0
              }}
              animate={{ 
                opacity: 0,
                scale: 1,
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400
              }}
              transition={{ 
                duration: 1.5,
                delay: i * 0.05,
                ease: "easeOut"
              }}
              className="absolute top-1/2 left-1/2"
              style={{
                width: 8 + Math.random() * 12,
                height: 8 + Math.random() * 12,
                borderRadius: '50%',
                background: `linear-gradient(135deg, #FF9600, #FF4500)`
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
