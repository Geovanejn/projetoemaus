import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BookOpen, Heart, HelpCircle, Lock, Check, Dumbbell, Star, FolderOpen } from "lucide-react";

export type LessonStatus = "completed" | "current" | "locked";
export type StageStatus = "completed" | "current" | "locked";
export type StageType = "estude" | "medite" | "responda";

export type QuestionResult = 'correct' | 'incorrect' | 'unanswered';

export interface StageItem {
  type: StageType;
  status: StageStatus;
  completedUnits: number;
  totalUnits: number;
  questionResults?: QuestionResult[];
}

export interface LessonItem {
  id: number;
  lessonNumber: number;
  title: string;
  subtitle: string;
  status: LessonStatus;
  progress: number;
  totalSections: number;
  stages: StageItem[];
}

export interface PracticeStatus {
  isUnlocked: boolean;
  starsEarned: number;
  isMastered: boolean;
  lessonsCompleted: number;
  totalLessons: number;
}

interface LearningPathProps {
  lessons: LessonItem[];
  unitTitle?: string;
  onLessonClick?: (lessonId: number, stage?: StageType) => void;
  onPracticeClick?: () => void;
  showPractice?: boolean;
  practiceStatus?: PracticeStatus;
}

const RAIL_WIDTH = 72;

const stageConfig = {
  estude: {
    icon: BookOpen,
    label: "Estude",
    description: "Aprenda sobre o tema",
    colors: {
      bg: "#58CC02",
      shadow: "#46A302",
      inner: "#7BD937"
    }
  },
  medite: {
    icon: Heart,
    label: "Medite",
    description: "Aplicação e oração",
    colors: {
      bg: "#9B59B6",
      shadow: "#7D3C98",
      inner: "#AF7AC5"
    }
  },
  responda: {
    icon: HelpCircle,
    label: "Responda",
    description: "Teste seus conhecimentos",
    colors: {
      bg: "#1CB0F6",
      shadow: "#1899D6",
      inner: "#49C0F8"
    }
  }
};

const lockedColors = {
  bg: "#E5E5E5",
  shadow: "#CECECE",
  inner: "#F0F0F0"
};

function StageIcon({ type, status, onClick, isMastered = false }: { type: StageType; status: StageStatus; onClick?: () => void; isMastered?: boolean }) {
  const config = stageConfig[type];
  const Icon = config.icon;
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isCurrent = status === "current";
  
  // Use golden colors if mastered (3 stars in practice)
  const goldenColors = {
    bg: "#FFD700",
    shadow: "#DAA520",
    inner: "#FFE55C"
  };
  
  const colors = isLocked ? lockedColors : (isCompleted && isMastered ? goldenColors : config.colors);

  return (
    <motion.button
      whileHover={!isLocked ? { scale: 1.08, y: -2 } : undefined}
      whileTap={!isLocked ? { scale: 0.95, y: 2 } : undefined}
      onClick={!isLocked ? onClick : undefined}
      disabled={isLocked}
      className={cn(
        "relative z-10 flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center",
        !isLocked && "cursor-pointer"
      )}
      style={{
        backgroundColor: colors.bg,
        boxShadow: `0 5px 0 0 ${colors.shadow}`
      }}
      data-testid={`stage-icon-${type}`}
    >
      <div 
        className="absolute inset-[4px] rounded-xl flex items-center justify-center"
        style={{
          background: `linear-gradient(180deg, ${colors.inner} 0%, ${colors.bg} 100%)`
        }}
      >
        {isLocked ? (
          <Lock className="h-6 w-6 text-muted-foreground/50" />
        ) : isCompleted ? (
          <Check className="h-6 w-6 text-white stroke-[3]" />
        ) : (
          <Icon className="h-6 w-6 text-white" />
        )}
      </div>
      
      {isCurrent && (
        <motion.div
          animate={{ 
            scale: [1, 1.12, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 rounded-2xl border-[3px] border-white/70"
        />
      )}
    </motion.button>
  );
}

function StageCard({ 
  stage,
  onClick,
  isMastered = false
}: { 
  stage: StageItem;
  onClick?: () => void;
  isMastered?: boolean;
}) {
  const config = stageConfig[stage.type];
  const isLocked = stage.status === "locked";
  const isCurrent = stage.status === "current";
  const isCompleted = stage.status === "completed";
  const showGolden = isCompleted && isMastered;

  return (
    <motion.button
      whileHover={!isLocked ? { scale: 1.01 } : undefined}
      whileTap={!isLocked ? { scale: 0.99 } : undefined}
      onClick={!isLocked ? onClick : undefined}
      disabled={isLocked}
      className={cn(
        "flex-1 text-left p-4 rounded-xl transition-all min-w-0",
        "border-2",
        isCurrent && "bg-card border-[#58CC02] shadow-md",
        isCompleted && !showGolden && "bg-card/80 border-border/50 shadow-sm",
        showGolden && "bg-gradient-to-r from-[#FFF8DC] to-[#FFE4B5] border-[#FFD700] shadow-md",
        isLocked && "bg-transparent border-transparent cursor-not-allowed"
      )}
      style={!isLocked ? { boxShadow: showGolden ? "0 2px 8px rgba(255, 215, 0, 0.3)" : "0 2px 8px rgba(0, 0, 0, 0.08)" } : undefined}
      data-testid={`stage-card-${stage.type}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <h4 className={cn(
          "font-bold text-sm",
          isLocked ? "text-muted-foreground/50" : "text-foreground"
        )}>
          {config.label}
        </h4>
        {isCurrent && (
          <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-[#FF9600] rounded-full uppercase tracking-wide">
            Atual
          </span>
        )}
        {isCompleted && (
          <Check className={cn("h-4 w-4", showGolden ? "text-[#DAA520]" : "text-[#58CC02]")} />
        )}
      </div>
      <p className={cn(
        "text-xs mt-1",
        isLocked ? "text-muted-foreground/40" : "text-muted-foreground"
      )}>
        {config.description}
      </p>
      
      {stage.totalUnits > 0 && (
        <div className="flex items-center gap-1.5 mt-3">
          {Array.from({ length: Math.min(stage.totalUnits, 6) }).map((_, index) => {
            let dotColor = "bg-muted-foreground/30"; // default: unanswered
            
            if (isLocked) {
              dotColor = "bg-muted-foreground/20";
            } else if (stage.type === 'responda' && stage.questionResults && stage.questionResults[index]) {
              const result = stage.questionResults[index];
              if (result === 'correct') {
                dotColor = "bg-[#58CC02]"; // green for correct
              } else if (result === 'incorrect') {
                dotColor = "bg-[#FF4B4B]"; // red for incorrect
              }
              // unanswered stays gray (default)
            } else if (index < stage.completedUnits) {
              dotColor = "bg-[#58CC02]"; // green for other stages completed
            }
            
            return (
              <div
                key={index}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-colors",
                  dotColor
                )}
              />
            );
          })}
          <span className={cn(
            "text-xs font-medium ml-1",
            isLocked ? "text-muted-foreground/40" : "text-muted-foreground"
          )}>
            {isLocked ? "0" : stage.completedUnits}/{stage.totalUnits}
          </span>
        </div>
      )}
    </motion.button>
  );
}

function LessonRow({ 
  lessonNumber, 
  title,
  status,
  isMastered = false
}: { 
  lessonNumber: number;
  title: string;
  status: LessonStatus;
  isMastered?: boolean;
}) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isCurrent = status === "current";
  const showGolden = isCompleted && isMastered;
  
  const colors = isLocked 
    ? { bg: "#E5E5E5", shadow: "#CECECE", inner: "#F0F0F0" }
    : showGolden
      ? { bg: "#FFD700", shadow: "#DAA520", inner: "#FFE55C" }
      : { bg: "#FFC800", shadow: "#E5A800", inner: "#FFD84D" };

  return (
    <div className="flex items-center gap-5" style={{ height: 88 }}>
      <div 
        className="flex-shrink-0 flex justify-center items-center relative"
        style={{ width: RAIL_WIDTH, height: 56 }}
      >
        <motion.div
          className="relative z-10 flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            backgroundColor: colors.bg,
            boxShadow: `0 5px 0 0 ${colors.shadow}`
          }}
          data-testid={`lesson-number-icon-${lessonNumber}`}
        >
          <div 
            className="absolute inset-[4px] rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(180deg, ${colors.inner} 0%, ${colors.bg} 100%)`
            }}
          >
            {isLocked ? (
              <Lock className="h-6 w-6 text-muted-foreground/50" />
            ) : showGolden ? (
              <Star className="h-6 w-6 text-white fill-white" />
            ) : (
              <span className="text-white font-bold text-lg">{lessonNumber}</span>
            )}
          </div>
          
          {isCurrent && (
            <motion.div
              animate={{ 
                scale: [1, 1.12, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-2xl border-[3px] border-white/70"
            />
          )}
        </motion.div>
      </div>
      
      <motion.div
        whileHover={!isLocked ? { scale: 1.01 } : undefined}
        whileTap={!isLocked ? { scale: 0.99 } : undefined}
        className={cn(
          "flex-1 text-left px-4 py-3 transition-all min-w-0",
          isLocked && "bg-muted/50 rounded-lg"
        )}
        style={!isLocked ? {
          background: showGolden 
            ? "linear-gradient(90deg, #FFD700 0%, #FFA500 100%)"
            : "linear-gradient(90deg, #FFC800 0%, #FF9500 100%)",
          boxShadow: "0 4px 12px rgba(255, 149, 0, 0.3)",
          borderRadius: "8px"
        } : undefined}
        data-testid={`lesson-card-${lessonNumber}`}
      >
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          isLocked ? "text-muted-foreground/50" : "text-white/70"
        )}>
          Lição {lessonNumber}
        </span>
        <h4 className={cn(
          "font-bold text-base leading-tight mt-1",
          isLocked ? "text-muted-foreground/50" : "text-white"
        )}>
          {title}
        </h4>
      </motion.div>
    </div>
  );
}

function LessonGroup({ 
  lesson, 
  onStageClick,
  isFirstLesson,
  isLastLesson,
  isMastered = false
}: { 
  lesson: LessonItem; 
  onStageClick?: (lessonId: number, stage: StageType) => void;
  isFirstLesson: boolean;
  isLastLesson: boolean;
  isMastered?: boolean;
}) {
  const ICON_SIZE = 56;
  const ROW_HEIGHT = 88;
  const GAP_BETWEEN_ROWS = 32;
  
  const ICON_VERTICAL_OFFSET = (ROW_HEIGHT - ICON_SIZE) / 2;
  const FIRST_ICON_CENTER = ICON_VERTICAL_OFFSET + ICON_SIZE / 2;
  const LAST_ICON_CENTER = (lesson.stages.length - 1) * (ROW_HEIGHT + GAP_BETWEEN_ROWS) + ICON_VERTICAL_OFFSET + ICON_SIZE / 2;
  const LINE_TOP = FIRST_ICON_CENTER + ICON_SIZE / 2;
  const LINE_HEIGHT = LAST_ICON_CENTER - ICON_SIZE / 2 - LINE_TOP;
  
  return (
    <div id={`lesson-${lesson.id}`} className="relative" data-testid={`lesson-group-${lesson.id}`}>
      <div className="mb-5">
        <LessonRow 
          lessonNumber={lesson.lessonNumber}
          title={lesson.subtitle || lesson.title}
          status={lesson.status}
          isMastered={isMastered}
        />
      </div>
      
      <div className="relative">
        {lesson.stages.length > 1 && LINE_HEIGHT > 0 && (
          <div 
            className="absolute w-1 rounded-full bg-gray-300"
            style={{ 
              left: RAIL_WIDTH / 2 - 2,
              top: LINE_TOP,
              height: LINE_HEIGHT,
              zIndex: 0
            }}
          />
        )}
        
        <div className="relative z-10" style={{ display: 'flex', flexDirection: 'column', gap: `${GAP_BETWEEN_ROWS}px` }}>
          {lesson.stages.map((stage) => {
            return (
              <div 
                key={stage.type} 
                className="flex items-center gap-5"
                style={{ height: `${ROW_HEIGHT}px` }}
              >
                <div 
                  className="flex-shrink-0 flex justify-center items-center relative"
                  style={{ width: RAIL_WIDTH, height: ICON_SIZE }}
                >
                  <StageIcon 
                    type={stage.type} 
                    status={stage.status} 
                    onClick={() => onStageClick?.(lesson.id, stage.type)}
                    isMastered={isMastered}
                  />
                </div>
                
                <StageCard
                  stage={stage}
                  onClick={() => onStageClick?.(lesson.id, stage.type)}
                  isMastered={isMastered}
                />
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}

function PracticeRow({ 
  onClick, 
  practiceStatus 
}: { 
  onClick?: () => void;
  practiceStatus?: PracticeStatus;
}) {
  const isLocked = !practiceStatus?.isUnlocked;
  const starsEarned = practiceStatus?.starsEarned || 0;
  const isMastered = practiceStatus?.isMastered || false;
  const lessonsCompleted = practiceStatus?.lessonsCompleted || 0;
  const totalLessons = practiceStatus?.totalLessons || 0;

  const bgColor = isLocked ? "#E5E5E5" : isMastered ? "#FFD700" : "#1CB0F6";
  const shadowColor = isLocked ? "#CECECE" : isMastered ? "#DAA520" : "#1899D6";
  const textColor = isLocked ? "text-muted-foreground/50" : "text-white";

  return (
    <div 
      className="flex items-center gap-4 mt-6"
    >
      <div 
        className="flex-shrink-0 flex justify-center"
        style={{ width: RAIL_WIDTH }}
      >
        <motion.button
          whileHover={!isLocked ? { scale: 1.05 } : undefined}
          whileTap={!isLocked ? { scale: 0.95 } : undefined}
          onClick={!isLocked ? onClick : undefined}
          disabled={isLocked}
          className={cn(
            "relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center",
            !isLocked && "cursor-pointer"
          )}
          style={{ 
            backgroundColor: bgColor,
            boxShadow: `0 5px 0 0 ${shadowColor}` 
          }}
          data-testid="practice-icon"
        >
          {isLocked ? (
            <Lock className="h-6 w-6 text-muted-foreground/50" />
          ) : (
            <Dumbbell className="h-6 w-6 text-white" />
          )}
        </motion.button>
      </div>
      
      <motion.button
        whileHover={!isLocked ? { scale: 1.01 } : undefined}
        whileTap={!isLocked ? { scale: 0.99 } : undefined}
        onClick={!isLocked ? onClick : undefined}
        disabled={isLocked}
        className={cn(
          "flex-1 p-4 rounded-xl text-left",
          isLocked ? "cursor-not-allowed" : "cursor-pointer"
        )}
        style={{ 
          backgroundColor: bgColor,
          boxShadow: `0 5px 0 0 ${shadowColor}` 
        }}
        data-testid="practice-card"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className={cn("font-bold text-base", textColor)}>Pratique</h3>
          <div className="flex gap-1">
            {[1, 2, 3].map((star) => {
              const isEarned = star <= starsEarned;
              return (
                <Star
                  key={star}
                  className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isEarned
                      ? isMastered
                        ? "text-white fill-white drop-shadow-sm"
                        : "text-white fill-white drop-shadow-sm"
                      : isLocked
                        ? "text-muted-foreground/30 fill-transparent"
                        : "text-white/40 fill-transparent"
                  )}
                />
              );
            })}
          </div>
        </div>
        <p className={cn("text-sm mt-0.5", isLocked ? "text-muted-foreground/40" : "text-white/80")}>
          {isLocked 
            ? practiceStatus 
              ? `Complete ${totalLessons - lessonsCompleted} lições para desbloquear`
              : "Complete todas as lições para desbloquear"
            : isMastered 
              ? "Você dominou esta semana!"
              : "Teste seus conhecimentos"
          }
        </p>
      </motion.button>
    </div>
  );
}

export function LearningPath({ 
  lessons, 
  unitTitle,
  onLessonClick, 
  onPracticeClick,
  showPractice = true,
  practiceStatus
}: LearningPathProps) {
  const handleStageClick = (lessonId: number, stage: StageType) => {
    onLessonClick?.(lessonId, stage);
  };

  const ICON_SIZE = 56;
  const UNIT_HEADER_HEIGHT = 64;
  
  return (
    <div className="relative px-4 py-6">
      <div className="max-w-lg mx-auto">
        {unitTitle && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 relative"
            data-testid="unit-title-header"
          >
            <div className="flex items-center gap-5">
              <div 
                className="flex-shrink-0 flex justify-center items-center"
                style={{ width: RAIL_WIDTH, height: ICON_SIZE }}
              >
                <div
                  className="relative z-10 flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(145deg, #6B7280 0%, #4B5563 100%)",
                    boxShadow: "0 5px 0 0 #374151"
                  }}
                >
                  <div 
                    className="absolute inset-[3px] rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(180deg, #9CA3AF 0%, #6B7280 100%)"
                    }}
                  >
                    <FolderOpen className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              
              <div 
                className="flex-1 relative overflow-visible"
                style={{ minHeight: UNIT_HEADER_HEIGHT }}
              >
                <div 
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(135deg, #6B7280 0%, #4B5563 100%)",
                    clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)"
                  }}
                />
                <div 
                  className="absolute top-0 right-0 w-5 h-5"
                  style={{
                    background: "linear-gradient(135deg, transparent 50%, #374151 50%)"
                  }}
                />
                <div className="relative z-10 px-5 py-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                    Unidade
                  </span>
                  <h2 className="text-lg font-bold text-white mt-1">
                    {unitTitle}
                  </h2>
                </div>
              </div>
            </div>
            
            {lessons.length > 0 && (
              <div 
                className="absolute w-1 rounded-full bg-gray-300"
                style={{ 
                  left: RAIL_WIDTH / 2 - 2,
                  top: UNIT_HEADER_HEIGHT - 8,
                  height: 120,
                  zIndex: 0
                }}
              />
            )}
          </motion.div>
        )}
        <div className="relative">
          <div className="space-y-10">
            {lessons.map((lesson, index) => (
              <LessonGroup
                key={lesson.id}
                lesson={lesson}
                onStageClick={handleStageClick}
                isFirstLesson={index === 0}
                isLastLesson={index === lessons.length - 1}
                isMastered={practiceStatus?.isMastered || false}
              />
            ))}
          </div>
        </div>
        
        {showPractice && lessons.length > 0 && (
          <PracticeRow onClick={onPracticeClick} practiceStatus={practiceStatus} />
        )}
      </div>
    </div>
  );
}
