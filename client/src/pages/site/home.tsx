import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  BookOpen, 
  Calendar, 
  Heart, 
  ArrowRight,
  BookMarked,
  Vote,
  GraduationCap,
  MapPin,
  Clock,
  Sparkles
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { HeroBanner } from "@/components/site/HeroBanner";
import { InstagramPostModal, InstagramPostData } from "@/components/site/InstagramPostModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StaggerContainer, StaggerItem } from "@/components/AnimatedPage";
import { parseTipTapContent } from "@/lib/utils";
import { DevotionalSkeleton, EventsSkeleton, InstagramGridSkeleton } from "@/components/ui/skeleton-cards";
import { useAuth } from "@/lib/auth";

import devocionalArt from "@assets/stock_images/christian_prayer_spi_92875813.jpg";
import eventImg1 from "@assets/stock_images/christian_youth_conc_2afcb390.jpg";
import eventImg2 from "@assets/stock_images/christian_church_you_d8df7c7e.jpg";
import eventImg3 from "@assets/stock_images/christian_youth_conc_d8e3bb50.jpg";
import instagramImg1 from "@assets/stock_images/christian_prayer_spi_70fb5265.jpg";
import instagramImg2 from "@assets/stock_images/christian_bible_stud_56b5ae40.jpg";
import instagramImg3 from "@assets/stock_images/christian_church_you_6c49260a.jpg";
import instagramImg4 from "@assets/stock_images/christian_church_you_f7bd452d.jpg";
import instagramImg5 from "@assets/stock_images/christian_bible_stud_e77c4159.jpg";
import instagramImg6 from "@assets/stock_images/christian_youth_conc_ce1b7f0c.jpg";

const fallbackDevotionalImages = [devocionalArt];
const fallbackEventImages = [eventImg1, eventImg2, eventImg3];
const fallbackInstagramImages = [
  instagramImg1, instagramImg2, instagramImg3, 
  instagramImg4, instagramImg5, instagramImg6
];

interface DevotionalData {
  id: number;
  title: string;
  verse: string;
  verseReference: string;
  summary?: string;
  author?: string;
  publishedAt?: string;
  imageUrl?: string;
}

interface EventData {
  id: number;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  time?: string;
  location?: string;
  imageUrl?: string;
}

interface SiteHighlights {
  devotional: DevotionalData | null;
  events: EventData[];
  instagramPosts: InstagramPostData[];
}

interface DailyVerseData {
  id: number;
  verse: string;
  reference: string;
  reflection: string | null;
  imageUrl: string | null;
  publishedAt: string;
  stockImage: {
    id: number;
    imageUrl: string;
    category: string;
  } | null;
}

const getQuickAccessItems = (isAuthenticated: boolean) => [
  {
    icon: BookOpen,
    title: "Versículo do Dia",
    description: "Reflexão diária",
    href: "/versiculo-do-dia",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: BookMarked,
    title: "Devocionais",
    description: "Leia a Palavra",
    href: "/devocionais",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: GraduationCap,
    title: "DeoGlory",
    description: "Sistema de Estudos",
    href: isAuthenticated ? "/study" : "/membro",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Heart,
    title: "Oracao",
    description: "Envie seu pedido",
    href: "/oracao",
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

function formatEventDate(dateStr: string) {
  // Use UTC to avoid timezone shifts when parsing YYYY-MM-DD
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const weekdays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  return {
    date: day,
    month: months[date.getMonth()],
    weekday: weekdays[date.getDay()],
  };
}

function formatDevotionalDate(dateStr?: string) {
  if (!dateStr) return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function HomePage() {
  const [selectedPost, setSelectedPost] = useState<InstagramPostData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const { data: highlights, isLoading, isError } = useQuery<SiteHighlights>({
    queryKey: ['/api/site/highlights'],
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const { data: dailyVerse, isLoading: isLoadingVerse } = useQuery<DailyVerseData>({
    queryKey: ['/api/site/daily-verse'],
    retry: false,
  });

  const quickAccessItems = getQuickAccessItems(isAuthenticated);

  const devotional = highlights?.devotional || null;

  const events = (highlights?.events || []).map((event, index) => ({
    ...event,
    ...formatEventDate(event.startDate),
    imageUrl: event.imageUrl && !event.imageUrl.includes('placeholder') 
      ? event.imageUrl 
      : fallbackEventImages[index % fallbackEventImages.length],
  }));

  // Só usa posts reais da API - não mostra fallback de imagens stock
  // Se a API do Instagram não estiver configurada ou não houver posts, a seção fica oculta
  const instagramPosts = (highlights?.instagramPosts || [])
    .filter(post => post.imageUrl && !post.imageUrl.includes('placeholder') && !post.imageUrl.includes('stock_images'))
    .map(post => ({
      ...post,
    }));

  const devotionalImage = devotional?.imageUrl && !devotional.imageUrl.includes('placeholder')
    ? devotional.imageUrl
    : fallbackDevotionalImages[0];

  const verseImage = dailyVerse?.stockImage?.imageUrl || dailyVerse?.imageUrl;

  return (
    <SiteLayout>
      <HeroBanner />

      {dailyVerse && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-amber-500" />
                <h2 className="text-2xl font-bold">Versículo do Dia</h2>
              </div>
              <Link href="/versiculo-do-dia">
                <Button variant="ghost" className="gap-2" data-testid="link-verse-page">
                  Ver mais <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-3">
                    <div className="relative overflow-hidden min-h-[280px]">
                      <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ 
                          backgroundImage: verseImage ? `url(${verseImage})` : undefined,
                          backgroundColor: verseImage ? undefined : 'hsl(var(--primary))'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/70" />
                      <div className="relative p-8 flex flex-col justify-center h-full">
                        <div className="absolute top-4 right-4">
                          <Sparkles className="h-6 w-6 text-amber-500/50" />
                        </div>
                        <div className="relative z-10">
                          <p className="text-sm text-amber-500 mb-2">
                            {new Date(dailyVerse.publishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
                            <BookOpen className="h-8 w-8 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2" data-testid="verse-reference">
                            {dailyVerse.reference}
                          </h3>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 p-6 md:p-8 space-y-4">
                      <blockquote className="border-l-4 border-amber-500 pl-4 py-2 bg-amber-500/5 rounded-r-lg">
                        <p className="italic text-foreground/90 text-lg">
                          "{dailyVerse.verse}"
                        </p>
                        <cite className="text-sm text-muted-foreground mt-1 block">
                          - {dailyVerse.reference}
                        </cite>
                      </blockquote>
                      {dailyVerse.reflection && (
                        <p className="text-muted-foreground line-clamp-3">
                          {dailyVerse.reflection}
                        </p>
                      )}
                      <Link href="/versiculo-do-dia">
                        <Button className="bg-amber-500 hover:bg-amber-600 text-white" data-testid="button-read-verse">
                          Ler Completo <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      )}

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Devocional da Semana</h2>
            </div>
            <Link href="/devocionais">
              <Button variant="ghost" className="gap-2" data-testid="link-all-devotionals">
                Ver todos <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <DevotionalSkeleton />
          ) : !devotional ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum devocional publicado no momento.
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-3">
                    <div className="relative overflow-hidden min-h-[280px]">
                      <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${devotionalImage})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/70" />
                      <div className="relative p-8 flex flex-col justify-center h-full">
                        <div className="absolute top-4 right-4">
                          <Sparkles className="h-6 w-6 text-primary/50" />
                        </div>
                        <div className="relative z-10">
                          <p className="text-sm text-primary mb-2">{formatDevotionalDate(devotional.publishedAt)}</p>
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
                            <BookOpen className="h-8 w-8 text-white" />
                          </div>
                          <h3 className="text-2xl font-bold text-white mb-2" data-testid="devotional-title">
                            {devotional.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            Por: {devotional.author || "Secretaria de Espiritualidade"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 p-6 md:p-8 space-y-4">
                      <blockquote className="border-l-4 border-primary pl-4 py-2 bg-primary/5 rounded-r-lg">
                        <p className="italic text-foreground/90">
                          "{devotional.verse}"
                        </p>
                        <cite className="text-sm text-muted-foreground mt-1 block">
                          - {devotional.verseReference}
                        </cite>
                      </blockquote>
                      <p className="text-muted-foreground leading-relaxed">
                        {parseTipTapContent(devotional.summary)}
                      </p>
                      <Link href={`/devocionais/${devotional.id}`}>
                        <Button className="gap-2" data-testid="button-read-devotional">
                          Ler Completo <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-2 mb-8 flex-wrap">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Próximos Eventos</h2>
            </div>
            <Link href="/agenda">
              <Button variant="ghost" className="gap-2" data-testid="link-all-events">
                Ver todos <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <EventsSkeleton />
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum evento programado no momento.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              <StaggerContainer className="flex gap-4 min-w-max md:min-w-0 md:grid md:grid-cols-3">
                {events.map((event) => (
                  <StaggerItem key={event.id}>
                    <motion.div
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="w-[280px] md:w-auto overflow-hidden hover-elevate">
                        <CardContent className="p-0">
                          <div className="flex">
                            <div className="relative min-w-[100px] min-h-[140px] overflow-hidden">
                              <div 
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${event.imageUrl})` }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/80 to-gray-900/60" />
                              <div className="relative z-10 h-full flex flex-col items-center justify-center text-white p-3">
                                <span className="text-xs font-semibold text-primary">
                                  {event.month}
                                </span>
                                <span className="text-3xl font-bold">
                                  {event.date}
                                </span>
                                <span className="text-xs text-gray-300">
                                  {event.weekday}
                                </span>
                              </div>
                            </div>
                            <div className="p-4 flex-1">
                              <h3 className="font-semibold text-lg mb-2" data-testid={`event-title-${event.id}`}>
                                {event.title}
                              </h3>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                {event.location && (
                                  <p className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-primary" /> {event.location}
                                  </p>
                                )}
                                {event.time && (
                                  <p className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 text-primary" /> {event.time}
                                  </p>
                                )}
                              </div>
                              <Link href={`/agenda`}>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="mt-3 gap-1 p-0 h-auto text-primary"
                                  data-testid={`button-event-details-${event.id}`}
                                >
                                  Saiba mais <ArrowRight className="h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Acesso Rápido</h2>
            <p className="text-muted-foreground">
              Navegue pelos nossos recursos
            </p>
          </div>

          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickAccessItems.map((item) => (
              <StaggerItem key={item.href + item.title}>
                <Link href={item.href}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="h-full hover-elevate cursor-pointer">
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className={`w-14 h-14 rounded-xl ${item.bg} flex items-center justify-center mb-4`}>
                          <item.icon className={`h-7 w-7 ${item.color}`} />
                        </div>
                        <h3 className="font-semibold mb-1" data-testid={`quick-access-${item.title.toLowerCase()}`}>
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Só mostra seção Instagram se houver posts reais da API */}
      {instagramPosts.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between gap-2 mb-8 flex-wrap">
              <div className="flex items-center gap-3">
                <svg className="h-6 w-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <h2 className="text-2xl font-bold">Instagram</h2>
              </div>
              <a 
                href="https://instagram.com/umpemaus" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button variant="ghost" className="gap-2" data-testid="link-follow-instagram">
                  Seguir <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>

            {isLoading ? (
              <InstagramGridSkeleton />
            ) : (
              <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                <div className="flex gap-2 min-w-max md:min-w-0 md:grid md:grid-cols-6">
                  {instagramPosts.map((post, i) => (
                    <motion.div
                      key={post.id}
                      onClick={() => {
                        setSelectedPost(post);
                        setIsModalOpen(true);
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      className="w-[120px] md:w-auto aspect-square rounded-lg overflow-hidden cursor-pointer flex-shrink-0"
                      data-testid={`instagram-post-${i + 1}`}
                    >
                      <img 
                        src={post.imageUrl} 
                        alt={post.caption || `Post Instagram ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-muted-foreground text-sm mt-4">
              @umpemaus
            </p>
          </div>
        </section>
      )}

      <section className="py-20 bg-gray-900 dark:bg-black text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4">
              Precisa de oração?
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Compartilhe suas necessidades. Iremos orar uns pelos outros.
            </p>
            <Link href="/oracao">
              <Button 
                size="lg" 
                className="bg-primary text-primary-foreground font-semibold"
                data-testid="button-send-prayer"
              >
                <Heart className="h-5 w-5 mr-2" />
                Enviar Pedido de Oração
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <InstagramPostModal
        post={selectedPost}
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedPost(null);
          }
        }}
      />
    </SiteLayout>
  );
}
