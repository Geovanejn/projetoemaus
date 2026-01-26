import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BookOpen, Calendar, Instagram, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import defaultDevotionalImg from "@assets/stock_images/christian_prayer_spi_92875813.jpg";
import defaultEventImg from "@assets/stock_images/christian_bible_stud_56b5ae40.jpg";
import defaultInstagramImg from "@assets/stock_images/christian_prayer_spi_70fb5265.jpg";

interface DevotionalData {
  id: number;
  title: string;
  verse: string;
  verseReference: string;
  summary?: string;
  imageUrl?: string;
  mobileCropData?: string | null;
}

interface MobileCropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

function parseMobileCropData(data: string | null | undefined): MobileCropData | null {
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function getMobileBackgroundStyle(cropData: MobileCropData | null): React.CSSProperties {
  if (!cropData) {
    return { backgroundPosition: 'center' };
  }
  const posX = cropData.x + (cropData.width / 2);
  const posY = cropData.y + (cropData.height / 2);
  return { backgroundPosition: `${posX}% ${posY}%` };
}

interface EventData {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  startDate: string;
  time?: string;
  location?: string;
}

interface InstagramPostData {
  id: number;
  caption?: string;
  imageUrl: string;
  permalink?: string;
}

interface HighlightsData {
  devotional: DevotionalData | null;
  events: EventData[];
  instagramPosts: InstagramPostData[];
  featuredInstagramPost: InstagramPostData | null;
  featuredDevotionals: DevotionalData[];
  featuredEvents: EventData[];
  featuredInstagramPosts: InstagramPostData[];
}

interface DailyVerseData {
  id: number;
  verse: string;
  reference: string;
  reflection?: string;
  imageUrl?: string;
  stockImage?: { imageUrl: string };
  publishedAt: string;
}

type BannerSlide = {
  type: 'devotional' | 'event' | 'instagram' | 'verse';
  id: number;
  title: string;
  subtitle: string;
  caption: string;
  imageUrl: string;
  mobileCropData?: MobileCropData | null;
  linkUrl: string;
  linkText: string;
  secondaryLinkUrl?: string;
  secondaryLinkText?: string;
  icon: LucideIcon;
  badge: string;
};

function formatEventDate(dateString: string): string {
  // Use T12:00:00 to avoid timezone shifts to previous day
  const date = new Date(dateString + 'T12:00:00');
  const day = date.getDate();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const month = months[date.getMonth()];
  return `${day} de ${month}`;
}

export function HeroBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const { data: highlights, isLoading, isError } = useQuery<HighlightsData>({
    queryKey: ['/api/site/highlights'],
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const { data: dailyVerse } = useQuery<DailyVerseData>({
    queryKey: ['/api/site/daily-verse'],
    retry: false,
  });

  const slides: BannerSlide[] = [];

  // Add daily verse as first slide if available
  if (dailyVerse) {
    const verseImage = dailyVerse.stockImage?.imageUrl || dailyVerse.imageUrl;
    slides.push({
      type: 'verse',
      id: dailyVerse.id,
      title: 'Versículo do Dia',
      subtitle: `"${dailyVerse.verse}"`,
      caption: dailyVerse.reference,
      imageUrl: verseImage || defaultDevotionalImg,
      linkUrl: '/versiculo-do-dia',
      linkText: 'Ver Reflexão',
      icon: Sparkles,
      badge: 'Versículo do Dia',
    });
  }

  const hasFeaturedContent = (highlights?.featuredDevotionals?.length || 0) > 0 ||
    (highlights?.featuredEvents?.length || 0) > 0 ||
    (highlights?.featuredInstagramPosts?.length || 0) > 0;

  if (hasFeaturedContent) {
    highlights?.featuredDevotionals?.forEach((d) => {
      slides.push({
        type: 'devotional',
        id: d.id,
        title: d.title,
        subtitle: `"${d.verse}"`,
        caption: d.verseReference,
        imageUrl: d.imageUrl || defaultDevotionalImg,
        mobileCropData: parseMobileCropData(d.mobileCropData),
        linkUrl: `/devocionais/${d.id}`,
        linkText: 'Ler Devocional',
        icon: BookOpen,
        badge: 'Devocional',
      });
    });

    highlights?.featuredEvents?.forEach((e) => {
      slides.push({
        type: 'event',
        id: e.id,
        title: e.title,
        subtitle: e.description || 'Participe conosco!',
        caption: `${formatEventDate(e.startDate)}${e.time ? ` às ${e.time}` : ''}${e.location ? ` - ${e.location}` : ''}`,
        imageUrl: e.imageUrl || defaultEventImg,
        linkUrl: `/agenda/${e.id}`,
        linkText: 'Ver Detalhes',
        icon: Calendar,
        badge: 'Evento',
      });
    });

    highlights?.featuredInstagramPosts?.forEach((p) => {
      slides.push({
        type: 'instagram',
        id: p.id,
        title: 'Novidades no Instagram',
        subtitle: p.caption || 'Confira nossa última postagem!',
        caption: '@umpemaus',
        imageUrl: p.imageUrl || defaultInstagramImg,
        linkUrl: p.permalink || 'https://instagram.com/umpemaus',
        linkText: 'Ver no Instagram',
        icon: Instagram,
        badge: 'Instagram',
      });
    });
  } else {
    if (highlights?.devotional) {
      const d = highlights.devotional;
      slides.push({
        type: 'devotional',
        id: d.id,
        title: d.title,
        subtitle: `"${d.verse}"`,
        caption: d.verseReference,
        imageUrl: d.imageUrl || defaultDevotionalImg,
        mobileCropData: parseMobileCropData(d.mobileCropData),
        linkUrl: `/devocionais/${d.id}`,
        linkText: 'Ler Devocional',
        icon: BookOpen,
        badge: 'Devocional do Dia',
      });
    }

    if (highlights?.events && highlights.events.length > 0) {
      const e = highlights.events[0];
      slides.push({
        type: 'event',
        id: e.id,
        title: e.title,
        subtitle: e.description || 'Participe conosco!',
        caption: `${formatEventDate(e.startDate)}${e.time ? ` às ${e.time}` : ''}${e.location ? ` - ${e.location}` : ''}`,
        imageUrl: e.imageUrl || defaultEventImg,
        linkUrl: `/agenda/${e.id}`,
        linkText: 'Ver Detalhes',
        icon: Calendar,
        badge: 'Próximo Evento',
      });
    }

    if (highlights?.featuredInstagramPost) {
      const p = highlights.featuredInstagramPost;
      slides.push({
        type: 'instagram',
        id: p.id,
        title: 'Novidades no Instagram',
        subtitle: p.caption || 'Confira nossa última postagem!',
        caption: '@umpemaus',
        imageUrl: p.imageUrl || defaultInstagramImg,
        linkUrl: p.permalink || 'https://instagram.com/umpemaus',
        linkText: 'Ver no Instagram',
        icon: Instagram,
        badge: 'Instagram',
      });
    }
  }

  const defaultSlides: BannerSlide[] = [
    {
      type: 'devotional',
      id: 0,
      title: "Bem-vindo ao Emaús",
      subtitle: 'Conectando jovens à fé e à comunidade',
      caption: "Comunidade UMP Emaús",
      imageUrl: defaultDevotionalImg,
      linkUrl: '/sobre',
      linkText: 'Conhecer',
      icon: BookOpen,
      badge: 'Comunidade',
    },
  ];

  const displaySlides = slides.length > 0 ? slides : defaultSlides;

  const goToNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % displaySlides.length);
  }, [displaySlides.length]);

  const goToPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + displaySlides.length) % displaySlides.length);
  }, [displaySlides.length]);

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (displaySlides.length <= 1) return;
    const timer = setInterval(goToNext, 8000);
    return () => clearInterval(timer);
  }, [goToNext, displaySlides.length]);

  useEffect(() => {
    if (currentIndex >= displaySlides.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, displaySlides.length]);

  const currentSlide = displaySlides[currentIndex] || defaultSlides[0];
  const IconComponent = currentSlide.icon;

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  if (isLoading) {
    return (
      <div className="relative w-full h-[480px] md:h-[520px] overflow-hidden bg-gray-900 flex items-center justify-center">
        <div className="text-white/60 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[480px] md:h-[520px] overflow-hidden bg-gray-900">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentSlide.type}-${currentSlide.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          {/* Desktop background - always centered */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden md:block"
            style={{ backgroundImage: `url(${currentSlide.imageUrl})` }}
          />
          {/* Mobile background - uses crop position if available, otherwise centered */}
          <div 
            className="absolute inset-0 md:hidden bg-cover bg-no-repeat"
            style={{ 
              backgroundImage: `url(${currentSlide.imageUrl})`,
              ...(currentSlide.mobileCropData 
                ? getMobileBackgroundStyle(currentSlide.mobileCropData) 
                : { backgroundPosition: 'center' })
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/80 to-gray-900/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-gray-900/30" />
        </motion.div>
      </AnimatePresence>
      
      <div className="relative h-full container mx-auto px-4 flex flex-col justify-center">
        <div className="max-w-xl ml-4 md:ml-12 lg:ml-16">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm rounded-full px-3 py-1.5 mb-4"
          >
            <IconComponent className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary font-medium text-xs uppercase tracking-wider">
              {currentSlide.badge}
            </span>
          </motion.div>
          
          <div className="h-[280px] md:h-[300px] overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`content-${currentSlide.type}-${currentSlide.id}`}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="h-full flex flex-col"
              >
                <h1
                  className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight line-clamp-2"
                  data-testid="banner-title"
                >
                  {currentSlide.title}
                </h1>
                
                <blockquote className="border-l-3 border-primary pl-4 py-2 mb-6 flex-shrink-0">
                  <p className="text-base md:text-xl text-white/90 italic font-light leading-relaxed line-clamp-2">
                    {currentSlide.subtitle}
                  </p>
                  <cite className="text-sm text-primary mt-2 block not-italic font-medium">
                    - {currentSlide.caption}
                  </cite>
                </blockquote>

                <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                  <Link href={currentSlide.linkUrl}>
                    <Button
                      size="default"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
                      data-testid="banner-primary-button"
                    >
                      {currentSlide.linkText}
                    </Button>
                  </Link>
                  {currentSlide.secondaryLinkUrl && (
                    <Link href={currentSlide.secondaryLinkUrl}>
                      <Button
                        size="default"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10 font-semibold px-6"
                        data-testid="banner-secondary-button"
                      >
                        {currentSlide.secondaryLinkText}
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {displaySlides.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
            aria-label="Anterior"
            data-testid="banner-prev-button"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
            aria-label="Próximo"
            data-testid="banner-next-button"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {displaySlides.map((slide, index) => (
          <button
            key={`${slide.type}-${slide.id}`}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex
                ? "w-5 h-1.5 bg-primary"
                : "w-1.5 h-1.5 bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Ir para slide ${index + 1}`}
            data-testid={`banner-dot-${index}`}
          />
        ))}
      </div>
    </div>
  );
}
