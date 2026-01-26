import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
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
  Clock,
  Send,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Share2,
  PenLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSound } from "@/hooks/use-sound";
import { useSounds } from "@/hooks/use-sounds";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { SiWhatsapp } from "react-icons/si";

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
  MessageSquare,
  Share2,
};

interface MissionDetail {
  id: number;
  missionId: number;
  completed: boolean;
  mission: {
    id: number;
    type: string;
    title: string;
    description: string;
    icon: string;
    xpReward: number;
  };
  content?: {
    dailyVerse?: string;
    verseReference?: string;
    bibleCharacter?: string;
    characterStory?: string;
    bibleFact?: string;
    themeToMemorize?: string;
    themeExplanation?: string;
    quizQuestions?: Array<{
      question: string;
      options: string[];
      correctIndex: number;
    }>;
  };
}

function VerseReaderActivity({ 
  content, 
  onComplete 
}: { 
  content: MissionDetail['content']; 
  onComplete: () => void;
}) {
  const [hasRead, setHasRead] = useState(false);
  const { sounds } = useSounds();

  const handleMarkRead = () => {
    setHasRead(true);
    sounds.click();
  };

  const handleComplete = () => {
    sounds.success();
    onComplete();
  };

  return (
    <div className="space-y-6" data-testid="verse-reader-activity">
      <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
        <div className="text-center mb-4">
          <BookMarked className="w-12 h-12 mx-auto text-amber-600 mb-3" />
          <h3 className="text-lg font-bold text-foreground">Versículo do Dia</h3>
        </div>
        
        <blockquote className="text-lg italic text-center text-foreground/90 mb-4 leading-relaxed">
          "{content?.dailyVerse || 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.'}"
        </blockquote>
        
        <p className="text-center font-semibold text-amber-700 dark:text-amber-400" data-testid="verse-reference">
          {content?.verseReference || 'João 3:16'}
        </p>
      </Card>

      <div className="space-y-4">
        <p className="text-center text-muted-foreground">
          Tire um momento para refletir sobre este versículo e deixe a Palavra de Deus tocar seu coração.
        </p>
        
        {!hasRead ? (
          <Button 
            onClick={handleMarkRead} 
            className="w-full bg-amber-600 text-white"
            data-testid="button-mark-read"
          >
            Já li e meditei
          </Button>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Button 
              onClick={handleComplete} 
              className="w-full bg-[#58CC02] text-white"
              data-testid="button-complete-verse"
            >
              <Check className="w-4 h-4 mr-2" />
              Concluir Missão
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function QuizActivity({ 
  content, 
  missionType,
  onComplete 
}: { 
  content: MissionDetail['content']; 
  missionType: string;
  onComplete: () => void;
}) {
  const { sounds, vibrateError } = useSounds();
  
  // Quiz Rápido: 5 perguntas em 30 segundos, precisa acertar TODAS
  // Timed Challenge: 5 perguntas em 30 segundos, precisa acertar TODAS
  const isQuickQuiz = missionType === 'quick_quiz';
  const isTimedChallenge = missionType === 'timed_challenge';
  const needsAllCorrect = isQuickQuiz || isTimedChallenge;
  
  // Check if we have valid AI-generated questions - NO FALLBACK
  const hasValidQuestions = content?.quizQuestions && content.quizQuestions.length >= 5;
  
  const getShuffledQuestions = (sourceQuestions: Array<{ question: string; options: string[]; correctIndex: number }>) => {
    const shuffled = [...sourceQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  };

  const [questions, setQuestions] = useState(() => {
    if (hasValidQuestions) {
      return getShuffledQuestions(content.quizQuestions!);
    }
    return []; // Empty if no AI content
  });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(needsAllCorrect ? 30 : null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [failed, setFailed] = useState(false);
  const [timedOutFlag, setTimedOutFlag] = useState(false);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || quizComplete || failed) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          setTimedOutFlag(true);
          setFailed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, quizComplete, failed]);

  const resetQuiz = () => {
    if (hasValidQuestions) {
      setQuestions(getShuffledQuestions(content.quizQuestions!));
    }
    setCurrentQuestion(0);
    setCorrectAnswers(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(30);
    setQuizComplete(false);
    setFailed(false);
    setTimedOutFlag(false);
  };
  
  // Show error state if no AI-generated questions available
  if (!hasValidQuestions || questions.length === 0) {
    return (
      <div className="space-y-6 text-center" data-testid="quiz-no-content">
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900">
          <AlertCircle className="w-10 h-10 text-amber-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">Conteúdo em Preparação</h3>
          <p className="text-muted-foreground">
            As perguntas do quiz estão sendo geradas. Por favor, volte mais tarde.
          </p>
        </div>
      </div>
    );
  }

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null || timedOutFlag || failed || (timeLeft !== null && timeLeft <= 0)) return;
    
    setSelectedAnswer(index);
    const isCorrect = index === questions[currentQuestion].correctIndex;
    
    if (isCorrect) {
      setCorrectAnswers(prev => {
        const newValue = prev + 1;
        return newValue;
      });
      sounds.practiceCorrect();
    } else {
      sounds.practiceError();
      vibrateError();
      // Para quick_quiz e timed_challenge: errou uma = falhou imediatamente
      if (needsAllCorrect) {
        setTimeout(() => {
          setFailed(true);
        }, 1000);
        return;
      }
    }
    
    setShowResult(true);
    
    setTimeout(() => {
      if (timedOutFlag || failed) return;
      
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setQuizComplete(true);
        sounds.success();
      }
    }, 1000);
  };

  // Se falhou (errou ou tempo esgotou), mostrar tela de retry
  if (failed) {
    return (
      <div className="space-y-6 text-center" data-testid="quiz-result-failed">
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-red-500">
          {timedOutFlag ? <Clock className="w-10 h-10 text-white" /> : <Target className="w-10 h-10 text-white" />}
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {timedOutFlag ? 'Tempo Esgotado!' : 'Ops! Você errou'}
          </h3>
          <p className="text-muted-foreground">
            {timedOutFlag 
              ? 'O tempo acabou antes de você responder todas as perguntas.' 
              : 'Você precisa acertar todas as 5 perguntas sem errar.'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Acertou {correctAnswers} de {questions.length} perguntas.
          </p>
        </div>

        <Button 
          onClick={resetQuiz}
          variant="outline"
          className="w-full"
          data-testid="button-retry-quiz"
        >
          <Clock className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  if (quizComplete) {
    return (
      <div className="space-y-6 text-center" data-testid="quiz-result">
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-[#58CC02]">
          <Star className="w-10 h-10 text-white" />
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">Parabéns!</h3>
          <p className="text-muted-foreground">
            Você acertou {correctAnswers} de {questions.length} perguntas!
          </p>
        </div>

        <Button 
          onClick={onComplete} 
          className="w-full bg-[#58CC02] text-white"
          data-testid="button-complete-quiz"
        >
          <Check className="w-4 h-4 mr-2" />
          Concluir Missão
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="quiz-activity">
      {timeLeft !== null && (
        <div className="flex items-center justify-center gap-2 text-lg font-bold">
          <Clock className="w-5 h-5 text-orange-500" />
          <span className={timeLeft <= 10 ? 'text-red-500' : 'text-foreground'}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      )}

      <Progress 
        value={(currentQuestion / questions.length) * 100} 
        className="h-2"
      />
      
      <p className="text-sm text-muted-foreground text-center">
        Pergunta {currentQuestion + 1} de {questions.length}
      </p>

      <Card className="p-6">
        <h3 className="text-lg font-bold text-center mb-6" data-testid="quiz-question">
          {questions[currentQuestion].question}
        </h3>

        <div className="space-y-3">
          {questions[currentQuestion].options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === questions[currentQuestion].correctIndex;
            
            let buttonClass = "w-full justify-start text-left p-4 min-h-[56px] h-auto whitespace-normal break-words";
            if (showResult) {
              if (isCorrect) {
                buttonClass += " bg-[#58CC02] text-white";
              } else if (isSelected && !isCorrect) {
                buttonClass += " bg-red-500 text-white";
              }
            }

            return (
              <Button
                key={index}
                variant={showResult ? "default" : "outline"}
                className={buttonClass}
                onClick={() => handleAnswer(index)}
                disabled={selectedAnswer !== null}
                data-testid={`quiz-option-${index}`}
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3 text-sm font-bold">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1 break-words overflow-hidden">{option}</span>
              </Button>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-center gap-1">
        {questions.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full ${
              index < currentQuestion 
                ? 'bg-[#58CC02]' 
                : index === currentQuestion 
                  ? 'bg-orange-500' 
                  : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function BibleCharacterActivity({ 
  content, 
  onComplete 
}: { 
  content: MissionDetail['content']; 
  onComplete: () => void;
}) {
  const [hasRead, setHasRead] = useState(false);

  // Check if we have valid AI-generated content - NO FALLBACK
  const hasValidCharacter = content?.bibleCharacter && content.bibleCharacter.length > 0;
  
  if (!hasValidCharacter) {
    return (
      <div className="space-y-6 text-center" data-testid="character-no-content">
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900">
          <AlertCircle className="w-10 h-10 text-purple-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">Conteúdo em Preparação</h3>
          <p className="text-muted-foreground">
            O personagem bíblico do dia está sendo gerado. Por favor, volte mais tarde.
          </p>
        </div>
      </div>
    );
  }

  const character = content.bibleCharacter;
  const story = content?.characterStory || 'História sendo carregada...';

  return (
    <div className="space-y-6" data-testid="bible-character-activity">
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-3">
            <User className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-foreground" data-testid="character-name">
            {character}
          </h3>
          <Badge variant="secondary" className="mt-2">Personagem Bíblico do Dia</Badge>
        </div>
        
        <p className="text-foreground/90 leading-relaxed text-center" data-testid="character-story">
          {story}
        </p>
      </Card>

      {!hasRead ? (
        <Button 
          onClick={() => setHasRead(true)} 
          className="w-full bg-purple-600 text-white"
          data-testid="button-understood"
        >
          Entendi a história
        </Button>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Button 
            onClick={onComplete} 
            className="w-full bg-[#58CC02] text-white"
            data-testid="button-complete-character"
          >
            <Check className="w-4 h-4 mr-2" />
            Concluir Missão
          </Button>
        </motion.div>
      )}
    </div>
  );
}

const prayerTypes = [
  {
    type: 'gratitude',
    title: 'Oração de Gratidão',
    description: 'Escreva uma oração curta agradecendo a Deus por algo especial em sua vida.',
    placeholder: 'Obrigado, Deus, por...',
    icon: Heart,
    gradient: 'from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30',
    border: 'border-rose-200 dark:border-rose-800',
    iconColor: 'text-rose-500',
  },
  {
    type: 'confession',
    title: 'Confissão de Pecados',
    description: 'Confesse a Deus algo que pesa em seu coração. Ele é fiel e justo para nos perdoar.',
    placeholder: 'Senhor, eu confesso que...',
    icon: Heart,
    gradient: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-500',
  },
  {
    type: 'petition',
    title: 'Oração de Petição',
    description: 'Apresente seus pedidos a Deus com fé. Ele ouve e responde as orações dos seus filhos.',
    placeholder: 'Senhor, eu te peço...',
    icon: Heart,
    gradient: 'from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30',
    border: 'border-sky-200 dark:border-sky-800',
    iconColor: 'text-sky-500',
  },
];

function PrayerActivity({ 
  onComplete 
}: { 
  onComplete: (prayerText: string) => void;
}) {
  const [prayer, setPrayer] = useState('');
  const minLength = 10;
  
  // Select prayer type based on day of year (rotates daily)
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const prayerType = prayerTypes[dayOfYear % prayerTypes.length];
  const IconComponent = prayerType.icon;

  return (
    <div className="space-y-6" data-testid="prayer-activity">
      <Card className={`p-6 bg-gradient-to-br ${prayerType.gradient} ${prayerType.border}`}>
        <div className="text-center mb-4">
          <IconComponent className={`w-12 h-12 mx-auto ${prayerType.iconColor} mb-3`} />
          <h3 className="text-lg font-bold text-foreground">{prayerType.title}</h3>
          <p className="text-sm text-muted-foreground mt-2">
            {prayerType.description}
          </p>
        </div>

        <Textarea
          placeholder={prayerType.placeholder}
          value={prayer}
          onChange={(e) => setPrayer(e.target.value)}
          className="min-h-[120px] resize-none"
          data-testid="prayer-textarea"
        />
        
        <p className="text-xs text-muted-foreground text-right mt-2">
          {prayer.length} caracteres (mínimo {minLength})
        </p>
      </Card>

      <Button 
        onClick={() => onComplete(prayer)} 
        disabled={prayer.length < minLength}
        className="w-full bg-[#58CC02] text-white"
        data-testid="button-submit-prayer"
      >
        <Send className="w-4 h-4 mr-2" />
        Enviar Oração
      </Button>
    </div>
  );
}

function BibleFactActivity({ 
  content, 
  onComplete 
}: { 
  content: MissionDetail['content']; 
  onComplete: () => void;
}) {
  const [hasRead, setHasRead] = useState(false);
  const [generating, setGenerating] = useState(false);
  const shareContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fact = content?.bibleFact || 
    'O livro de Ester é um dos dois livros da Bíblia que não menciona o nome de Deus diretamente (o outro é Cantares de Salomão). Mesmo assim, a providência divina é claramente vista em toda a narrativa.';

  const generateAndShareWhatsApp = useCallback(async () => {
    if (!shareContainerRef.current) return;
    setGenerating(true);
    
    try {
      // Take literal screenshot of the 9:16 share container
      const canvas = await html2canvas(shareContainerRef.current, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
        imageTimeout: 0,
      });

      const shareText = `*Curiosidade Bíblica* - UMP Emaús\n\n${fact}\n\nAcesse: umpemaus.com.br`;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast({ title: "Erro ao gerar imagem", variant: "destructive" });
          setGenerating(false);
          return;
        }
        const file = new File([blob], 'curiosidade-biblica.png', { type: 'image/png' });
        try {
          await navigator.clipboard.writeText(shareText);
        } catch (e) {
          console.log('Could not copy to clipboard');
        }
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          toast({ 
            title: "Legenda copiada!", 
            description: "Cole no campo 'Adicione uma legenda' do WhatsApp" 
          });
          await navigator.share({
            files: [file],
            title: 'Curiosidade Bíblica',
          });
        } else {
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
          window.open(whatsappUrl, '_blank');
        }
        setGenerating(false);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Error generating image:', error);
      toast({ title: "Erro ao gerar imagem", variant: "destructive" });
      setGenerating(false);
    }
  }, [fact, toast]);

  return (
    <div className="space-y-6" data-testid="bible-fact-activity">
      {/* 9:16 aspect ratio share container - visible to user */}
      <div 
        ref={shareContainerRef}
        className="rounded-2xl overflow-hidden mx-auto"
        style={{ 
          background: 'linear-gradient(135deg, #FEF9C3 0%, #FDE68A 50%, #FCD34D 100%)',
          width: '100%',
          maxWidth: '320px',
          aspectRatio: '9/16',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px'
        }}
      >
        {/* Main content area */}
        <div className="flex-1 flex flex-col justify-center">
          <Card className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 shadow-lg">
            <div className="text-center mb-4">
              <Lightbulb className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
              <h3 className="text-lg font-bold text-gray-900">Você Sabia?</h3>
              <Badge className="mt-2 bg-yellow-100 text-yellow-800 border-yellow-300">Fato Bíblico do Dia</Badge>
            </div>
            
            <p className="text-gray-800 leading-relaxed text-center text-sm" data-testid="bible-fact">
              {fact}
            </p>
          </Card>
        </div>

        {/* Footer with black UMP logo */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <img 
            src="/logo-ump.png" 
            alt="UMP Emaús" 
            className="w-10 h-10 object-contain"
            crossOrigin="anonymous"
            style={{ filter: 'brightness(0)' }}
          />
          <div className="text-center">
            <p className="font-bold text-gray-900 text-sm">UMP Emaús</p>
            <p className="text-gray-600 text-xs">umpemaus.com.br</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {!hasRead ? (
          <Button 
            onClick={() => setHasRead(true)} 
            className="w-full bg-yellow-600 text-white"
            data-testid="button-understood-fact"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Interessante!
          </Button>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-3"
          >
            <Button 
              onClick={generateAndShareWhatsApp}
              disabled={generating}
              className="w-full bg-[#25D366] hover:bg-[#20BD5B] text-white"
              data-testid="button-share-whatsapp-fact"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <SiWhatsapp className="w-4 h-4 mr-2" />
              )}
              Compartilhar no WhatsApp
            </Button>
            <Button 
              onClick={onComplete} 
              className="w-full bg-[#58CC02] text-white"
              data-testid="button-complete-fact"
            >
              <Check className="w-4 h-4 mr-2" />
              Concluir Missão
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function MemorizeThemeActivity({ 
  content, 
  onComplete 
}: { 
  content: MissionDetail['content']; 
  onComplete: () => void;
}) {
  const [step, setStep] = useState<'read' | 'test' | 'done'>('read');
  const [userAnswer, setUserAnswer] = useState('');

  const theme = content?.themeToMemorize || 'Graça';
  const explanation = content?.themeExplanation || 
    'A Graça é o favor imerecido de Deus para conosco. Não conseguimos merecer a salvação por nossas obras, mas Deus nos oferece gratuitamente através de Jesus Cristo.';

  const handleTest = () => {
    if (userAnswer.toLowerCase().includes(theme.toLowerCase())) {
      setStep('done');
    }
  };

  return (
    <div className="space-y-6" data-testid="memorize-theme-activity">
      <Card className="p-6 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 border-cyan-200 dark:border-cyan-800">
        <div className="text-center mb-4">
          <Brain className="w-12 h-12 mx-auto text-cyan-600 mb-3" />
          <h3 className="text-lg font-bold text-foreground">Tema do Dia</h3>
        </div>
        
        {step === 'read' && (
          <>
            <div className="text-center mb-4">
              <span className="text-3xl font-black text-cyan-600" data-testid="theme-word">
                {theme}
              </span>
            </div>
            <p className="text-foreground/90 leading-relaxed text-center" data-testid="theme-explanation">
              {explanation}
            </p>
          </>
        )}

        {step === 'test' && (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              Qual foi o tema que você acabou de estudar?
            </p>
            <Textarea
              placeholder="Digite o tema..."
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="text-center"
              data-testid="theme-answer-input"
            />
          </div>
        )}

        {step === 'done' && (
          <div className="text-center">
            <Check className="w-16 h-16 mx-auto text-[#58CC02] mb-3" />
            <p className="text-[#58CC02] font-bold">Correto! Você memorizou o tema.</p>
          </div>
        )}
      </Card>

      {step === 'read' && (
        <Button 
          onClick={() => setStep('test')} 
          className="w-full bg-cyan-600 text-white"
          data-testid="button-test-memory"
        >
          <Brain className="w-4 h-4 mr-2" />
          Testar Memória
        </Button>
      )}

      {step === 'test' && (
        <Button 
          onClick={handleTest} 
          disabled={userAnswer.length < 2}
          className="w-full bg-cyan-600 text-white"
          data-testid="button-check-answer"
        >
          Verificar
        </Button>
      )}

      {step === 'done' && (
        <Button 
          onClick={onComplete} 
          className="w-full bg-[#58CC02] text-white"
          data-testid="button-complete-memorize"
        >
          <Check className="w-4 h-4 mr-2" />
          Concluir Missão
        </Button>
      )}
    </div>
  );
}

function VerseMemoryActivity({ 
  content, 
  onComplete 
}: { 
  content: MissionDetail['content']; 
  onComplete: () => void;
}) {
  const { sounds } = useSounds();
  const [step, setStep] = useState<'read' | 'fill' | 'done'>('read');
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  
  // Fetch the daily verse from API
  const { data: dailyVerseData } = useQuery<{ verse: string; reference: string }>({
    queryKey: ["/api/site/daily-verse"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Use content from mission first, then daily verse from API, then fallback
  const verse = content?.dailyVerse || dailyVerseData?.verse || "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.";
  const reference = content?.verseReference || dailyVerseData?.reference || "João 3:16";
  
  const words = verse.split(' ');
  const blanksIndices = [2, 5, 8, 11].filter(i => i < words.length);
  const correctAnswers = blanksIndices.map(i => words[i].replace(/[.,;:!?]/g, ''));

  const handleCheck = () => {
    const allCorrect = userAnswers.every((ans, idx) => 
      ans.toLowerCase().trim() === correctAnswers[idx].toLowerCase()
    );
    
    if (allCorrect) {
      sounds.success();
      setStep('done');
    } else {
      sounds.error();
    }
  };

  return (
    <div className="space-y-6" data-testid="verse-memory-activity">
      <Card className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200 dark:border-violet-800">
        <div className="text-center mb-4">
          <Brain className="w-12 h-12 mx-auto text-violet-600 mb-3" />
          <h3 className="text-lg font-bold text-foreground">Memorize o Versículo</h3>
        </div>
        
        {step === 'read' && (
          <>
            <blockquote className="text-lg italic text-center text-foreground/90 mb-4 leading-relaxed">
              "{verse}"
            </blockquote>
            <p className="text-center font-semibold text-violet-700 dark:text-violet-400">
              {reference}
            </p>
          </>
        )}

        {step === 'fill' && (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground mb-4">
              Complete as palavras que faltam:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {words.map((word, idx) => {
                const blankIdx = blanksIndices.indexOf(idx);
                if (blankIdx !== -1) {
                  return (
                    <input
                      key={idx}
                      type="text"
                      className="w-24 px-2 py-1 border-2 border-violet-300 rounded text-center bg-background"
                      placeholder="..."
                      value={userAnswers[blankIdx] || ''}
                      onChange={(e) => {
                        const newAnswers = [...userAnswers];
                        newAnswers[blankIdx] = e.target.value;
                        setUserAnswers(newAnswers);
                      }}
                      data-testid={`blank-input-${blankIdx}`}
                    />
                  );
                }
                return <span key={idx} className="text-foreground">{word}</span>;
              })}
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center">
            <Check className="w-16 h-16 mx-auto text-[#58CC02] mb-3" />
            <p className="text-[#58CC02] font-bold">Parabéns! Você memorizou o versículo!</p>
          </div>
        )}
      </Card>

      {step === 'read' && (
        <Button 
          onClick={() => setStep('fill')} 
          className="w-full bg-violet-600 text-white"
          data-testid="button-start-memory"
        >
          <Brain className="w-4 h-4 mr-2" />
          Testar Memória
        </Button>
      )}

      {step === 'fill' && (
        <Button 
          onClick={handleCheck} 
          disabled={userAnswers.length < blanksIndices.length || userAnswers.some(a => !a)}
          className="w-full bg-violet-600 text-white"
          data-testid="button-check-memory"
        >
          Verificar
        </Button>
      )}

      {step === 'done' && (
        <Button 
          onClick={onComplete} 
          className="w-full bg-[#58CC02] text-white"
          data-testid="button-complete-verse-memory"
        >
          <Check className="w-4 h-4 mr-2" />
          Concluir Missão
        </Button>
      )}
    </div>
  );
}

function DailyReflectionActivity({ 
  onComplete 
}: { 
  onComplete: (data: { reflectionText: string }) => void;
}) {
  const [reflection, setReflection] = useState('');
  const { sounds } = useSounds();

  const handleComplete = () => {
    if (reflection.length >= 20) {
      sounds.success();
      onComplete({ reflectionText: reflection });
    }
  };

  return (
    <div className="space-y-6" data-testid="daily-reflection-activity">
      <Card className="p-6 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border-teal-200 dark:border-teal-800">
        <div className="text-center mb-4">
          <MessageSquare className="w-12 h-12 mx-auto text-teal-600 mb-3" />
          <h3 className="text-lg font-bold text-foreground">Reflexão Diária</h3>
        </div>
        
        <p className="text-center text-muted-foreground mb-4">
          Escreva uma reflexão sobre o que Deus tem falado ao seu coração hoje. 
          Pode ser sobre um versículo, uma situação ou algo que aprendeu.
        </p>

        <Textarea
          placeholder="Escreva sua reflexão aqui..."
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          className="min-h-[120px]"
          data-testid="reflection-input"
        />
        
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Mínimo de 20 caracteres ({reflection.length}/20)
        </p>
      </Card>

      <Button 
        onClick={handleComplete} 
        disabled={reflection.length < 20}
        className="w-full bg-[#58CC02] text-white"
        data-testid="button-complete-reflection"
      >
        <Check className="w-4 h-4 mr-2" />
        Concluir Missão
      </Button>
    </div>
  );
}

function ShareKnowledgeActivity({ 
  onComplete 
}: { 
  onComplete: () => void;
}) {
  const [, setLocation] = useLocation();
  const { sounds } = useSounds();

  // Check if user has shared daily verse today
  const { data: shareStatus, isLoading } = useQuery<{ hasShared: boolean }>({
    queryKey: ["/api/study/daily-verse/shared-today"],
    refetchInterval: 3000, // Poll every 3 seconds to detect when user shares
  });

  const hasShared = shareStatus?.hasShared || false;

  // Auto-trigger completion sound when share is detected
  useEffect(() => {
    if (hasShared) {
      sounds.success();
    }
  }, [hasShared, sounds]);

  return (
    <div className="space-y-6" data-testid="share-knowledge-activity">
      <Card className="p-6 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 border-sky-200 dark:border-sky-800">
        <div className="text-center mb-4">
          <Share2 className="w-12 h-12 mx-auto text-sky-600 mb-3" />
          <h3 className="text-lg font-bold text-foreground">Compartilhe a Palavra</h3>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          </div>
        ) : !hasShared ? (
          <>
            <p className="text-center text-muted-foreground mb-4">
              Compartilhe o Versículo do Dia no WhatsApp ou Instagram para completar esta missão.
            </p>
            
            <div className="bg-sky-100 dark:bg-sky-900/30 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-sky-800 dark:text-sky-200">Como fazer:</p>
              <ol className="list-decimal list-inside text-sky-700 dark:text-sky-300 space-y-1">
                <li>Acesse a página do Versículo do Dia</li>
                <li>Clique no botão "Compartilhar"</li>
                <li>Escolha WhatsApp ou Instagram</li>
                <li>Envie para um amigo ou nos Stories</li>
              </ol>
            </div>
          </>
        ) : (
          <div className="text-center">
            <Check className="w-16 h-16 mx-auto text-[#58CC02] mb-3" />
            <p className="text-[#58CC02] font-bold">Versículo do Dia compartilhado!</p>
            <p className="text-sm text-muted-foreground mt-1">Você espalhou a Palavra hoje.</p>
          </div>
        )}
      </Card>

      {!hasShared ? (
        <Button 
          onClick={() => setLocation('/versiculo-do-dia')} 
          className="w-full bg-sky-600 text-white"
          data-testid="button-go-to-verse"
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Ir para o Versículo do Dia
        </Button>
      ) : (
        <Button 
          onClick={onComplete} 
          className="w-full bg-[#58CC02] text-white"
          data-testid="button-complete-share"
        >
          <Check className="w-4 h-4 mr-2" />
          Concluir Missão
        </Button>
      )}
    </div>
  );
}

function LessonRedirectActivity({ 
  onComplete 
}: { 
  onComplete: () => void;
}) {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6 text-center" data-testid="lesson-redirect-activity">
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
        <BookOpen className="w-16 h-16 mx-auto text-blue-500 mb-4" />
        <h3 className="text-lg font-bold text-foreground mb-2">Conclua uma Lição</h3>
        <p className="text-muted-foreground">
          Para completar esta missão, você precisa concluir uma lição na sua trilha de estudos.
        </p>
      </Card>

      <Button 
        onClick={() => setLocation('/study')} 
        className="w-full bg-blue-600 text-white"
        data-testid="button-go-to-lessons"
      >
        <ArrowRight className="w-4 h-4 mr-2" />
        Ir para as Lições
      </Button>
    </div>
  );
}

function StreakActivity({ 
  onComplete 
}: { 
  onComplete: () => void;
}) {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading } = useQuery<{ currentStreak: number; lastLessonCompletedAt: string | null }>({
    queryKey: ["/api/study/profile"],
  });

  // User must have completed a lesson today to complete this mission
  const hasCompletedLessonToday = (() => {
    if (!profile?.lastLessonCompletedAt) return false;
    const lastLessonDate = new Date(profile.lastLessonCompletedAt);
    const today = new Date();
    return lastLessonDate.toDateString() === today.toDateString();
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFC800]" />
      </div>
    );
  }

  if (!hasCompletedLessonToday) {
    return (
      <div className="space-y-6 text-center" data-testid="streak-activity-incomplete">
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800">
          <Flame className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">Complete uma Lição Hoje</h3>
          <p className="text-muted-foreground mb-4">
            Para completar esta missão, você precisa concluir pelo menos uma lição hoje para garantir sua ofensiva do dia!
          </p>
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            Ofensiva atual: {profile?.currentStreak || 0} dias
          </Badge>
        </Card>

        <Button 
          onClick={() => setLocation('/study')} 
          className="w-full bg-orange-500 text-white"
          data-testid="button-go-study"
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Ir Estudar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center" data-testid="streak-activity">
      <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Flame className="w-16 h-16 mx-auto text-orange-500 mb-4" />
        </motion.div>
        <h3 className="text-lg font-bold text-foreground mb-2">Ofensiva Conquistada Hoje!</h3>
        <p className="text-muted-foreground mb-2">
          Parabéns! Você completou uma lição hoje e garantiu sua ofensiva!
        </p>
        <Badge className="bg-orange-500 text-white">
          {profile?.currentStreak || 0} dias de ofensiva
        </Badge>
      </Card>

      <Button 
        onClick={onComplete} 
        className="w-full bg-[#58CC02] text-white"
        data-testid="button-complete-streak"
      >
        <Check className="w-4 h-4 mr-2" />
        Concluir Missão
      </Button>
    </div>
  );
}

function PerfectAnswersActivity({ 
  onComplete 
}: { 
  onComplete: () => void;
}) {
  const { play } = useSound();
  const allQuestions = [
    { question: "Quem construiu a arca?", options: ["Abraão", "Noé", "Moisés", "Davi"], correctIndex: 1 },
    { question: "Qual profeta enfrentou os profetas de Baal?", options: ["Elias", "Eliseu", "Isaías", "Jeremias"], correctIndex: 0 },
    { question: "Quantos discípulos Jesus escolheu?", options: ["10", "11", "12", "13"], correctIndex: 2 },
    { question: "Quem foi jogado na cova dos leões?", options: ["Jonas", "Daniel", "José", "Elias"], correctIndex: 1 },
    { question: "Em que cidade Jesus nasceu?", options: ["Nazaré", "Jerusalém", "Belém", "Cafarnaum"], correctIndex: 2 },
    { question: "Quem foi o primeiro rei de Israel?", options: ["Davi", "Salomão", "Saul", "Samuel"], correctIndex: 2 },
    { question: "Quem escreveu a maior parte dos Salmos?", options: ["Moisés", "Salomão", "Davi", "Asafe"], correctIndex: 2 },
    { question: "Qual era a profissão de Pedro antes de seguir Jesus?", options: ["Carpinteiro", "Pescador", "Cobrador de impostos", "Pastor"], correctIndex: 1 },
    { question: "Quem foi engolido por um grande peixe?", options: ["Jonas", "Daniel", "Elias", "José"], correctIndex: 0 },
    { question: "Qual mulher foi escolhida rainha da Pérsia?", options: ["Rute", "Ester", "Raabe", "Débora"], correctIndex: 1 },
  ];

  // Shuffle and select 5 random questions
  const [questions] = useState(() => {
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  });

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [perfectStreak, setPerfectStreak] = useState(0);
  const [failed, setFailed] = useState(false);

  const handleAnswer = (index: number) => {
    if (index === questions[currentQuestion].correctIndex) {
      play("correct");
      if (currentQuestion === questions.length - 1) {
        setPerfectStreak(5);
        play("complete");
      } else {
        setCurrentQuestion(prev => prev + 1);
        setPerfectStreak(prev => prev + 1);
      }
    } else {
      play("wrong");
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div className="space-y-6 text-center" data-testid="perfect-failed">
        <Card className="p-6">
          <Target className="w-16 h-16 mx-auto text-orange-500 mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">Ops! Você errou</h3>
          <p className="text-muted-foreground mb-4">
            Para completar esta missão, você precisa acertar 5 perguntas seguidas sem errar.
          </p>
          <Button 
            onClick={() => {
              setCurrentQuestion(0);
              setPerfectStreak(0);
              setFailed(false);
            }}
            variant="outline"
            data-testid="button-try-again"
          >
            Tentar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  if (perfectStreak >= 5) {
    return (
      <div className="space-y-6 text-center" data-testid="perfect-success">
        <Card className="p-6">
          <Star className="w-16 h-16 mx-auto text-[#58CC02] mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">Perfeito!</h3>
          <p className="text-muted-foreground">
            Você acertou {perfectStreak} perguntas seguidas!
          </p>
        </Card>

        <Button 
          onClick={onComplete} 
          className="w-full bg-[#58CC02] text-white"
          data-testid="button-complete-perfect"
        >
          <Check className="w-4 h-4 mr-2" />
          Concluir Missão
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="perfect-answers-activity">
      <div className="flex justify-center gap-2 mb-4">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              i < perfectStreak ? 'bg-[#58CC02]' : 'bg-muted'
            }`}
          >
            {i < perfectStreak && <Check className="w-4 h-4 text-white" />}
          </div>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-bold text-center mb-6" data-testid="perfect-question">
          {questions[currentQuestion].question}
        </h3>

        <div className="space-y-3">
          {questions[currentQuestion].options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left p-4 min-h-[56px] h-auto whitespace-normal break-words"
              onClick={() => handleAnswer(index)}
              data-testid={`perfect-option-${index}`}
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3 text-sm font-bold">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="flex-1 break-words overflow-hidden">{option}</span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function MissionActivityPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const [, setLocation] = useLocation();
  const [isCompleting, setIsCompleting] = useState(false);

  const { data: mission, isLoading, isError, refetch } = useQuery<MissionDetail>({
    queryKey: ["/api/missions", missionId, "detail"],
    queryFn: async () => {
      const response = await fetch(`/api/missions/${missionId}/detail`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch mission');
      return response.json();
    },
    enabled: !!missionId,
  });

  const completeMutation = useMutation({
    mutationFn: async (payload?: { prayerText?: string }) => {
      const response = await apiRequest("POST", `/api/missions/${missionId}/complete`, payload);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/missions/daily"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/study/profile"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/study/weekly-goal"] });
      setLocation('/study/missions');
    },
  });

  const handleComplete = useCallback((payload?: { prayerText?: string; reflectionText?: string }) => {
    if (isCompleting || completeMutation.isPending) return;
    setIsCompleting(true);
    completeMutation.mutate(payload);
  }, [isCompleting, completeMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-state">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFC800]" />
          <span className="text-muted-foreground">Carregando missão...</span>
        </div>
      </div>
    );
  }

  if (isError || !mission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4" data-testid="error-state">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h3 className="font-bold text-lg text-foreground mb-2">
          Erro ao carregar missão
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Não foi possível carregar a missão. Tente novamente.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation('/study/missions')} data-testid="button-back-error">
            Voltar
          </Button>
          <Button onClick={() => refetch()} data-testid="button-retry">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (mission.completed) {
    return (
      <div className="min-h-screen bg-background p-4" data-testid="already-completed">
        <div className="max-w-lg mx-auto pt-12 text-center">
          <Check className="w-20 h-20 mx-auto text-[#58CC02] mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">
            Missão já concluída!
          </h3>
          <p className="text-muted-foreground mb-6">
            Você já completou esta missão hoje.
          </p>
          <Button onClick={() => setLocation('/study/missions')} data-testid="button-back-completed">
            Voltar para Missões
          </Button>
        </div>
      </div>
    );
  }

  if (!mission.mission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4" data-testid="error-state">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h3 className="font-bold text-lg text-foreground mb-2">
          Dados da missão incompletos
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Os detalhes da missão não foram carregados corretamente.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation('/study/missions')} data-testid="button-back-error">
            Voltar
          </Button>
          <Button onClick={() => refetch()} data-testid="button-retry">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = iconMap[mission.mission.icon] || Star;
  const missionType = mission.mission.type;

  const renderActivity = () => {
    switch (missionType) {
      case 'read_daily_verse':
        return <VerseReaderActivity content={mission.content} onComplete={() => handleComplete()} />;
      
      case 'timed_challenge':
      case 'quick_quiz':
        return <QuizActivity content={mission.content} missionType={missionType} onComplete={() => handleComplete()} />;
      
      case 'bible_character':
        return <BibleCharacterActivity content={mission.content} onComplete={() => handleComplete()} />;
      
      case 'simple_prayer':
        return <PrayerActivity onComplete={(prayerText) => handleComplete({ prayerText })} />;
      
      case 'bible_fact':
        return <BibleFactActivity content={mission.content} onComplete={() => handleComplete()} />;
      
      case 'memorize_theme':
        return <MemorizeThemeActivity content={mission.content} onComplete={() => handleComplete()} />;
      
      case 'complete_lesson':
        return <LessonRedirectActivity onComplete={() => handleComplete()} />;
      
      case 'maintain_streak':
        return <StreakActivity onComplete={() => handleComplete()} />;
      
      case 'perfect_answers':
        return <PerfectAnswersActivity onComplete={() => handleComplete()} />;
      
      case 'verse_memory':
        return <VerseMemoryActivity content={mission.content} onComplete={() => handleComplete()} />;
      
      case 'daily_reflection':
        return <DailyReflectionActivity onComplete={(data) => handleComplete(data)} />;
      
      case 'share_knowledge':
        return <ShareKnowledgeActivity onComplete={() => handleComplete()} />;
      
      default:
        return (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Tipo de missão não suportado: {missionType}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="mission-activity-page">
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation('/study/missions')}
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg" data-testid="mission-title">{mission.mission.title}</h1>
            <p className="text-xs text-muted-foreground">
              {mission.mission.description}
            </p>
          </div>
          <Badge 
            variant="outline" 
            className="border-[#FFC800] text-[#FFC800]"
            data-testid="mission-xp-reward"
          >
            +{mission.mission.xpReward} XP
          </Badge>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        <div className="flex justify-center mb-6">
          <div 
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFC800] to-[#FF9600] flex items-center justify-center"
            style={{ boxShadow: "0 4px 0 0 #E68A00" }}
          >
            <IconComponent className="w-8 h-8 text-white" />
          </div>
        </div>

        {renderActivity()}

        {completeMutation.isPending && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="completing-overlay">
            <div className="bg-card rounded-xl p-6 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#58CC02]" />
              <span className="text-foreground font-medium">Concluindo missão...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
