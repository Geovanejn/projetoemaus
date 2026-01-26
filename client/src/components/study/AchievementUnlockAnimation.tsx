import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import html2canvas from "html2canvas";
import { 
  Trophy, Flame, BookOpen, Star, Medal, Award, Crown, Zap,
  Heart, Target, CheckCircle, Calendar, Sunrise, Moon,
  BookMarked, BookHeart, Shield, GraduationCap, TrendingUp, Sparkles, Book, Share2, Download
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSounds } from "@/hooks/use-sounds";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { StaticShareableCard } from "./StaticShareableCard";

interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: string;
}

interface AchievementUnlockAnimationProps {
  achievement: Achievement;
  onComplete: () => void;
  className?: string;
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
  stars: Sparkles,
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
  "calendar-check": Calendar,
  "trending-up": TrendingUp,
};

const categoryColors: Record<string, { primary: string; secondary: string; gradient: string }> = {
  streak: { 
    primary: "#FF9600", 
    secondary: "#FF6B00",
    gradient: "from-orange-400 via-orange-500 to-red-500"
  },
  lessons: { 
    primary: "#58CC02", 
    secondary: "#45A302",
    gradient: "from-green-400 via-green-500 to-emerald-600"
  },
  xp: { 
    primary: "#FFC800", 
    secondary: "#FFAB00",
    gradient: "from-yellow-400 via-amber-500 to-orange-500"
  },
  special: { 
    primary: "#1CB0F6", 
    secondary: "#0D9DE5",
    gradient: "from-blue-400 via-cyan-500 to-teal-500"
  },
};

const categoryLabels: Record<string, string> = {
  streak: "Sequencia",
  lessons: "Licoes",
  xp: "Experiencia",
  special: "Especiais",
};

function getIconComponent(iconName: string) {
  return iconMap[iconName.toLowerCase()] || Trophy;
}

function getCategoryStyle(category: string) {
  return categoryColors[category] || categoryColors.special;
}

export function AchievementUnlockAnimation({
  achievement,
  onComplete,
  className
}: AchievementUnlockAnimationProps) {
  const [showButton, setShowButton] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { sounds } = useSounds();
  const { toast } = useToast();
  const hasPlayedSound = useRef(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  
  const IconComponent = getIconComponent(achievement.icon);
  const categoryStyle = getCategoryStyle(achievement.category);

  const fireConfetti = useCallback(() => {
    const colors = [categoryStyle.primary, categoryStyle.secondary, '#FFD700', '#FFA500', '#FF6347', '#00CED1'];
    
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        ...opts,
        particleCount: Math.floor(300 * particleRatio),
        origin: { x: 0.5, y: 0.5 },
        colors,
        disableForReducedMotion: true,
        shapes: ['star', 'circle'],
        ticks: 300,
      });
    };

    fire(0.35, { spread: 30, startVelocity: 65, scalar: 1.2 });
    fire(0.25, { spread: 70, startVelocity: 50 });
    fire(0.4, { spread: 120, decay: 0.91, scalar: 0.9 });
    fire(0.15, { spread: 150, startVelocity: 30, decay: 0.92, scalar: 1.3 });
    fire(0.15, { spread: 140, startVelocity: 55, scalar: 0.8 });

    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { x: 0, y: 0.5 },
        colors,
        angle: 60,
        startVelocity: 55,
        shapes: ['star'],
      });
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { x: 1, y: 0.5 },
        colors,
        angle: 120,
        startVelocity: 55,
        shapes: ['star'],
      });
    }, 200);

    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { x: 0.2, y: 0.7 },
        colors,
        angle: 75,
        startVelocity: 45,
      });
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { x: 0.8, y: 0.7 },
        colors,
        angle: 105,
        startVelocity: 45,
      });
    }, 400);

    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.5, y: 0.3 },
        colors,
        gravity: 1.2,
        scalar: 1.1,
        shapes: ['circle', 'star'],
      });
    }, 600);

    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 360,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#FFD700', '#FFA500'],
        startVelocity: 30,
        scalar: 0.7,
        ticks: 200,
      });
    }, 800);
  }, [categoryStyle]);

  const generateShareImage = useCallback(async (): Promise<Blob | null> => {
    if (!shareCardRef.current) return null;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const scale = Math.max(3, window.devicePixelRatio || 2);
      const canvas = await html2canvas(shareCardRef.current, {
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
      const imageBlob = await generateShareImage();
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
      const imageBlob = await generateShareImage();
      if (!imageBlob) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível gerar a imagem."
        });
        setIsGenerating(false);
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

  useEffect(() => {
    if (!hasPlayedSound.current) {
      sounds.achievement();
      fireConfetti();
      hasPlayedSound.current = true;
      
      setTimeout(() => {
        sounds.star();
      }, 400);
      
      setTimeout(() => {
        sounds.goldenTransform();
      }, 800);
    }
    
    const timer = setTimeout(() => setShowButton(true), 1500);
    return () => clearTimeout(timer);
  }, [sounds, fireConfetti]);

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center p-4",
        "bg-background/95 backdrop-blur-sm overflow-y-auto",
        className
      )}
      data-testid="achievement-unlock-animation"
    >
      <div 
        className="absolute -left-[9999px] top-0"
        aria-hidden="true"
      >
        <div ref={shareCardRef}>
          <StaticShareableCard achievement={achievement} />
        </div>
      </div>

      <div 
        className="relative w-full max-w-sm rounded-2xl flex-shrink-0"
        style={{ 
          background: `linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)`,
          boxShadow: `0 0 60px ${categoryStyle.primary}40, 0 25px 50px -12px rgba(0, 0, 0, 0.5)`
        }}
      >
        <div 
          className="absolute inset-0 opacity-40 rounded-2xl"
          style={{ 
            background: `radial-gradient(circle at 50% 0%, ${categoryStyle.primary}50, transparent 60%)` 
          }}
        />
        
        <div 
          className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl"
          style={{ 
            background: `linear-gradient(90deg, ${categoryStyle.primary}, ${categoryStyle.secondary}, ${categoryStyle.primary})` 
          }}
        />
        
        <div className="relative p-6 pt-8">
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center text-gray-400 mb-4 font-semibold tracking-wide uppercase text-sm"
            style={{ color: '#9ca3af' }}
          >
            Conquista Desbloqueada!
          </motion.p>

          <motion.div
            className="relative mb-4 flex justify-center"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: 0.2
            }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.08, 1],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatDelay: 0.3
              }}
              className="relative inline-block"
            >
              <div 
                className="w-28 h-28 rounded-full flex items-center justify-center relative"
                style={{
                  background: `linear-gradient(135deg, ${categoryStyle.primary}, ${categoryStyle.secondary})`,
                  boxShadow: `0 0 60px ${categoryStyle.primary}90, 0 0 30px ${categoryStyle.secondary}60, inset 0 -4px 20px rgba(0,0,0,0.3)`
                }}
              >
                <div className="absolute inset-2 rounded-full" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3), rgba(255,255,255,0.1))' }} />
                <IconComponent className="h-14 w-14 text-white relative z-10" style={{ color: '#ffffff' }} />
                
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-3 rounded-full"
                  style={{ border: '1px dashed rgba(255,255,255,0.2)' }}
                />
              </div>
              
              <motion.div
                animate={{ 
                  scale: [1, 1.4, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 rounded-full -z-10"
                style={{
                  background: `linear-gradient(135deg, ${categoryStyle.primary}, ${categoryStyle.secondary})`,
                  filter: 'blur(24px)'
                }}
              />
              
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.5, 0.5],
                    x: [0, (Math.cos(i * Math.PI / 4) * 50)],
                    y: [0, (Math.sin(i * Math.PI / 4) * 50)]
                  }}
                  transition={{ 
                    duration: 2,
                    delay: 0.5 + i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <Sparkles className="w-4 h-4" style={{ color: categoryStyle.primary }} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <Badge 
              className="mb-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border-0 inline-flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${categoryStyle.primary}40, ${categoryStyle.secondary}30)`,
                color: categoryStyle.primary,
                minHeight: '28px'
              }}
            >
              {categoryLabels[achievement.category] || achievement.category}
            </Badge>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-2xl font-black mb-2 text-center tracking-tight"
            style={{ color: categoryStyle.primary }}
          >
            {achievement.name}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center text-sm leading-relaxed max-w-xs mx-auto mb-4"
            style={{ color: '#9ca3af' }}
          >
            {achievement.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ 
                background: 'linear-gradient(135deg, rgba(255,200,0,0.2), rgba(255,150,0,0.15))',
                border: '1px solid rgba(255,200,0,0.3)',
                boxShadow: '0 0 20px rgba(255,200,0,0.2)'
              }}
            >
              <Zap className="h-5 w-5" style={{ color: '#fbbf24' }} />
              <span className="text-xl font-bold" style={{ color: '#fbbf24' }}>+{achievement.xpReward} XP</span>
            </div>
          </motion.div>

          <div className="flex items-center justify-end gap-1.5">
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${categoryStyle.primary}, ${categoryStyle.secondary})` }}
            >
              <Trophy className="h-3 w-3" style={{ color: '#ffffff' }} />
            </div>
            <span className="text-xs font-semibold leading-none" style={{ color: '#6b7280' }}>DeoGlory</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showButton && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-sm mt-4 space-y-3 flex-shrink-0"
          >
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex-1"
                data-testid="button-download-achievement"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
              <Button
                variant="outline"
                onClick={handleShare}
                disabled={isGenerating}
                className="flex-1"
                data-testid="button-share-achievement"
              >
                <Share2 className="h-4 w-4 mr-2" />
                {isGenerating ? "..." : "Compartilhar"}
              </Button>
            </div>
            
            <Button
              onClick={onComplete}
              className={cn(
                "w-full py-6 text-lg font-black uppercase tracking-wide",
                "bg-gradient-to-r from-[#1CB0F6] to-[#1899D6]",
                "shadow-[0_6px_0_0_#1480B8]",
                "hover:shadow-[0_4px_0_0_#1480B8] hover:translate-y-[2px]",
                "active:shadow-[0_2px_0_0_#1480B8] active:translate-y-[4px]",
                "transition-all duration-100"
              )}
              data-testid="button-continue-achievement"
            >
              Continuar
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {[...Array(24)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 1, 
            scale: 0,
            x: 0,
            y: 0
          }}
          animate={{ 
            opacity: 0,
            scale: 1,
            x: (Math.random() - 0.5) * 600,
            y: (Math.random() - 0.5) * 600
          }}
          transition={{ 
            duration: 2.5,
            delay: 0.2 + i * 0.04,
            ease: "easeOut"
          }}
          className="absolute top-1/2 left-1/2 pointer-events-none"
          style={{
            width: 6 + Math.random() * 14,
            height: 6 + Math.random() * 14,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            background: `linear-gradient(135deg, ${categoryStyle.primary}, ${categoryStyle.secondary})`,
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}
    </div>
  );
}
