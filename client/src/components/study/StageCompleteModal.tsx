import { motion, AnimatePresence } from "framer-motion";
import { Zap, BookOpen, Heart, ChevronRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSounds } from "@/hooks/use-sounds";
import { useEffect, useRef } from "react";

type StageType = "estude" | "medite" | "responda";

interface StageCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  xpEarned: number;
  stageType: StageType;
  nextStage?: StageType | null;
  respondaCorrectAnswers?: number;
  totalRespondaQuestions?: number;
  preventBackdropClose?: boolean;
}

const stageConfig = {
  estude: {
    icon: BookOpen,
    label: "Estudo Concluído!",
    description: "Você completou a leitura",
    bgGradient: "from-[#58CC02] to-[#46A302]",
    shadowColor: "#3D8C02"
  },
  medite: {
    icon: Heart,
    label: "Meditação Concluída!",
    description: "Você completou a reflexão",
    bgGradient: "from-[#9B59B6] to-[#7D3C98]",
    shadowColor: "#6C3483"
  },
  responda: {
    icon: CheckCircle,
    label: "Perguntas Concluídas!",
    description: "Você completou todas as perguntas",
    bgGradient: "from-[#FF9600] to-[#E68600]",
    shadowColor: "#CC7600"
  }
};

const nextStageLabels: Record<StageType, string> = {
  estude: "Continuar",
  medite: "Continuar",
  responda: "Concluir"
};

export function StageCompleteModal({
  isOpen,
  onClose,
  xpEarned,
  stageType,
  nextStage,
  respondaCorrectAnswers = 0,
  totalRespondaQuestions = 0,
  preventBackdropClose = false
}: StageCompleteModalProps) {
  const config = stageConfig[stageType];
  const Icon = config.icon;
  const { sounds } = useSounds();
  const hasPlayedRef = useRef(false);
  
  const buttonText = nextStage ? "Continuar" : "Concluir";

  useEffect(() => {
    if (isOpen && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      sounds.achievement();
      if (xpEarned > 0) {
        setTimeout(() => sounds.xp(), 300);
      }
    } else if (!isOpen) {
      hasPlayedRef.current = false;
    }
  }, [isOpen, xpEarned, sounds]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={stageType === "responda" || preventBackdropClose ? undefined : onClose}
          />
          
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={cn(
                "relative w-full max-w-xs p-5 rounded-2xl pointer-events-auto",
                "bg-card border border-border shadow-xl"
              )}
              onClick={(e) => e.stopPropagation()}
              data-testid="stage-complete-modal"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  className={cn(
                    "inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full",
                    `bg-gradient-to-br ${config.bgGradient}`
                  )}
                  style={{ boxShadow: `0 4px 0 0 ${config.shadowColor}` }}
                >
                  <Icon className="h-8 w-8 text-white" />
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-lg font-bold text-foreground mb-1"
                >
                  {config.label}
                </motion.h2>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-muted-foreground mb-4"
                >
                  {config.description}
                </motion.p>

                {stageType === 'responda' ? (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.25 }}
                    className="flex flex-col items-center justify-center gap-2 mb-5 py-4 px-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      <CheckCircle className="h-8 w-8 text-emerald-500" />
                    </motion.div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-emerald-500">{respondaCorrectAnswers}</span>
                      <span className="text-lg font-bold text-emerald-500">de</span>
                      <span className="text-4xl font-black text-emerald-500">{totalRespondaQuestions}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-500/70">Certas</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Zap className="h-4 w-4 text-amber-500 fill-amber-500/30" />
                      <span className="text-lg font-black text-amber-500">+{respondaCorrectAnswers * 10}</span>
                      <span className="text-xs font-bold text-amber-500/70">XP</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.25 }}
                    className="flex items-center justify-center gap-2 mb-5 py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
                  >
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                    >
                      <Zap className="h-6 w-6 text-amber-500 fill-amber-500/30" />
                    </motion.div>
                    <span className="text-2xl font-black text-amber-500">+{xpEarned}</span>
                    <span className="text-sm font-bold text-amber-500/70">XP</span>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <Button
                    onClick={onClose}
                    className={cn(
                      "w-full h-12 text-base font-bold",
                      `bg-gradient-to-r ${config.bgGradient}`,
                      "shadow-[0_3px_0_0_rgba(0,0,0,0.2)]",
                      "active:shadow-[0_1px_0_0_rgba(0,0,0,0.2)] active:translate-y-0.5",
                      "transition-all"
                    )}
                    data-testid="button-continue-stage"
                  >
                    {buttonText}
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
