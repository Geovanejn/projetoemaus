import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface ContinueLearningData {
  unitNumber: number;
  unitTitle: string;
  lessonNumber: number;
  lessonTitle: string;
  sectionsRemaining: number;
  totalSections: number;
  progress: number;
  lessonId: number;
  currentStage?: 'estude' | 'medite' | 'responda';
}

interface ContinueLearningProps {
  data: ContinueLearningData | null;
  onContinue?: (lessonId: number, currentStage?: 'estude' | 'medite' | 'responda') => void;
  onViewAll?: () => void;
}

export function ContinueLearning({ data, onContinue, onViewAll }: ContinueLearningProps) {
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-foreground">Continue Aprendendo</h2>
        {onViewAll && (
          <button 
            onClick={onViewAll}
            className="text-sm text-[#8B5CF6] font-medium hover:underline"
            data-testid="button-view-all"
          >
            Ver tudo
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] p-4 text-white shadow-lg"
        data-testid="continue-learning-card"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium bg-[#F59E0B] text-white px-2 py-0.5 rounded-full">
            Em Progresso
          </span>
          <span className="text-xs text-white/80">Unidade {data.unitNumber}</span>
        </div>

        <h3 className="font-bold text-xl mb-1">{data.lessonTitle}</h3>
        <p className="text-white/80 text-sm mb-3">
          Lição {data.lessonNumber} • {data.sectionsRemaining} seções restantes
        </p>

        <div className="mb-4">
          <Progress 
            value={data.progress} 
            className="h-2 bg-white/20"
          />
        </div>

        <Button
          onClick={() => onContinue?.(data.lessonId, data.currentStage)}
          className="w-full bg-white text-[#7C3AED] hover:bg-white/90 font-bold"
          data-testid="button-continue-studying"
        >
          Continuar Estudando
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
