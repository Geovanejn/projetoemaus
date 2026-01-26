import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Star, MessageSquare, Presentation, Lock, Dumbbell } from "lucide-react";

export type UnitStatus = "completed" | "current" | "locked";

interface UnitCardProps {
  id: number;
  title: string;
  subtitle: string;
  status: UnitStatus;
  progress: number;
  totalLessons: number;
  icon?: "star" | "message" | "presentation" | "dumbbell";
  iconColor?: string;
  onClick?: () => void;
}

const iconMap = {
  star: Star,
  message: MessageSquare,
  presentation: Presentation,
  dumbbell: Dumbbell,
};

const iconColors = {
  star: "#FFC800",
  message: "#58CC02",
  presentation: "#AFAFAF",
  dumbbell: "#1CB0F6",
};

const bgColors = {
  star: "bg-[#FFC800]",
  message: "bg-[#58CC02]",
  presentation: "bg-[#E5E5E5]",
  dumbbell: "bg-[#1CB0F6]",
};

function ProgressDots({ current, total, isLocked }: { current: number; total: number; isLocked: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "w-2.5 h-2.5 rounded-full transition-colors",
            isLocked
              ? "bg-muted-foreground/20"
              : index < current
              ? "bg-[#58CC02]"
              : "bg-muted-foreground/30"
          )}
        />
      ))}
      <span className={cn(
        "text-xs font-bold ml-1.5",
        isLocked ? "text-muted-foreground/40" : "text-muted-foreground"
      )}>
        {isLocked ? "0" : current}/{total}
      </span>
    </div>
  );
}

export function UnitCard({
  id,
  title,
  subtitle,
  status,
  progress,
  totalLessons,
  icon = "star",
  onClick,
}: UnitCardProps) {
  const Icon = iconMap[icon];
  const isLocked = status === "locked";
  const isCurrent = status === "current";
  const isCompleted = status === "completed";

  return (
    <motion.button
      whileHover={!isLocked ? { scale: 1.01 } : undefined}
      whileTap={!isLocked ? { scale: 0.99 } : undefined}
      onClick={!isLocked ? onClick : undefined}
      disabled={isLocked}
      className={cn(
        "relative w-full flex items-center gap-4 p-4 rounded-2xl transition-all",
        "bg-card border-2",
        isCurrent && "border-[#58CC02] shadow-md",
        isCompleted && "border-border",
        isLocked && "border-transparent bg-transparent cursor-not-allowed"
      )}
      data-testid={`unit-card-${id}`}
    >
      <div
        className={cn(
          "relative flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center",
          isLocked ? "bg-muted" : bgColors[icon]
        )}
        style={{
          boxShadow: isLocked ? "0 4px 0 0 #CECECE" : `0 4px 0 0 ${iconColors[icon]}99`
        }}
      >
        {isLocked ? (
          <Lock className="h-6 w-6 text-muted-foreground/50" />
        ) : (
          <Icon className="h-6 w-6 text-white" />
        )}
      </div>

      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <h3 className={cn(
            "font-bold text-base",
            isLocked ? "text-muted-foreground/50" : "text-foreground"
          )}>
            {title}
          </h3>
          {isCurrent && (
            <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-[#58CC02] rounded-full uppercase">
              Atual
            </span>
          )}
        </div>
        <p className={cn(
          "text-sm mt-0.5",
          isLocked ? "text-muted-foreground/40" : "text-muted-foreground"
        )}>
          {subtitle}
        </p>
        <div className="mt-2">
          <ProgressDots 
            current={progress} 
            total={totalLessons} 
            isLocked={isLocked} 
          />
        </div>
      </div>
    </motion.button>
  );
}

interface PracticeCardProps {
  onClick?: () => void;
}

export function PracticeCard({ onClick }: PracticeCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#1CB0F6] text-white"
      style={{
        boxShadow: "0 4px 0 0 #1899D6"
      }}
      data-testid="practice-card"
    >
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
        <Dumbbell className="h-6 w-6 text-white" />
      </div>

      <div className="flex-1 text-left">
        <h3 className="font-bold text-base">Prática</h3>
        <p className="text-sm text-white/80">Revise suas lições</p>
      </div>
    </motion.button>
  );
}
