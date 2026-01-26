import { 
  Trophy, Flame, BookOpen, Star, Medal, Award, Crown, Zap,
  Heart, Target, CheckCircle, Calendar, Sunrise, Moon,
  BookMarked, BookHeart, Shield, GraduationCap, TrendingUp, Sparkles, Book
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: string;
  unlockedAt?: string | null;
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

const categoryColors: Record<string, { primary: string; secondary: string }> = {
  streak: { primary: "#FF9600", secondary: "#FF6B00" },
  lessons: { primary: "#58CC02", secondary: "#45A302" },
  xp: { primary: "#FFC800", secondary: "#FFAB00" },
  special: { primary: "#1CB0F6", secondary: "#0D9DE5" },
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

interface StaticShareableCardProps {
  achievement: Achievement;
  showUnlockedDate?: boolean;
}

export function StaticShareableCard({ achievement, showUnlockedDate = false }: StaticShareableCardProps) {
  const categoryStyle = getCategoryStyle(achievement.category);
  const IconComponent = getIconComponent(achievement.icon);
  
  return (
    <div 
      style={{ 
        position: 'relative',
        width: '320px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: `linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)`,
      }}
    >
      <div 
        style={{ 
          position: 'absolute',
          inset: 0,
          opacity: 0.3,
          background: `radial-gradient(circle at 50% 0%, ${categoryStyle.primary}40, transparent 60%)` 
        }}
      />
      
      <div 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '8px',
          background: `linear-gradient(90deg, ${categoryStyle.primary}, ${categoryStyle.secondary})` 
        }}
      />
      
      <div style={{ position: 'relative', padding: '30px 32px 32px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div 
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                background: `linear-gradient(135deg, ${categoryStyle.primary}, ${categoryStyle.secondary})`,
                boxShadow: `0 0 40px ${categoryStyle.primary}60, 0 8px 32px rgba(0,0,0,0.4)`
              }}
            >
              <div 
                style={{ 
                  position: 'absolute',
                  inset: '6px',
                  borderRadius: '50%',
                  opacity: 0.4,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.3), rgba(255,255,255,0.2))' 
                }}
              />
              <div 
                style={{ 
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' 
                }}
              />
              <IconComponent style={{ width: '45px', height: '45px', color: '#ffffff', position: 'relative', zIndex: 10 }} />
            </div>
            
            <div 
              style={{ 
                position: 'absolute',
                inset: '-12px',
                borderRadius: '50%',
                opacity: 0.2,
                filter: 'blur(12px)',
                zIndex: -1,
                background: `linear-gradient(135deg, ${categoryStyle.primary}, ${categoryStyle.secondary})` 
              }}
            />
          </div>
          
          <div style={{ marginTop: '22px', textAlign: 'center', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '28px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  borderRadius: '6px',
                  background: `linear-gradient(135deg, ${categoryStyle.primary}30, ${categoryStyle.secondary}20)`,
                }}
              >
                <span 
                  style={{ 
                    color: categoryStyle.primary,
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  {categoryLabels[achievement.category] || achievement.category}
                </span>
              </div>
            </div>
            
            <h2 
              style={{ 
                color: categoryStyle.primary,
                fontSize: '24px',
                fontWeight: 900,
                marginTop: '16px',
                letterSpacing: '-0.025em',
                margin: '16px 0 0 0',
              }}
            >
              {achievement.name}
            </h2>
            
            <p 
              style={{ 
                color: '#9ca3af',
                marginTop: '12px',
                fontSize: '14px',
                lineHeight: '1.6',
                maxWidth: '280px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              {achievement.description}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <div 
                style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  paddingLeft: '20px',
                  paddingRight: '20px',
                  height: '40px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(255,200,0,0.15), rgba(255,150,0,0.1))',
                  border: '1px solid rgba(255,200,0,0.2)'
                }}
              >
                <Zap style={{ width: '20px', height: '20px', color: '#fbbf24', flexShrink: 0 }} />
                <span 
                  style={{ 
                    color: '#fbbf24',
                    fontSize: '18px',
                    fontWeight: 700,
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  +{achievement.xpReward} XP
                </span>
              </div>
            </div>
            
            {showUnlockedDate && achievement.unlockedAt && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '16px', marginBottom: '0' }}>
                Desbloqueada em {new Date(achievement.unlockedAt).toLocaleDateString('pt-BR')}
              </p>
            )}
            
            <div 
              style={{
                marginTop: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <div 
                style={{ 
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${categoryStyle.primary}, ${categoryStyle.secondary})`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '6px',
                  verticalAlign: 'middle',
                }}
              >
                <Trophy style={{ width: '12px', height: '12px', color: '#ffffff' }} />
              </div>
              <span 
                style={{ 
                  color: '#6b7280', 
                  fontSize: '14px',
                  fontWeight: 600,
                  lineHeight: '20px',
                  verticalAlign: 'middle',
                }}
              >
                DeoGlory
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
