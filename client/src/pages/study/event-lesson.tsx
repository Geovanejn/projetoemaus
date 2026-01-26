import { useState, useEffect, useMemo } from "react";
import { useSounds } from "@/hooks/use-sounds";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft,
  Loader2,
  BookOpen,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Sparkles,
  Trophy,
  Heart,
  Brain,
  MessageSquare,
  Star,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { shuffleArrayWithSeed } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EstudeScreen } from "@/components/study/EstudeScreen";
import { MediteScreen } from "@/components/study/MediteScreen";
import { RespondaScreen } from "@/components/study/RespondaScreen";

// Generate contextual distractors for fill_blank questions when AI doesn't provide them
function generateSmartDistractors(correctAnswer: string, questionId: number = 1): string[] {
  const answer = correctAnswer.toLowerCase().trim();
  
  // Biblical/spiritual word banks by category - extended lists to ensure we always have enough
  const virtueWords = ["amor", "fé", "esperança", "paz", "alegria", "paciência", "bondade", "mansidão", "domínio próprio", "humildade", "gratidão", "perdão", "misericórdia", "verdade", "sabedoria"];
  const actionWords = ["orar", "louvar", "adorar", "servir", "amar", "perdoar", "confiar", "crer", "buscar", "seguir", "obedecer", "honrar", "santificar", "glorificar", "evangelizar"];
  const nounWords = ["Deus", "Cristo", "Espírito", "Igreja", "Reino", "Palavra", "Verdade", "Vida", "Caminho", "Luz", "Graça", "Salvação", "Fé", "Esperança", "Amor"];
  const verbWords = ["abstenhais", "santificai", "glorificai", "permanecei", "vigiai", "perseverai", "alegrai", "orai", "buscai", "amais", "confiai", "louvai", "adorai", "servi", "honrai"];
  
  // Detect answer type based on suffix/pattern
  let pool: string[] = [];
  
  if (answer.endsWith("ais") || answer.endsWith("eis") || answer.endsWith("is")) {
    pool = verbWords;
  } else if (answer.endsWith("ar") || answer.endsWith("er") || answer.endsWith("ir")) {
    pool = actionWords;
  } else if (answer.endsWith("ão") || answer.endsWith("ade") || answer.endsWith("eza") || answer.endsWith("ança")) {
    pool = virtueWords;
  } else {
    pool = nounWords;
  }
  
  // Filter out the correct answer (case-insensitive)
  const filtered = pool.filter(w => w.toLowerCase() !== answer);
  
  // Use deterministic shuffle based on questionId for consistent ordering
  const shuffled = shuffleArrayWithSeed(filtered, questionId);
  
  // Return exactly 3 distractors, padding with fallback if necessary
  const result = shuffled.slice(0, 3);
  const fallbacks = ["Renovar", "Seguir", "Praticar"];
  while (result.length < 3) {
    const fallback = fallbacks[result.length] || `Opção ${result.length + 1}`;
    if (!result.includes(fallback) && fallback.toLowerCase() !== answer) {
      result.push(fallback);
    } else {
      result.push(`Alternativa ${result.length + 1}`);
    }
  }
  
  return result;
}

interface EventLesson {
  id: number;
  eventId: number;
  dayNumber: number;
  title: string;
  content: string;
  verseReference: string | null;
  verseText: string | null;
  questions: Question[];
  xpReward: number | null;
  status: string | null;
}

interface Question {
  id: string;
  type?: "multiple_choice" | "true_false" | "fill_blank";
  question: string;
  statement?: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string | boolean;
  explanation?: string;
  isTrue?: boolean;
}

interface UserProgress {
  id: number;
  lessonId: number;
  completed: boolean;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
}

interface LessonResponse {
  lesson: EventLesson;
  progress: UserProgress | null;
}

type Stage = "estude" | "medite" | "responda";

interface StageCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  xpEarned: number;
  stageType: Stage;
  nextStage: Stage | null;
  correctAnswers?: number;
  totalQuestions?: number;
}

function StageCompleteModal({ 
  isOpen, 
  onClose, 
  xpEarned, 
  stageType, 
  nextStage,
  correctAnswers,
  totalQuestions 
}: StageCompleteModalProps) {
  const stageLabels: Record<Stage, string> = {
    estude: "Estude",
    medite: "Medite",
    responda: "Responda"
  };

  const stageIcons: Record<Stage, JSX.Element> = {
    estude: <BookOpen className="h-8 w-8" />,
    medite: <Heart className="h-8 w-8" />,
    responda: <Brain className="h-8 w-8" />
  };

  const isLessonComplete = stageType === "responda" && !nextStage;

  // Get stage-specific colors for the glowing effect
  const stageColors = {
    estude: { gradient: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/50", text: "text-blue-500" },
    medite: { gradient: "from-rose-500 to-pink-600", glow: "shadow-rose-500/50", text: "text-rose-500" },
    responda: { gradient: "from-purple-500 to-violet-600", glow: "shadow-purple-500/50", text: "text-purple-500" }
  };
  
  const colors = isLessonComplete 
    ? { gradient: "from-amber-400 to-yellow-500", glow: "shadow-amber-500/50", text: "text-amber-500" }
    : stageColors[stageType];

  const shouldBlockClose = stageType === "responda";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !shouldBlockClose && onClose()}>
      <DialogContent 
        className="sm:max-w-md overflow-hidden border-0 bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center"
        onInteractOutside={(e) => shouldBlockClose && e.preventDefault()}
        onEscapeKeyDown={(e) => shouldBlockClose && e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {isLessonComplete ? "Lição Completa" : `${stageLabels[stageType]} Concluído`}
          </DialogTitle>
        </DialogHeader>
        
        {/* Animated background glow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} blur-3xl pointer-events-none`}
        />

        {/* Shimmer effect */}
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ delay: 0.3, duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
        />
        
        <div className="text-center py-6 relative z-10 w-full flex flex-col items-center">
          {/* Icon with glowing ring */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
            className="relative mb-6 flex items-center justify-center"
            style={{ width: 80, height: 80 }}
          >
            {/* Outer glowing ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors.gradient} blur-md opacity-60`}
              style={{ margin: -8 }}
            />
            
            {/* Pulsing ring animation */}
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute inset-0 rounded-full border-2 border-current ${colors.text}`}
              style={{ margin: -8 }}
            />
            
            {/* Icon container */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br ${colors.gradient} shadow-lg ${colors.glow}`}>
              <div className="text-white drop-shadow-lg">
                {isLessonComplete ? (
                  <Trophy className="h-10 w-10" />
                ) : (
                  stageIcons[stageType]
                )}
              </div>
            </div>
            
            {/* Sparkle particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 1, 0], 
                  opacity: [0, 1, 0],
                  x: [0, (i % 2 === 0 ? 20 : -20) * Math.sin(i * 60 * Math.PI / 180)],
                  y: [0, -20 * Math.cos(i * 60 * Math.PI / 180) - 10]
                }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.8 }}
                className={`absolute ${colors.text}`}
                style={{ 
                  left: 40 + Math.sin(i * 60 * Math.PI / 180) * 40,
                  top: 40 + Math.cos(i * 60 * Math.PI / 180) * 40,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <Sparkles className="h-3 w-3" />
              </motion.div>
            ))}
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`text-2xl font-bold mb-2 ${isLessonComplete ? "bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent" : ""}`}
          >
            {isLessonComplete ? "Lição Concluída!" : `${stageLabels[stageType]} Concluído!`}
          </motion.h2>

          {isLessonComplete && correctAnswers !== undefined && totalQuestions !== undefined && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-muted-foreground mb-4"
            >
              Você acertou {correctAnswers} de {totalQuestions} questões
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="flex items-center justify-center gap-2 mb-6"
          >
            <div className="relative">
              {/* XP Badge glow */}
              <motion.div
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 bg-amber-500 blur-lg rounded-full"
              />
              <Badge className="relative bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-lg px-5 py-2.5 border-0 shadow-lg shadow-amber-500/30">
                <Star className="h-5 w-5 mr-2 fill-white" />
                +{xpEarned} XP
              </Badge>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button 
              onClick={onClose} 
              className={`w-full bg-gradient-to-r ${colors.gradient} hover:opacity-90 text-white shadow-lg ${colors.glow} border-0`}
              size="lg" 
              data-testid="button-stage-continue"
            >
              {nextStage ? (
                <>
                  Continuar para {stageLabels[nextStage]}
                  <ChevronRight className="h-5 w-5 ml-2" />
                </>
              ) : (
                "Voltar ao Evento"
              )}
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function parseContentSections(content: string): { estude: string; medite: string } {
  const estudeMatch = content.match(/<h2[^>]*>\s*Estude\s*<\/h2>([\s\S]*?)(?=<h2|$)/i);
  const mediteMatch = content.match(/<h2[^>]*>\s*Medite\s*<\/h2>([\s\S]*?)(?=<h2|$)/i);
  
  const estudeContent = estudeMatch ? estudeMatch[1].trim() : content;
  const mediteContent = mediteMatch ? mediteMatch[1].trim() : "";
  
  return { estude: estudeContent, medite: mediteContent };
}

// Wrapper component to ensure params are ready before rendering
export default function EventLessonPage() {
  const params = useParams<{ eventId: string; dayNumber: string }>();
  const eventId = parseInt(params.eventId || "0");
  const dayNumber = parseInt(params.dayNumber || "0");
  
  // Don't render until params are valid
  if (eventId === 0 || dayNumber === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  // Key forces remount when params change, ensuring useState initializers run with correct values
  return <EventLessonContent key={`${eventId}-${dayNumber}`} eventId={eventId} dayNumber={dayNumber} />;
}

function EventLessonContent({ eventId, dayNumber }: { eventId: number; dayNumber: number }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { sounds, vibrateError } = useSounds();

  // Now eventId and dayNumber are guaranteed to be valid when useState runs
  const [currentStage, setCurrentStage] = useState<Stage>(() => {
    const saved = localStorage.getItem(`lesson_${eventId}_${dayNumber}_stage`);
    return (saved as Stage) || "estude";
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    const saved = localStorage.getItem(`lesson_${eventId}_${dayNumber}_questionIndex`);
    return saved ? parseInt(saved) : 0;
  });

  const [estudeScreenIndex, setEstudeScreenIndex] = useState(() => {
    const saved = localStorage.getItem(`lesson_${eventId}_${dayNumber}_estudeIndex`);
    return saved ? parseInt(saved) : 0;
  });
  const [mediteScreenIndex, setMediteScreenIndex] = useState(() => {
    const saved = localStorage.getItem(`lesson_${eventId}_${dayNumber}_mediteIndex`);
    return saved ? parseInt(saved) : 0;
  });

  useEffect(() => {
    localStorage.setItem(`lesson_${eventId}_${dayNumber}_stage`, currentStage);
  }, [currentStage, eventId, dayNumber]);

  useEffect(() => {
    localStorage.setItem(`lesson_${eventId}_${dayNumber}_questionIndex`, currentQuestionIndex.toString());
  }, [currentQuestionIndex, eventId, dayNumber]);

  useEffect(() => {
    localStorage.setItem(`lesson_${eventId}_${dayNumber}_estudeIndex`, estudeScreenIndex.toString());
  }, [estudeScreenIndex, eventId, dayNumber]);

  useEffect(() => {
    localStorage.setItem(`lesson_${eventId}_${dayNumber}_mediteIndex`, mediteScreenIndex.toString());
  }, [mediteScreenIndex, eventId, dayNumber]);

  // Track if lesson is fully complete to clear saved progress
  const [progressCleared, setProgressCleared] = useState(false);

  const [correctAnswers, setCorrectAnswers] = useState(() => {
    const saved = localStorage.getItem(`lesson_${eventId}_${dayNumber}_correctAnswers`);
    return saved ? parseInt(saved) : 0;
  });
  const [accumulatedXp, setAccumulatedXp] = useState(0);

  // Save correct answers as user progresses
  useEffect(() => {
    if (!progressCleared) {
      localStorage.setItem(`lesson_${eventId}_${dayNumber}_correctAnswers`, correctAnswers.toString());
    }
  }, [correctAnswers, eventId, dayNumber, progressCleared]);

  // Register participation when entering "estude" stage (fires once per event)
  useEffect(() => {
    if (currentStage === "estude" && user?.id) {
      apiRequest("POST", `/api/study/events/${eventId}/participate`, {}).catch(() => {
        // Silently fail - participation tracking is not critical
      });
    }
  }, [eventId, currentStage, user?.id]);

  // Clear saved progress when lesson is completed
  const clearLessonProgress = () => {
    localStorage.removeItem(`lesson_${eventId}_${dayNumber}_stage`);
    localStorage.removeItem(`lesson_${eventId}_${dayNumber}_questionIndex`);
    localStorage.removeItem(`lesson_${eventId}_${dayNumber}_estudeIndex`);
    localStorage.removeItem(`lesson_${eventId}_${dayNumber}_mediteIndex`);
    localStorage.removeItem(`lesson_${eventId}_${dayNumber}_correctAnswers`);
    setProgressCleared(true);
  };

  const [showStageComplete, setShowStageComplete] = useState(false);
  const [stageCompleteData, setStageCompleteData] = useState<{
    xp: number;
    stageType: Stage;
    nextStage: Stage | null;
    correctAnswers?: number;
    totalQuestions?: number;
  } | null>(null);

  const { data, isLoading, error } = useQuery<LessonResponse>({
    queryKey: ["/api/study/events", eventId, "lessons", dayNumber],
    enabled: !!user && eventId > 0 && dayNumber > 0,
  });
  
  // Also fetch event data to check if event is accessible
  const { data: eventData } = useQuery<{ event: any }>({
    queryKey: ["/api/study/events", eventId],
    enabled: !!user && eventId > 0,
  });

  const submitMutation = useMutation({
    mutationFn: async (results: { correct: number; total: number; score: number; lessonId: number }) => {
      return apiRequest("POST", `/api/study/events/${eventId}/lessons/${results.lessonId}/complete`, {
        correctAnswers: results.correct,
        totalQuestions: results.total,
        score: results.score,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/study/events", eventId, "lessons", dayNumber] });
      queryClient.invalidateQueries({ queryKey: ["/api/study/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/study/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar progresso",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  const lesson = data?.lesson;
  const progress = data?.progress;
  const isCompleted = progress?.completed || false;
  const lessonId = lesson?.id;

  const contentSections = useMemo(() => {
    if (!lesson?.content) return { estude: "", medite: "" };
    return parseContentSections(lesson.content);
  }, [lesson?.content]);

  // Convert questions to RespondaScreen format
  const convertedQuestions = useMemo(() => {
    return (lesson?.questions || []).map((q: any) => {
      // Handle both flattened and nested (content) structures
      const content = q.content || q;
      
      const converted: any = {
        type: q.type || content.type || "multiple_choice",
        question: q.question || q.statement || content.question || content.statement || "",
        explanation: q.explanation || content.explanation || content.explanationCorrect || ""
      };

      if (converted.type === "multiple_choice") {
        const options = q.options || content.options;
        if (options && Array.isArray(options) && options.length > 0) {
          converted.options = options;
          // Ensure correctIndex is ALWAYS a number
          converted.correctIndex = Number(q.correctIndex ?? content.correctIndex ?? 0);
        }
      } else if (converted.type === "true_false") {
        // Check multiple possible locations for isTrue value
        // Priority: q.isTrue > q.content.isTrue > q.correctAnswer > content.correctAnswer
        // Must explicitly handle both true AND false encodings
        let correctBool: boolean | null = null;
        
        // Helper function to parse boolean from various formats
        const parseBoolean = (value: any): boolean | null => {
          if (typeof value === 'boolean') return value;
          if (value === 1 || value === "1") return true;
          if (value === 0 || value === "0") return false;
          if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            if (lower === 'true' || lower === 'verdadeiro') return true;
            if (lower === 'false' || lower === 'falso') return false;
          }
          return null;
        };
        
        // First check direct isTrue property
        correctBool = parseBoolean(q.isTrue);
        
        // Then check content.isTrue
        if (correctBool === null) {
          correctBool = parseBoolean(content.isTrue);
        }
        
        // Check correctAnswer as fallback
        if (correctBool === null) {
          correctBool = parseBoolean(q.correctAnswer);
        }
        if (correctBool === null) {
          correctBool = parseBoolean(content.correctAnswer);
        }
        
        // Default to false if nothing found
        if (correctBool === null) {
          correctBool = false;
        }
        
        converted.correctAnswer = correctBool;
        
        // Debug logging for true/false
        console.log(`[Event Lesson Debug] True/False: "${converted.question?.substring(0, 40)}..."`, {
          qIsTrue: q.isTrue,
          contentIsTrue: content.isTrue,
          qCorrectAnswer: q.correctAnswer,
          contentCorrectAnswer: content.correctAnswer,
          finalCorrectAnswer: correctBool
        });
      } else if (converted.type === "fill_blank") {
        converted.correctAnswer = q.correctAnswer || content.correctAnswer || "";
        
        // Check if AI generated distractors for fill_blank
        const correctAns = String(converted.correctAnswer);
        const questionIdNum = typeof q.id === 'number' ? q.id : (parseInt(String(q.id), 10) || 1);
        
        const distractors = q.distractors || content.distractors || q.options || content.options;
        let finalDistractors: string[] = [];
        
        if (distractors && Array.isArray(distractors) && distractors.length > 0) {
          // Filter out correct answer and duplicates from AI distractors
          finalDistractors = distractors
            .filter((d: string) => d.toLowerCase() !== correctAns.toLowerCase())
            .filter((d: string, i: number, arr: string[]) => arr.indexOf(d) === i) // remove duplicates
            .slice(0, 3);
        }
        
        // If we don't have 3 distractors, pad with generated ones
        if (finalDistractors.length < 3) {
          const generatedDistractors = generateSmartDistractors(correctAns, questionIdNum);
          // Add generated distractors that aren't already in our list
          for (const gd of generatedDistractors) {
            if (finalDistractors.length >= 3) break;
            if (!finalDistractors.some(fd => fd.toLowerCase() === gd.toLowerCase()) && gd.toLowerCase() !== correctAns.toLowerCase()) {
              finalDistractors.push(gd);
            }
          }
        }
        
        const allOptions = [correctAns, ...finalDistractors.slice(0, 3)];
        converted.options = shuffleArrayWithSeed(allOptions, questionIdNum + 999);
        converted.correctIndex = converted.options.indexOf(correctAns);
      }

      return converted;
    });
  }, [lesson?.questions]);

  // Shuffle questions using lesson ID as seed for deterministic but varied order
  const questions = useMemo(() => {
    if (!lessonId || convertedQuestions.length === 0) return convertedQuestions;
    return shuffleArrayWithSeed(convertedQuestions, lessonId);
  }, [convertedQuestions, lessonId]);
  
  // Fixed XP rewards for event lessons:
  // Estude: 30 XP, Medite: 30 XP, Responda: 10 XP per correct answer (max 50 XP for 5 questions)
  const XP_ESTUDE = 30;
  const XP_MEDITE = 30;
  const XP_PER_CORRECT_ANSWER = 10;

  const estudeSections = useMemo(() => {
    const estudeContent = contentSections.estude;
    const estudeParts = estudeContent.split(/<h3[^>]*>.*?<\/h3>/i).filter(Boolean);
    const titles = (estudeContent.match(/<h3[^>]*>(.*?)<\/h3>/gi) || []).map(t => t.replace(/<[^>]*>/g, ''));
    
    const sections: any[] = [];
    // Add verse as the first section for EstudeScreen slide 0
    // THIS IS THE CRITICAL FIX: Ensure verse is always the first slide
    if (lesson?.verseText) {
      sections.push({ 
        type: "verse", 
        title: lesson.verseReference || "Referência", 
        content: lesson.verseText 
      });
    } else {
      // Fallback only if no verse at all, but we should prioritize AI content
      sections.push({ type: "verse", title: "Versículo Base", content: "Versículo base não disponível." });
    }

    // Now add topics
    sections.push({ type: "topic", title: titles[0] || "Tópico 1", content: estudeParts[0] || "" });
    sections.push({ type: "topic", title: titles[1] || "Tópico 2", content: estudeParts[1] || "" });
    sections.push({ type: "conclusion", title: "Conclusão", content: estudeParts[2] || "Conclusão do estudo." });
    
    return sections;
  }, [contentSections.estude, lesson?.verseText, lesson?.verseReference]);

  const mediteSections = useMemo(() => {
    const mediteContent = contentSections.medite;
    const mediteParts = mediteContent.split(/<hr\s*\/?>/i).filter(Boolean);
    
    const sections: any[] = [];
    sections.push({ type: "meditation", title: "Meditação", content: mediteParts[0] || mediteContent });
    sections.push({ type: "reflection", title: "Aplicação", content: mediteParts[1] || "Como você pode aplicar isso hoje?" });
    
    return sections;
  }, [contentSections.medite]);

  const handleEstudeComplete = () => {
    sounds.stageComplete();
    setAccumulatedXp(prev => prev + XP_ESTUDE);
    setStageCompleteData({
      xp: XP_ESTUDE,
      stageType: "estude",
      nextStage: contentSections.medite ? "medite" : (questions.length > 0 ? "responda" : null)
    });
    setShowStageComplete(true);
  };

  const handleMediteComplete = () => {
    sounds.stageComplete();
    setAccumulatedXp(prev => prev + XP_MEDITE);
    setStageCompleteData({
      xp: XP_MEDITE,
      stageType: "medite",
      nextStage: questions.length > 0 ? "responda" : null
    });
    setShowStageComplete(true);
  };

  const handleEstudeIndexChange = (index: number) => {
    setEstudeScreenIndex(index);
  };

  const handleMediteIndexChange = (index: number) => {
    setMediteScreenIndex(index);
  };

  const handleQuestionIndexChange = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleAnswer = (index: number, answer: any, isCorrect: boolean) => {
    if (isCorrect) {
      sounds.practiceCorrect();
      setCorrectAnswers(prev => prev + 1);
    } else {
      sounds.practiceError();
      vibrateError();
    }
  };

  const handleStageModalClose = () => {
    setShowStageComplete(false);
    if (stageCompleteData?.nextStage) {
      setCurrentStage(stageCompleteData.nextStage);
    } else {
      setLocation(`/study/events/${eventId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !data || !lesson) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation(`/study/events/${eventId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-muted-foreground">Lição não encontrada</p>
        </div>
      </div>
    );
  }

  // Check if event is accessible (not ended and not upcoming)
  if (eventData?.event) {
    const now = new Date();
    const startDate = new Date(eventData.event.startDate);
    const endDate = new Date(eventData.event.endDate);
    const isForceUnlocked = eventData.event.forceUnlock === true;
    const isEnded = eventData.event.status === "ended" || now > endDate;
    const isUpcoming = now < startDate && !isForceUnlocked;
    
    if (isEnded || isUpcoming) {
      return (
        <div className="flex flex-col min-h-screen bg-background">
          <header className="sticky top-0 z-50 bg-background border-b p-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/study/events")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
            <div className="h-12 w-12 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <p className="text-muted-foreground text-center">
              {isEnded 
                ? "Este evento já foi encerrado e não pode mais ser acessado."
                : "Este evento ainda não começou. Aguarde a data de início."}
            </p>
            <Button onClick={() => setLocation("/study/events")}>
              Voltar para Eventos
            </Button>
          </div>
        </div>
      );
    }
  }

  const stageLabels: Record<Stage, { label: string; icon: JSX.Element }> = {
    estude: { label: "Estude", icon: <BookOpen className="h-4 w-4" /> },
    medite: { label: "Medite", icon: <Heart className="h-4 w-4" /> },
    responda: { label: "Responda", icon: <Brain className="h-4 w-4" /> }
  };

  // If lesson is already completed, redirect back to event page immediately
  // No intermediate "completed" screen - user goes directly to event
  if (isCompleted && !showStageComplete) {
    setLocation(`/study/events/${eventId}`);
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          {currentStage === "estude" && (
            <motion.div
              key="estude"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <EstudeScreen
                lessonTitle={lesson.title}
                sections={estudeSections}
                onComplete={handleEstudeComplete}
                onClose={() => setLocation(`/study/events/${eventId}`)}
                initialIndex={estudeScreenIndex}
              />
            </motion.div>
          )}

          {currentStage === "medite" && (
            <motion.div
              key="medite"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <MediteScreen
                lessonTitle={lesson.title}
                sections={mediteSections}
                onComplete={handleMediteComplete}
                onClose={() => setLocation(`/study/events/${eventId}`)}
                initialIndex={mediteScreenIndex}
              />
            </motion.div>
          )}

          {currentStage === "responda" && (
            <motion.div
              key="responda"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <RespondaScreen
                lessonTitle={lesson.title}
                questions={questions}
                streak={0}
                initialQuestionIndex={currentQuestionIndex}
                initialCorrectCount={correctAnswers}
                onAnswer={(idx, ans, isCorrect) => {
                  if (isCorrect) {
                    setCorrectAnswers(prev => prev + 1);
                    sounds.practiceCorrect();
                  } else {
                    sounds.practiceError();
                    vibrateError();
                  }
                }}
                onComplete={(finalCorrect, total) => {
                   // finalCorrect now comes from RespondaScreen's internal correctCount 
                   // which was initialized with correctAnswers from localStorage
                   const score = Math.round((finalCorrect / total) * 100);
                   const xp = finalCorrect * XP_PER_CORRECT_ANSWER;
                   
                   setStageCompleteData({
                     xp,
                     stageType: "responda",
                     nextStage: null,
                     correctAnswers: finalCorrect,
                     totalQuestions: total
                   });
                   setShowStageComplete(true);
                   sounds.lessonComplete();

                   // Clear saved progress since lesson is complete
                   clearLessonProgress();

                   if (lessonId && !isCompleted) {
                     submitMutation.mutate({ 
                       correct: finalCorrect, 
                       total, 
                       score, 
                       lessonId 
                     });
                   }
                }}
                onClose={() => setLocation(`/study/events/${eventId}`)}
                onQuestionChange={handleQuestionIndexChange}
                showHearts={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <StageCompleteModal
        isOpen={showStageComplete}
        onClose={handleStageModalClose}
        xpEarned={stageCompleteData?.xp || 0}
        stageType={stageCompleteData?.stageType || "estude"}
        nextStage={stageCompleteData?.nextStage || null}
        correctAnswers={stageCompleteData?.correctAnswers}
        totalQuestions={stageCompleteData?.totalQuestions}
      />
    </div>
  );
}
