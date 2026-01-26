import { Star, Crown, Sparkles, Circle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useEffect } from "react";

export type CardRarity = "common" | "rare" | "epic" | "legendary";
export type CardOrientation = "portrait" | "landscape";

interface CollectibleCardProps {
  name: string;
  imageUrl?: string | null;
  rarity: CardRarity;
  orientation?: CardOrientation;
  sourceType?: "season" | "event" | "magazine";
  onClick?: () => void;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg" | "compact" | "magazine" | "event" | "event-modal" | "magazine-modal";
}

const rarityLabels: Record<CardRarity, string> = {
  common: "Comum",
  rare: "Raro",
  epic: "Epico",
  legendary: "Lendario",
};

// Icons matching the badge indicators at the top of the collection page
const rarityIcons: Record<CardRarity, LucideIcon> = {
  common: Circle,
  rare: Star,
  epic: Sparkles,
  legendary: Crown,
};

export function CollectibleCard({
  name,
  imageUrl,
  rarity,
  orientation = "portrait",
  sourceType,
  onClick,
  className = "",
  showLabel = true,
  size = "md",
}: CollectibleCardProps) {
  const IconComponent = rarityIcons[rarity];
  const label = rarityLabels[rarity];
  
  const sizeClasses = {
    compact: "w-[100px] h-[120px]",
    sm: "w-[140px] h-[160px]",
    md: "w-[180px] h-[210px] sm:w-[220px] sm:h-[250px]",
    lg: "w-[280px] h-[320px]",
    magazine: "w-[180px] h-[270px] sm:w-[220px] sm:h-[330px]",
    // Event-specific: vertical portrait format matching new design
    event: "w-[180px] h-[270px] sm:w-[220px] sm:h-[330px]",
    // Modal sizes - 30% larger than regular event/magazine
    "event-modal": "w-[234px] h-[351px] sm:w-[286px] sm:h-[429px]",
    "magazine-modal": "w-[234px] h-[351px] sm:w-[286px] sm:h-[429px]",
  };

  // For magazine size, we use flex-1 with aspect ratio instead of fixed height
  const imageHeightClasses: Record<string, string> = {
    compact: "h-[48px]",
    sm: "h-[68px]",
    md: "h-[88px] sm:h-[108px]",
    lg: "h-[140px]",
    magazine: "aspect-[3/4] w-full",
    event: "h-[100px] sm:h-[110px]",
    "event-modal": "h-[130px] sm:h-[143px]",
    "magazine-modal": "aspect-[3/4] w-full",
  };

  const badgeSizeClasses: Record<string, string> = {
    compact: "w-7 h-7",
    sm: "w-8 h-8",
    md: "w-10 h-10 sm:w-12 sm:h-12",
    lg: "w-14 h-14",
    magazine: "w-12 h-12 sm:w-14 sm:h-14",
    event: "w-12 h-12 sm:w-14 sm:h-14",
    "event-modal": "w-14 h-14 sm:w-16 sm:h-16",
    "magazine-modal": "w-14 h-14 sm:w-16 sm:h-16",
  };

  const titleSizeClasses: Record<string, string> = {
    compact: "text-[10px] leading-tight line-clamp-2 px-1",
    sm: "text-xs",
    md: "text-sm sm:text-base",
    lg: "text-lg",
    magazine: "text-base sm:text-lg",
    event: "text-sm sm:text-base",
    "event-modal": "text-base sm:text-lg",
    "magazine-modal": "text-base sm:text-lg",
  };

  const subtitleSizeClasses: Record<string, string> = {
    compact: "text-[8px]",
    sm: "text-[10px]",
    md: "text-[10px] sm:text-xs",
    lg: "text-sm",
    magazine: "text-xs sm:text-sm",
    event: "text-[10px] sm:text-xs",
    "event-modal": "text-xs sm:text-sm",
    "magazine-modal": "text-xs sm:text-sm",
  };

  const cardRef = useRef<HTMLDivElement>(null);

  // Treat "season" as "magazine" for backwards compatibility
  const effectiveSourceType = sourceType === 'season' ? 'magazine' : sourceType;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`
        collectible-card
        ${effectiveSourceType === 'event' ? `event-card-${rarity}` : effectiveSourceType === 'magazine' ? `magazine-card-${rarity}` : `collectible-card-${rarity}`}
        ${sizeClasses[size]}
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
      data-testid={`collectible-card-${rarity}`}
    >
      {/* Light sweep effects - for rare, epic and legendary (both season and event) */}
      {(rarity === "rare" || rarity === "epic" || rarity === "legendary") && (
        <div className="collectible-card-effects" />
      )}

      {/* Second flash for legendary (both season and event cards) */}
      {rarity === "legendary" && (
        <div className="collectible-card-effects-secondary" />
      )}

      {/* Holographic overlay for epic and legendary (both season and event) */}
      {(rarity === "epic" || rarity === "legendary") && (
        <div className="collectible-card-holo-overlay" />
      )}

      {/* Diamond sparkles only for legendary season cards (not event/magazine) */}
      {rarity === "legendary" && effectiveSourceType !== "event" && effectiveSourceType !== "magazine" && (
        <>
          <div className="card-diamond-effect" />
          <div className="card-diamond-effect" />
          <div className="card-diamond-effect" />
          <div className="card-diamond-effect" />
          <div className="card-diamond-effect" />
        </>
      )}


      <div className={`collectible-card-inner ${size === 'compact' ? 'collectible-card-inner-compact' : ''} ${effectiveSourceType === 'magazine' ? 'magazine-card-inner' : ''} ${effectiveSourceType === 'event' ? 'event-card-inner' : ''}`}>
        {/* Compact mode: only centered rarity icon, no image */}
        {size === 'compact' ? (
          <div className="flex-1 flex items-center justify-center">
            <div className={`collectible-card-medallion collectible-card-medallion-${rarity} w-12 h-12`}>
              <IconComponent className="w-6 h-6 text-white" />
            </div>
          </div>
        ) : effectiveSourceType === 'magazine' ? (
          /* Magazine card layout: cover image BEHIND PNG, NO title */
          <>
            {/* Layer 0: Portal effect for legendary (BEHIND everything) */}
            {rarity === 'legendary' && (
              <div className="magazine-card-portal-layer" />
            )}

            {/* Layer 1: Cover image (BEHIND the PNG frame) */}
            <div className="magazine-card-image-layer">
              {imageUrl && (
                <img 
                  src={imageUrl} 
                  alt={name}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'auto' }}
                />
              )}
            </div>

            {/* Layer 2: PNG card frame (ON TOP of the image) */}
            <div className={`magazine-card-png-layer magazine-card-png-${rarity}`} />
          </>
        ) : effectiveSourceType === 'event' ? (
          /* Event card layout: image BEHIND PNG, portal BEHIND everything */
          <>
            {/* Layer 0: Portal effect for legendary (BEHIND everything) */}
            {rarity === 'legendary' && (
              <div className="event-card-portal-layer" />
            )}

            {/* Layer 1: User image (BEHIND the PNG frame) */}
            <div className="event-card-image-layer">
              {imageUrl && (
                <img 
                  src={imageUrl} 
                  alt={name}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'auto' }}
                />
              )}
            </div>

            {/* Layer 2: PNG card frame (ON TOP of the image) */}
            <div className={`event-card-png-layer event-card-png-${rarity}`} />

            {/* Layer 3: Event name overlay */}
            <div className="event-card-name-area">
              <h3 className={`event-card-title event-card-title-${rarity}`}>
                {name}
              </h3>
            </div>

          </>
        ) : (
          <>
            {/* Centered rarity medallion with forged effect */}
            <div className={`collectible-card-medallion collectible-card-medallion-${rarity} ${badgeSizeClasses[size]} ${size === 'magazine' ? 'my-2' : ''}`}>
              <IconComponent className="w-6 h-6 text-white" />
            </div>

            {/* Text plate - hidden for magazine size */}
            {size !== 'magazine' && (
              <div className={`flex flex-col justify-center items-center ${size === 'event' ? '' : 'flex-1'}`}>
                <div className="collectible-card-text-plate">
                  <h3 className={`collectible-card-title ${titleSizeClasses[size]}`}>
                    {name}
                  </h3>
                </div>
              </div>
            )}

            <div 
              className={`collectible-card-image ${size === 'event' ? 'flex-1' : imageHeightClasses[size]} overflow-hidden relative`}
            >
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={name}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'auto' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black/20">
                  <IconComponent className="w-8 h-8 text-white/50" />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

interface CollectibleCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: {
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    rarity: CardRarity;
    sourceType: "season" | "event" | "magazine";
    sourceName?: string;
    earnedAt?: string;
    performance?: number | null;
  };
}

export function CollectibleCardModal({ isOpen, onClose, card }: CollectibleCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sound effect only for legendary cards - plays once, no loop
  useEffect(() => {
    if (!isOpen) return;

    // Only legendary cards have sound effect
    if (card.rarity === "legendary") {
      audioRef.current = new Audio("/sounds/legendary-reveal.mp3");
      audioRef.current.loop = false;
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {
        // Autoplay might be blocked, ignore error
      });
    }

    return () => {
      // Cleanup: stop and remove audio when modal closes
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, [isOpen, card.rarity]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto max-h-screen"
      onClick={onClose}
      data-testid="modal-card-view"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="flex flex-col items-center gap-4 max-w-md overflow-visible my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={cardRef} className="relative overflow-visible">
          <CollectibleCard
            name={card.name}
            imageUrl={card.imageUrl}
            rarity={card.rarity}
            sourceType={card.sourceType}
            orientation="portrait"
            size={(card.sourceType === "magazine" || card.sourceType === "season") ? "magazine-modal" : card.sourceType === "event" ? "event-modal" : "lg"}
          />
        </div>

        <div className="text-center space-y-2 text-white">
          {card.description && (
            <p className="text-sm text-white/80 max-w-xs">
              {card.description}
            </p>
          )}
          
          {card.sourceName && (
            <p className="text-xs text-white/60">
              {card.sourceType === "event" ? "Evento" : "Revista"}: {card.sourceName}
            </p>
          )}

          {card.earnedAt && (
            <p className="text-xs text-white/50">
              Conquistado em: {new Date(card.earnedAt).toLocaleDateString("pt-BR")}
            </p>
          )}

          {card.performance !== null && card.performance !== undefined && (
            <p className="text-xs text-white/50">
              Desempenho: {Math.round(card.performance)}%
            </p>
          )}
        </div>


        <button
          onClick={onClose}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm transition-colors"
          data-testid="button-close-modal"
        >
          Fechar
        </button>
      </motion.div>
    </motion.div>
  );
}

export function CollectibleCardGrid({ 
  cards, 
  onCardClick,
  emptyMessage = "Nenhum card encontrado"
}: { 
  cards: Array<{
    id: number;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    rarity: CardRarity;
    sourceType: "season" | "event" | "magazine";
    earnedAt?: string;
    performance?: number | null;
  }>;
  onCardClick?: (card: typeof cards[0]) => void;
  emptyMessage?: string;
}) {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <Crown className="w-12 h-12 mb-4 opacity-30" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {cards.map((card) => (
        <CollectibleCard
          key={card.id}
          name={card.name}
          imageUrl={card.imageUrl}
          rarity={card.rarity}
          orientation="portrait"
          onClick={onCardClick ? () => onCardClick(card) : undefined}
          size="md"
        />
      ))}
    </div>
  );
}
