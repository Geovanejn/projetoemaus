import { motion, AnimatePresence } from "framer-motion";
import { Star, Crown, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSounds } from "@/hooks/use-sounds";
import { useEffect, useRef } from "react";

interface GoldenMasteryAnimationProps {
  show: boolean;
  starsEarned: number;
  onClose: () => void;
}

export function GoldenMasteryAnimation({ show, starsEarned, onClose }: GoldenMasteryAnimationProps) {
  const { sounds } = useSounds();
  const hasPlayedRef = useRef(false);
  
  useEffect(() => {
    if (show && starsEarned === 3 && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      sounds.mastery();
      setTimeout(() => sounds.star(), 300);
      setTimeout(() => sounds.star(), 600);
      setTimeout(() => sounds.star(), 900);
      setTimeout(() => sounds.goldenTransform(), 1200);
      setTimeout(() => sounds.achievement(), 1800);
    } else if (!show) {
      hasPlayedRef.current = false;
    }
  }, [show, starsEarned, sounds]);

  if (starsEarned !== 3) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          onClick={onClose}
          data-testid="golden-mastery-overlay"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-amber-900/90 via-amber-800/85 to-yellow-900/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at center, rgba(255,215,0,0.4) 0%, transparent 60%)'
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 0.8, 0.4]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </motion.div>

          <motion.div
            className="relative flex flex-col items-center z-10"
            onClick={(e) => e.stopPropagation()}
            data-testid="golden-mastery-modal"
          >
            <motion.div
              initial={{ scale: 0, y: -100 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 150, damping: 15 }}
              className="relative mb-6"
            >
              <motion.div
                className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 flex items-center justify-center shadow-2xl"
                animate={{
                  boxShadow: [
                    '0 0 40px rgba(255, 215, 0, 0.6)',
                    '0 0 80px rgba(255, 215, 0, 1)',
                    '0 0 40px rgba(255, 215, 0, 0.6)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Crown className="h-14 w-14 text-amber-900" />
                </motion.div>
              </motion.div>

              <motion.div
                className="absolute -top-4 -right-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
              >
                <Trophy className="h-10 w-10 text-yellow-400 drop-shadow-lg" />
              </motion.div>
            </motion.div>

            <div className="flex gap-3 mb-6">
              {[1, 2, 3].map((star) => (
                <motion.div
                  key={star}
                  initial={{ scale: 0, rotate: -180, y: -50 }}
                  animate={{ 
                    scale: 1, 
                    rotate: 0, 
                    y: 0
                  }}
                  transition={{ 
                    delay: 0.4 + star * 0.3, 
                    type: "spring", 
                    stiffness: 200,
                    damping: 12
                  }}
                  className="relative"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      delay: star * 0.2
                    }}
                  >
                    <Star 
                      className="h-14 w-14 text-yellow-400 fill-yellow-400 drop-shadow-lg"
                      style={{
                        filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))'
                      }}
                    />
                  </motion.div>
                  
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.5, 2]
                    }}
                    transition={{ 
                      delay: 0.4 + star * 0.3,
                      duration: 0.8,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  >
                    <Sparkles className="h-8 w-8 text-white" />
                  </motion.div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 }}
              className="text-center"
            >
              <motion.h2 
                className="text-4xl font-black text-white mb-2"
                animate={{ 
                  textShadow: [
                    '0 0 20px rgba(255, 215, 0, 0.5)',
                    '0 0 40px rgba(255, 215, 0, 0.8)',
                    '0 0 20px rgba(255, 215, 0, 0.5)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                MESTRE!
              </motion.h2>
              <p className="text-amber-200 text-lg mb-2">
                Você dominou esta semana!
              </p>
              <motion.p 
                className="text-yellow-400 font-bold text-sm mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
              >
                Todas as lições ficaram douradas!
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 2.2, type: "spring" }}
              className="relative"
            >
              <motion.div
                className="absolute -inset-4 rounded-xl bg-gradient-to-r from-yellow-400/30 to-amber-400/30"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <Button 
                onClick={onClose}
                size="lg"
                className="relative bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-500 hover:via-amber-500 hover:to-yellow-600 text-amber-900 font-black text-lg px-10 py-6 shadow-2xl"
                data-testid="button-close-golden"
              >
                Continuar
              </Button>
            </motion.div>

            {Array.from({ length: 40 }).map((_, i) => (
              <motion.div
                key={`star-particle-${i}`}
                className="absolute pointer-events-none"
                style={{
                  left: '50%',
                  top: '0%',
                }}
                initial={{ 
                  x: (Math.random() - 0.5) * 300, 
                  y: -50,
                  opacity: 0,
                  scale: 0
                }}
                animate={{ 
                  y: 500,
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1, 1, 0.5],
                  rotate: Math.random() * 720
                }}
                transition={{ 
                  delay: i * 0.1,
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 2
                }}
              >
                {i % 3 === 0 ? (
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                ) : (
                  <div 
                    className="rounded-full"
                    style={{
                      width: 4 + Math.random() * 4,
                      height: 4 + Math.random() * 4,
                      backgroundColor: ['#FFD700', '#FFA500', '#FFCC00', '#FFE55C'][i % 4]
                    }}
                  />
                )}
              </motion.div>
            ))}

            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute"
                style={{
                  left: `${10 + (i % 4) * 25}%`,
                  top: `${20 + Math.floor(i / 4) * 60}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0]
                }}
                transition={{
                  delay: 1.5 + i * 0.3,
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 1
                }}
              >
                <Sparkles className="h-6 w-6 text-yellow-300" />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
