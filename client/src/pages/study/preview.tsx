import { useState } from "react";
import { 
  HeartsDisplay, 
  BottomNav,
  MultipleChoiceExercise,
  TrueFalseExercise,
  TextContent,
  FeedbackOverlay,
  LessonComplete,
  VerseList,
  StudyHeader,
  UnitCard,
  PracticeCard,
  StreakCelebration,
  LearningPath
} from "@/components/study";
import type { LessonItem } from "@/components/study";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, ArrowLeft, Flame, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const mockUserProfile = {
  name: "Maria Silva",
  avatar: "",
  level: 5,
  totalXP: 450,
  streak: 7,
  hearts: 4,
  maxHearts: 5,
};

const mockLessons: LessonItem[] = [
  { 
    id: 1, 
    lessonNumber: 1,
    title: "Lição 1", 
    subtitle: "Uma paixão única pela qual viver", 
    status: "completed", 
    progress: 5, 
    totalSections: 5,
    stages: [
      { type: "estude", status: "completed", completedUnits: 3, totalUnits: 3 },
      { type: "medite", status: "completed", completedUnits: 2, totalUnits: 2 },
      { type: "responda", status: "completed", completedUnits: 5, totalUnits: 5 },
    ],
  },
  { 
    id: 2, 
    lessonNumber: 2,
    title: "Lição 2", 
    subtitle: "Não desperdice sua vida", 
    status: "completed", 
    progress: 5, 
    totalSections: 5,
    stages: [
      { type: "estude", status: "completed", completedUnits: 3, totalUnits: 3 },
      { type: "medite", status: "completed", completedUnits: 2, totalUnits: 2 },
      { type: "responda", status: "completed", completedUnits: 5, totalUnits: 5 },
    ],
  },
  { 
    id: 3, 
    lessonNumber: 3,
    title: "Lição 3", 
    subtitle: "Glória somente na cruz", 
    status: "current", 
    progress: 2, 
    totalSections: 5,
    stages: [
      { type: "estude", status: "completed", completedUnits: 3, totalUnits: 3 },
      { type: "medite", status: "current", completedUnits: 1, totalUnits: 2 },
      { type: "responda", status: "locked", completedUnits: 0, totalUnits: 5 },
    ],
  },
  { 
    id: 4, 
    lessonNumber: 4,
    title: "Lição 4", 
    subtitle: "Glorificando a Cristo por meio de dor e morte (1)", 
    status: "locked", 
    progress: 0, 
    totalSections: 5,
    stages: [
      { type: "estude", status: "locked", completedUnits: 0, totalUnits: 3 },
      { type: "medite", status: "locked", completedUnits: 0, totalUnits: 2 },
      { type: "responda", status: "locked", completedUnits: 0, totalUnits: 5 },
    ],
  },
  { 
    id: 5, 
    lessonNumber: 5,
    title: "Lição 5", 
    subtitle: "Glorificando a Cristo por meio de dor e morte (2)", 
    status: "locked", 
    progress: 0, 
    totalSections: 5,
    stages: [
      { type: "estude", status: "locked", completedUnits: 0, totalUnits: 3 },
      { type: "medite", status: "locked", completedUnits: 0, totalUnits: 2 },
      { type: "responda", status: "locked", completedUnits: 0, totalUnits: 5 },
    ],
  },
];

const mockDailyGoal = {
  current: 3,
  target: 5,
};

const mockVerses = [
  {
    id: 1,
    reference: "João 3:16",
    text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.",
    reflection: "Este versículo nos mostra a profundidade do amor de Deus."
  },
  {
    id: 2,
    reference: "Salmos 23:1",
    text: "O Senhor é o meu pastor; nada me faltará.",
    reflection: "Quando reconhecemos Deus como nosso pastor, podemos descansar."
  },
];

function UserProfileHeader({ user }: { user: typeof mockUserProfile }) {
  return (
    <div 
      className="px-4 pt-6 pb-8"
      style={{
        background: 'linear-gradient(180deg, #FFC800 0%, #FFD633 100%)',
      }}
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border-3 border-white shadow-lg">
              <AvatarFallback 
                className="text-xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #87CEEB 0%, #4A90D9 100%)',
                  color: 'white'
                }}
              >
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-white/80 font-medium">Olá,</p>
              <h1 className="text-lg font-bold text-white" data-testid="text-user-name">
                {user.name}
              </h1>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-white/20"
            data-testid="button-settings"
          >
            <Settings className="h-5 w-5 text-white" />
          </motion.button>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF9600] shadow-lg"
            style={{ boxShadow: '0 4px 0 0 #CC7700' }}
          >
            <Flame className="h-5 w-5 text-white" />
            <span className="font-bold text-white">{user.streak}</span>
            <span className="text-white/80 text-sm">dias</span>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#58CC02] shadow-lg"
            style={{ boxShadow: '0 4px 0 0 #46A302' }}
          >
            <Zap className="h-5 w-5 text-white" />
            <span className="font-bold text-white">{user.totalXP}</span>
            <span className="text-white/80 text-sm">XP</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function DailyGoalSection({ current, target }: { current: number; target: number }) {
  const percentage = Math.min((current / target) * 100, 100);
  const remaining = target - current;
  
  return (
    <div className="px-4 py-4 bg-background border-b border-border">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2">
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

function MapPreview() {
  const handleLessonClick = (lessonId: number, stage?: string) => {
    const lesson = mockLessons.find(l => l.id === lessonId);
    if (lesson && lesson.status !== 'locked') {
      const stageName = stage || 'estude';
      const stageInfo = lesson.stages.find(s => s.type === stageName);
      if (stageInfo && stageInfo.status !== 'locked') {
        alert(`Navegando para Lição ${lessonId} - Etapa: ${stageName.charAt(0).toUpperCase() + stageName.slice(1)}\n\nEsta é uma demonstração. Para acessar as lições, faça login no sistema.`);
      } else {
        alert(`A etapa "${stageName}" ainda está bloqueada. Complete as etapas anteriores primeiro!`);
      }
    } else {
      alert('Esta lição ainda está bloqueada. Complete as lições anteriores primeiro!');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <UserProfileHeader user={mockUserProfile} />
      
      <DailyGoalSection 
        current={mockDailyGoal.current} 
        target={mockDailyGoal.target} 
      />
      
      <LearningPath 
        lessons={mockLessons}
        unitTitle="Não Desperdice a sua Vida"
        onLessonClick={handleLessonClick}
        onPracticeClick={() => alert("Prática!\n\nEsta é uma demonstração. Para praticar, faça login no sistema.")}
        showPractice={true}
      />

      <BottomNav />
    </div>
  );
}

function ExercisePreview() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState(true);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StudyHeader
        currentStep={2}
        totalSteps={5}
        hearts={4}
        maxHearts={5}
        onClose={() => {}}
      />

      <main className="flex-1 flex flex-col p-4">
        <h2 className="text-xl font-bold text-foreground mb-6 text-center">
          Segundo Hebreus 11:1, a fé é a certeza daquilo que...
        </h2>

        <div className="flex flex-col gap-3 mb-6">
          {["Vemos", "Esperamos", "Duvidamos", "Sabemos"].map((opt, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full py-5 px-4 text-left rounded-2xl border-2 font-medium text-base",
                "transition-all duration-150",
                i === 1 
                  ? "border-[#58CC02] bg-[#58CC02]/10" 
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <span className={cn(
                "inline-flex items-center justify-center h-7 w-7 rounded-full border-2 mr-3 text-sm font-bold",
                i === 1 
                  ? "border-[#58CC02] bg-[#58CC02] text-white" 
                  : "border-muted-foreground/50 text-muted-foreground"
              )}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </motion.button>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <Button 
            onClick={() => { setFeedbackCorrect(true); setShowFeedback(true); }} 
            className="flex-1 bg-[#58CC02] hover:bg-[#46A302]"
          >
            Mostrar Feedback Correto
          </Button>
          <Button 
            onClick={() => { setFeedbackCorrect(false); setShowFeedback(true); }} 
            variant="destructive" 
            className="flex-1"
          >
            Mostrar Feedback Errado
          </Button>
        </div>
      </main>

      <FeedbackOverlay
        isVisible={showFeedback}
        isCorrect={feedbackCorrect}
        explanation={feedbackCorrect 
          ? "Exatamente! A fé é a certeza daquilo que ESPERAMOS, não do que já vemos." 
          : "A resposta correta é 'esperamos'. Hebreus 11:1 diz: 'A fé é a certeza daquilo que esperamos...'"
        }
        hint="Releia o versículo com atenção"
        xpEarned={feedbackCorrect ? 5 : 0}
        heartsLost={feedbackCorrect ? 0 : 1}
        onContinue={() => setShowFeedback(false)}
      />
    </div>
  );
}

function VersesPreview() {
  const [hearts, setHearts] = useState(3);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-3 p-3">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="font-bold text-lg">Versículos</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <VerseList
          verses={mockVerses}
          currentHearts={hearts}
          maxHearts={5}
          onVerseComplete={() => setHearts(h => Math.min(5, h + 1))}
        />
      </main>
    </div>
  );
}

function CompletePreview() {
  return (
    <LessonComplete
      xpEarned={14}
      isPerfect={true}
      streakDays={7}
      mistakesCount={1}
      timeSpentSeconds={70}
      onContinue={() => {}}
    />
  );
}

function StreakPreview() {
  return (
    <StreakCelebration
      streakDays={1}
      weekProgress={[true, false, false, false, false, false, false]}
      message="Sua ofensiva começou! Pratique todos os dias pra ela crescer."
      onContinue={() => alert("Continuar!")}
    />
  );
}

export default function StudyPreviewPage() {
  const [activeTab, setActiveTab] = useState("map");

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-[60] bg-background border-b p-2">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-center mb-2 text-primary">
            Preview do Sistema de Estudos
          </h1>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger value="map" className="text-[10px] sm:text-xs px-1 py-2">Mapa</TabsTrigger>
              <TabsTrigger value="exercise" className="text-[10px] sm:text-xs px-1 py-2">Exerc.</TabsTrigger>
              <TabsTrigger value="verses" className="text-[10px] sm:text-xs px-1 py-2">Vers.</TabsTrigger>
              <TabsTrigger value="complete" className="text-[10px] sm:text-xs px-1 py-2">Concl.</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="pt-2">
        {activeTab === "map" && <MapPreview />}
        {activeTab === "exercise" && <ExercisePreview />}
        {activeTab === "verses" && <VersesPreview />}
        {activeTab === "complete" && <CompletePreview />}
      </div>
    </div>
  );
}
