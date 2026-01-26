import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSounds } from "@/hooks/use-sounds";

interface CrystalGainAnimationProps {
  crystalsGained: number;
  reason: string;
  onComplete: () => void;
  className?: string;
}

function CrystalIcon({ size = 80 }: { size?: number }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width={size}
      height={size}
      className="transition-all duration-300"
    >
      <defs>
        <linearGradient id="crystalGradientLarge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        <filter id="crystalGlowLarge" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="glow"/>
          <feMerge>
            <feMergeNode in="glow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <polygon
        points="12,2 22,8 22,16 12,22 2,16 2,8"
        fill="url(#crystalGradientLarge)"
        filter="url(#crystalGlowLarge)"
        stroke="#8B5CF6"
        strokeWidth="0.5"
      />
      <polygon
        points="12,2 17,5 17,11 12,14 7,11 7,5"
        fill="rgba(255,255,255,0.3)"
      />
      <line 
        x1="12" y1="2" 
        x2="12" y2="22" 
        stroke="rgba(255,255,255,0.2)" 
        strokeWidth="0.5"
      />
      <line 
        x1="2" y1="8" 
        x2="22" y2="16" 
        stroke="rgba(255,255,255,0.1)" 
        strokeWidth="0.5"
      />
    </svg>
  );
}

function SmallCrystal({ delay, startX, startY }: { delay: number; startX: number; startY: number }) {
  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        scale: 0,
        x: startX,
        y: startY
      }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0, 1.2, 1, 0.5],
        y: [startY, startY - 100, startY - 200, startY - 300],
        x: [startX, startX + (Math.random() - 0.5) * 100, startX + (Math.random() - 0.5) * 150, startX],
        rotate: [0, 180, 360, 540]
      }}
      transition={{ 
        duration: 2,
        delay,
        ease: "easeOut"
      }}
      className="absolute"
    >
      <CrystalIcon size={20} />
    </motion.div>
  );
}

export function CrystalGainAnimation({
  crystalsGained,
  reason,
  onComplete,
  className
}: CrystalGainAnimationProps) {
  const [displayNumber, setDisplayNumber] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const { playSound } = useSounds();
  const hasPlayedSound = useRef(false);

  useEffect(() => {
    if (!hasPlayedSound.current) {
      playSound('crystal');
      hasPlayedSound.current = true;
    }

    const steps = crystalsGained;
    
    if (steps <= 0) {
      setDisplayNumber(0);
      setAnimationComplete(true);
      playSound('achievement');
      setTimeout(() => setShowButton(true), 500);
      return;
    }

    const countDuration = 1200;
    const stepDuration = countDuration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setDisplayNumber(currentStep);
      playSound('crystal');
      
      if (currentStep >= crystalsGained) {
        clearInterval(interval);
        setAnimationComplete(true);
        playSound('achievement');
        setTimeout(() => setShowButton(true), 500);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [crystalsGained, playSound]);

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center p-6",
        "bg-background/95 backdrop-blur-sm",
        className
      )}
      data-testid="crystal-gain-animation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center relative"
      >
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-purple-600 dark:text-purple-400 mb-2 font-bold"
        >
          Você ganhou cristais!
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-muted-foreground mb-8"
        >
          {reason}
        </motion.p>

        <motion.div
          className="relative mb-8"
          animate={animationComplete ? {
            scale: [1, 1.1, 1],
          } : {}}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              repeatDelay: 0.5
            }}
            className="relative inline-block"
          >
            <div className="relative">
              <CrystalIcon size={100} />
              <motion.div
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 flex items-center justify-center -z-10"
              >
                <div className="w-28 h-28 rounded-full bg-purple-500/30 blur-xl" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        <div className="relative h-24 flex items-center justify-center overflow-hidden mb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={displayNumber}
              initial={{ y: 30, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -30, opacity: 0, scale: 0.8 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
              className="flex items-center gap-2 absolute"
            >
              <span
                className="text-7xl font-black text-purple-600 dark:text-purple-400"
                style={{ 
                  textShadow: '0 4px 0 #6D28D9, 0 8px 15px rgba(139, 92, 246, 0.4)'
                }}
              >
                +{displayNumber}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl font-bold text-purple-600 dark:text-purple-400 mb-8"
        >
          {crystalsGained === 1 ? "cristal" : "cristais"}
        </motion.p>

        <AnimatePresence>
          {showButton && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-sm mx-auto"
            >
              <Button
                onClick={onComplete}
                className={cn(
                  "w-full py-6 text-lg font-black uppercase tracking-wide",
                  "bg-gradient-to-r from-purple-600 to-purple-700",
                  "shadow-[0_6px_0_0_#5B21B6]",
                  "hover:shadow-[0_4px_0_0_#5B21B6] hover:translate-y-[2px]",
                  "active:shadow-[0_2px_0_0_#5B21B6] active:translate-y-[4px]",
                  "transition-all duration-100"
                )}
                data-testid="button-continue-crystal"
              >
                Continuar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {[...Array(8)].map((_, i) => (
        <SmallCrystal 
          key={i} 
          delay={0.5 + i * 0.15} 
          startX={(Math.random() - 0.5) * 200}
          startY={100}
        />
      ))}

      {animationComplete && (
        <>
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              initial={{ 
                opacity: 1, 
                scale: 0,
                x: 0,
                y: 0
              }}
              animate={{ 
                opacity: 0,
                scale: 1,
                x: (Math.random() - 0.5) * 500,
                y: (Math.random() - 0.5) * 500
              }}
              transition={{ 
                duration: 1.5,
                delay: i * 0.03,
                ease: "easeOut"
              }}
              className="absolute top-1/2 left-1/2"
              style={{
                width: 4 + Math.random() * 8,
                height: 4 + Math.random() * 8,
                borderRadius: '50%',
                background: `linear-gradient(135deg, #A855F7, #7C3AED)`
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
