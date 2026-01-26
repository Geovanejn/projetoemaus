import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/study";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Flame, 
  Target, 
  BookOpen, 
  ArrowLeft,
  Star,
  Medal,
  Zap,
  Crown,
  Award,
  TrendingUp,
  Heart,
  Sunrise,
  Moon,
  Calendar,
  CheckCircle,
  CalendarCheck,
  BookMarked,
  BookHeart,
  Shield,
  GraduationCap,
  Loader2,
  Share2,
  Book,
  Download,
  MoreVertical,
  Rocket,
  Users,
  Bookmark,
  Edit3,
  Gift,
  Infinity,
  Layers
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StaticShareableCard } from "@/components/study/StaticShareableCard";

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

const iconMap: Record<string, LucideIcon> = {
  flame: Flame,
  book: Book,
  "book-open": BookOpen,
  "book-heart": BookHeart,
  "book-marked": BookMarked,
  "graduation-cap": GraduationCap,
  trophy: Trophy,
  crown: Crown,
  star: Star,
  award: Award,
  zap: Zap,
  shield: Shield,
  medal: Medal,
  sunrise: Sunrise,
  moon: Moon,
  calendar: Calendar,
  heart: Heart,
  target: Target,
  "check-circle": CheckCircle,
  "calendar-check": CalendarCheck,
  "trending-up": TrendingUp,
  rocket: Rocket,
  users: Users,
  bookmark: Bookmark,
  edit: Edit3,
  gift: Gift,
  infinity: Infinity,
  layers: Layers,
};

const categoryLabels: Record<string, string> = {
  streak: "Sequência",
  lessons: "Lições",
  xp: "Experiência",
  special: "Especiais",
  level: "Nível",
};

const categoryConfig: Record<string, { 
  icon: LucideIcon; 
  bgColor: string; 
  iconBg: string;
  unlockedBg: string;
  headerBg: string;
}> = {
  lessons: { 
    icon: Book,
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    iconBg: "bg-blue-500",
    unlockedBg: "bg-blue-500",
    headerBg: "bg-blue-100 dark:bg-blue-900/40"
  },
  streak: { 
    icon: Flame,
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
    iconBg: "bg-pink-500",
    unlockedBg: "bg-pink-500",
    headerBg: "bg-pink-100 dark:bg-pink-900/40"
  },
  xp: { 
    icon: Star,
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    iconBg: "bg-emerald-500",
    unlockedBg: "bg-emerald-500",
    headerBg: "bg-emerald-100 dark:bg-emerald-900/40"
  },
  level: { 
    icon: Layers,
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
    iconBg: "bg-violet-500",
    unlockedBg: "bg-violet-500",
    headerBg: "bg-violet-100 dark:bg-violet-900/40"
  },
  special: { 
    icon: Heart,
    bgColor: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
    iconBg: "bg-fuchsia-500",
    unlockedBg: "bg-fuchsia-500",
    headerBg: "bg-fuchsia-100 dark:bg-fuchsia-900/40"
  },
};

function getIconComponent(iconName: string) {
  return iconMap[iconName.toLowerCase()] || Star;
}

function CircularProgress({ percentage }: { percentage: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="6"
          fill="none"
        />
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          stroke="white"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold text-lg">{percentage}%</span>
      </div>
    </div>
  );
}

function AchievementGridCard({ 
  achievement, 
  category,
  onShare 
}: { 
  achievement: Achievement; 
  category: string;
  onShare: (a: Achievement) => void;
}) {
  const IconComponent = getIconComponent(achievement.icon);
  const config = categoryConfig[category] || categoryConfig.special;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[110px]",
        achievement.unlocked 
          ? "bg-white dark:bg-gray-800 shadow-md" 
          : "bg-white/50 dark:bg-gray-900/30"
      )}
      style={achievement.unlocked ? { 
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' 
      } : undefined}
      onClick={() => achievement.unlocked && onShare(achievement)}
      data-testid={`achievement-card-${achievement.code}`}
    >
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all",
        achievement.unlocked 
          ? config.unlockedBg 
          : "bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700"
      )}
      style={achievement.unlocked ? {
        boxShadow: `0 4px 12px ${config.iconBg === 'bg-blue-500' ? 'rgba(59, 130, 246, 0.3)' : 
                     config.iconBg === 'bg-pink-500' ? 'rgba(236, 72, 153, 0.3)' :
                     config.iconBg === 'bg-emerald-500' ? 'rgba(16, 185, 129, 0.3)' :
                     config.iconBg === 'bg-violet-500' ? 'rgba(139, 92, 246, 0.3)' :
                     'rgba(217, 70, 239, 0.3)'}`
      } : undefined}
      >
        <IconComponent className={cn(
          "h-6 w-6",
          achievement.unlocked 
            ? "text-white" 
            : "text-gray-300 dark:text-gray-600"
        )} />
      </div>
      <span className={cn(
        "text-xs font-semibold leading-tight line-clamp-2",
        achievement.unlocked 
          ? "text-gray-900 dark:text-gray-100" 
          : "text-gray-400 dark:text-gray-500"
      )}>
        {achievement.name}
      </span>
      <span className={cn(
        "text-[10px] mt-0.5 line-clamp-1",
        achievement.unlocked 
          ? "text-gray-500 dark:text-gray-400" 
          : "text-gray-300 dark:text-gray-600"
      )}>
        {achievement.description.length > 15 
          ? achievement.description.substring(0, 15) + "..." 
          : achievement.description}
      </span>
    </motion.div>
  );
}

function CategorySection({ 
  category, 
  achievements, 
  onShare 
}: { 
  category: string; 
  achievements: Achievement[];
  onShare: (a: Achievement) => void;
}) {
  const config = categoryConfig[category] || categoryConfig.special;
  const CategoryIcon = config.icon;
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  const sortedAchievements = [...achievements].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return 0;
  });

  return (
    <div className={cn("rounded-2xl overflow-hidden", config.bgColor)}>
      <div className={cn("px-4 py-3 flex items-center gap-3", config.headerBg)}>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.iconBg)}>
          <CategoryIcon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {categoryLabels[category] || category}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {unlockedCount}/{totalCount} completas
          </p>
        </div>
      </div>
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {sortedAchievements.map((achievement) => (
          <AchievementGridCard
            key={achievement.id}
            achievement={achievement}
            category={category}
            onShare={onShare}
          />
        ))}
      </div>
    </div>
  );
}

function ShareableAchievementCard({ achievement, onClose }: { achievement: Achievement; onClose: () => void }) {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    
    try {
      const scale = Math.max(3, window.devicePixelRatio || 2);
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#1a1a2e',
        scale: scale,
        useCORS: true,
        logging: false,
        allowTaint: true,
        imageTimeout: 0,
      });
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
      });
    } catch (error) {
      console.error('Error generating image:', error);
      return null;
    }
  }, []);

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const imageBlob = await generateImage();
      const shareText = `Desbloqueei a conquista "${achievement.name}" no DeoGlory! ${achievement.description} - ${window.location.origin}`;
      
      if (!imageBlob) {
        try {
          await navigator.clipboard.writeText(shareText);
          toast({
            title: "Link copiado!",
            description: "O texto foi copiado para a área de transferência."
          });
        } catch {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível copiar o texto."
          });
        }
        setIsGenerating(false);
        return;
      }
      
      if (navigator.share) {
        const file = new File([imageBlob], `conquista-${achievement.code}.png`, { type: 'image/png' });
        const shareData = {
          title: `Conquista Desbloqueada: ${achievement.name}`,
          text: `Desbloqueei a conquista "${achievement.name}" no DeoGlory! ${achievement.description}`,
          files: [file],
        };
        
        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast({
            title: "Compartilhado!",
            description: "Sua conquista foi compartilhada com sucesso."
          });
        } else {
          const shareTextData = {
            title: `Conquista Desbloqueada: ${achievement.name}`,
            text: `Desbloqueei a conquista "${achievement.name}" no DeoGlory! ${achievement.description}`,
            url: window.location.origin
          };
          await navigator.share(shareTextData);
          toast({
            title: "Compartilhado!",
            description: "Sua conquista foi compartilhada com sucesso."
          });
        }
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Link copiado!",
          description: "O texto foi copiado para a área de transferência."
        });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        try {
          const fallbackText = `Desbloqueei a conquista "${achievement.name}" no DeoGlory! ${achievement.description} - ${window.location.origin}`;
          await navigator.clipboard.writeText(fallbackText);
          toast({
            title: "Link copiado!",
            description: "O texto foi copiado para a área de transferência."
          });
        } catch (clipboardError) {
          console.error("Share/clipboard error:", error, clipboardError);
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível compartilhar. Tente novamente."
          });
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const imageBlob = await generateImage();
      if (!imageBlob) {
        setIsGenerating(false);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível gerar a imagem."
        });
        return;
      }
      const url = URL.createObjectURL(imageBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conquista-${achievement.code}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Imagem baixada!",
        description: "A imagem da conquista foi salva."
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível baixar a imagem."
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
      <div ref={cardRef} className="max-w-full" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        <StaticShareableCard achievement={achievement} showUnlockedDate={true} />
      </div>
      
      <motion.div 
        className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-6 w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button variant="outline" size="sm" onClick={onClose} data-testid="button-close-share">
          Fechar
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={isGenerating} data-testid="button-download-achievement">
          <Download className="h-4 w-4 mr-1 sm:mr-2" />
          Baixar
        </Button>
        <Button size="sm" onClick={handleShare} disabled={isGenerating} data-testid="button-share-achievement">
          <Share2 className="h-4 w-4 mr-1 sm:mr-2" />
          {isGenerating ? "..." : "Compartilhar"}
        </Button>
      </motion.div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando conquistas...</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Medal className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-bold text-muted-foreground">Nenhuma conquista encontrada</h3>
      <p className="text-sm text-muted-foreground text-center mt-1">
        Complete licoes para desbloquear conquistas
      </p>
    </div>
  );
}

export default function AchievementsPage() {
  const [, setLocation] = useLocation();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const { isAuthenticated } = useAuth();

  const { data: achievements, isLoading } = useQuery<Achievement[]>({
    queryKey: ['/api/study/achievements'],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  const unlockedCount = achievements?.filter(a => a.unlocked).length || 0;
  const totalCount = achievements?.length || 0;
  const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const categorizedAchievements = achievements?.reduce((acc, achievement) => {
    const cat = achievement.category;
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>) || {};

  const categoryOrder = ['lessons', 'streak', 'xp', 'level', 'special'];
  const orderedCategories = categoryOrder.filter(cat => categorizedAchievements[cat]);
  Object.keys(categorizedAchievements).forEach(cat => {
    if (!orderedCategories.includes(cat)) {
      orderedCategories.push(cat);
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24" data-testid="achievements-page">
      <header className="bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 text-white">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setLocation("/study/profile")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Conquistas</h1>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-white/20"
              data-testid="button-menu"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-6 pb-4">
            <div>
              <p className="text-white/80 text-sm">Total de Conquistas</p>
              <p className="text-5xl font-bold mt-1">{unlockedCount}/{totalCount}</p>
            </div>
            <CircularProgress percentage={percentage} />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {orderedCategories.length === 0 ? (
          <EmptyState />
        ) : (
          orderedCategories.map((category, index) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <CategorySection
                category={category}
                achievements={categorizedAchievements[category]}
                onShare={setSelectedAchievement}
              />
            </motion.div>
          ))
        )}
      </main>

      <Dialog open={!!selectedAchievement} onOpenChange={() => setSelectedAchievement(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Compartilhar Conquista</DialogTitle>
          </DialogHeader>
          <AnimatePresence>
            {selectedAchievement && (
              <ShareableAchievementCard 
                achievement={selectedAchievement} 
                onClose={() => setSelectedAchievement(null)}
              />
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
