import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, BookOpen, Heart, HelpCircle, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export type UnitStatus = "completed" | "current" | "locked";
export type LessonStageStatus = "completed" | "current" | "locked";

export interface LessonStage {
  type: "estude" | "medite" | "responda";
  status: LessonStageStatus;
  completedUnits: number;
  totalUnits: number;
}

export interface LessonData {
  id: number;
  number: number;
  title: string;
  status: "completed" | "in_progress" | "locked";
  sectionsCompleted: number;
  totalSections: number;
  xpReward: number;
  stages: LessonStage[];
  coverImageUrl?: string | null;
}

export interface UnitData {
  id: number;
  number: number;
  title: string;
  subtitle: string;
  status: UnitStatus;
  lessonsCompleted: number;
  totalLessons: number;
  progress: number;
  lessons: LessonData[];
  unlockMessage?: string;
}

interface NewUnitCardProps {
  unit: UnitData;
  onLessonStageClick?: (lessonId: number, stage: "estude" | "medite" | "responda") => void;
  defaultExpanded?: boolean;
}

const unitColors = [
  { gradient: "from-[#6366F1] to-[#818CF8]", bg: "bg-[#6366F1]", progress: "#818CF8" },
  { gradient: "from-[#10B981] to-[#34D399]", bg: "bg-[#10B981]", progress: "#34D399" },
  { gradient: "from-[#EC4899] to-[#F472B6]", bg: "bg-[#EC4899]", progress: "#F472B6" },
  { gradient: "from-[#8B5CF6] to-[#A78BFA]", bg: "bg-[#8B5CF6]", progress: "#A78BFA" },
  { gradient: "from-[#F59E0B] to-[#FBBF24]", bg: "bg-[#F59E0B]", progress: "#FBBF24" },
];

const completedColors = {
  gradient: "from-[#F59E0B] to-[#D97706]",
  bg: "bg-[#F59E0B]",
  progress: "#D97706"
};

const lockedColors = {
  gradient: "from-[#9CA3AF] to-[#D1D5DB]",
  bg: "bg-[#9CA3AF]",
  progress: "#D1D5DB"
};

export function LessonCard({ 
  lesson, 
  onStageClick,
  colorIndex = 0,
  defaultCollapsed = false
}: { 
  lesson: LessonData;
  onStageClick?: (lessonId: number, stage: "estude" | "medite" | "responda") => void;
  colorIndex?: number;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const isCompleted = lesson.status === "completed";
  const isInProgress = lesson.status === "in_progress";
  const isLocked = lesson.status === "locked";

  const borderColor = isCompleted 
    ? "border-l-[#10B981]" 
    : isInProgress 
      ? "border-l-[#8B5CF6]" 
      : "border-l-[#D1D5DB]";

  const circleColor = isCompleted
    ? "bg-[#10B981]"
    : isInProgress
      ? "bg-[#8B5CF6]"
      : "bg-[#9CA3AF]";

  const xpColor = isCompleted
    ? "text-[#10B981]"
    : isInProgress
      ? "text-[#8B5CF6]"
      : "text-[#9CA3AF]";

  return (
    <motion.div
      id={`lesson-${lesson.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "bg-card rounded-xl border-l-4 p-4 shadow-sm",
        borderColor
      )}
      data-testid={`lesson-card-${lesson.id}`}
    >
      <button
        onClick={() => !isLocked && setIsCollapsed(!isCollapsed)}
        disabled={isLocked}
        className="w-full text-left"
        data-testid={`lesson-toggle-${lesson.id}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className={cn(
                  "w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold",
                  circleColor
                )}>
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    lesson.number
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Lição {lesson.number}
                  </p>
                  <h4 className="font-bold text-foreground text-sm line-clamp-2 break-words" data-testid={`lesson-title-${lesson.id}`}>
                    {lesson.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {isCompleted ? "Completo" : isInProgress ? "Em progresso" : "Bloqueado"} • {lesson.sectionsCompleted}/{lesson.totalSections} seções
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("text-xs font-bold", xpColor)}>
                  {isCompleted ? "+" : ""}{lesson.xpReward} XP
                </span>
                {!isLocked && (
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    !isCollapsed && "rotate-180"
                  )} />
                )}
              </div>
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mt-3">
              {lesson.stages.map((stage) => {
                const stageIsLocked = stage.status === "locked";
                const stageIsCompleted = stage.status === "completed";
                
                let bgClass = "";
                let textClass = "";
                let iconClass = "";
                
                if (stage.type === "estude") {
                  bgClass = stageIsLocked ? "bg-muted" : "bg-[#10B981]/10";
                  textClass = stageIsLocked ? "text-muted-foreground" : "text-[#10B981]";
                  iconClass = stageIsLocked ? "text-muted-foreground" : "text-[#10B981]";
                } else if (stage.type === "medite") {
                  bgClass = stageIsLocked ? "bg-muted" : "bg-[#8B5CF6]/10";
                  textClass = stageIsLocked ? "text-muted-foreground" : "text-[#8B5CF6]";
                  iconClass = stageIsLocked ? "text-muted-foreground" : "text-[#8B5CF6]";
                } else {
                  bgClass = stageIsLocked ? "bg-muted" : "bg-[#10B981]/10";
                  textClass = stageIsLocked ? "text-muted-foreground" : "text-[#10B981]";
                  iconClass = stageIsLocked ? "text-muted-foreground" : "text-[#10B981]";
                }

                const Icon = stage.type === "estude" 
                  ? BookOpen 
                  : stage.type === "medite" 
                    ? Heart 
                    : HelpCircle;

                return (
                  <button
                    key={stage.type}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!stageIsLocked) onStageClick?.(lesson.id, stage.type);
                    }}
                    disabled={stageIsLocked}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2.5 px-3 rounded-lg transition-all",
                      bgClass,
                      !stageIsLocked && "hover-elevate cursor-pointer"
                    )}
                    data-testid={`lesson-${lesson.id}-stage-${stage.type}`}
                  >
                    {stageIsLocked ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Icon className={cn("h-4 w-4", iconClass)} />
                    )}
                    <span className={cn("text-xs font-medium", textClass)}>
                      {stage.type === "estude" ? "Estude" : stage.type === "medite" ? "Medite" : "Responda"}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function NewUnitCard({ unit, onLessonStageClick, defaultExpanded = false }: NewUnitCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const colorIndex = (unit.number - 1) % unitColors.length;
  const isLocked = unit.status === "locked";
  const isCompleted = unit.status === "completed";
  const colors = isLocked ? lockedColors : isCompleted ? completedColors : unitColors[colorIndex];

  return (
    <div className="space-y-3" data-testid={`unit-${unit.id}`}>
      <motion.button
        onClick={() => !isLocked && setIsExpanded(!isExpanded)}
        disabled={isLocked}
        className={cn(
          "w-full rounded-2xl overflow-hidden transition-all shadow-sm",
          !isLocked && "cursor-pointer"
        )}
        whileHover={!isLocked ? { scale: 1.01 } : undefined}
        whileTap={!isLocked ? { scale: 0.99 } : undefined}
        data-testid={`unit-card-${unit.id}`}
      >
        <div className={cn(
          "bg-gradient-to-r p-4 text-white",
          colors.gradient
        )}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-left">
              <h3 className="font-bold text-lg">Unidade {unit.number}</h3>
              <p className="text-white/90 text-sm">{unit.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <BookOpen className="h-3.5 w-3.5 text-white/80" />
                <span className="text-xs text-white/80">
                  {isLocked 
                    ? `${unit.totalLessons} Licoes` 
                    : isCompleted 
                      ? `${unit.totalLessons} Licoes Completas`
                      : `${unit.lessonsCompleted}/${unit.totalLessons} Licoes`
                  }
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLocked ? (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-white" />
                </div>
              ) : isCompleted ? (
                <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center">
                  <span className="text-white font-bold">{unit.lessonsCompleted}</span>
                </div>
              )}
              {!isLocked && (
                <ChevronDown className={cn(
                  "h-5 w-5 text-white/80 transition-transform",
                  isExpanded && "rotate-180"
                )} />
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-card px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Progresso</span>
          <div className="flex-1 max-w-[120px]">
            <Progress 
              value={unit.progress} 
              className="h-2"
            />
          </div>
          <span className={cn(
            "text-sm font-bold",
            isLocked ? "text-muted-foreground" : isCompleted ? "text-[#10B981]" : "text-[#8B5CF6]"
          )}>
            {unit.progress}%
          </span>
        </div>

        {isLocked && unit.unlockMessage && (
          <div className="bg-muted/50 px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">{unit.unlockMessage}</p>
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {isExpanded && !isLocked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 px-1"
          >
            <h4 className="font-semibold text-foreground px-2 pt-2">
              Licoes - Unidade {unit.number}
            </h4>
            {unit.lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onStageClick={onLessonStageClick}
                colorIndex={colorIndex}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
