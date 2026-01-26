import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef } from "react";
import { BottomNav } from "@/components/study";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft,
  Loader2,
  Sparkles,
  Calendar,
  Clock,
  Trophy,
  CheckCircle2,
  Lock,
  Play,
  BookOpen,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { format, differenceInDays, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StudyEvent {
  id: number;
  title: string;
  description: string | null;
  theme: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  status: string;
  cardId: number | null;
  lessonsCount: number | null;
  xpMultiplier: number | null;
}

interface EventLesson {
  id: number;
  eventId: number;
  dayNumber: number;
  title: string;
  content: string;
  verseReference: string | null;
  verseText: string | null;
  questions: any[];
  xpReward: number | null;
  status: string | null;
}

interface UserProgress {
  id: number;
  lessonId: number;
  completed: boolean;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
}

interface EventDetailResponse {
  event: StudyEvent;
  lessons: EventLesson[];
  progress: UserProgress[];
}

function LessonItem({ 
  lesson, 
  progress, 
  isLocked, 
  isInProgress,
  dayNumber,
  eventId 
}: { 
  lesson: EventLesson; 
  progress?: UserProgress; 
  isLocked: boolean;
  isInProgress: boolean;
  dayNumber: number;
  eventId: number;
}) {
  const [, setLocation] = useLocation();
  const isCompleted = progress?.completed || false;

  const handleClick = () => {
    if (!isLocked && !isCompleted) {
      setLocation(`/study/eventos/${eventId}/lessons/${lesson.dayNumber}`);
    }
  };

  return (
    <motion.div
      id={`event-lesson-${lesson.id}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: dayNumber * 0.05 }}
    >
      <Card 
        className={`transition-all ${
          isLocked ? "opacity-50 cursor-not-allowed" : isCompleted ? "border-green-500/50 cursor-default" : isInProgress ? "border-primary ring-2 ring-primary/20 hover-elevate cursor-pointer" : "hover-elevate cursor-pointer"
        }`}
        onClick={handleClick}
        data-testid={`card-lesson-day-${dayNumber}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
              isCompleted 
                ? "bg-green-500/20 text-green-600" 
                : isLocked 
                  ? "bg-muted text-muted-foreground" 
                  : "bg-primary/10 text-primary"
            }`}>
              {isCompleted ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : isLocked ? (
                <Lock className="h-5 w-5" />
              ) : (
                <span className="font-bold text-lg">{dayNumber}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Dia {dayNumber}
                </span>
                {isCompleted && (
                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                    Concluído
                  </Badge>
                )}
              </div>
              <h4 className="font-medium truncate">{lesson.title}</h4>
              {lesson.verseReference && (
                <p className="text-xs text-muted-foreground truncate">
                  {lesson.verseReference}
                </p>
              )}
            </div>

            {!isLocked && !isCompleted && (
              <Play className="h-5 w-5 text-primary flex-shrink-0" />
            )}

            {isCompleted && progress && (
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-medium text-green-600">
                  {progress.correctAnswers}/{progress.totalQuestions}
                </div>
                <div className="text-xs text-muted-foreground">acertos</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function EventDetailPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id || "0");
  const { toast } = useToast();
  const scrolledRef = useRef(false);

  const { data, isLoading, error } = useQuery<EventDetailResponse>({
    queryKey: ["/api/study/events", eventId],
    enabled: !!user && eventId > 0,
  });

  useEffect(() => {
    if (data?.lessons && data?.progress && !scrolledRef.current) {
      const sortedLessons = [...data.lessons].sort((a, b) => a.dayNumber - b.dayNumber);
      const progressMap = new Map(data.progress.map(p => [p.lessonId, p]));
      
      const firstInProgress = sortedLessons.find((lesson, index) => {
        const previousLesson = index > 0 ? sortedLessons[index - 1] : null;
        const previousCompleted = previousLesson 
          ? progressMap.get(previousLesson.id)?.completed || false 
          : true;
        const currentCompleted = progressMap.get(lesson.id)?.completed || false;
        return previousCompleted && !currentCompleted && lesson.status === "published";
      });
      
      if (firstInProgress) {
        scrolledRef.current = true;
        setTimeout(() => {
          const element = document.getElementById(`event-lesson-${firstInProgress.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    }
  }, [data?.lessons, data?.progress]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/study/events")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-muted-foreground">Evento não encontrado</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const { event, lessons, progress } = data;
  const now = new Date();
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  
  // Check if event is accessible (considering forceUnlock for upcoming events)
  const isDateReached = now >= startDate;
  const isForceUnlocked = (event as any).forceUnlock === true;
  const isEnded = event.status === "ended" || isAfter(now, endDate);
  const isUpcoming = isBefore(now, startDate) && !isForceUnlocked;
  
  // Block access to ended or upcoming events
  if (isEnded || isUpcoming) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/study/events")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          <Lock className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            {isEnded 
              ? "Este evento já foi encerrado e não pode mais ser acessado."
              : "Este evento ainda não começou. Aguarde a data de início."}
          </p>
          <Button onClick={() => setLocation("/study/events")}>
            Voltar para Eventos
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }
  
  const isActive = (isDateReached || isForceUnlocked) && !isEnded;
  const daysRemaining = Math.max(0, differenceInDays(endDate, now));

  const completedLessons = progress.filter(p => p.completed).length;
  const totalLessons = lessons.length;
  const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  const progressMap = new Map(progress.map(p => [p.lessonId, p]));

  const sortedLessons = [...lessons].sort((a, b) => a.dayNumber - b.dayNumber);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="relative">
        {event.imageUrl && (
          <div className="h-48 overflow-hidden">
            <img 
              src={event.imageUrl} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}
        
        <div className={`${event.imageUrl ? 'absolute bottom-0 left-0 right-0' : 'bg-background border-b'} p-4`}>
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="ghost" 
              size="icon"
              className="bg-background/80 backdrop-blur"
              onClick={() => setLocation("/study/events")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Evento Especial
              </span>
              <h1 className="text-xl font-bold" data-testid="text-event-title">
                {event.title}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(startDate, "d MMM", { locale: ptBR })} - {format(endDate, "d MMM", { locale: ptBR })}
                </span>
              </div>
              
              {isActive && daysRemaining > 0 && (
                <div className="flex items-center gap-1.5 text-amber-600">
                  <Clock className="h-4 w-4" />
                  <span>{daysRemaining} dias restantes</span>
                </div>
              )}

              {event.cardId && (
                <div className="flex items-center gap-1.5 text-purple-600">
                  <Trophy className="h-4 w-4" />
                  <span>Card exclusivo</span>
                </div>
              )}
            </div>

            {event.description && (
              <p className="text-sm text-muted-foreground">
                {event.description}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{completedLessons}/{totalLessons} lições</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {event.xpMultiplier && event.xpMultiplier > 1 && (
              <Badge variant="secondary">
                {event.xpMultiplier}x XP neste evento
              </Badge>
            )}
          </CardContent>
        </Card>

        {(() => {
          const currentLesson = sortedLessons.find((lesson, index) => {
            const previousLesson = index > 0 ? sortedLessons[index - 1] : null;
            const previousCompleted = previousLesson 
              ? progressMap.get(previousLesson.id)?.completed || false 
              : true;
            const currentCompleted = progressMap.get(lesson.id)?.completed || false;
            const isPublished = lesson.status === 'published';
            return isPublished && previousCompleted && !currentCompleted;
          });
          
          if (currentLesson && completedLessons < totalLessons) {
            return (
              <Card 
                className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 hover-elevate cursor-pointer"
                onClick={() => setLocation(`/study/eventos/${eventId}/lessons/${currentLesson.dayNumber}`)}
                data-testid="card-continue-studying"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Play className="h-5 w-5 text-white fill-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">Continuar estudando</p>
                      <h4 className="font-semibold truncate">Dia {currentLesson.dayNumber}: {currentLesson.title}</h4>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}

        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Lições do Evento
          </h2>
          
          <div className="space-y-3">
            {sortedLessons.map((lesson, index) => {
              const previousLesson = index > 0 ? sortedLessons[index - 1] : null;
              const previousCompleted = previousLesson 
                ? progressMap.get(previousLesson.id)?.completed || false 
                : true;
              const currentCompleted = progressMap.get(lesson.id)?.completed || false;
              const isPublished = lesson.status === 'published';
              const isLocked = !isPublished || (!previousCompleted && !currentCompleted);
              const isInProgress = isPublished && previousCompleted && !currentCompleted;

              return (
                <LessonItem
                  key={lesson.id}
                  lesson={lesson}
                  progress={progressMap.get(lesson.id)}
                  isLocked={isLocked}
                  isInProgress={isInProgress}
                  dayNumber={lesson.dayNumber}
                  eventId={eventId}
                />
              );
            })}
          </div>
        </section>

        {completedLessons === totalLessons && totalLessons > 0 && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="p-4 text-center">
              <Trophy className="h-10 w-10 text-amber-500 mx-auto mb-2" />
              <h3 className="font-semibold text-lg">Parabéns!</h3>
              <p className="text-sm text-muted-foreground">
                Você completou todas as lições deste evento!
              </p>
              {event.cardId && (
                <Button 
                  className="mt-4" 
                  onClick={() => setLocation("/study/cards")}
                  data-testid="button-view-cards"
                >
                  Ver meus cards
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
