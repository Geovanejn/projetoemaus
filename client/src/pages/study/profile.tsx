import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/study";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CollectibleCard } from "@/components/study/CollectibleCard";
import { 
  Trophy, 
  Flame, 
  BookOpen, 
  Settings,
  ChevronLeft,
  Star,
  Medal,
  Crown,
  Heart,
  Calendar,
  CheckCircle,
  Loader2,
  Lock,
  Sparkles
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StudyProfile {
  id: number;
  userId: number;
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  hearts: number;
  heartsMax: number;
  heartsRefillAt: string | null;
  lastActivityDate: string | null;
  dailyGoalMinutes: number;
  timezone: string;
  crystals: number;
}

interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: string;
  requirement: any;
  isSecret: boolean;
  unlocked: boolean;
  unlockedAt: string | null;
}

interface RecentActivity {
  type: "lesson_completed" | "achievement_unlocked";
  title: string;
  xpEarned?: number;
  perfectScore?: boolean;
  icon?: string;
  date: string | null;
}

const iconMap: Record<string, LucideIcon> = {
  flame: Flame,
  book: BookOpen,
  "book-open": BookOpen,
  trophy: Trophy,
  crown: Crown,
  star: Star,
  medal: Medal,
  calendar: Calendar,
  heart: Heart,
  "check-circle": CheckCircle,
};

function getIconComponent(iconName: string) {
  return iconMap[iconName.toLowerCase()] || Star;
}

function getLevelTitle(level: number): { title: string; nextLevel: number } {
  const levelTitles = [
    { minLevel: 1, title: "Iniciante na Fé", nextLevel: 5 },
    { minLevel: 5, title: "Aprendiz das Escrituras", nextLevel: 10 },
    { minLevel: 10, title: "Estudante Dedicado", nextLevel: 20 },
    { minLevel: 20, title: "Discípulo Fiel", nextLevel: 40 },
    { minLevel: 40, title: "Mestre dos Estudos", nextLevel: 60 },
    { minLevel: 60, title: "Sábio Bíblico", nextLevel: 80 },
    { minLevel: 80, title: "Guardião da Palavra", nextLevel: 100 },
    { minLevel: 100, title: "Supremo Conhecedor das Escrituras", nextLevel: 999 },
  ];
  
  for (let i = levelTitles.length - 1; i >= 0; i--) {
    if (level >= levelTitles[i].minLevel) {
      return { title: levelTitles[i].title, nextLevel: levelTitles[i].nextLevel };
    }
  }
  return { title: "Iniciante na Fé", nextLevel: 5 };
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando perfil...</p>
      </div>
    </div>
  );
}

interface LeaderboardResponse {
  periodType: string;
  periodKey: string;
  entries: Array<{
    rank: number;
    userId: number;
    username: string;
    photoUrl: string | null;
    totalXp: number;
    level: number;
    currentStreak: number;
    dailyXp?: number;
    isCurrentUser?: boolean;
  }>;
}

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery<StudyProfile>({
    queryKey: ['/api/study/profile'],
    enabled: isAuthenticated,
  });

  const { data: leaderboardData } = useQuery<LeaderboardResponse>({
    queryKey: ["/api/study/leaderboard", { period: "weekly" }],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/study/leaderboard?period=weekly", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Erro ao carregar XP");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: achievements, isLoading: achievementsLoading } = useQuery<Achievement[]>({
    queryKey: ['/api/study/achievements'],
    enabled: isAuthenticated,
  });

  interface UserStats {
    lessonsCompleted: number;
    achievementsEarned: number;
    studyDays: number;
    rankingPosition: number | null;
    firstActivityDate: string | null;
  }

  const { data: userStats } = useQuery<UserStats>({
    queryKey: ['/api/study/profile/stats'],
    enabled: isAuthenticated,
  });

  const { data: recentActivities = [] } = useQuery<RecentActivity[]>({
    queryKey: ['/api/study/profile/activities'],
    enabled: isAuthenticated,
  });

  interface UserCardData {
    id: number;
    cardId: number;
    rarity: string;
    earnedAt: string;
    performance: number | null;
    card: {
      id: number;
      name: string;
      description: string | null;
      imageUrl: string | null;
      sourceType: string;
      sourceId: number;
    };
    source?: {
      type: string;
      name: string;
    };
  }

  const { data: userCards = [] } = useQuery<UserCardData[]>({
    queryKey: ['/api/study/cards'],
    enabled: isAuthenticated,
  });

  if (profileLoading || achievementsLoading) {
    return <LoadingState />;
  }

  // Progressive XP system with increasing difficulty
  // Levels 1-5: 500 XP per level
  // Levels 6-10: 750 XP per level
  // Levels 11-20: 1000 XP per level
  // Levels 21-30: 1500 XP per level
  // Levels 31+: 2000 XP per level
  const getXpPerLevel = (level: number): number => {
    if (level <= 5) return 500;
    if (level <= 10) return 750;
    if (level <= 20) return 1000;
    if (level <= 30) return 1500;
    return 2000;
  };

  // Calculate total XP needed to reach a specific level
  const getXpForLevel = (targetLevel: number): number => {
    let totalXp = 0;
    for (let lvl = 1; lvl < targetLevel; lvl++) {
      totalXp += getXpPerLevel(lvl);
    }
    return totalXp;
  };

  // Calculate level from total XP
  const calculateLevelFromXp = (totalXp: number): number => {
    let level = 1;
    let xpAccumulated = 0;
    while (xpAccumulated + getXpPerLevel(level) <= totalXp) {
      xpAccumulated += getXpPerLevel(level);
      level++;
    }
    return level;
  };

  // Use profile data as the source of truth
  const currentXp = profile?.totalXp || 0;
  const currentLevel = profile?.currentLevel || calculateLevelFromXp(currentXp);
  
  // Calculate thresholds for current and next level
  const xpForCurrentLevel = getXpForLevel(currentLevel);
  const xpForNextLevel = getXpForLevel(currentLevel + 1);
  const xpRequiredThisLevel = xpForNextLevel - xpForCurrentLevel;
  
  // XP progress within current level
  const xpInLevel = currentXp - xpForCurrentLevel;
  const xpNeeded = xpRequiredThisLevel;
  const xpRemaining = Math.max(0, xpForNextLevel - currentXp);
  
  // Calculate progress percentage within current level
  const progressPercent = xpNeeded > 0 
    ? Math.max(0, Math.min((xpInLevel / xpNeeded) * 100, 100))
    : 0;

  const categoryColorMap: Record<string, { bgColor: string }> = {
    streak: { bgColor: "#F97316" },
    lessons: { bgColor: "#22C55E" },
    xp: { bgColor: "#FFC800" },
    special: { bgColor: "#1CB0F6" },
  };

  const displayAchievements = (achievements || []).slice(0, 6);
  const unlockedCount = (achievements || []).filter(a => a.unlocked).length;

  const hasRecentActivities = recentActivities.length > 0;

  const formatActivityDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atras`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const lessonsCompleted = userStats?.lessonsCompleted ?? 0;
  const achievementsEarned = userStats?.achievementsEarned ?? 0;
  const studyDays = userStats?.studyDays ?? 0;
  const rankingPosition = userStats?.rankingPosition;
  const firstActivityDate = userStats?.firstActivityDate;

  return (
    <div className="min-h-screen bg-background pb-24" data-testid="profile-page">
      <div 
        className="relative pt-4 pb-6"
        style={{
          background: 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)'
        }}
      >
        <div className="flex items-center justify-between px-4 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/90"
            onClick={() => setLocation("/study")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold text-white">Perfil</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/90"
            onClick={() => setLocation("/study/settings")}
            data-testid="button-settings-top"
          >
            <Settings className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative mb-3"
          >
            <Avatar className="h-24 w-24 ring-4 ring-white/30">
              <AvatarImage src={user?.photoUrl || ""} />
              <AvatarFallback 
                className="text-3xl font-bold bg-gradient-to-br from-purple-400 to-purple-600 text-white"
              >
                {user?.fullName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div 
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#FFC800" }}
            >
              <Crown className="h-4 w-4 text-white" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-4"
          >
            <h2 className="text-xl font-bold text-white" data-testid="text-user-name">
              {user?.fullName || "Usuario"}
            </h2>
            <p className="text-white/70 text-sm">
              {getLevelTitle(currentLevel).title}
            </p>
            <Badge 
              className="mt-1 text-xs bg-white/20 text-white border-0"
            >
              Nível {currentLevel}
            </Badge>
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-6"
          >
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Flame className="h-5 w-5 text-orange-400" />
                <span className="text-lg font-bold text-white">{profile?.currentStreak || 12}</span>
              </div>
              <span className="text-xs text-white/70">Ofensiva</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 text-yellow-400" />
                <span className="text-lg font-bold text-white">{currentLevel}</span>
              </div>
              <span className="text-xs text-white/70">Nível</span>
            </div>
            <div className="flex flex-col items-center" data-testid="profile-crystals">
              <div className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <defs>
                    <linearGradient id="crystalGradProfile" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#A855F7" />
                      <stop offset="50%" stopColor="#7C3AED" />
                      <stop offset="100%" stopColor="#6D28D9" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="12,2 22,8 22,16 12,22 2,16 2,8"
                    fill="url(#crystalGradProfile)"
                    stroke="#8B5CF6"
                    strokeWidth="0.5"
                  />
                  <polygon
                    points="12,2 17,5 17,11 12,14 7,11 7,5"
                    fill="rgba(255,255,255,0.3)"
                  />
                </svg>
                <span className="text-lg font-bold text-white">{profile?.crystals || 0}</span>
              </div>
              <span className="text-xs text-white/70">Cristais</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Trophy className="h-5 w-5 text-blue-400" />
                <span className="text-lg font-bold text-white">{rankingPosition !== null ? rankingPosition : "-"}</span>
              </div>
              <span className="text-xs text-white/70">Posicao</span>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground">Progresso do Nível</h3>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: "#8B5CF6" }}>Nível {currentLevel + 1}</p>
                <p className="text-xs text-muted-foreground" data-testid="text-xp-progress">
                  {currentXp.toLocaleString('pt-BR')} / {xpForNextLevel.toLocaleString('pt-BR')} XP
                </p>
              </div>
            </div>
            <Progress 
              value={progressPercent} 
              className="h-3 mb-3"
              style={{ 
                background: "#E5E7EB"
              }}
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">Faltam {xpRemaining.toLocaleString('pt-BR')} XP para o nível {currentLevel + 1}</p>
              <Badge 
                className="text-xs font-medium px-2 py-1"
                style={{ 
                  backgroundColor: "#FEF3C7",
                  color: "#D97706",
                  border: "none"
                }}
              >
                <Heart className="h-3 w-3 mr-1" style={{ color: "#EF4444" }} />
                Premio: +1 Vida
              </Badge>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-2 gap-3"
        >
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#FEF3C7" }}
              >
                <Flame className="h-5 w-5" style={{ color: "#F97316" }} />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Ofensiva Atual</span>
            </div>
            <p className="text-2xl font-black text-foreground">{profile?.currentStreak || 0} dias</p>
            <p className="text-xs text-muted-foreground">Maior: {profile?.longestStreak || 0} dias</p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#FEF3C7" }}
              >
                <Calendar className="h-5 w-5" style={{ color: "#F59E0B" }} />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Dias Totais</span>
            </div>
            <p className="text-2xl font-black text-foreground">{studyDays}</p>
            <p className="text-xs text-muted-foreground">
              {firstActivityDate 
                ? `Desde ${new Date(firstActivityDate).toLocaleDateString('pt-BR', { month: 'long' })}`
                : 'Sem atividades'}
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-foreground">Conquistas</h3>
            <Button 
              variant="ghost" 
              className="text-sm px-2"
              style={{ color: "#8B5CF6" }}
              onClick={() => setLocation("/study/achievements")}
              data-testid="button-view-all-achievements"
            >
              Ver todas
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displayAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              const categoryStyle = categoryColorMap[achievement.category] || { bgColor: "#1CB0F6" };
              
              return (
                <div 
                  key={achievement.id}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-xl",
                    achievement.unlocked ? "bg-card" : "bg-muted/30"
                  )}
                  data-testid={`achievement-${achievement.code}`}
                >
                  <div 
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center mb-2 relative"
                    )}
                    style={{ 
                      backgroundColor: achievement.unlocked ? categoryStyle.bgColor : "#E5E7EB"
                    }}
                  >
                    {achievement.unlocked ? (
                      <IconComponent className="h-6 w-6 text-white" />
                    ) : (
                      <>
                        <IconComponent className="h-6 w-6 text-gray-400" />
                        <div 
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: "#9CA3AF" }}
                        >
                          <Lock className="h-3 w-3 text-white" />
                        </div>
                      </>
                    )}
                  </div>
                  <p className={cn(
                    "text-[10px] text-center font-medium",
                    achievement.unlocked ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {achievement.name}
                  </p>
                  {achievement.unlocked ? (
                    <p className="text-[9px] text-muted-foreground">Completa!</p>
                  ) : (
                    <p className="text-[9px] text-muted-foreground">Bloqueado</p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {(() => {
          const eventCards = userCards.filter(c => c.card?.sourceType === 'event');
          const seasonCards = userCards.filter(c => c.card?.sourceType === 'season');
          
          return (
            <>
              {eventCards.length > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.42 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-orange-500" />
                      Cards de Eventos
                    </h3>
                    <Button 
                      variant="ghost" 
                      className="text-sm px-2"
                      style={{ color: "#8B5CF6" }}
                      onClick={() => setLocation("/study/cards")}
                      data-testid="button-view-event-cards"
                    >
                      Ver todos
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 justify-items-center">
                    {eventCards.slice(0, 3).map((userCard) => (
                      <div key={userCard.id} data-testid={`card-event-${userCard.id}`}>
                        <CollectibleCard
                          name={userCard.card.name}
                          imageUrl={userCard.card.imageUrl}
                          rarity={userCard.rarity as "common" | "rare" | "epic" | "legendary"}
                          sourceType="event"
                          size="compact"
                          showLabel
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {seasonCards.length > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.44 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-500" />
                      Cards de Revistas
                    </h3>
                    <Button 
                      variant="ghost" 
                      className="text-sm px-2"
                      style={{ color: "#8B5CF6" }}
                      onClick={() => setLocation("/study/cards")}
                      data-testid="button-view-season-cards"
                    >
                      Ver todos
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 justify-items-center">
                    {seasonCards.slice(0, 3).map((userCard) => (
                      <div key={userCard.id} data-testid={`card-season-${userCard.id}`}>
                        <CollectibleCard
                          name={userCard.card.name}
                          imageUrl={userCard.card.imageUrl}
                          rarity={userCard.rarity as "common" | "rare" | "epic" | "legendary"}
                          sourceType="season"
                          size="compact"
                          showLabel
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          );
        })()}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="p-4">
            <h3 className="text-lg font-bold text-foreground mb-4">Estatisticas</h3>
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="p-4 rounded-xl text-center"
                style={{ backgroundColor: "#F3E8FF" }}
              >
                <p className="text-2xl font-black" style={{ color: "#8B5CF6" }}>{currentXp.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">XP Total</p>
              </div>
              <div 
                className="p-4 rounded-xl text-center"
                style={{ backgroundColor: "#F3E8FF" }}
              >
                <p className="text-2xl font-black" style={{ color: "#8B5CF6" }}>{lessonsCompleted}</p>
                <p className="text-xs text-muted-foreground">Lições Completas</p>
              </div>
              <div 
                className="p-4 rounded-xl text-center"
                style={{ backgroundColor: "#F3E8FF" }}
              >
                <p className="text-2xl font-black" style={{ color: "#8B5CF6" }}>{achievementsEarned}</p>
                <p className="text-xs text-muted-foreground">Conquistas</p>
              </div>
              <div 
                className="p-4 rounded-xl text-center"
                style={{ backgroundColor: "#F3E8FF" }}
              >
                <p className="text-2xl font-black" style={{ color: "#8B5CF6" }}>{studyDays}</p>
                <p className="text-xs text-muted-foreground">Dias de Estudo</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-lg font-bold text-foreground mb-3">Atividade Recente</h3>
          {hasRecentActivities ? (
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <Card key={`${activity.type}-${index}`} className="p-4">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ 
                        backgroundColor: activity.type === 'lesson_completed' 
                          ? (activity.perfectScore ? '#22C55E' : '#8B5CF6')
                          : '#FFC800'
                      }}
                    >
                      {activity.type === 'lesson_completed' && (
                        <BookOpen className="h-5 w-5 text-white" />
                      )}
                      {activity.type === 'achievement_unlocked' && (
                        <Trophy className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{activity.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {activity.type === 'lesson_completed' && activity.xpEarned && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                            style={{ backgroundColor: '#F3E8FF', color: '#8B5CF6' }}
                          >
                            +{activity.xpEarned} XP
                          </Badge>
                        )}
                        {activity.perfectScore && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                            style={{ backgroundColor: '#DCFCE7', color: '#22C55E' }}
                          >
                            Perfeito
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatActivityDate(activity.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4">
              <p className="text-center text-muted-foreground text-sm">
                Voce ainda nao possui atividades recentes. Complete suas primeiras licoes para ver seu progresso aqui!
              </p>
            </Card>
          )}
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
