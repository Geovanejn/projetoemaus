import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, Star, Trophy, Clock, Lock, Loader2, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  MultipleChoiceExercise,
  TrueFalseExercise,
  FillBlankExercise,
} from "@/components/study/ExerciseCard";
import { useSounds } from "@/hooks/use-sounds";
import { GoldenMasteryAnimation } from "@/components/study/GoldenMasteryAnimation";

interface PracticeQuestion {
  id: number;
  type: string;
  content: {
    question?: string;
    statement?: string;
    options?: string[];
    correctIndex?: number;
    isTrue?: boolean;
    correctAnswer?: string;
  };
  orderIndex: number;
}

interface PracticeStartResponse {
  questions: PracticeQuestion[];
  timeLimit: number;
  totalQuestions: number;
}

interface PracticeCompleteResponse {
  starsEarned: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  completedWithinTime: boolean;
  isMastered: boolean;
}

interface StudyWeek {
  id: number;
  weekNumber: number;
  year: number;
  title: string;
}

export default function PracticePage() {
  const params = useParams<{ weekId: string }>();
  const paramWeekId = parseInt(params.weekId || "0");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { sounds, vibrateError } = useSounds();
  
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [result, setResult] = useState<PracticeCompleteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGoldenAnimation, setShowGoldenAnimation] = useState(false);
  const hasPlayedResultSoundRef = useRef(false);

  const { data: weeks, isLoading: weeksLoading } = useQuery<StudyWeek[]>({
    queryKey: ['/api/study/weeks'],
    enabled: !!user && paramWeekId === 0,
  });

  const weekId = paramWeekId > 0 ? paramWeekId : (weeks?.[0]?.id || 0);

  // Query practice status to check if already mastered
  interface PracticeStatusResponse {
    isUnlocked: boolean;
    isMastered: boolean;
    starsEarned: number;
    lessonsCompleted: number;
    totalLessons: number;
  }

  const { data: practiceStatus, isLoading: statusLoading } = useQuery<PracticeStatusResponse>({
    queryKey: ['/api/study/practice', weekId.toString(), 'status'],
    enabled: !!user && weekId > 0,
  });

  const startPracticeMutation = useMutation({
    mutationFn: async () => {
      if (weekId === 0) throw new Error("Semana não encontrada");
      const response = await apiRequest("POST", `/api/study/practice/${weekId}/start`);
      return response.json() as Promise<PracticeStartResponse>;
    },
    onSuccess: (data) => {
      setQuestions(data.questions);
      setTimeRemaining(data.timeLimit);
      setIsStarted(true);
      setStartTime(Date.now());
      setError(null);
      sounds.click();
    },
    onError: (err: any) => {
      if (err.message) {
        setError(err.message);
      } else {
        setError("Erro ao iniciar o Pratique");
      }
      sounds.error();
    }
  });

  const completePracticeMutation = useMutation({
    mutationFn: async (data: { correctAnswers: number; timeSpentSeconds: number }) => {
      const response = await apiRequest("POST", `/api/study/practice/${weekId}/complete`, data);
      return response.json() as Promise<PracticeCompleteResponse>;
    },
    onSuccess: (data) => {
      setResult(data);
      setIsFinished(true);
      hasPlayedResultSoundRef.current = false;
      
      if (data.starsEarned === 3 && data.isMastered) {
        setShowGoldenAnimation(true);
      } else if (data.starsEarned > 0) {
        sounds.success();
        for (let i = 0; i < data.starsEarned; i++) {
          setTimeout(() => sounds.star(), 300 + i * 200);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/study/practice', weekId.toString(), 'status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study/weeks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study/profile'] });
    }
  });

  useEffect(() => {
    if (!isStarted || isFinished || showFeedback) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 120;
          completePracticeMutation.mutate({ correctAnswers: correctCount, timeSpentSeconds: timeSpent });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, isFinished, showFeedback, correctCount, startTime]);

  const handleAnswer = useCallback((isCorrect: boolean) => {
    setFeedbackCorrect(isCorrect);
    setShowFeedback(true);
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      sounds.practiceCorrect();
    } else {
      sounds.practiceError();
      vibrateError();
    }
  }, [sounds, vibrateError]);

  const handleContinue = useCallback(() => {
    setShowFeedback(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 120;
      const finalCorrect = feedbackCorrect ? correctCount : correctCount;
      completePracticeMutation.mutate({ 
        correctAnswers: finalCorrect, 
        timeSpentSeconds: timeSpent 
      });
    }
  }, [currentIndex, questions.length, startTime, correctCount, feedbackCorrect]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStars = (count: number, size: "sm" | "lg" = "lg") => {
    const starSize = size === "lg" ? "h-10 w-10" : "h-6 w-6";
    return (
      <div className="flex gap-1">
        {[1, 2, 3].map((star) => (
          <motion.div
            key={star}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: star * 0.2, type: "spring", stiffness: 200 }}
          >
            <Star
              className={cn(
                starSize,
                star <= count
                  ? "text-yellow-400 fill-yellow-400 drop-shadow-lg"
                  : "text-muted-foreground/30"
              )}
            />
          </motion.div>
        ))}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Lock className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Faca login para acessar o Pratique</p>
        <Button onClick={() => setLocation("/login")} className="mt-4" data-testid="button-login">
          Fazer Login
        </Button>
      </div>
    );
  }

  if (weeksLoading || statusLoading || (paramWeekId === 0 && weekId === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Show "already completed" screen if practice is already mastered (3 stars)
  if (practiceStatus?.isMastered && !isStarted && !isFinished) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 flex items-center gap-3 p-4 border-b bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/study')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg">Pratique</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-6 shadow-xl"
          >
            <Crown className="h-12 w-12 text-white" />
          </motion.div>

          <div className="flex gap-1 mb-4">
            {[1, 2, 3].map((star) => (
              <motion.div
                key={star}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: star * 0.2, type: "spring", stiffness: 200 }}
              >
                <Star className="h-10 w-10 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
              </motion.div>
            ))}
          </div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-2xl font-bold mb-2"
          >
            Você já dominou esta semana!
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-muted-foreground mb-6 max-w-xs"
          >
            Parabéns! Você completou o Pratique com 3 estrelas. Continue estudando as próximas semanas!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <Button
              size="lg"
              onClick={() => setLocation('/study')}
              data-testid="button-back-study"
            >
              Voltar ao Estudo
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 flex items-center gap-3 p-4 border-b bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/study')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg">Pratique</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Lock className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Pratique Bloqueado</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => setLocation('/study')} data-testid="button-go-study">
            Voltar ao Estudo
          </Button>
        </div>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 flex items-center gap-3 p-4 border-b bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/study')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg">Pratique</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-6 shadow-xl"
          >
            <Trophy className="h-12 w-12 text-white" />
          </motion.div>
          
          <h2 className="text-2xl font-bold mb-2">Desafio Pratique</h2>
          <p className="text-muted-foreground mb-6 max-w-xs">
            Responda 10 perguntas em 2 minutos para ganhar estrelas e dominar a semana!
          </p>

          <div className="flex flex-col gap-4 mb-8 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">2 minutos</p>
                <p className="text-sm text-muted-foreground">Tempo limite</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">3 Estrelas</p>
                <p className="text-sm text-muted-foreground">10 acertos no tempo</p>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full max-w-xs py-6 text-lg font-bold"
            onClick={() => startPracticeMutation.mutate()}
            disabled={startPracticeMutation.isPending}
            data-testid="button-start-practice"
          >
            {startPracticeMutation.isPending ? "Carregando..." : "INICIAR DESAFIO"}
          </Button>
        </div>
      </div>
    );
  }

  if (isFinished && result) {
    const getMessage = () => {
      if (result.starsEarned === 3) return "Perfeito! Você dominou!";
      if (result.starsEarned === 2) return "Ótimo trabalho!";
      if (result.starsEarned === 1) return "Bom começo!";
      return "Continue praticando!";
    };

    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 flex items-center gap-3 p-4 border-b bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/study')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg">Resultado</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl",
              result.isMastered
                ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                : "bg-gradient-to-br from-primary to-primary/70"
            )}
          >
            <Trophy className="h-12 w-12 text-white" />
          </motion.div>

          {renderStars(result.starsEarned)}
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-2xl font-bold mt-6 mb-2"
          >
            {getMessage()}
          </motion.h2>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-muted-foreground mb-6 space-y-1"
          >
            <p>{result.correctAnswers} de {result.totalQuestions} corretas</p>
            <p className="text-sm">
              Tempo: {formatTime(result.timeSpentSeconds)}
              {result.completedWithinTime && (
                <span className="text-green-500 ml-2">(dentro do tempo!)</span>
              )}
            </p>
          </motion.div>

          {result.isMastered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 }}
              className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6 max-w-xs"
            >
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                Todas as licoes da semana ficaram douradas!
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="flex flex-col gap-3 w-full max-w-xs"
          >
            {result.starsEarned < 3 && (
              <Button
                size="lg"
                onClick={() => {
                  setIsFinished(false);
                  setIsStarted(false);
                  setQuestions([]);
                  setCurrentIndex(0);
                  setCorrectCount(0);
                  setResult(null);
                  setTimeRemaining(120);
                }}
                data-testid="button-try-again"
              >
                Tentar Novamente
              </Button>
            )}
            <Button
              variant={result.starsEarned >= 3 ? "default" : "outline"}
              onClick={() => setLocation('/study')}
              data-testid="button-back-study"
            >
              Voltar ao Estudo
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              {currentQuestion.type === "multiple_choice" && (
                <MultipleChoiceExercise
                  key={`mc-${currentIndex}-${currentQuestion.id}`}
                  question={currentQuestion.content.question || ""}
                  options={currentQuestion.content.options || []}
                  correctIndex={currentQuestion.content.correctIndex || 0}
                  onAnswer={handleAnswer}
                />
              )}

              {currentQuestion.type === "true_false" && (
                <TrueFalseExercise
                  key={`tf-${currentIndex}-${currentQuestion.id}`}
                  statement={currentQuestion.content.statement || ""}
                  isTrue={currentQuestion.content.isTrue || false}
                  onAnswer={handleAnswer}
                />
              )}

              {currentQuestion.type === "fill_blank" && (
                <FillBlankExercise
                  key={`fb-${currentIndex}-${currentQuestion.id}`}
                  question={currentQuestion.content.question || ""}
                  correctAnswer={currentQuestion.content.correctAnswer || ""}
                  options={currentQuestion.content.options}
                  onAnswer={handleAnswer}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 p-4 border-t",
              feedbackCorrect 
                ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800" 
                : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                feedbackCorrect ? "bg-green-500" : "bg-red-500"
              )}>
                {feedbackCorrect ? (
                  <CheckCircle2 className="h-6 w-6 text-white" />
                ) : (
                  <XCircle className="h-6 w-6 text-white" />
                )}
              </div>
              <p className={cn(
                "font-bold text-lg",
                feedbackCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
              )}>
                {feedbackCorrect ? "Correto!" : "Incorreto"}
              </p>
            </div>
            
            <Button 
              onClick={handleContinue} 
              className={cn(
                "w-full py-6 font-bold text-lg",
                feedbackCorrect 
                  ? "bg-green-500 hover:bg-green-600" 
                  : "bg-red-500 hover:bg-red-600"
              )}
              data-testid="button-continue"
            >
              CONTINUAR
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <GoldenMasteryAnimation
        show={showGoldenAnimation}
        starsEarned={result?.starsEarned || 0}
        onClose={() => setShowGoldenAnimation(false)}
      />
    </div>
  );
}
