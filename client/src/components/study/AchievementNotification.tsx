import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Flame, 
  Target, 
  BookOpen, 
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
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSounds } from "@/hooks/use-sounds";
import { useEffect } from "react";

interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: string;
}

interface AchievementNotificationProps {
  achievement: Achievement | null;
  show: boolean;
  onClose: () => void;
}

const iconMap: Record<string, LucideIcon> = {
  flame: Flame,
  book: BookOpen,
  "book-open": BookOpen,
  "book-heart": BookHeart,
  "book-marked": BookMarked,
  "graduation-cap": GraduationCap,
  trophy: Trophy,
  crown: Crown,
  star: Star,
  stars: Star,
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
};

function getIconComponent(iconName: string) {
  return iconMap[iconName.toLowerCase()] || Star;
}

const categoryColors: Record<string, { primary: string; secondary: string }> = {
  streak: { primary: "#FF9600", secondary: "#FF6B00" },
  lessons: { primary: "#58CC02", secondary: "#45A302" },
  xp: { primary: "#FFC800", secondary: "#FFAB00" },
  special: { primary: "#1CB0F6", secondary: "#0D9DE5" },
};

export function AchievementNotification({ achievement, show, onClose }: AchievementNotificationProps) {
  const { sounds } = useSounds();
  
  useEffect(() => {
    if (show && achievement) {
      sounds.achievement();
    }
  }, [show, achievement, sounds]);
  
  if (!achievement) return null;

  const IconComponent = getIconComponent(achievement.icon);
  const categoryStyle = categoryColors[achievement.category] || categoryColors.special;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          data-testid="achievement-notification-overlay"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative rounded-2xl p-8 max-w-sm mx-4 shadow-2xl"
            style={{
              background: `linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)`,
              border: `2px solid ${categoryStyle.primary}40`
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="achievement-notification-modal"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-gray-400"
              onClick={onClose}
              data-testid="button-close-achievement"
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", damping: 10, stiffness: 200 }}
                className="inline-block mb-4"
              >
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg relative"
                  style={{
                    background: `linear-gradient(135deg, ${categoryStyle.primary}, ${categoryStyle.secondary})`,
                    boxShadow: `0 0 30px ${categoryStyle.primary}60`
                  }}
                >
                  <IconComponent className="h-12 w-12 text-white" style={{ color: '#ffffff' }} />
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ border: `4px solid ${categoryStyle.primary}50` }}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>
                  Nova Conquista!
                </p>
                <h2 className="text-2xl font-black mb-2" style={{ color: categoryStyle.primary }}>
                  {achievement.name}
                </h2>
                <p className="mb-4" style={{ color: '#9ca3af' }}>
                  {achievement.description}
                </p>

                <div 
                  className="flex items-center justify-center gap-2 rounded-lg py-2 px-4 mb-4"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(255,200,0,0.15), rgba(255,150,0,0.1))',
                    border: '1px solid rgba(255,200,0,0.2)'
                  }}
                >
                  <Zap className="h-5 w-5" style={{ color: '#fbbf24' }} />
                  <span className="font-bold" style={{ color: '#fbbf24' }}>
                    +{achievement.xpReward} XP
                  </span>
                </div>

                <Button 
                  onClick={onClose}
                  className="w-full font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${categoryStyle.primary}, ${categoryStyle.secondary})`,
                  }}
                  data-testid="button-continue-achievement"
                >
                  Continuar
                </Button>
              </motion.div>
            </div>

            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: [categoryStyle.primary, categoryStyle.secondary, `${categoryStyle.primary}cc`, '#ffffff'][i % 4],
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 1, 0], 
                  opacity: [0, 1, 0],
                  y: [0, -50, -100]
                }}
                transition={{ 
                  delay: 0.5 + i * 0.05, 
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useState, useCallback } from "react";

export function useAchievementNotification() {
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [show, setShow] = useState(false);

  const showAchievement = useCallback((achievement: Achievement) => {
    setCurrentAchievement(achievement);
    setShow(true);
  }, []);

  const hideAchievement = useCallback(() => {
    setShow(false);
    setTimeout(() => setCurrentAchievement(null), 300);
  }, []);

  const AchievementComponent = useCallback(() => (
    <AchievementNotification
      achievement={currentAchievement}
      show={show}
      onClose={hideAchievement}
    />
  ), [currentAchievement, show, hideAchievement]);

  return {
    showAchievement,
    hideAchievement,
    isShowing: show,
    AchievementComponent,
  };
}
