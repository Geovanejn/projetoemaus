import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { HeartCrack, Loader2, AlertCircle, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  StudyHeader,
  MultipleChoiceExercise,
  TrueFalseExercise,
  TextContent,
  FillBlankExercise,
  FeedbackOverlay,
  LessonComplete,
  StudyContent,
  EstudeScreen,
  MediteScreen,
  RespondaScreen,
  StageCompleteModal,
  StreakIncrementAnimation,
  CrystalGainAnimation,
  AchievementUnlockAnimation
} from "@/components/study";
import type { StudySection, MeditationSection, QuizQuestion } from "@/components/study";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MedalAchievementAnimation } from "@/components/study/MedalAchievementAnimation";
import { shuffleArrayWithSeed } from "@/lib/utils";
import { useSounds } from "@/hooks/use-sounds";

interface UnitContent {
  title?: string;
  body?: string;
  highlight?: string;
  question?: string;
  sentence?: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  statement?: string;
  isTrue?: boolean;
  explanationCorrect?: string;
  explanationIncorrect?: string;
  explanation?: string;
  hint?: string;
  reflectionPrompt?: string;
  meditationDuration?: number;
  meditationGuide?: string;
  verseReference?: string;
  verseText?: string;
  text?: string;
  reference?: string;
}

interface Unit {
  id: number;
  lessonId: number;
  orderIndex: number;
  type: "text" | "multiple_choice" | "true_false" | "fill_blank" | "verse" | "meditation" | "reflection";
  content: UnitContent;
  xpValue: number;
  stage: "estude" | "medite" | "responda";
}

interface LessonProgress {
  id?: number;
  userId: number;
  lessonId: number;
  startedAt?: string;
  completedAt?: string | null;
  xpEarned?: number;
  mistakesCount?: number;
  perfectScore?: boolean;
  timeSpentSeconds?: number;
}

interface LessonData {
  id: number;
  studyWeekId: number | null;
  seasonId: number | null;
  orderIndex: number;
  title: string;
  type: string;
  description?: string;
  xpReward: number;
  estimatedMinutes: number;
  icon?: string;
  isBonus: boolean;
  units: Unit[];
  progress: LessonProgress | null;
}

interface StudyProfile {
  id: number;
  userId: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  hearts: number;
  heartsMax: number;
  weeklyXp: number;
  level: number;
  lastActivityAt: string | null;
  lastHeartRecoveryAt: string | null;
  crystals: number;
}

interface AnswerResult {
  correct: boolean;
  explanation?: string;
  unitProgress: {
    id: number;
    userId: number;
    unitId: number;
    isCompleted: boolean;
    isCorrect: boolean;
    attempts: number;
  };
  profile: StudyProfile;
}

interface StreakInfo {
  newStreak: number;
  isNewRecord: boolean;
  crystalsAwarded: number;
  crystalRewards: Array<{ type: string; amount: number; description: string }>;
  milestoneReward: { milestone: any; crystalsAwarded: number; xpAwarded: number } | null;
}

interface CompletionResult {
  progress: LessonProgress;
  profile: StudyProfile;
  streakInfo: StreakInfo;
  unlockedAchievements?: any[];
}

function useQueryParam(param: string): string | null {
  const searchParams = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search) 
    : new URLSearchParams();
  return searchParams.get(param);
}

// Key prefix for saving lesson progress in localStorage when hearts run out
// Each lesson+user combination gets its own key to avoid overwrites
const LESSON_PROGRESS_KEY_PREFIX = "deo_glory_lesson_progress_";

function getLessonProgressKey(lessonId: number, userId: number): string {
  return `${LESSON_PROGRESS_KEY_PREFIX}${userId}_${lessonId}`;
}

interface SavedLessonProgress {
  lessonId: number;
  userId: number;
  unitIndex: number;
  stage: string | null;
  savedAt: number;
  heartsWereDepleted: boolean;
  respondaQuestionIndex?: number;
  accumulatedXp?: number;
  respondaCorrectAnswers?: number;
}

function getSavedProgress(lessonId: number, userId: number): SavedLessonProgress | null {
  try {
    const key = getLessonProgressKey(lessonId, userId);
    const saved = localStorage.getItem(key);
    if (saved) {
      const progress: SavedLessonProgress = JSON.parse(saved);
      // Restore if saved within last 24 hours
      if (Date.now() - progress.savedAt < 24 * 60 * 60 * 1000) {
        return progress;
      }
    }
  } catch (e) {
    console.error("Error reading saved progress:", e);
  }
  return null;
}

function saveProgress(lessonId: number, userId: number, unitIndex: number, stage: string | null, heartsWereDepleted: boolean, respondaQuestionIndex?: number, accumulatedXp?: number, respondaCorrect?: number): void {
  try {
    const key = getLessonProgressKey(lessonId, userId);
    const progress: SavedLessonProgress = {
      lessonId,
      userId,
      unitIndex,
      stage,
      savedAt: Date.now(),
      heartsWereDepleted,
      respondaQuestionIndex: respondaQuestionIndex ?? 0,
      accumulatedXp: accumulatedXp ?? 0,
      respondaCorrectAnswers: respondaCorrect ?? 0,
    };
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (e) {
    console.error("Error saving progress:", e);
  }
}

function saveProgressOnHeartDepletion(lessonId: number, userId: number, unitIndex: number, stage: string | null, respondaQuestionIndex?: number, accumulatedXp?: number, respondaCorrect?: number): void {
  saveProgress(lessonId, userId, unitIndex, stage, true, respondaQuestionIndex, accumulatedXp, respondaCorrect);
}

function clearSavedProgress(lessonId: number, userId: number): void {
  try {
    const key = getLessonProgressKey(lessonId, userId);
    localStorage.removeItem(key);
  } catch (e) {
    console.error("Error clearing saved progress:", e);
  }
}

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { sounds, vibrateError } = useSounds();
  const lessonId = parseInt(id || "0");
  const stageParam = useQueryParam('stage');
  
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);
  const [progressRestored, setProgressRestored] = useState(false);
  const [progressCheckDone, setProgressCheckDone] = useState(false);
  const progressSavedForDepletion = useRef(false); // Track if we already saved for this depletion
  const [initialStageSet, setInitialStageSet] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{
    isCorrect: boolean;
    explanation: string;
    hint?: string;
    xpEarned: number;
    heartsLost: number;
  } | null>(null);
  const [displayXp, setDisplayXp] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState(Date.now());
  const [isCompleted, setIsCompleted] = useState(false);
  const [lessonStarted, setLessonStarted] = useState(false);
  const [noHeartsError, setNoHeartsError] = useState(false);
  const [alreadyCompletedError, setAlreadyCompletedError] = useState(false);
  const [finalProfile, setFinalProfile] = useState<StudyProfile | null>(null);
  const [finalXpFromServer, setFinalXpFromServer] = useState<number | null>(null);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const heartsBeforeAnswer = useRef<number>(5);
  const [showStageComplete, setShowStageComplete] = useState(false);
  const [stageCompleteData, setStageCompleteData] = useState<{
    xp: number;
    stageType: "estude" | "medite" | "responda";
    nextStage: string | null;
    nextIndex: number;
    respondaCorrectAnswers?: number;
    totalRespondaQuestions?: number;
    lessonBonus?: number;
  } | null>(null);
  const [studyProgress, setStudyProgress] = useState<{ current: number; total: number } | null>(null);
  const [stageOverride, setStageOverride] = useState<string | null>(null);
  const [currentRespondaQuestionIndex, setCurrentRespondaQuestionIndex] = useState(0);
  const [initialRespondaQuestionIndex, setInitialRespondaQuestionIndex] = useState(0);
  const [displayXpBeforeResponda, setDisplayXpBeforeResponda] = useState(0);
  const [respondaCorrectAnswers, setRespondaCorrectAnswers] = useState(0);
  
  // Reset stageOverride when URL stage param changes or lesson changes
  // BUT only if we don't have restored progress (which sets its own stageOverride)
  useEffect(() => {
    if (!progressRestored) {
      setStageOverride(null);
    }
  }, [stageParam, lessonId, progressRestored]);
  
  const [animationPhase, setAnimationPhase] = useState<"none" | "streak" | "crystal" | "achievement" | "complete">("none");
  const [unlockedAchievementsList, setUnlockedAchievementsList] = useState<any[]>([]);
  const [currentAchievementIndex, setCurrentAchievementIndex] = useState(0);
  const [streakAnimationData, setStreakAnimationData] = useState<{ previousStreak: number; newStreak: number } | null>(null);
  const [crystalAnimationData, setCrystalAnimationData] = useState<{ amount: number; reason: string } | null>(null);
  const previousStreakRef = useRef<number>(0);

  const { 
    data: lessonData, 
    isLoading: isLoadingLesson, 
    error: lessonError,
    refetch: refetchLesson 
  } = useQuery<LessonData>({
    queryKey: ['/api/study/lessons', lessonId.toString()],
    enabled: !!user && lessonId > 0,
  });

  const { data: profileData, refetch: refetchProfile } = useQuery<StudyProfile>({
    queryKey: ['/api/study/profile'],
    enabled: !!user,
  });

  interface WeekLessonsResponse {
    id: number;
    lessons: Array<{ id: number; orderIndex: number; status?: string }>;
  }

  const weekId = lessonData?.studyWeekId;
  const { data: weekLessonsData } = useQuery<WeekLessonsResponse>({
    queryKey: ['/api/study/weeks', weekId?.toString()],
    enabled: !!weekId && isCompleted,
  });

  const nextLessonId = useMemo(() => {
    if (!weekLessonsData?.lessons || !lessonData) return null;
    const currentIndex = weekLessonsData.lessons.findIndex(l => l.id === lessonId);
    if (currentIndex === -1 || currentIndex >= weekLessonsData.lessons.length - 1) return null;
    const nextLesson = weekLessonsData.lessons[currentIndex + 1];
    if (nextLesson?.status === 'completed') return null;
    return nextLesson?.id || null;
  }, [weekLessonsData, lessonId, lessonData]);

  const serverHearts = finalProfile?.hearts ?? profileData?.hearts;

  const startLessonMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/study/lessons/${lessonId}/start`);
      return res.json();
    },
    onSuccess: () => {
      setLessonStarted(true);
      refetchProfile();
    },
    onError: (error: Error) => {
      if (error.message.includes("vidas") || error.message.includes("hearts") || error.message.includes("heartsNeeded")) {
        setNoHeartsError(true);
      } else if (error.message.includes("concluida") || error.message.includes("alreadyCompleted") || error.message.includes("completed")) {
        setAlreadyCompletedError(true);
      }
    }
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async ({ unitId, answer }: { unitId: number; answer: any }) => {
      // Deduzir vida apenas nas páginas /study e /study/estudos
      const shouldDeductHeart = window.location.pathname === "/study" || window.location.pathname.startsWith("/study/estudos") || window.location.pathname.startsWith("/study/lesson");
      const res = await apiRequest("POST", `/api/study/units/${unitId}/answer`, { 
        answer,
        skipHeartDeduction: !shouldDeductHeart 
      });
      return res.json() as Promise<AnswerResult>;
    },
    onSuccess: (result) => {
      // OPTIMIZED: Only update profile locally during lesson, avoid refetching weeks
      // Week data only needs to be refreshed when lesson is fully completed
      queryClient.setQueryData<StudyProfile>(['/api/study/profile'], result.profile);
    }
  });

  const completeLessonMutation = useMutation({
    mutationFn: async (completionData: { xpEarned: number; mistakesCount: number; timeSpentSeconds: number }) => {
      previousStreakRef.current = profileData?.currentStreak ?? 0;
      const res = await apiRequest("POST", `/api/study/lessons/${lessonId}/complete`, completionData);
      return res.json() as Promise<CompletionResult>;
    },
    onSuccess: (result) => {
      setFinalProfile(result.profile);
      if (result.progress?.xpEarned !== undefined) {
        setFinalXpFromServer(result.progress.xpEarned);
      }
      
      // OPTIMIZED: Selective cache invalidation
      // Update profile locally first for immediate UI feedback
      if (result.profile) {
        queryClient.setQueryData<StudyProfile>(['/api/study/profile'], result.profile);
      }
      
      // CRITICAL: Invalidate all caches needed for immediate UI feedback after lesson completion
      queryClient.invalidateQueries({ queryKey: ['/api/study/weeks'] }); // Week progress changed
      queryClient.invalidateQueries({ queryKey: ['/api/study/weeks/bulk'] }); // Bulk endpoint
      queryClient.invalidateQueries({ queryKey: ['/api/study/weekly-goal'] }); // Goal progress changed
      queryClient.invalidateQueries({ queryKey: ['/api/study/current-lesson'] }); // Next lesson unlocked
      queryClient.invalidateQueries({ queryKey: ['/api/study/seasons'] }); // Season progress updated
      // Invalidate season detail with array key pattern for proper cache matching
      if (lessonData?.seasonId) {
        queryClient.invalidateQueries({ queryKey: ['/api/study/seasons', lessonData.seasonId] });
      }
      
      const streakInfo = result.streakInfo;
      const previousStreak = previousStreakRef.current;
      const streakIncreased = streakInfo && streakInfo.newStreak > previousStreak;
      const crystalsAwarded = streakInfo?.crystalsAwarded || 0;
      const achievements = result.unlockedAchievements || [];
      
      if (achievements.length > 0) {
        setUnlockedAchievementsList(achievements);
        setCurrentAchievementIndex(0);
      }
      
      if (streakIncreased) {
        setStreakAnimationData({
          previousStreak,
          newStreak: streakInfo.newStreak
        });
        if (crystalsAwarded > 0) {
          const reasons = streakInfo.crystalRewards?.length > 0 
            ? streakInfo.crystalRewards.map(r => r.description).join(', ')
            : 'Recompensa por lição';
          setCrystalAnimationData({
            amount: crystalsAwarded,
            reason: reasons
          });
        }
        setAnimationPhase("streak");
      } else if (crystalsAwarded > 0) {
        const reasons = streakInfo?.crystalRewards?.length > 0 
          ? streakInfo.crystalRewards.map(r => r.description).join(', ')
          : 'Recompensa por lição';
        setCrystalAnimationData({
          amount: crystalsAwarded,
          reason: reasons
        });
        setAnimationPhase("crystal");
      } else if (achievements.length > 0) {
        setAnimationPhase("achievement");
      } else {
        setAnimationPhase("complete");
      }
      
      setIsCompleted(true);
    }
  });

  const completeUnitMutation = useMutation({
    mutationFn: async (unitId: number) => {
      const res = await apiRequest("POST", `/api/study/units/${unitId}/complete`);
      return res.json();
    },
    onSuccess: (result) => {
      // OPTIMIZED: Only update profile locally, avoid redundant refetches during lesson
      // The lesson data doesn't change when completing units - units are tracked separately
      // Full cache invalidation happens only when lesson is fully completed
      if (result.profile) {
        queryClient.setQueryData<StudyProfile>(['/api/study/profile'], result.profile);
      }
    }
  });

  useEffect(() => {
    if (lessonData && !lessonStarted && !startLessonMutation.isPending && !noHeartsError && !alreadyCompletedError && !startLessonMutation.isError) {
      startLessonMutation.mutate();
    }
  }, [lessonData, lessonStarted, noHeartsError, alreadyCompletedError]);

  useEffect(() => {
    if (lessonData?.units && stageParam && !initialStageSet) {
      const validStages = ['estude', 'medite', 'responda'];
      if (validStages.includes(stageParam)) {
        // When filtering by stage, always start at index 0 of the filtered units
        // The filtering happens later, so we just need to reset to beginning
        // But only if we don't have restored progress
        if (!progressRestored) {
          setCurrentUnitIndex(0);
        }
      }
      setInitialStageSet(true);
    }
  }, [lessonData, stageParam, initialStageSet, progressRestored]);

  // Ref to guard against race condition when restoring XP from saved progress
  const restoredXpRef = useRef(false);
  
  // Reset progress check when lesson or user changes
  useEffect(() => {
    setProgressCheckDone(false);
    setProgressRestored(false);
    restoredXpRef.current = false;
    setRespondaCorrectAnswers(0);
  }, [lessonId, user?.id]);

  // Force profile refetch when showing no-hearts screen to get fresh heart count
  useEffect(() => {
    if (noHeartsError || (serverHearts !== undefined && serverHearts <= 0)) {
      // Refetch profile every 2 seconds while on no-hearts screen to detect recovery
      const interval = setInterval(() => {
        refetchProfile();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [noHeartsError, serverHearts, refetchProfile]);

  // Reset noHeartsError when hearts are recovered (check profileData directly for fresh data)
  useEffect(() => {
    const freshHearts = profileData?.hearts;
    if ((noHeartsError || (serverHearts !== undefined && serverHearts <= 0)) && 
        freshHearts !== undefined && freshHearts > 0) {
      setNoHeartsError(false);
      // Reset the save flag so we can save again if hearts deplete again
      progressSavedForDepletion.current = false;
      // Reset mutation state and re-trigger lesson start
      startLessonMutation.reset();
      if (lessonData) {
        startLessonMutation.mutate();
      }
    }
  }, [noHeartsError, serverHearts, profileData?.hearts, lessonData]);

  // Restore saved progress on initial load (only for authenticated users)
  useEffect(() => {
    if (user?.id && lessonId > 0 && !progressCheckDone) {
      const savedProgress = getSavedProgress(lessonId, user.id);
      if (savedProgress) {
        setCurrentUnitIndex(savedProgress.unitIndex);
        // Restore the stage filter if it was saved
        if (savedProgress.stage) {
          setStageOverride(savedProgress.stage);
        }
        // Restore the responda question index if it was saved
        if (savedProgress.respondaQuestionIndex !== undefined) {
          setInitialRespondaQuestionIndex(savedProgress.respondaQuestionIndex);
          setCurrentRespondaQuestionIndex(savedProgress.respondaQuestionIndex);
        }
        // Restore the responda correct answers count if it was saved
        if (savedProgress.respondaCorrectAnswers !== undefined && savedProgress.respondaCorrectAnswers > 0) {
          setRespondaCorrectAnswers(savedProgress.respondaCorrectAnswers);
        }
        // Restore accumulated XP if it was saved
        // Set ref BEFORE state to guard against race condition with responda bootstrap effect
        if (savedProgress.accumulatedXp !== undefined && savedProgress.accumulatedXp > 0) {
          restoredXpRef.current = true;
          setDisplayXp(savedProgress.accumulatedXp);
        }
        setProgressRestored(true);
        // Don't clear yet - wait until user actually resumes the lesson with hearts
      }
      setProgressCheckDone(true);
    }
  }, [user?.id, lessonId, progressCheckDone]);

  // Keep progress in localStorage even after hearts are recovered
  // This ensures returning via device back button restores the correct state
  // Progress is only cleared when lesson is completed (line 551-555)

  // Use stageOverride if available, otherwise use URL param
  const activeStage = stageOverride ?? stageParam;
  
  // CRITICAL FIX: Save progress continuously during the lesson (not just when hearts deplete)
  // This ensures the device back button can restore the correct state
  // Save even when on hearts recovery screen (lessonStarted may be false but we still need to persist)
  useEffect(() => {
    if (user?.id && lessonData && !isCompleted) {
      // Only save if we have meaningful progress (not at the very start)
      // Save regardless of lessonStarted or noHeartsError to handle device back navigation
      if (activeStage || currentUnitIndex > 0 || currentRespondaQuestionIndex > 0) {
        saveProgress(lessonId, user.id, currentUnitIndex, activeStage, false, currentRespondaQuestionIndex, displayXp, respondaCorrectAnswers);
      }
    }
  }, [user?.id, lessonId, currentUnitIndex, activeStage, currentRespondaQuestionIndex, displayXp, respondaCorrectAnswers, lessonData, isCompleted]);

  // Save progress with depletion flag when running out of hearts
  useEffect(() => {
    if (user?.id && 
        (noHeartsError || (serverHearts !== undefined && serverHearts <= 0)) && 
        !progressSavedForDepletion.current) {
      // Mark as saved to prevent multiple saves
      progressSavedForDepletion.current = true;
      saveProgressOnHeartDepletion(lessonId, user.id, currentUnitIndex, activeStage, currentRespondaQuestionIndex, displayXp, respondaCorrectAnswers);
    }
  }, [noHeartsError, serverHearts, lessonId, currentUnitIndex, activeStage, user?.id, currentRespondaQuestionIndex, displayXp, respondaCorrectAnswers]);

  // Clear saved progress when lesson is completed
  useEffect(() => {
    if (isCompleted && user?.id) {
      clearSavedProgress(lessonId, user.id);
    }
  }, [isCompleted, lessonId, user?.id]);

  // Capture displayXp when entering responda stage
  const respondaStageOverride = stageOverride ?? stageParam;
  useEffect(() => {
    if (respondaStageOverride === 'responda' && displayXpBeforeResponda === 0) {
      setDisplayXpBeforeResponda(displayXp);
    }
  }, [respondaStageOverride, displayXp, displayXpBeforeResponda]);

  // Calcular XP inicial das etapas anteriores (estude + medite) quando entra direto na etapa responda
  // IMPORTANTE: Este hook deve estar ANTES de qualquer return condicional
  // Valores fixos: Estude = 50 XP, Medite = 50 XP, Responda = 10 XP por certa (máx 50)
  // Bônus de conclusão: 30 XP (lições semanais) ou 50 XP (revistas/temporadas)
  const previousStagesXp = useMemo(() => {
    if (!lessonData?.units) return 0;
    const allU = lessonData.units;
    const ESTUDE_FIXED_XP = 50;
    const MEDITE_FIXED_XP = 50;
    
    const hasEstude = allU.some(u => u.stage === 'estude');
    const hasMedite = allU.some(u => u.stage === 'medite');
    
    return (hasEstude ? ESTUDE_FIXED_XP : 0) + (hasMedite ? MEDITE_FIXED_XP : 0);
  }, [lessonData?.units]);
  
  // Ref para controlar se já inicializamos o XP para esta sessão de responda
  // IMPORTANTE: Este hook deve estar ANTES de qualquer return condicional
  const xpInitializedForLesson = useRef<number | null>(null);
  
  // Calcular targetStage para usar no useEffect abaixo
  const earlyTargetStage = (stageOverride ?? stageParam) as "estude" | "medite" | "responda" | null;
  
  // Ref para rastrear se as seções foram creditadas no backend
  const stagesCreditedRef = useRef<{ estude: boolean; medite: boolean }>({ estude: false, medite: false });
  
  useEffect(() => {
    // Se entramos na etapa responda diretamente, inicializar XP e creditar seções anteriores no backend
    // Só executa uma vez por lessonId para evitar loops
    // NÃO sobrescrever se já restauramos XP de progresso salvo
    // Check restoredXpRef.current (synchronous) to prevent race condition with progress restoration
    if (earlyTargetStage === 'responda' && displayXp === 0 && previousStagesXp > 0 && xpInitializedForLesson.current !== lessonId && !progressRestored && !restoredXpRef.current) {
      xpInitializedForLesson.current = lessonId;
      setDisplayXp(previousStagesXp);
      
      // Creditar as seções anteriores no backend quando entra diretamente em Responda
      // Backend é idempotente, então chamadas duplicadas são seguras
      const creditPreviousStages = async () => {
        const allU = lessonData?.units || [];
        const hasEstude = allU.some(u => u.stage === 'estude');
        const hasMedite = allU.some(u => u.stage === 'medite');
        
        if (hasEstude && !stagesCreditedRef.current.estude) {
          try {
            await apiRequest("POST", `/api/study/lessons/${lessonId}/complete-stage`, { stage: 'estude' });
            stagesCreditedRef.current.estude = true;
          } catch (error) {
            console.error("Error awarding estude XP:", error);
          }
        }
        
        if (hasMedite && !stagesCreditedRef.current.medite) {
          try {
            const response = await apiRequest("POST", `/api/study/lessons/${lessonId}/complete-stage`, { stage: 'medite' });
            stagesCreditedRef.current.medite = true;
            
            // Use the profile returned by backend to sync displayXp with actual XP
            const data = await response.json();
            if (data.profile) {
              queryClient.setQueryData(['/api/study/profile'], data.profile);
            }
          } catch (error) {
            console.error("Error awarding medite XP:", error);
          }
        }
        
        // Invalidate profile cache to ensure sync with backend
        queryClient.invalidateQueries({ queryKey: ['/api/study/profile'] });
      };
      
      creditPreviousStages();
    }
  }, [earlyTargetStage, previousStagesXp, lessonId, displayXp, lessonData?.units]);

  // IMPORTANT: All useMemo hooks must be defined before any early returns to respect React's hooks rules
  const studySections = useMemo((): StudySection[] => {
    if (!lessonData?.units) return [];
    
    // Get all units for the "estude" stage
    const units = lessonData.units.filter(u => u.stage === "estude");
    
    // Convert units to sections
    // Note: verse units from season PDFs use { text, reference } format
    // while other units use { body, title } or { verseText, verseReference } format
    // For verse type: highlight contains the reference when coming from AI-generated studyContent
    const sections: StudySection[] = units.map(u => {
      // For verse type units, prioritize reference fields but also check title if it's a real reference
      const isVerse = u.type === 'verse';
      let title = '';
      if (isVerse) {
        // For verse: reference > verseReference > highlight > title (if not generic) > fallback
        // Avoid using generic "Versículo Base" or "Versiculo base" as the displayed reference
        const contentTitle = u.content.title;
        const isGenericTitle = !contentTitle || 
          contentTitle.toLowerCase().includes('versículo base') || 
          contentTitle.toLowerCase().includes('versiculo base');
        
        title = u.content.reference || 
                u.content.verseReference || 
                u.content.highlight || 
                (!isGenericTitle ? contentTitle : '') || 
                'Versículo Base';
      } else {
        // For other types: title > verseReference > reference
        title = u.content.title || u.content.verseReference || u.content.reference || '';
      }
      
      return {
        type: u.type as any,
        title,
        content: u.content.body || u.content.verseText || u.content.text || u.content.highlight || ""
      };
    });

    // Find Slide 0 (Verse) - MUST be first
    const primaryVerseIndex = sections.findIndex(s => s.type === 'verse');
    
    if (primaryVerseIndex > -1) {
      const [verse] = sections.splice(primaryVerseIndex, 1);
      return [verse, ...sections];
    } else {
      // Create slide 0 if missing
      return [{
        type: 'verse',
        title: 'Versículo Base',
        content: 'Versículo não carregado.'
      }, ...sections];
    }
  }, [lessonData]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="not-authenticated">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Não Autenticado</h1>
          <p className="text-muted-foreground mb-4">Faça login para acessar as lições.</p>
          <Button onClick={() => setLocation("/login")} data-testid="button-login">
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  if (alreadyCompletedError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4" data-testid="already-completed">
        <div className="text-center max-w-sm">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Lição já concluída!
          </h1>
          <p className="text-muted-foreground mb-6">
            Você já completou esta lição. Continue sua jornada de estudo com outras lições disponíveis.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setLocation("/study")}
              className="w-full py-6 font-bold"
              data-testid="button-continue-study"
            >
              CONTINUAR ESTUDANDO
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (noHeartsError || (serverHearts !== undefined && serverHearts <= 0)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4" data-testid="no-hearts">
        <div className="text-center max-w-sm">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <HeartCrack className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Suas vidas acabaram!
          </h1>
          <p className="text-muted-foreground mb-6">
            Leia versículos bíblicos para recuperar vidas, ou aguarde 6 horas para recuperar automaticamente.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setLocation("/study/verses")}
              className="w-full py-6 font-bold"
              data-testid="button-read-verses"
            >
              LER VERSÍCULOS
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/study")}
              className="w-full py-6"
              data-testid="button-go-home"
            >
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingLesson || startLessonMutation.isPending || !profileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="loading-lesson">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando lição...</p>
        </div>
      </div>
    );
  }

  if (lessonError || startLessonMutation.isError) {
    const errorMessage = lessonError 
      ? (lessonError as Error).message 
      : (startLessonMutation.error as Error)?.message || "Erro ao iniciar lição";
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="error-lesson">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Erro ao carregar lição</h1>
          <p className="text-muted-foreground mb-4">{errorMessage}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => {
              if (lessonError) refetchLesson();
              else startLessonMutation.reset();
            }} variant="outline" data-testid="button-retry">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button onClick={() => setLocation("/study")} data-testid="button-back">
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!lessonData || !lessonData.units || lessonData.units.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="empty-lesson">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Lição Vazia</h1>
          <p className="text-muted-foreground mb-4">Esta lição ainda não tem conteúdo.</p>
          <Button onClick={() => setLocation("/study")} data-testid="button-back-empty">
            Voltar ao Estudo
          </Button>
        </div>
      </div>
    );
  }

  const allUnits = [...lessonData.units].sort((a, b) => {
    // Special ordering for medite stage: reflection (applications) before meditation (prayer)
    if (a.stage === 'medite' && b.stage === 'medite') {
      // reflection comes before meditation
      if (a.type === 'reflection' && b.type === 'meditation') return -1;
      if (a.type === 'meditation' && b.type === 'reflection') return 1;
    }
    const orderDiff = (a.orderIndex || 0) - (b.orderIndex || 0);
    return orderDiff !== 0 ? orderDiff : (a.id || 0) - (b.id || 0);
  });
  
  // Use stageOverride if set (from stage transition), otherwise use URL param
  const targetStage = (stageOverride ?? stageParam) as "estude" | "medite" | "responda" | null;
  const filteredUnits = targetStage 
    ? allUnits.filter(u => u.stage === targetStage)
    : null;
  
  const hasFilteredUnits = filteredUnits !== null && filteredUnits.length > 0;
  const units = hasFilteredUnits ? filteredUnits : allUnits;
  const safeIndex = Math.max(0, Math.min(currentUnitIndex, units.length - 1));
  const currentUnit = units[safeIndex];
  const totalUnits = units.length;
  const currentHearts = serverHearts ?? 5;
  
  const isStudyStage = currentUnit?.stage === 'estude';
  const isTextType = currentUnit?.type === 'text' || currentUnit?.type === 'verse';
  const studyUnits = allUnits
    .filter(u => u.stage === 'estude' && (u.type === 'text' || u.type === 'verse'));
  
  // Extract base verse reference from the first verse unit
  const baseVerseReference = studyUnits.find(u => u.type === 'verse')?.content?.highlight 
    || studyUnits.find(u => u.type === 'verse')?.content?.verseReference 
    || lessonData.title 
    || '';
  
  const isMediteStage = currentUnit?.stage === 'medite';
  const isMediteType = currentUnit?.type === 'meditation' || currentUnit?.type === 'reflection';
  const mediteUnits = allUnits
    .filter(u => u.stage === 'medite' && (u.type === 'meditation' || u.type === 'reflection'));
  
  const mediteSections: MeditationSection[] = mediteUnits.map((unit) => {
    return {
      type: unit.type as 'reflection' | 'meditation',
      title: unit.content.title || (unit.type === 'meditation' ? 'Meditacao' : 'Reflexao'),
      content: unit.content.body || unit.content.meditationGuide || unit.content.reflectionPrompt || '',
      prompt: unit.content.reflectionPrompt,
      duration: unit.content.meditationDuration
    };
  });
  
  const isRespondaStage = currentUnit?.stage === 'responda';
  const isQuestionType = currentUnit?.type === 'multiple_choice' || currentUnit?.type === 'true_false' || currentUnit?.type === 'fill_blank';
  // Include units that are either marked as 'responda' stage OR have interactive question types (fallback for missing stage)
  const respondaUnits = allUnits.filter(u => {
    const isInteractiveType = u.type === 'multiple_choice' || u.type === 'true_false' || u.type === 'fill_blank';
    // If stage is explicitly set, respect it; otherwise, include interactive types
    if (u.stage === 'responda' && isInteractiveType) return true;
    if (!u.stage && isInteractiveType) return true; // Fallback: include interactive types without stage
    return false;
  });
  
  const respondaQuestionsRaw: QuizQuestion[] = respondaUnits.map((unit) => {
    // Handle nested content structure: some questions have content.content.question
    const innerContent = (unit.content as any).content || unit.content;
    const questionType = (unit.content as any).type || unit.type;
    
    return {
      type: questionType as 'multiple_choice' | 'true_false' | 'fill_blank',
      question: innerContent.question || innerContent.statement || innerContent.sentence || '',
      options: innerContent.options,
      correctIndex: innerContent.correctIndex,
      correctAnswer: questionType === 'fill_blank' ? innerContent.correctAnswer : innerContent.isTrue,
      hint: innerContent.hint,
      explanation: innerContent.explanation || innerContent.explanationCorrect || innerContent.explanationIncorrect,
      unitId: unit.id
    };
  });
  
  // Shuffle questions using lesson ID as seed for deterministic but varied order
  const respondaQuestions = lessonId > 0 && respondaQuestionsRaw.length > 0 
    ? shuffleArrayWithSeed(respondaQuestionsRaw, lessonId) 
    : respondaQuestionsRaw;
  
  // FIXED: Move derived content flags here (before useEffect at line 252 that uses them)
  // These must be defined after their dependencies (studyUnits, mediteUnits, respondaUnits)
  const showStudyContent = isStudyStage && isTextType && studyUnits.length > 0;
  const showMediteContent = isMediteStage && isMediteType && mediteUnits.length > 0;
  const showRespondaContent = isRespondaStage && isQuestionType && respondaUnits.length > 0;
  
  if (targetStage && filteredUnits !== null && filteredUnits.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="empty-stage">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Sem conteúdo</h1>
          <p className="text-muted-foreground mb-4">
            Este estágio ainda não tem conteúdo disponível.
          </p>
          <Button onClick={() => setLocation("/study")} data-testid="button-back-empty-stage">
            Voltar ao Estudo
          </Button>
        </div>
      </div>
    );
  }

  const handleAnswerSubmit = async (userAnswer: any) => {
    if (waitingForAnswer || userAnswer === null || userAnswer === undefined) return;
    setWaitingForAnswer(true);
    heartsBeforeAnswer.current = currentHearts;

    try {
      const result = await submitAnswerMutation.mutateAsync({ 
        unitId: currentUnit.id, 
        answer: userAnswer 
      });

      const isCorrect = result.correct;
      // Responda stage uses fixed 10 XP per correct answer
      const RESPONDA_XP_PER_CORRECT = 10;
      const xpForUnit = isRespondaStage ? RESPONDA_XP_PER_CORRECT : (currentUnit.xpValue || 5);
      const heartsAfter = result.profile.hearts;
      const heartsLost = Math.max(0, heartsBeforeAnswer.current - heartsAfter);

      if (isCorrect) {
        sounds.practiceCorrect();
        setDisplayXp(prev => prev + xpForUnit);
        // Track correct answers during responda stage
        if (isRespondaStage) {
          setRespondaCorrectAnswers(prev => prev + 1);
        }
      } else {
        sounds.practiceError();
        vibrateError();
        setMistakes(prev => prev + 1);
      }

      setFeedbackData({
        isCorrect,
        explanation: result.explanation || (isCorrect 
          ? currentUnit.content.explanationCorrect || currentUnit.content.explanation || "Correto!"
          : currentUnit.content.explanationIncorrect || currentUnit.content.explanation || "Incorreto"),
        hint: !isCorrect ? currentUnit.content.hint : undefined,
        xpEarned: isCorrect ? xpForUnit : 0,
        heartsLost
      });
      setShowFeedback(true);
    } catch (error) {
      console.error("Error submitting answer:", error);
      setFeedbackData({
        isCorrect: false,
        explanation: "Erro ao enviar resposta. Tente novamente.",
        xpEarned: 0,
        heartsLost: 0
      });
      setShowFeedback(true);
    } finally {
      setWaitingForAnswer(false);
    }
  };

  const handleContinue = () => {
    setShowFeedback(false);
    setFeedbackData(null);

    if (currentUnitIndex < totalUnits - 1) {
      setCurrentUnitIndex(prev => prev + 1);
    } else {
      if (targetStage === 'responda') {
        // Calculate from state when called from unit-by-unit flow
        const respondaUnits = allUnits.filter(u => u.stage === 'responda');
        const questionUnits = respondaUnits.filter(u => 
          u.type === 'multiple_choice' || u.type === 'true_false' || u.type === 'fill_blank'
        );
        handleRespondaComplete(respondaCorrectAnswers, questionUnits.length);
      } else {
        handleLessonCompletion();
      }
    }
  };

  const handleRespondaComplete = async (correctCount: number, totalQuestions: number) => {
    const respondaUnits = allUnits.filter(u => u.stage === 'responda');
    const totalXpFromResponda = displayXp - displayXpBeforeResponda;
    
    // Lesson completion bonus: 50 for season lessons, 30 for regular weekly lessons
    const LESSON_COMPLETION_BONUS = lessonData?.seasonId ? 50 : 30;
    
    // Note: mistakes are now tracked in real-time via handleRespondaAnswer
    // No need to calculate here - the mistakes state is already accurate
    
    // Mark all responda units as completed (ensures text-type units are also marked)
    for (const unit of respondaUnits) {
      try {
        await completeUnitMutation.mutateAsync(unit.id);
      } catch (error) {
        console.error("Error completing responda unit:", error);
      }
    }
    
    setStageCompleteData({
      xp: totalXpFromResponda + LESSON_COMPLETION_BONUS,
      stageType: "responda",
      nextStage: null,
      nextIndex: allUnits.length,
      respondaCorrectAnswers: correctCount,
      totalRespondaQuestions: totalQuestions,
      lessonBonus: LESSON_COMPLETION_BONUS
    });
    setShowStageComplete(true);
  };

  const handleMeditateComplete = async () => {
    const MEDITE_FIXED_XP = 50;
    const meditateUnits = allUnits.filter(u => u.stage === 'medite');
    
    // Complete all meditate units in parallel for faster completion
    await Promise.all(
      meditateUnits.map(unit => 
        completeUnitMutation.mutateAsync(unit.id).catch(error => {
          console.error("Error completing meditate unit:", error);
        })
      )
    );
    
    // Add fixed XP for completing Medite section
    try {
      await apiRequest("POST", `/api/study/lessons/${lessonId}/complete-stage`, { stage: 'medite' });
    } catch (error) {
      console.error("Error awarding medite XP:", error);
    }
    
    const lastMeditateIndex = allUnits.reduce((lastIdx, u, idx) => 
      u.stage === 'medite' ? idx : lastIdx, -1
    );
    
    const nextIndex = lastMeditateIndex + 1;
    const nextUnit = nextIndex < allUnits.length ? allUnits[nextIndex] : null;
    
    setStageCompleteData({
      xp: MEDITE_FIXED_XP,
      stageType: "medite",
      nextStage: nextUnit?.stage || null,
      nextIndex: nextIndex
    });
    setShowStageComplete(true);
  };

  const handleTextContinue = async () => {
    try {
      await completeUnitMutation.mutateAsync(currentUnit.id);
    } catch (error) {
      console.error("Error completing unit:", error);
    }
    
    // For estude and medite sections, check if this is the last unit of the section
    if (currentUnit.stage === 'estude') {
      const estudeUnitsInFiltered = units.filter(u => u.stage === 'estude');
      const currentEstudeIndex = estudeUnitsInFiltered.findIndex(u => u.id === currentUnit.id);
      const isLastEstudeUnit = currentEstudeIndex === estudeUnitsInFiltered.length - 1;
      
      if (isLastEstudeUnit) {
        handleStudyComplete();
        return;
      }
      
      if (currentUnitIndex < totalUnits - 1) {
        setCurrentUnitIndex(prev => prev + 1);
      }
      return;
    }
    
    if (currentUnit.stage === 'medite') {
      const meditateUnitsInFiltered = units.filter(u => u.stage === 'medite');
      const currentMeditateIndex = meditateUnitsInFiltered.findIndex(u => u.id === currentUnit.id);
      const isLastMeditateUnit = currentMeditateIndex === meditateUnitsInFiltered.length - 1;
      
      if (isLastMeditateUnit) {
        handleMeditateComplete();
        return;
      }
      
      if (currentUnitIndex < totalUnits - 1) {
        setCurrentUnitIndex(prev => prev + 1);
      }
      return;
    }
    
    if (currentUnitIndex < totalUnits - 1) {
      setCurrentUnitIndex(prev => prev + 1);
    } else {
      handleLessonCompletion();
    }
  };

  const handleLessonCompletion = async () => {
    const LESSON_COMPLETION_BONUS = lessonData?.seasonId ? 50 : 30;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const isPerfect = mistakes === 0;
    
    try {
      await completeLessonMutation.mutateAsync({
        xpEarned: displayXp + LESSON_COMPLETION_BONUS,
        mistakesCount: mistakes,
        timeSpentSeconds: timeSpent
      });
    } catch (error) {
      console.error("Error completing lesson:", error);
    }
    
    setIsCompleted(true);
  };

  const handleClose = () => {
    if (window.confirm("Tem certeza que deseja sair? Você pode continuar de onde parou mais tarde.")) {
      // Save progress before exiting (not hearts depleted, just normal exit)
      if (user?.id && lessonId > 0) {
        const currentStage = stageOverride || stageParam || null;
        saveProgress(lessonId, user.id, currentUnitIndex, currentStage, false, currentRespondaQuestionIndex, displayXp, respondaCorrectAnswers);
      }
      setLocation("/study");
    }
  };

  const handleLessonComplete = () => {
    // Redirect to lesson list - the page will auto-scroll to the next available lesson
    // Using scrollToNext=1 to indicate we want to scroll to the next available lesson after this one
    if (lessonData?.seasonId) {
      setLocation(`/study/estudos?scrollToNext=${lessonId}`);
    } else {
      setLocation(`/study?scrollToNext=${lessonId}`);
    }
  };

  if (isCompleted) {
    const LESSON_COMPLETION_BONUS = lessonData?.seasonId ? 50 : 30;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const streakDays = finalProfile?.currentStreak ?? profileData?.currentStreak ?? 0;
    const isPerfect = mistakes === 0;
    // Use the actual XP value from server response. If not available yet, calculate from display XP
    // The server value is authoritative and always correct
    const finalXp = finalXpFromServer ?? (displayXp + LESSON_COMPLETION_BONUS);
    
    const handleStreakAnimationComplete = () => {
      if (crystalAnimationData) {
        setAnimationPhase("crystal");
      } else if (unlockedAchievementsList.length > 0) {
        setAnimationPhase("achievement");
      } else {
        setAnimationPhase("complete");
      }
    };
    
    const handleCrystalAnimationComplete = () => {
      if (unlockedAchievementsList.length > 0) {
        setAnimationPhase("achievement");
      } else {
        setAnimationPhase("complete");
      }
    };
    
    const handleAchievementAnimationComplete = () => {
      if (currentAchievementIndex < unlockedAchievementsList.length - 1) {
        setCurrentAchievementIndex(currentAchievementIndex + 1);
      } else {
        setAnimationPhase("complete");
      }
    };
    
    if (animationPhase === "streak" && streakAnimationData) {
      return (
        <StreakIncrementAnimation
          previousStreak={streakAnimationData.previousStreak}
          newStreak={streakAnimationData.newStreak}
          onComplete={handleStreakAnimationComplete}
        />
      );
    }
    
    if (animationPhase === "crystal" && crystalAnimationData) {
      return (
        <CrystalGainAnimation
          crystalsGained={crystalAnimationData.amount}
          reason={crystalAnimationData.reason}
          onComplete={handleCrystalAnimationComplete}
        />
      );
    }
    
    if (animationPhase === "achievement" && unlockedAchievementsList.length > 0) {
      const currentAchievement = unlockedAchievementsList[currentAchievementIndex];
      return (
        <AchievementUnlockAnimation
          achievement={currentAchievement}
          onComplete={handleAchievementAnimationComplete}
        />
      );
    }
    
    return (
      <LessonComplete
        xpEarned={finalXp}
        isPerfect={isPerfect}
        streakDays={streakDays}
        mistakesCount={mistakes}
        timeSpentSeconds={timeSpent}
        onContinue={handleLessonComplete}
      />
    );
  }

  const handleMultipleChoiceAnswer = (_isCorrect: boolean, selectedIndex: number) => {
    handleAnswerSubmit(selectedIndex);
  };

  const handleTrueFalseAnswer = (_isCorrect: boolean, userAnswer: boolean) => {
    handleAnswerSubmit(userAnswer);
  };

  const handleFillBlankAnswer = (_isCorrect: boolean, userAnswer: string) => {
    handleAnswerSubmit(userAnswer);
  };

  const currentStage = targetStage || currentUnit?.stage || 'responda';
  
  const handleStudyComplete = async () => {
    const ESTUDE_FIXED_XP = 50;
    
    // Complete all study units in parallel for faster completion
    await Promise.all(
      studyUnits.map(unit => 
        completeUnitMutation.mutateAsync(unit.id).catch(error => {
          console.error("Error completing study unit:", error);
        })
      )
    );
    
    // Add fixed XP for completing Estude section
    try {
      await apiRequest("POST", `/api/study/lessons/${lessonId}/complete-stage`, { stage: 'estude' });
    } catch (error) {
      console.error("Error awarding estude XP:", error);
    }
    
    const lastStudyIndex = allUnits.reduce((lastIdx, u, idx) => 
      u.stage === 'estude' ? idx : lastIdx, -1
    );
    
    const nextIndex = lastStudyIndex + 1;
    const nextUnit = nextIndex < allUnits.length ? allUnits[nextIndex] : null;
    
    setStageCompleteData({
      xp: ESTUDE_FIXED_XP,
      stageType: "estude",
      nextStage: nextUnit?.stage || null,
      nextIndex: nextIndex
    });
    setShowStageComplete(true);
  };

  const handleStageModalClose = async () => {
    if (!stageCompleteData) return;
    
    const { xp, stageType, nextStage } = stageCompleteData;
    
    if (stageType !== 'responda') {
      setDisplayXp(prev => prev + xp);
    }
    
    setShowStageComplete(false);
    setStageCompleteData(null);
    
    // OPTIMIZED: Selective cache invalidation for stage completion
    // Only invalidate essentials - profile is usually updated via setQueryData
    queryClient.invalidateQueries({ queryKey: ['/api/study/weeks'] });
    queryClient.invalidateQueries({ queryKey: ['/api/study/weeks/bulk'] });
    queryClient.invalidateQueries({ queryKey: ['/api/study/weekly-goal'] });
    
    if (stageType === 'responda') {
      // Responda completed - finish the lesson
      await handleLessonCompletion();
    } else if (nextStage) {
      // Automatically advance to the next stage (estude -> medite -> responda)
      setStageOverride(nextStage);
    } else {
      // No next stage available, go back to lesson list
      if (lessonData?.seasonId) {
        setLocation(`/study/estudos?lesson=${lessonId}`);
      } else {
        setLocation(`/study?lesson=${lessonId}`);
      }
    }
  };

  const handleRespondaAnswer = async (questionIndex: number, answer: any, isCorrect: boolean, unitId?: number) => {
    // Use unitId from the shuffled question if available, fallback to index-based lookup
    const targetUnitId = unitId ?? respondaUnits[questionIndex]?.id;
    if (!targetUnitId) return;
    
    // Fixed 10 XP per correct answer in Responda stage
    const RESPONDA_XP_PER_CORRECT = 10;
    
    // Track mistakes in real-time for accurate achievement calculation
    // This is critical for the "Perfeito" achievement to work correctly
    if (!isCorrect) {
      sounds.practiceError();
      vibrateError();
      setMistakes(prev => prev + 1);
    } else {
      sounds.practiceCorrect();
      // Track correct answers for the stage complete modal
      setRespondaCorrectAnswers(prev => prev + 1);
      // Add XP for correct answer
      setDisplayXp(prev => prev + RESPONDA_XP_PER_CORRECT);
    }
    
    // Submit to server for persistence using the correct unitId
    try {
      await submitAnswerMutation.mutateAsync({ 
        unitId: targetUnitId, 
        answer: answer 
      });
    } catch (error) {
      console.error("Error submitting responda answer:", error);
    }
  };
  
  // Handle progress updates from StudyContent
  const handleStudyProgress = (current: number, total: number) => {
    setStudyProgress({ current, total });
  };
  
  // Calculate header progress - use study progress when in study mode, otherwise use unit progress
  const headerCurrentStep = (showStudyContent || showMediteContent || showRespondaContent) && studyProgress 
    ? studyProgress.current 
    : currentUnitIndex + 1;
  const headerTotalSteps = (showStudyContent || showMediteContent || showRespondaContent) && studyProgress 
    ? studyProgress.total 
    : totalUnits;

  // Hide progress bar, stats, and entire header for dedicated session screens (Estude, Medite, Responda)
  // These screens have their own headers built-in
  // Use targetStage (which comes from stageOverride or stageParam) for reliable detection
  // Also check stageParam directly to hide header immediately when URL contains a stage parameter
  // This prevents the header from flashing before data loads
  // Normalize to lowercase for comparison, and also check content flags as fallback
  const normalizedTargetStage = targetStage?.toLowerCase();
  const normalizedStageParam = stageParam?.toLowerCase();
  const isSessionByStage = normalizedTargetStage === 'estude' || normalizedTargetStage === 'medite' || normalizedTargetStage === 'responda';
  const isSessionByUrlParam = normalizedStageParam === 'estude' || normalizedStageParam === 'medite' || normalizedStageParam === 'responda';
  const isSessionScreen = isSessionByStage || isSessionByUrlParam || showStudyContent || showMediteContent || showRespondaContent;

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="lesson-page">
      <main className="flex-1 flex flex-col">
        {showStudyContent ? (
          <EstudeScreen
            lessonTitle={lessonData.title}
            sections={studySections}
            onComplete={handleStudyComplete}
            onClose={handleClose}
          />
        ) : showMediteContent ? (
          <MediteScreen
            lessonTitle={lessonData.title}
            sections={mediteSections}
            onComplete={handleMeditateComplete}
            onClose={handleClose}
          />
        ) : showRespondaContent ? (
          <RespondaScreen
            lessonTitle={lessonData.title}
            questions={respondaQuestions}
            streak={profileData?.currentStreak || 0}
            hearts={currentHearts}
            maxHearts={profileData?.heartsMax || 5}
            initialQuestionIndex={initialRespondaQuestionIndex}
            initialCorrectCount={respondaCorrectAnswers}
            onAnswer={handleRespondaAnswer}
            onComplete={handleRespondaComplete}
            onClose={handleClose}
            onQuestionChange={(index) => setCurrentRespondaQuestionIndex(index)}
            showHearts={true}
          />
        ) : (
          <>
            {currentUnit.type === "text" && (
              <TextContent
                title={currentUnit.content.title || ""}
                body={currentUnit.content.body || ""}
                highlight={currentUnit.content.highlight}
                onContinue={handleTextContinue}
              />
            )}

            {currentUnit.type === "verse" && (
              <TextContent
                title={currentUnit.content.title || "Versículo"}
                body={currentUnit.content.body || currentUnit.content.verseText || ""}
                highlight={currentUnit.content.highlight || currentUnit.content.verseReference}
                onContinue={handleTextContinue}
              />
            )}

            {currentUnit.type === "meditation" && (
              <TextContent
                title={currentUnit.content.title || "Meditação"}
                body={currentUnit.content.body || currentUnit.content.meditationGuide || ""}
                highlight={currentUnit.content.meditationDuration ? `Duração: ${currentUnit.content.meditationDuration} segundos` : undefined}
                onContinue={handleTextContinue}
              />
            )}

            {currentUnit.type === "reflection" && (
              <TextContent
                title={currentUnit.content.title || "Reflexão"}
                body={currentUnit.content.body || currentUnit.content.reflectionPrompt || ""}
                highlight={currentUnit.content.highlight}
                onContinue={handleTextContinue}
              />
            )}

            {currentUnit.type === "multiple_choice" && (
              <MultipleChoiceExercise
                key={`mc-${currentUnitIndex}-${currentUnit.id}`}
                question={currentUnit.content.question || ""}
                options={currentUnit.content.options || []}
                correctIndex={currentUnit.content.correctIndex || 0}
                onAnswer={handleMultipleChoiceAnswer}
              />
            )}

            {currentUnit.type === "true_false" && (
              <TrueFalseExercise
                key={`tf-${currentUnitIndex}-${currentUnit.id}`}
                statement={currentUnit.content.statement || ""}
                isTrue={currentUnit.content.isTrue || false}
                onAnswer={handleTrueFalseAnswer}
              />
            )}

            {currentUnit.type === "fill_blank" && (
              <FillBlankExercise
                key={`fb-${currentUnitIndex}-${currentUnit.id}`}
                question={currentUnit.content.question || currentUnit.content.sentence || ""}
                correctAnswer={currentUnit.content.correctAnswer || ""}
                options={currentUnit.content.options}
                onAnswer={handleFillBlankAnswer}
              />
            )}
          </>
        )}
      </main>

      {feedbackData && (
        <FeedbackOverlay
          isVisible={showFeedback}
          isCorrect={feedbackData.isCorrect}
          explanation={feedbackData.explanation}
          hint={feedbackData.hint}
          xpEarned={feedbackData.xpEarned}
          heartsLost={feedbackData.heartsLost}
          onContinue={handleContinue}
        />
      )}

      {stageCompleteData && (
        <StageCompleteModal
          isOpen={showStageComplete}
          onClose={handleStageModalClose}
          xpEarned={stageCompleteData.xp}
          stageType={stageCompleteData.stageType}
          nextStage={stageCompleteData.nextStage as "estude" | "medite" | "responda" | null}
          respondaCorrectAnswers={stageCompleteData.respondaCorrectAnswers}
          totalRespondaQuestions={stageCompleteData.totalRespondaQuestions}
        />
      )}
    </div>
  );
}
