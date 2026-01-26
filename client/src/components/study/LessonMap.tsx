import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LessonNode, LessonStatus, LessonType } from "./LessonNode";
import { SectionHeader } from "./SectionHeader";
import { Sparkles, Gift } from "lucide-react";

interface Lesson {
  id: number;
  title: string;
  type: LessonType;
  status: LessonStatus;
  xpReward: number;
  isBonus?: boolean;
}

interface LessonMapProps {
  weekTitle: string;
  weekNumber: number;
  sectionNumber?: number;
  unitNumber?: number;
  lessons: Lesson[];
  onLessonClick?: (lessonId: number) => void;
  className?: string;
}

function getPosition(index: number): "left" | "center" | "right" {
  const pattern: ("left" | "center" | "right")[] = ["center", "right", "center", "left"];
  return pattern[index % pattern.length];
}

function PathConnector({ 
  fromPos, 
  toPos, 
  isCompleted,
  isNext
}: { 
  fromPos: "left" | "center" | "right";
  toPos: "left" | "center" | "right";
  isCompleted: boolean;
  isNext?: boolean;
}) {
  const getX = (pos: string) => {
    switch (pos) {
      case "left": return 92;
      case "right": return 188;
      default: return 140;
    }
  };

  const fromX = getX(fromPos);
  const toX = getX(toPos);
  
  const controlPoint1X = fromX;
  const controlPoint2X = toX;

  const pathD = `M ${fromX} 0 C ${controlPoint1X} 40, ${controlPoint2X} 50, ${toX} 90`;

  const completedColor = "#58CC02";
  const completedShadow = "#46A302";
  const pendingColor = "#E5E5E5";
  const pendingShadow = "#CECECE";

  return (
    <svg 
      className="absolute left-0 right-0 mx-auto w-[280px] h-[90px] -mt-1 -mb-1 z-0"
      viewBox="0 0 280 90"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="pathShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="1" floodOpacity="0.3"/>
        </filter>
      </defs>
      
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        d={pathD}
        fill="none"
        stroke={isCompleted || isNext ? completedShadow : pendingShadow}
        strokeWidth="14"
        strokeLinecap="round"
        style={{ transform: 'translateY(3px)' }}
      />
      
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        d={pathD}
        fill="none"
        stroke={isCompleted || isNext ? completedColor : pendingColor}
        strokeWidth="12"
        strokeLinecap="round"
      />
      
      {(isCompleted || isNext) && (
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          d={pathD}
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function TreasureChest({ isUnlocked }: { isUnlocked: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex flex-col items-center my-6"
    >
      <motion.div
        whileHover={isUnlocked ? { scale: 1.1, y: -4 } : undefined}
        className={cn(
          "relative w-20 h-20 rounded-2xl flex items-center justify-center",
          isUnlocked 
            ? "bg-gradient-to-br from-[#FFD700] to-[#FFA500] shadow-[0_6px_0_0_#CC8400]"
            : "bg-[#E5E5E5] shadow-[0_6px_0_0_#CECECE]"
        )}
      >
        <div className={cn(
          "absolute inset-[4px] rounded-xl flex items-center justify-center",
          isUnlocked 
            ? "bg-gradient-to-b from-[#FFE55C] to-[#FFD700]"
            : "bg-[#F0F0F0]"
        )}>
          <Gift className={cn(
            "h-10 w-10",
            isUnlocked ? "text-[#8B6914]" : "text-[#AFAFAF]"
          )} />
        </div>
        
        {isUnlocked && (
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-2 -right-2"
          >
            <Sparkles className="h-6 w-6 text-[#FFD700]" />
          </motion.div>
        )}
      </motion.div>
      
      <p className={cn(
        "mt-2 text-xs font-bold",
        isUnlocked ? "text-[#CC8400]" : "text-muted-foreground/50"
      )}>
        {isUnlocked ? "Recompensa!" : "Complete todas"}
      </p>
    </motion.div>
  );
}

export function LessonMap({
  weekTitle,
  weekNumber,
  sectionNumber = 1,
  unitNumber = 1,
  lessons,
  onLessonClick,
  className
}: LessonMapProps) {
  const allCompleted = lessons.every(l => l.status === "completed");
  const activeIndex = lessons.findIndex(l => l.status === "available" || l.status === "in_progress");
  
  return (
    <div className={cn("flex flex-col items-center", className)} data-testid="lesson-map">
      <SectionHeader 
        sectionNumber={sectionNumber}
        unitNumber={unitNumber}
        title={weekTitle}
      />

      <div className="relative flex flex-col items-center gap-4 w-full max-w-[280px]">
        {lessons.map((lesson, index) => {
          const currentPos = getPosition(index);
          const nextPos = index < lessons.length - 1 ? getPosition(index + 1) : currentPos;
          const isCompleted = lesson.status === "completed";
          const isNextLesson = index < lessons.length - 1 && 
            lessons[index].status === "completed" && 
            (lessons[index + 1].status === "available" || lessons[index + 1].status === "in_progress");
          const isActiveLesson = lesson.status === "available" || lesson.status === "in_progress";
          
          return (
            <motion.div 
              key={lesson.id} 
              className="relative flex flex-col items-center w-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
            >
              <LessonNode
                id={lesson.id}
                title={lesson.title}
                type={lesson.type}
                status={lesson.status}
                xpReward={lesson.xpReward}
                isBonus={lesson.isBonus}
                position={currentPos}
                onClick={() => onLessonClick?.(lesson.id)}
                isLast={index === lessons.length - 1}
                showStartButton={isActiveLesson && activeIndex === index}
              />
              
              {index < lessons.length - 1 && (
                <PathConnector 
                  fromPos={currentPos}
                  toPos={nextPos}
                  isCompleted={isCompleted}
                  isNext={isNextLesson}
                />
              )}
            </motion.div>
          );
        })}
        
        <TreasureChest isUnlocked={allCompleted} />
      </div>
    </div>
  );
}
