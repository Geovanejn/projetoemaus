import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Clock, Flame, BookOpen, Target, Gift, Check } from "lucide-react";

interface Mission {
  id: string;
  title: string;
  current: number;
  target: number;
  icon: "streak" | "lesson" | "perfect" | "gift";
  isCompleted: boolean;
}

interface DailyMissionsProps {
  missions: Mission[];
  hoursRemaining: number;
  className?: string;
}

const missionIcons = {
  streak: Flame,
  lesson: BookOpen,
  perfect: Target,
  gift: Gift
};

const missionColors = {
  streak: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    icon: "text-orange-500",
    progress: "from-orange-400 to-orange-500"
  },
  lesson: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    icon: "text-blue-500",
    progress: "from-blue-400 to-blue-500"
  },
  perfect: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    icon: "text-purple-500",
    progress: "from-purple-400 to-purple-500"
  },
  gift: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    icon: "text-amber-500",
    progress: "from-amber-400 to-amber-500"
  }
};

function MissionCard({ mission }: { mission: Mission }) {
  const Icon = missionIcons[mission.icon];
  const colors = missionColors[mission.icon];
  const progress = (mission.current / mission.target) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "relative overflow-hidden rounded-xl p-4",
        "bg-card border border-border",
        mission.isCompleted && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      )}
      data-testid={`mission-${mission.id}`}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-xl",
          mission.isCompleted ? "bg-green-100 dark:bg-green-900/30" : colors.bg
        )}>
          {mission.isCompleted ? (
            <Check className="h-6 w-6 text-green-500" />
          ) : (
            <Icon className={cn("h-6 w-6", colors.icon)} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-bold text-sm mb-2",
            mission.isCompleted ? "text-green-600 dark:text-green-400" : "text-foreground"
          )}>
            {mission.title}
          </p>
          
          <div className="relative h-6 bg-muted/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, progress)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                mission.isCompleted 
                  ? "bg-gradient-to-r from-green-400 to-green-500"
                  : `bg-gradient-to-r ${colors.progress}`
              )}
            />
            <span className={cn(
              "absolute inset-0 flex items-center justify-center",
              "text-xs font-bold",
              progress > 50 ? "text-white" : "text-muted-foreground"
            )}>
              {mission.current} / {mission.target}
            </span>
          </div>
        </div>
        
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          mission.isCompleted 
            ? "bg-gradient-to-br from-amber-300 to-amber-500"
            : "bg-muted"
        )}>
          <Gift className={cn(
            "h-6 w-6",
            mission.isCompleted ? "text-white" : "text-muted-foreground/50"
          )} />
        </div>
      </div>
    </motion.div>
  );
}

export function DailyMissions({ missions, hoursRemaining, className }: DailyMissionsProps) {
  return (
    <div className={cn("space-y-4", className)} data-testid="daily-missions">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-foreground">Missoes do dia</h2>
        <div className="flex items-center gap-1.5 text-[#FFA500]">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-bold">{hoursRemaining} HORAS</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {missions.map((mission, index) => (
          <motion.div
            key={mission.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <MissionCard mission={mission} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
