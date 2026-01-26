import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Trophy,
  Timer,
  Loader2,
  Check,
  X,
  Crown,
  Star,
  Flame,
  Target,
  Share2,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface FinalChallengeData {
  id: number;
  seasonId: number;
  title: string;
  description: string | null;
  timeLimitSeconds: number;
  questionCount: number;
  xpReward: number;
  perfectXpBonus: number;
  isActive: boolean;
  questions: Question[];
}

interface ChallengeStartResponse {
  progress: {
    id: number;
    startedAt: string;
  };
  token: string;
}

interface ChallengeResult {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  xpEarned: number;
  isPerfect: boolean;
  isMastered: boolean;
  answers: { questionIndex: number; selectedAnswer: number; isCorrect: boolean }[];
}

type ChallengeState = "loading" | "ready" | "playing" | "reviewing" | "finished";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function TimerDisplay({ 
  timeLeft, 
  totalTime 
}: { 
  timeLeft: number; 
  totalTime: number;
}) {
  const percentage = (timeLeft / totalTime) * 100;
  const isLow = timeLeft <= 30;
  const isCritical = timeLeft <= 10;

  return (
    <motion.div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border-2",
        isCritical 
          ? "bg-red-100 dark:bg-red-900/30 border-red-500" 
          : isLow 
            ? "bg-orange-100 dark:bg-orange-900/30 border-orange-500"
            : "bg-card border-border"
      )}
      animate={isCritical ? { scale: [1, 1.02, 1] } : undefined}
      transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
    >
      <Timer className={cn(
        "h-6 w-6",
        isCritical ? "text-red-500" : isLow ? "text-orange-500" : "text-muted-foreground"
      )} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            "text-2xl font-black tabular-nums",
            isCritical ? "text-red-600 dark:text-red-400" : isLow ? "text-orange-600 dark:text-orange-400" : "text-foreground"
          )}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <Progress 
          value={percentage} 
          className={cn(
            "h-2",
            isCritical ? "[&>div]:bg-red-500" : isLow ? "[&>div]:bg-orange-500" : "[&>div]:bg-primary"
          )}
        />
      </div>
    </motion.div>
  );
}

function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onSelect,
  isReviewing,
  correctAnswer,
}: {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: number | null;
  onSelect: (index: number) => void;
  isReviewing: boolean;
  correctAnswer?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary" className="text-sm">
          Pergunta {questionNumber}/{totalQuestions}
        </Badge>
        <Progress 
          value={(questionNumber / totalQuestions) * 100} 
          className="flex-1 max-w-32 h-2"
        />
      </div>

      <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl">
        <p className="text-lg font-bold text-white leading-relaxed">
          {question.question}
        </p>
      </div>

      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = isReviewing && index === correctAnswer;
          const isWrong = isReviewing && isSelected && index !== correctAnswer;

          return (
            <motion.button
              key={index}
              whileHover={!isReviewing ? { scale: 1.01 } : undefined}
              whileTap={!isReviewing ? { scale: 0.99 } : undefined}
              onClick={() => !isReviewing && onSelect(index)}
              disabled={isReviewing}
              className={cn(
                "w-full p-4 rounded-xl text-left transition-all border-2",
                "flex items-center gap-3",
                isReviewing
                  ? isCorrect
                    ? "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-200"
                    : isWrong
                      ? "bg-red-100 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-200"
                      : "bg-card border-border text-muted-foreground"
                  : isSelected
                    ? "bg-purple-100 dark:bg-purple-900/30 border-purple-500"
                    : "bg-card border-border hover:border-purple-300"
              )}
              data-testid={`option-${index}`}
            >
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                isReviewing
                  ? isCorrect
                    ? "bg-green-500 text-white"
                    : isWrong
                      ? "bg-red-500 text-white"
                      : "bg-muted text-muted-foreground"
                  : isSelected
                    ? "bg-purple-500 text-white"
                    : "bg-muted text-muted-foreground"
              )}>
                {isReviewing ? (
                  isCorrect ? <Check className="h-4 w-4" /> : isWrong ? <X className="h-4 w-4" /> : String.fromCharCode(65 + index)
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </div>
              <span className="flex-1 font-medium">{option}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function ResultScreen({
  result,
  onPlayAgain,
  onBack,
  onShare,
}: {
  result: ChallengeResult;
  onPlayAgain: () => void;
  onBack: () => void;
  onShare: () => void;
}) {
  const percentage = Math.round(result.score);
  const isGreat = percentage >= 80;
  const isGood = percentage >= 60;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div 
        className={cn(
          "p-8 rounded-2xl text-center",
          result.isPerfect 
            ? "bg-gradient-to-br from-yellow-400 to-orange-500"
            : isGreat 
              ? "bg-gradient-to-br from-green-400 to-emerald-600"
              : isGood 
                ? "bg-gradient-to-br from-blue-400 to-blue-600"
                : "bg-gradient-to-br from-gray-400 to-gray-600"
        )}
      >
        {result.isPerfect ? (
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Crown className="h-20 w-20 mx-auto text-white mb-4 drop-shadow-lg" />
          </motion.div>
        ) : isGreat ? (
          <Trophy className="h-20 w-20 mx-auto text-white mb-4" />
        ) : (
          <Target className="h-20 w-20 mx-auto text-white mb-4" />
        )}

        <h1 className="text-3xl font-black text-white mb-2">
          {result.isPerfect 
            ? "Perfeito!" 
            : isGreat 
              ? "Excelente!" 
              : isGood 
                ? "Bom trabalho!" 
                : "Continue praticando!"}
        </h1>

        <div className="text-6xl font-black text-white mb-2">
          {percentage}%
        </div>

        <p className="text-white/90">
          {result.correctAnswers} de {result.totalQuestions} corretas
        </p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted rounded-xl">
            <Flame className="h-8 w-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-foreground">{result.xpEarned}</p>
            <p className="text-sm text-muted-foreground">XP Ganhos</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-xl">
            <Check className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-foreground">{result.correctAnswers}</p>
            <p className="text-sm text-muted-foreground">Acertos</p>
          </div>
        </div>

        {result.isMastered && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-xl text-center"
          >
            <Crown className="h-6 w-6 mx-auto text-yellow-600 dark:text-yellow-400 mb-2" />
            <p className="font-bold text-yellow-800 dark:text-yellow-200">
              Temporada Dominada!
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Parabens por completar toda a temporada com excelencia!
            </p>
          </motion.div>
        )}
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onBack}
          data-testid="button-back-season"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onShare}
          data-testid="button-share"
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <Button
          className="flex-1 bg-purple-600 hover:bg-purple-700"
          onClick={onPlayAgain}
          data-testid="button-play-again"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Jogar Novamente
        </Button>
      </div>
    </motion.div>
  );
}

function ReadyScreen({
  challenge,
  onStart,
  isStarting,
}: {
  challenge: FinalChallengeData;
  onStart: () => void;
  isStarting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="p-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl text-center">
        <Trophy className="h-16 w-16 mx-auto text-white mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">{challenge.title}</h1>
        {challenge.description && (
          <p className="text-white/80">{challenge.description}</p>
        )}
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-lg text-foreground">Regras do Desafio</h2>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Timer className="h-5 w-5 text-purple-500" />
            <div>
              <p className="font-medium">Tempo Limite</p>
              <p className="text-sm text-muted-foreground">
                {formatTime(challenge.timeLimitSeconds)} para completar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Target className="h-5 w-5 text-purple-500" />
            <div>
              <p className="font-medium">{challenge.questionCount} Perguntas</p>
              <p className="text-sm text-muted-foreground">
                Baseadas nas licoes da temporada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium">{challenge.xpReward} XP</p>
              <p className="text-sm text-muted-foreground">
                +{challenge.perfectXpBonus} XP bonus por pontucao perfeita
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Crown className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-medium">Domine a Temporada</p>
              <p className="text-sm text-muted-foreground">
                Acerte 80% ou mais para dominar
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Button
        onClick={onStart}
        disabled={isStarting}
        className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700"
        style={{ boxShadow: "0 4px 0 0 #7C3AED" }}
        data-testid="button-start-challenge"
      >
        {isStarting ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Trophy className="h-5 w-5 mr-2" />
        )}
        {isStarting ? "Iniciando..." : "INICIAR DESAFIO"}
      </Button>
    </motion.div>
  );
}

export default function FinalChallengePage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const seasonId = params.id;

  const [state, setState] = useState<ChallengeState>("loading");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [result, setResult] = useState<ChallengeResult | null>(null);

  const { data: challenge, isLoading, error } = useQuery<FinalChallengeData>({
    queryKey: ["/api/study/seasons", seasonId, "final-challenge"],
    enabled: isAuthenticated && !!seasonId,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/study/seasons/${seasonId}/final-challenge/start`);
      return response.json() as Promise<ChallengeStartResponse>;
    },
    onSuccess: (data) => {
      setChallengeToken(data.token);
      setTimeLeft(challenge?.timeLimitSeconds || 150);
      setAnswers(new Array(challenge?.questions?.length || 0).fill(null));
      setCurrentQuestion(0);
      setState("playing");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao iniciar desafio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { token: string; answers: number[] }) => {
      const response = await apiRequest("POST", `/api/study/seasons/${seasonId}/final-challenge/submit`, data);
      return response.json() as Promise<ChallengeResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setState("finished");
      queryClient.invalidateQueries({ queryKey: ["/api/study/seasons", seasonId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar respostas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = useCallback(() => {
    if (!challengeToken) return;
    
    const finalAnswers = answers.map(a => a ?? -1);
    submitMutation.mutate({ token: challengeToken, answers: finalAnswers });
  }, [challengeToken, answers, submitMutation]);

  useEffect(() => {
    if (state !== "playing" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, timeLeft, handleSubmit]);

  useEffect(() => {
    if (challenge && !isLoading && !error) {
      setState("ready");
    }
  }, [challenge, isLoading, error]);

  const handleAnswer = (index: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = index;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < (challenge?.questions?.length || 0) - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleBack = () => {
    setLocation(`/study/season/${seasonId}`);
  };

  const handlePlayAgain = () => {
    setResult(null);
    setAnswers([]);
    setCurrentQuestion(0);
    setChallengeToken(null);
    setState("ready");
  };

  const handleShare = async () => {
    if (!result) return;

    const text = `Completei o Desafio Final com ${Math.round(result.score)}% de acerto e ganhei ${result.xpEarned} XP!${result.isPerfect ? " Pontuação PERFEITA!" : ""} #UMPEmaus #EstudoBíblico`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copiado!", description: "Texto copiado para a área de transferência" });
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copiado!", description: "Texto copiado para a área de transferência" });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="challenge-loading">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
          <p className="text-muted-foreground">Carregando desafio...</p>
        </div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="challenge-error">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-foreground mb-2">Erro ao carregar</h1>
          <p className="text-muted-foreground mb-4">
            Não foi possível carregar o desafio. Verifique se você completou todas as lições.
          </p>
          <Button onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="challenge-page">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 p-4">
          {state !== "playing" && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="font-bold text-lg text-foreground">
              {state === "playing" ? "Desafio Final" : challenge.title}
            </h1>
          </div>
          {state === "playing" && (
            <TimerDisplay 
              timeLeft={timeLeft} 
              totalTime={challenge.timeLimitSeconds} 
            />
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <AnimatePresence mode="wait">
          {state === "ready" && (
            <ReadyScreen
              key="ready"
              challenge={challenge}
              onStart={() => startMutation.mutate()}
              isStarting={startMutation.isPending}
            />
          )}

          {state === "playing" && challenge.questions && (
            <motion.div key="playing" className="space-y-6">
              <QuestionCard
                question={challenge.questions[currentQuestion]}
                questionNumber={currentQuestion + 1}
                totalQuestions={challenge.questions.length}
                selectedAnswer={answers[currentQuestion]}
                onSelect={handleAnswer}
                isReviewing={false}
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  className="flex-1"
                  data-testid="button-previous"
                >
                  Anterior
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={answers[currentQuestion] === null || submitMutation.isPending}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  data-testid="button-next"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {currentQuestion === challenge.questions.length - 1 ? "Finalizar" : "Proxima"}
                </Button>
              </div>

              <div className="flex justify-center gap-2 flex-wrap">
                {challenge.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={cn(
                      "w-8 h-8 rounded-full text-sm font-bold transition-all",
                      index === currentQuestion
                        ? "bg-purple-600 text-white"
                        : answers[index] !== null
                          ? "bg-purple-200 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200"
                          : "bg-muted text-muted-foreground"
                    )}
                    data-testid={`question-nav-${index}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {state === "finished" && result && (
            <ResultScreen
              key="finished"
              result={result}
              onPlayAgain={handlePlayAgain}
              onBack={handleBack}
              onShare={handleShare}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
