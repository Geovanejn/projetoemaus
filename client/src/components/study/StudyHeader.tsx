import { ArrowLeft, X, BookOpen, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeartsDisplay } from "./HeartsDisplay";
import { CrystalDisplay } from "./CrystalDisplay";
import { ProgressBar } from "./ProgressBar";
import { cn } from "@/lib/utils";

type LessonStage = "estude" | "medite" | "responda";

interface StudyHeaderProps {
  currentStep: number;
  totalSteps: number;
  hearts: number;
  maxHearts: number;
  onClose?: () => void;
  onBack?: () => void;
  showProgress?: boolean;
  showStats?: boolean;
  className?: string;
  currentStage?: LessonStage;
  showStages?: boolean;
}

const stageConfig = {
  estude: { label: "Estude", icon: BookOpen, color: "text-blue-500" },
  medite: { label: "Medite", icon: Heart, color: "text-purple-500" },
  responda: { label: "Responda", icon: MessageCircle, color: "text-green-500" }
};

const stageOrder: LessonStage[] = ["estude", "medite", "responda"];

export function StudyHeader({
  currentStep,
  totalSteps,
  hearts,
  maxHearts,
  onClose,
  onBack,
  showProgress = true,
  showStats = true,
  className,
  currentStage,
  showStages = false
}: StudyHeaderProps) {
  return (
    <header className={cn("sticky top-0 z-50 bg-background border-b", className)}>
      {showStages && currentStage && (
        <div className="flex items-center justify-center gap-1 py-2 border-b bg-muted/30">
          {stageOrder.map((stage, index) => {
            const config = stageConfig[stage];
            const Icon = config.icon;
            const isActive = stage === currentStage;
            const isPast = stageOrder.indexOf(currentStage) > index;
            
            return (
              <div key={stage} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    isPast && !isActive && "bg-muted text-muted-foreground",
                    !isActive && !isPast && "text-muted-foreground/50"
                  )}
                  data-testid={`stage-indicator-${stage}`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{config.label}</span>
                </div>
                {index < stageOrder.length - 1 && (
                  <div className={cn(
                    "w-4 h-0.5 mx-1",
                    isPast ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <div className="flex items-center gap-3 p-3">
        {onBack ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : onClose ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close"
          >
            <X className="h-5 w-5" />
          </Button>
        ) : null}

        {showProgress && (
          <div className="flex-1">
            <ProgressBar
              current={currentStep}
              total={totalSteps}
              height="md"
              color={currentStep === totalSteps ? "success" : "default"}
            />
          </div>
        )}

        {showStats && (
          <div className="flex items-center gap-2">
            <CrystalDisplay size="md" />
            <HeartsDisplay
              current={hearts}
              max={maxHearts}
              size="md"
            />
          </div>
        )}
      </div>
    </header>
  );
}
