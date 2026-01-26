import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { 
  BookOpen, 
  BookMarked, 
  Timer, 
  Zap, 
  User, 
  Target, 
  Brain, 
  Heart, 
  Lightbulb, 
  Flame,
  ChevronLeft,
  Check,
  Gift,
  Star,
  AlertCircle,
  Loader2,
  ArrowRight,
  Gem
} from "lucide-react";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  BookMarked,
  Timer,
  Zap,
  User,
  Target,
  Brain,
  Heart,
  Lightbulb,
  Flame,
};

const missionColors: Record<string, { bg: string; shadow: string }> = {
  "palavra_do_dia": { bg: "#5B6EE1", shadow: "#4A5BC0" },
  "mantenha_foco": { bg: "#2ECC71", shadow: "#27AE60" },
  "perfeicao": { bg: "#9B59B6", shadow: "#8E44AD" },
  "curiosidade": { bg: "#1ABC9C", shadow: "#16A085" },
  "memorize": { bg: "#E91E63", shadow: "#C2185B" },
  "default": { bg: "#5B6EE1", shadow: "#4A5BC0" },
};

function getMissionColor(missionType: string, index: number) {
  const colorKeys = Object.keys(missionColors).filter(k => k !== "default");
  const colorKey = colorKeys[index % colorKeys.length];
  return missionColors[colorKey] || missionColors.default;
}

interface Mission {
  id: number;
  missionId: number;
  completed: boolean;
  completedAt: string | null;
  xpAwarded: number;
  progress?: number;
  mission: {
    id: number;
    type: string;
    title: string;
    description: string;
    icon: string;
    xpReward: number;
    targetValue?: number;
  };
}

interface DailyMissionsData {
  missions: Mission[];
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
  bonusXpAvailable: number;
  date: string;
}

function MissionCard({ 
  mission,
  index,
  onClick
}: { 
  mission: Mission;
  index: number;
  onClick: () => void;
}) {
  const IconComponent = iconMap[mission.mission.icon] || Star;
  const isCompleted = mission.completed;
  const colors = getMissionColor(mission.mission.type, index);
  const progress = mission.progress || 0;
  const targetValue = mission.mission.targetValue || 1;
  const progressPercent = isCompleted ? 100 : Math.min((progress / targetValue) * 100, 100);
  const progressText = targetValue > 1 ? `${progress}/${targetValue}` : `${Math.round(progressPercent)}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      data-testid={`mission-item-${mission.id}`}
    >
      <div 
        className="bg-white dark:bg-card rounded-2xl overflow-hidden"
        style={{ 
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
        data-testid={`mission-card-${mission.id}`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ 
                backgroundColor: isCompleted ? "#2ECC71" : colors.bg,
                boxShadow: `0 3px 0 0 ${isCompleted ? "#27AE60" : colors.shadow}`
              }}
              data-testid={`mission-icon-${mission.id}`}
            >
              {isCompleted ? (
                <Check className="w-6 h-6 text-white" />
              ) : (
                <IconComponent className="w-6 h-6 text-white" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 
                className="font-bold text-foreground text-base"
                data-testid={`mission-title-${mission.id}`}
              >
                {mission.mission.title}
              </h3>
              <p 
                className="text-sm text-muted-foreground mt-0.5"
                data-testid={`mission-description-${mission.id}`}
              >
                {mission.mission.description}
              </p>
            </div>

            <div 
              className="px-2.5 py-1 rounded-md text-sm font-bold flex-shrink-0"
              style={{ 
                backgroundColor: isCompleted ? "#E8F5E9" : "#E8F5E9",
                color: "#2ECC71"
              }}
              data-testid={`mission-xp-${mission.id}`}
            >
              +{mission.mission.xpReward} XP
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end">
            <span className="text-sm text-muted-foreground">{progressText}</span>
          </div>

          <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: isCompleted ? "#2ECC71" : colors.bg }}
            />
          </div>
        </div>

        <button
          onClick={onClick}
          className="w-full px-4 py-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 group"
          disabled={isCompleted}
          data-testid={`button-start-mission-${mission.id}`}
        >
          <span 
            className="font-semibold text-sm"
            style={{ color: isCompleted ? "#2ECC71" : "#5B6EE1" }}
          >
            {isCompleted ? "Missão concluída" : "Iniciar missão"}
          </span>
          {!isCompleted && (
            <ArrowRight 
              className="w-5 h-5 transition-transform group-hover:translate-x-1"
              style={{ color: "#5B6EE1" }}
            />
          )}
          {isCompleted && (
            <Check className="w-5 h-5 text-[#2ECC71]" />
          )}
        </button>
      </div>
    </motion.div>
  );
}

function RewardModal({ 
  isOpen, 
  onClose, 
  bonusXp 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  bonusXp: number;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={onClose}
          data-testid="reward-modal-overlay"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-card rounded-2xl p-8 mx-4 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
            data-testid="reward-modal"
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 0.5, repeat: 2 }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#FFC800] to-[#FF9600] flex items-center justify-center"
              style={{ boxShadow: "0 6px 0 0 #E68A00" }}
            >
              <Gift className="w-10 h-10 text-white" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="reward-modal-title">
              Parabéns!
            </h2>
            <p className="text-muted-foreground mb-4" data-testid="reward-modal-message">
              Você completou todas as missões de hoje!
            </p>
            
            <div className="bg-[#58CC02]/10 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2">
                <Star className="w-6 h-6 text-[#FFC800]" />
                <span className="text-2xl font-bold text-[#58CC02]" data-testid="reward-modal-xp">+{bonusXp} XP</span>
                <Star className="w-6 h-6 text-[#FFC800]" />
              </div>
              <p className="text-sm text-[#58CC02] mt-1">Bônus de conclusão!</p>
            </div>
            
            <Button 
              onClick={onClose}
              className="w-full bg-[#58CC02] text-white"
              data-testid="button-close-reward-modal"
            >
              Continuar
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function MissionsPage() {
  const [, setLocation] = useLocation();

  const { data, isLoading, isError, refetch } = useQuery<DailyMissionsData>({
    queryKey: ["/api/missions/daily"],
  });

  const handleMissionClick = (mission: Mission) => {
    if (mission.completed) return;
    setLocation(`/study/missions/${mission.missionId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background" data-testid="loading-state">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#5B6EE1]" />
          <span className="text-muted-foreground">Carregando missões...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background" data-testid="error-state">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h3 className="font-bold text-lg text-foreground mb-2">
          Erro ao carregar missões
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Não foi possível carregar as missões. Tente novamente.
        </p>
        <Button onClick={() => refetch()} data-testid="button-retry">
          Tentar novamente
        </Button>
      </div>
    );
  }

  const missions = data?.missions || [];
  const completedCount = data?.completedCount || 0;
  const totalCount = data?.totalCount || 0;

  return (
    <div className="min-h-screen bg-background" data-testid="missions-page">
      <div 
        className="pt-4 pb-6 px-4"
        style={{
          background: "linear-gradient(180deg, #5B6EE1 0%, #4A5BC0 100%)",
        }}
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/study")}
              className="text-white hover:bg-white/20"
              data-testid="button-back"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white" data-testid="page-title">
                Missões Diárias
              </h1>
              <p className="text-white/80 text-sm mt-1">
                Continue sua jornada espiritual
              </p>
            </div>
            
            <div 
              className="bg-white rounded-xl px-4 py-2 text-center flex-shrink-0"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
              data-testid="missions-counter"
            >
              <div className="text-xl font-bold text-[#5B6EE1]">
                {completedCount}/{totalCount}
              </div>
              <div className="text-xs text-muted-foreground">Completas</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-3 pb-8">
        <div className="max-w-lg mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-card rounded-xl p-4 flex items-center gap-3"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            data-testid="bonus-card"
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#FFF3CD" }}
            >
              <Gem className="w-5 h-5 text-[#F4C430]" />
            </div>
            <p className="text-sm text-foreground">
              <span className="font-bold text-[#F4C430]">+25 XP bonus</span>
              {" "}ao completar todas!
            </p>
          </motion.div>

          <div className="space-y-4" data-testid="missions-list">
            {missions.map((mission, index) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                index={index}
                onClick={() => handleMissionClick(mission)}
              />
            ))}
          </div>

          {missions.length === 0 && (
            <div className="text-center py-12" data-testid="empty-state">
              <Flame className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-bold text-lg text-muted-foreground mb-2">
                Sem missões disponíveis
              </h3>
              <p className="text-sm text-muted-foreground">
                As missões serão atualizadas em breve!
              </p>
            </div>
          )}

          {data?.allCompleted && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 text-center"
              data-testid="all-completed-message"
            >
              <div 
                className="bg-white dark:bg-card rounded-2xl p-6"
                style={{ 
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  border: "2px solid #2ECC71"
                }}
              >
                <div 
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: "#E8F5E9" }}
                >
                  <Check className="w-8 h-8 text-[#2ECC71]" />
                </div>
                <h3 className="font-bold text-lg text-[#2ECC71] mb-2">
                  Todas as missões concluídas!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Parabéns! Você completou todas as missões de hoje e ganhou +25 XP bônus!
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
