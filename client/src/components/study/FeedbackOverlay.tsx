import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Lightbulb, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSounds } from "@/hooks/use-sounds";
import { useEffect, useRef } from "react";

interface FeedbackOverlayProps {
  isVisible: boolean;
  isCorrect: boolean;
  explanation: string;
  hint?: string;
  xpEarned?: number;
  heartsLost?: number;
  onContinue: () => void;
}

export function FeedbackOverlay({
  isVisible,
  isCorrect,
  explanation,
  hint,
  xpEarned = 0,
  heartsLost = 0,
  onContinue
}: FeedbackOverlayProps) {
  const { sounds } = useSounds();
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    if (isVisible && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      if (isCorrect) {
        sounds.success();
        if (xpEarned > 0) {
          setTimeout(() => sounds.xp(), 200);
        }
      } else {
        sounds.error();
        if (heartsLost > 0) {
          setTimeout(() => sounds.heartLoss(), 200);
        }
      }
    } else if (!isVisible) {
      hasPlayedRef.current = false;
    }
  }, [isVisible, isCorrect, xpEarned, heartsLost, sounds]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 p-4 pb-8 rounded-t-3xl shadow-2xl",
            isCorrect 
              ? "bg-green-500 dark:bg-green-600" 
              : "bg-red-500 dark:bg-red-600"
          )}
          data-testid={`feedback-overlay-${isCorrect ? 'correct' : 'incorrect'}`}
        >
          <div className="max-w-lg mx-auto">
            <div className="flex items-start gap-3 mb-4">
              {isCorrect ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                >
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                >
                  <XCircle className="h-8 w-8 text-white" />
                </motion.div>
              )}
              
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">
                  {isCorrect ? "Correto!" : "Não foi dessa vez"}
                </h3>
                <p className="text-white/90 text-sm">
                  {explanation}
                </p>
                
                {hint && !isCorrect && (
                  <div className="flex items-start gap-2 mt-2 bg-white/10 rounded-lg p-2">
                    <Lightbulb className="h-4 w-4 text-yellow-300 mt-0.5 flex-shrink-0" />
                    <p className="text-white/80 text-xs">{hint}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              {isCorrect && xpEarned > 0 && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1"
                >
                  <span className="text-yellow-300 font-bold">+{xpEarned} XP</span>
                </motion.div>
              )}
              
              {!isCorrect && heartsLost > 0 && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1"
                >
                  <Heart className="h-4 w-4 fill-white text-white" />
                  <span className="text-white font-bold">-{heartsLost}</span>
                </motion.div>
              )}
            </div>

            <Button
              onClick={onContinue}
              className={cn(
                "w-full font-bold py-6",
                isCorrect 
                  ? "bg-white text-green-600 hover:bg-white/90" 
                  : "bg-white text-red-600 hover:bg-white/90"
              )}
              data-testid="button-continue"
            >
              CONTINUAR
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
