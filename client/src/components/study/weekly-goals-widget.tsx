import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen, 
  BookMarked, 
  ListChecks, 
  Leaf,
  Trophy,
  Flame,
  Sparkles,
  Check
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface GoalItem {
  current: number;
  target: number;
  completed: boolean;
}

interface WeeklyGoalStatus {
  goals: {
    lessons: GoalItem;
    verses: GoalItem;
    missions: GoalItem;
    devotionals: GoalItem;
  };
  overallProgress: number;
  isGoalMet: boolean;
  xpBonus: number;
  daysCompleted?: number;
  totalDays?: number;
}

interface GoalCardProps {
  icon: LucideIcon;
  label: string;
  current: number;
  target: number;
  completed: boolean;
  gradientFrom: string;
  gradientTo: string;
  delay?: number;
}

function GoalCard({ 
  icon: Icon, 
  label, 
  current, 
  target, 
  completed,
  gradientFrom,
  gradientTo,
  delay = 0
}: GoalCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="relative"
    >
      <div 
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
        }}
      >
        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-bold text-white">
              {current}
            </span>
            <span className="text-sm text-white/80">/{target}</span>
          </div>
          <span className="text-xs text-white/80">{label}</span>
        </div>
        {completed && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border border-red-400"
          >
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function WeeklyGoalsWidgetSkeleton() {
  return (
    <Card className="p-4 bg-white dark:bg-card">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-32 h-5" />
        <Skeleton className="w-16 h-5" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </Card>
  );
}

interface WeeklyGoalsWidgetProps {
  compact?: boolean;
  showTitle?: boolean;
}

function NotAuthenticatedPlaceholder() {
  return (
    <Card className="p-4 bg-white dark:bg-card" data-testid="widget-weekly-goals-placeholder">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground">Meta Semanal</h3>
        <span className="text-sm text-muted-foreground">Faca login</span>
      </div>
      <div className="grid grid-cols-2 gap-3 opacity-50">
        <div className="h-16 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
      </div>
    </Card>
  );
}

function ErrorPlaceholder({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="p-4 bg-white dark:bg-card" data-testid="widget-weekly-goals-error">
      <div className="text-center py-4">
        <Flame className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-3">Erro ao carregar metas</p>
        <button 
          onClick={onRetry}
          className="text-sm text-primary hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    </Card>
  );
}

export function WeeklyGoalsWidget({ compact = false, showTitle = true }: WeeklyGoalsWidgetProps) {
  const { isAuthenticated } = useAuth();

  const { data: weeklyGoal, isLoading, isError, refetch } = useQuery<WeeklyGoalStatus>({
    queryKey: ["/api/study/weekly-goal"],
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  if (!isAuthenticated) {
    return <NotAuthenticatedPlaceholder />;
  }

  if (isLoading) {
    return <WeeklyGoalsWidgetSkeleton />;
  }

  if (isError || !weeklyGoal) {
    return <ErrorPlaceholder onRetry={() => refetch()} />;
  }

  const { goals, overallProgress, isGoalMet, xpBonus, daysCompleted = 0, totalDays = 7 } = weeklyGoal;

  const goalItems = [
    {
      key: "lessons",
      icon: BookOpen,
      label: "Lições",
      ...goals.lessons,
      gradientFrom: "#4A90E2",
      gradientTo: "#357ABD",
    },
    {
      key: "verses",
      icon: BookMarked,
      label: "Versículos",
      ...goals.verses,
      gradientFrom: "#9B59B6",
      gradientTo: "#8E44AD",
    },
    {
      key: "missions",
      icon: ListChecks,
      label: "Missões",
      ...goals.missions,
      gradientFrom: "#5DADE2",
      gradientTo: "#3498DB",
    },
    {
      key: "devotionals",
      icon: Leaf,
      label: "Devocionais",
      ...goals.devotionals,
      gradientFrom: "#2ECC71",
      gradientTo: "#27AE60",
    },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium">{Math.round(overallProgress)}%</span>
        </div>
        <div className="flex gap-1">
          {goalItems.map((item) => (
            <div
              key={item.key}
              className={cn(
                "w-2 h-2 rounded-full",
                item.completed ? "bg-green-500" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="widget-weekly-goals">
      <Card className="p-4 bg-white dark:bg-card shadow-sm">
        {showTitle && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground text-base">Meta Semanal</h3>
            <span className="text-sm font-medium text-blue-500">{daysCompleted}/{totalDays} dias</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {goalItems.map((item, index) => (
            <GoalCard
              key={item.key}
              icon={item.icon}
              label={item.label}
              current={item.current}
              target={item.target}
              completed={item.completed}
              gradientFrom={item.gradientFrom}
              gradientTo={item.gradientTo}
              delay={index * 0.1}
            />
          ))}
        </div>

        <AnimatePresence>
          {isGoalMet && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center pt-4"
            >
              <p className="text-sm font-medium text-green-500 flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4" />
                Meta semanal completa! +{xpBonus} XP
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <div 
        className="p-4 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-white">Progresso Semanal</span>
          <span className="font-bold text-white text-lg">{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #A78BFA 0%, #F472B6 100%)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(overallProgress, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
