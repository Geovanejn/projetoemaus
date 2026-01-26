import { useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { 
  BottomNav,
  useCelebration,
  WeeklyGoalsWidget,
  NewUnitCard,
  ContinueLearning
} from "@/components/study";
import { StreakRecoveryModal } from "@/components/study/StreakRecoveryModal";
import type { StageType, QuestionResult, UnitData, LessonData, LessonStage, ContinueLearningData, PracticeStatus } from "@/components/study";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Flame, Star, Heart, Loader2, ListChecks, Home, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/NotificationCenter";

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
}

interface StudyWeek {
  id: number;
  weekNumber: number;
  year: number;
  title: string;
  description: string;
  pdfUrl: string | null;
  status: string;
  publishedAt: string | null;
  createdBy: number | null;
}

interface StageProgress {
  completed: number;
  total: number;
  questionResults?: QuestionResult[];
}

interface LessonWithProgress {
  id: number;
  studyWeekId: number;
  orderIndex: number;
  lessonNumber: number;
  title: string;
  type: string;
  description: string;
  xpReward: number;
  estimatedMinutes: number;
  icon: string | null;
  isBonus: boolean;
  status: string;
  progress?: {
    completedUnits: number;
    totalUnits: number;
    xpEarned: number;
    stageProgress?: {
      estude: StageProgress;
      medite: StageProgress;
      responda: StageProgress;
    };
  };
}

interface WeekWithLessons {
  week: StudyWeek;
  lessons: LessonWithProgress[];
}

interface MissionData {
  id: number;
  completed: boolean;
}

interface MissionsResponse {
  missions: MissionData[];
}

function UserProfileHeader({ 
  userName, 
  userPhoto,
  profile,
  missionsCompleted,
  missionsTotal
}: { 
  userName: string;
  userPhoto?: string | null;
  profile: StudyProfile;
  missionsCompleted: number;
  missionsTotal: number;
}) {
  const [, setLocation] = useLocation();
  
  const formatXp = (xp: number) => {
    if (xp >= 1000) {
      return xp.toLocaleString('pt-BR');
    }
    return xp.toString();
  };
  
  return (
    <div 
      className="px-4 pt-3 pb-5"
      style={{
        background: 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
      }}
    >
      <div className="max-w-lg mx-auto">
        {/* Navigation buttons inside the purple card */}
        <div className="flex items-center justify-between mb-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation('/membro')}
            data-testid="button-panels"
            className="bg-white/20 hover:bg-white/30 text-white"
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation('/')}
            data-testid="button-home"
            className="bg-white/20 hover:bg-white/30 text-white"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border-[3px] border-white/30 shadow-lg">
              <AvatarImage src={userPhoto || undefined} />
              <AvatarFallback 
                className="text-xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)',
                  color: 'white'
                }}
              >
                {userName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-bold text-white" data-testid="text-user-name">
                Olá, {userName.split(' ')[0]}!
              </h1>
              <p className="text-sm text-white/80">Nível {profile.currentLevel}</p>
            </div>
          </div>
          
          <div className="[&_button]:bg-white/20 [&_button]:text-white [&_button]:rounded-full [&_button]:w-10 [&_button]:h-10 [&_svg]:h-5 [&_svg]:w-5">
            <NotificationCenter />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-lg">
          <div className="grid grid-cols-4 gap-2">
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="flex flex-col items-center"
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
                style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' }}
              >
                <Flame className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-foreground text-sm">{profile.currentStreak}</span>
              <span className="text-[10px] text-muted-foreground">Ofensiva</span>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="flex flex-col items-center"
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
                style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
              >
                <Star className="h-6 w-6 text-white fill-white" />
              </div>
              <span className="font-bold text-foreground text-sm">{formatXp(profile.totalXp)}</span>
              <span className="text-[10px] text-muted-foreground">XP</span>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => setLocation('/study/verses')}
              data-testid="button-hearts"
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
                style={{ background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)' }}
              >
                <Heart className="h-6 w-6 text-white fill-white" />
              </div>
              <span className="font-bold text-foreground text-sm">{profile.hearts}</span>
              <span className="text-[10px] text-muted-foreground">Vidas</span>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => setLocation('/study/missions')}
              data-testid="button-missions"
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}
              >
                <ListChecks className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-foreground text-sm">{missionsCompleted}/{missionsTotal}</span>
              <span className="text-[10px] text-muted-foreground">Missões</span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DailyGoalSection({ 
  lessonsCompleted, 
  totalLessons 
}: { 
  lessonsCompleted: number; 
  totalLessons: number;
}) {
  const target = Math.min(totalLessons, 5);
  const current = Math.min(lessonsCompleted, target);
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining = target - current;
  
  return (
    <div className="px-4 py-4 bg-background border-b border-border">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2 gap-2">
          <h2 className="font-bold text-foreground">Meta Diária</h2>
          <span className="text-sm font-bold text-[#58CC02]">{current}/{target}</span>
        </div>
        
        <div className="relative h-4 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 bg-[#58CC02] rounded-full"
          />
        </div>
        
        <p className="text-sm text-muted-foreground mt-2">
          {remaining > 0 
            ? `Mais ${remaining} lições para completar sua meta!`
            : "Parabéns! Você completou sua meta diária!"
          }
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" data-testid="study-loading">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#FFA500]" />
        <p className="text-muted-foreground">Carregando estudos...</p>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="study-error">
      <div className="text-center max-w-sm">
        <h1 className="text-xl font-bold text-foreground mb-2">Erro ao carregar</h1>
        <p className="text-muted-foreground mb-4">
          Não foi possível carregar os dados do estudo. Por favor, tente novamente.
        </p>
        <Button onClick={onRetry} data-testid="button-retry">
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

function NotAuthenticatedState() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="study-not-auth">
      <div className="text-center max-w-sm">
        <h1 className="text-xl font-bold text-foreground mb-2">Faça login para continuar</h1>
        <p className="text-muted-foreground mb-4">
          Você precisa estar logado para acessar os estudos.
        </p>
        <Button onClick={() => setLocation('/')} data-testid="button-login">
          Fazer Login
        </Button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-4" data-testid="study-empty">
      <div className="text-center max-w-sm">
        <h2 className="text-xl font-bold text-foreground mb-2">Nenhum estudo disponível</h2>
        <p className="text-muted-foreground">
          Os estudos semanais serão liberados em breve. Volte mais tarde!
        </p>
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

export default function StudyHomePage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { CelebrationComponent } = useCelebration();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const scrollAttemptedRef = useRef(false);

  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useQuery<StudyProfile>({
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

  // Get correct XP from leaderboard
  const currentUserEntry = leaderboardData?.entries?.find((e) => e.userId === user?.id);
  const leaderboardXp = currentUserEntry?.totalXp || 0;
  
  // Create profile object with correct XP from leaderboard
  const displayProfile = profile ? {
    ...profile,
    totalXp: leaderboardXp || profile.totalXp
  } : undefined;

  const { data: weeks, isLoading: weeksLoading, error: weeksError, refetch: refetchWeeks } = useQuery<StudyWeek[]>({
    queryKey: ['/api/study/weeks'],
    enabled: isAuthenticated && !!profile,
  });

  const sortedWeeks = weeks ? [...weeks].filter(w => w && w.id).reverse() : [];
  const weekIds = sortedWeeks.map(w => w.id);

  // OPTIMIZED: Use bulk endpoint to fetch all weeks with lessons in a single request
  // This eliminates N+1 query problem (previously made one request per week)
  const { data: allWeeksData, isLoading: lessonsLoading, error: lessonsError, refetch: refetchLessons } = useQuery<WeekWithLessons[]>({
    queryKey: ['/api/study/weeks/bulk', weekIds.join(',')],
    queryFn: async () => {
      if (!sortedWeeks.length) return [];
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/study/weeks/bulk?ids=${weekIds.join(',')}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated && !!weeks?.length && weekIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds - data is fresh for a short while
  });

  const currentWeek = sortedWeeks?.[sortedWeeks.length - 1];

  const { data: practiceStatusData } = useQuery<PracticeStatus>({
    queryKey: ['/api/study/practice', currentWeek?.id?.toString(), 'status'],
    enabled: isAuthenticated && !!currentWeek?.id,
  });

  const { data: missionsData } = useQuery<MissionsResponse>({
    queryKey: ['/api/missions/daily'],
    enabled: isAuthenticated,
  });

  const missionsCompleted = missionsData?.missions?.filter(m => m.completed).length || 0;
  const missionsTotal = missionsData?.missions?.length || 5;

  const isLoading = authLoading || profileLoading || weeksLoading || lessonsLoading;
  const hasError = profileError || weeksError || lessonsError;

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const lessonId = params.get('lesson');
    const scrollToNext = params.get('scrollToNext');
    
    if (lessonId || scrollToNext) {
      scrollAttemptedRef.current = false;
    }
  }, [searchString]);

  useEffect(() => {
    if (!isLoading && allWeeksData?.length && searchString && !scrollAttemptedRef.current) {
      const params = new URLSearchParams(searchString);
      const lessonId = params.get('lesson');
      const scrollToNext = params.get('scrollToNext');
      
      if (lessonId) {
        // Scroll to a specific lesson
        scrollAttemptedRef.current = true;
        setTimeout(() => {
          const element = document.getElementById(`lesson-${lessonId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          window.history.replaceState({}, '', '/study');
        }, 400);
      } else if (scrollToNext) {
        // Scroll to the next available lesson after the completed one
        scrollAttemptedRef.current = true;
        const completedLessonId = parseInt(scrollToNext);
        
        // Find the next available lesson across all weeks
        let foundNextLesson = false;
        let foundCompletedLesson = false;
        
        for (const week of allWeeksData) {
          if (!week.lessons) continue;
          for (const lesson of week.lessons) {
            if (lesson.id === completedLessonId) {
              foundCompletedLesson = true;
              continue;
            }
            // If we found the completed lesson, look for the next non-completed lesson
            if (foundCompletedLesson && lesson.status !== 'completed') {
              setTimeout(() => {
                const element = document.getElementById(`lesson-${lesson.id}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                window.history.replaceState({}, '', '/study');
              }, 400);
              foundNextLesson = true;
              break;
            }
          }
          if (foundNextLesson) break;
        }
        
        // If no next lesson found, just clear the URL
        if (!foundNextLesson) {
          window.history.replaceState({}, '', '/study');
        }
      }
    }
  }, [isLoading, allWeeksData, searchString]);


  const handleRetry = () => {
    refetchProfile();
    refetchWeeks();
    refetchLessons();
  };

  if (authLoading) {
    return <LoadingState />;
  }

  if (!isAuthenticated || !user) {
    return <NotAuthenticatedState />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (hasError) {
    console.error("[Study] Error loading data:", { profileError, weeksError, lessonsError });
    return <ErrorState onRetry={handleRetry} />;
  }

  if (!profile || !displayProfile) {
    console.error("[Study] Missing profile data:", { profile, displayProfile });
    return <ErrorState onRetry={handleRetry} />;
  }

  const transformLessonsForWeek = (weekData: WeekWithLessons | null): LessonData[] => {
    if (!weekData?.lessons) return [];
    return weekData.lessons.map((lesson: LessonWithProgress, index: number) => {
      const previousLesson = index > 0 ? weekData.lessons[index - 1] : null;
      const isPreviousLessonComplete = !previousLesson || previousLesson.status === 'completed';
      
      let lessonStatus: 'completed' | 'in_progress' | 'locked' = 'locked';
      if (lesson.status === 'completed') {
        lessonStatus = 'completed';
      } else if ((lesson.status === 'in_progress' || lesson.status === 'available') && isPreviousLessonComplete) {
        lessonStatus = 'in_progress';
      } else if (isPreviousLessonComplete && lesson.status !== 'completed') {
        lessonStatus = 'in_progress';
      }

      const stageProgress = lesson.progress?.stageProgress;
      const estudeUnits = stageProgress?.estude?.total || 3;
      const mediteUnits = stageProgress?.medite?.total || 2;
      const respondaUnits = stageProgress?.responda?.total || 3;
      const estudeCompleted = stageProgress?.estude?.completed || 0;
      const mediteCompleted = stageProgress?.medite?.completed || 0;
      const respondaCompleted = stageProgress?.responda?.completed || 0;
      
      const completedUnits = estudeCompleted + mediteCompleted + respondaCompleted;
      const totalUnits = estudeUnits + mediteUnits + respondaUnits;
      
      let estudeStatus: 'completed' | 'current' | 'locked' = 'locked';
      let mediteStatus: 'completed' | 'current' | 'locked' = 'locked';
      let respondaStatus: 'completed' | 'current' | 'locked' = 'locked';
      
      if (lessonStatus === 'completed') {
        estudeStatus = 'completed';
        mediteStatus = 'completed';
        respondaStatus = 'completed';
      } else if (lessonStatus === 'in_progress') {
        const estudeComplete = estudeCompleted >= estudeUnits && estudeUnits > 0;
        const mediteComplete = mediteCompleted >= mediteUnits && mediteUnits > 0;
        
        if (estudeComplete) {
          estudeStatus = 'completed';
          if (mediteComplete) {
            mediteStatus = 'completed';
            respondaStatus = 'current';
          } else {
            mediteStatus = 'current';
          }
        } else {
          estudeStatus = 'current';
        }
      }
      
      const stages: LessonStage[] = [
        { type: 'estude' as const, status: estudeStatus, completedUnits: estudeCompleted, totalUnits: estudeUnits },
        { type: 'medite' as const, status: mediteStatus, completedUnits: mediteCompleted, totalUnits: mediteUnits },
        { type: 'responda' as const, status: respondaStatus, completedUnits: respondaCompleted, totalUnits: respondaUnits }
      ];

      return {
        id: lesson.id,
        number: lesson.lessonNumber || lesson.orderIndex + 1,
        title: lesson.title,
        status: lessonStatus,
        sectionsCompleted: completedUnits,
        totalSections: totalUnits,
        xpReward: 30,
        stages
      };
    });
  };

  const allUnitsData: UnitData[] = (allWeeksData || []).filter(weekData => weekData && weekData.week && weekData.week.id).map((weekData, unitIndex, allWeeks) => {
    const transformedLessons = transformLessonsForWeek(weekData);
    const lessonsCompleted = transformedLessons.filter(l => l.status === 'completed').length;
    const week = weekData.week;
    
    const previousWeekData = unitIndex > 0 ? allWeeks[unitIndex - 1] : null;
    const previousWeekLessons = previousWeekData ? transformLessonsForWeek(previousWeekData) : [];
    const previousWeekCompleted = previousWeekLessons.length > 0 && 
      previousWeekLessons.every(l => l.status === 'completed');
    
    const isFirstUnit = unitIndex === 0;
    const isPreviousComplete = isFirstUnit || previousWeekCompleted;
    
    let unitStatus: 'completed' | 'current' | 'locked';
    if (lessonsCompleted === transformedLessons.length && transformedLessons.length > 0) {
      unitStatus = 'completed';
    } else if (isPreviousComplete && transformedLessons.length > 0) {
      unitStatus = 'current';
    } else {
      unitStatus = 'locked';
    }
    
    const adjustedLessons = transformedLessons.map((lesson, lessonIndex) => {
      if (unitStatus === 'locked') {
        return { ...lesson, status: 'locked' as const };
      }
      if (unitStatus === 'completed') {
        return { ...lesson, status: 'completed' as const };
      }
      const previousLessonComplete = lessonIndex === 0 || transformedLessons[lessonIndex - 1].status === 'completed';
      if (lesson.status === 'locked' && previousLessonComplete) {
        return { ...lesson, status: 'in_progress' as const };
      }
      return lesson;
    });
    
    return {
      id: week.id,
      number: week.weekNumber,
      title: week.title,
      subtitle: week.description || '',
      status: unitStatus,
      lessonsCompleted,
      totalLessons: transformedLessons.length,
      progress: transformedLessons.length > 0 
        ? Math.round((lessonsCompleted / transformedLessons.length) * 100)
        : 0,
      lessons: adjustedLessons
    };
  });

  const allTransformedLessons = allUnitsData.flatMap(u => u.lessons);
  const inProgressLesson = allTransformedLessons.find(l => l.status === 'in_progress');
  const inProgressUnit = allUnitsData.find(u => u.lessons.some(l => l.id === inProgressLesson?.id));
  
  const getCurrentStage = (lesson: LessonData): 'estude' | 'medite' | 'responda' => {
    if (!lesson.stages) return 'estude';
    const currentStage = lesson.stages.find(s => s.status === 'current');
    if (currentStage) return currentStage.type as 'estude' | 'medite' | 'responda';
    const firstIncomplete = lesson.stages.find(s => s.status !== 'completed');
    if (firstIncomplete) return firstIncomplete.type as 'estude' | 'medite' | 'responda';
    return 'estude';
  };

  const continueLearningData: ContinueLearningData | null = inProgressLesson && inProgressUnit ? {
    unitNumber: inProgressUnit.number,
    unitTitle: inProgressUnit.title,
    lessonNumber: inProgressLesson.number,
    lessonTitle: inProgressLesson.title,
    sectionsRemaining: inProgressLesson.totalSections - inProgressLesson.sectionsCompleted,
    totalSections: inProgressLesson.totalSections,
    progress: inProgressLesson.totalSections > 0 
      ? Math.round((inProgressLesson.sectionsCompleted / inProgressLesson.totalSections) * 100) 
      : 0,
    lessonId: inProgressLesson.id,
    currentStage: getCurrentStage(inProgressLesson)
  } : null;

  const handleLessonStageClick = (lessonId: number, stage: 'estude' | 'medite' | 'responda') => {
    const lesson = allTransformedLessons.find(l => l.id === lessonId);
    if (lesson && lesson.status !== 'locked') {
      setLocation(`/study/lesson/${lessonId}?stage=${stage}`);
    }
  };
  
  const handleContinueLearning = (lessonId: number, currentStage?: 'estude' | 'medite' | 'responda') => {
    if (currentStage) {
      setLocation(`/study/lesson/${lessonId}?stage=${currentStage}`);
    } else {
      setLocation(`/study/lesson/${lessonId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="study-home">
      <CelebrationComponent />
      <StreakRecoveryModal />
      
      <UserProfileHeader 
        userName={user.fullName} 
        userPhoto={user.photoUrl}
        profile={displayProfile}
        missionsCompleted={missionsCompleted}
        missionsTotal={missionsTotal}
      />
      
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto">
          <WeeklyGoalsWidget />
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="max-w-lg mx-auto space-y-6">
          {continueLearningData && (
            <ContinueLearning 
              data={continueLearningData}
              onContinue={handleContinueLearning}
            />
          )}
          
          {allUnitsData.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Unidades de Estudo</h2>
              <p className="text-sm text-muted-foreground">
                {allUnitsData.length} unidade{allUnitsData.length !== 1 ? 's' : ''} disponíve{allUnitsData.length !== 1 ? 'is' : 'l'}
              </p>
              {allUnitsData.map((unitData) => {
                const urlParams = new URLSearchParams(searchString);
                const urlLessonId = urlParams.get('lesson');
                const hasInProgressLesson = unitData.lessons.some(l => l.status === 'in_progress');
                const hasUrlLesson = urlLessonId ? unitData.lessons.some(l => l.id.toString() === urlLessonId) : false;
                return (
                  <NewUnitCard 
                    key={unitData.id}
                    unit={unitData}
                    onLessonStageClick={handleLessonStageClick}
                    defaultExpanded={hasInProgressLesson || hasUrlLesson}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
