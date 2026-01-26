import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Trophy, 
  Medal, 
  Crown, 
  Star,
  Clock,
  Target,
  Share2,
  ChevronUp,
  ChevronDown,
  Minus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

interface RankingEntry {
  userId: number;
  userName: string;
  userAvatar: string | null;
  position: number;
  previousPosition?: number;
  score: number;
  lessonsCompleted: number;
  challengeScore: number | null;
  challengeTime: number | null;
  isCurrentUser: boolean;
}

interface Season {
  id: number;
  title: string;
  theme: string;
  description: string;
  coverImage: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  hasFinalChallenge: boolean;
}

function PositionBadge({ position }: { position: number }) {
  if (position === 1) {
    return (
      <motion.div 
        className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Crown className="w-5 h-5 text-white" />
      </motion.div>
    );
  }
  
  if (position === 2) {
    return (
      <motion.div 
        className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
      >
        <Medal className="w-5 h-5 text-white" />
      </motion.div>
    );
  }
  
  if (position === 3) {
    return (
      <motion.div 
        className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
      >
        <Medal className="w-5 h-5 text-white" />
      </motion.div>
    );
  }
  
  return (
    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
      <span className="text-sm font-semibold text-muted-foreground">{position}</span>
    </div>
  );
}

function PositionChange({ current, previous }: { current: number; previous?: number }) {
  if (!previous || previous === current) {
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
  
  const change = previous - current;
  
  if (change > 0) {
    return (
      <div className="flex items-center gap-0.5 text-green-500">
        <ChevronUp className="w-4 h-4" />
        <span className="text-xs font-medium">{change}</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-0.5 text-red-500">
      <ChevronDown className="w-4 h-4" />
      <span className="text-xs font-medium">{Math.abs(change)}</span>
    </div>
  );
}

function RankingCard({ entry, index }: { entry: RankingEntry; index: number }) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className={cn(
          "p-4",
          entry.isCurrentUser && "ring-2 ring-primary bg-primary/5"
        )}
      >
        <div className="flex items-center gap-4">
          <PositionBadge position={entry.position} />
          
          <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
            <AvatarImage src={entry.userAvatar || undefined} alt={entry.userName} />
            <AvatarFallback className="text-sm font-semibold">
              {entry.userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-semibold truncate",
                entry.isCurrentUser && "text-primary"
              )}>
                {entry.userName}
              </span>
              {entry.isCurrentUser && (
                <Badge variant="outline" className="text-xs shrink-0">
                  Você
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span>{entry.lessonsCompleted} lições</span>
              </div>
              {entry.challengeScore !== null && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  <span>{entry.challengeScore} pts</span>
                </div>
              )}
              {entry.challengeTime !== null && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(entry.challengeTime)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <PositionChange current={entry.position} previous={entry.previousPosition} />
            
            <div className="text-right">
              <div className="text-lg font-bold">{entry.score}</div>
              <div className="text-xs text-muted-foreground">pontos</div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function TopThreePodium({ entries }: { entries: RankingEntry[] }) {
  const positions = [
    { entry: entries[1], order: 0, height: "h-24", delay: 0.2 },
    { entry: entries[0], order: 1, height: "h-32", delay: 0 },
    { entry: entries[2], order: 2, height: "h-20", delay: 0.4 },
  ].filter(p => p.entry);
  
  return (
    <div className="flex items-end justify-center gap-4 py-6">
      {positions.map(({ entry, order, height, delay }, index) => (
        <motion.div
          key={entry.userId}
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, type: "spring", stiffness: 100 }}
          style={{ order }}
        >
          <Avatar className={cn(
            "border-4 shadow-lg mb-2",
            entry.position === 1 && "h-20 w-20 border-yellow-400",
            entry.position === 2 && "h-16 w-16 border-gray-400",
            entry.position === 3 && "h-14 w-14 border-orange-400"
          )}>
            <AvatarImage src={entry.userAvatar || undefined} alt={entry.userName} />
            <AvatarFallback className={cn(
              "font-bold",
              entry.position === 1 && "text-lg",
              entry.position === 2 && "text-base",
              entry.position === 3 && "text-sm"
            )}>
              {entry.userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <span className="font-medium text-sm text-center truncate max-w-20 mb-2">
            {entry.userName.split(' ')[0]}
          </span>
          
          <div 
            className={cn(
              "w-20 rounded-t-lg flex flex-col items-center justify-center",
              height,
              entry.position === 1 && "bg-gradient-to-b from-yellow-400 to-amber-500",
              entry.position === 2 && "bg-gradient-to-b from-gray-300 to-gray-400",
              entry.position === 3 && "bg-gradient-to-b from-orange-400 to-orange-600"
            )}
          >
            <span className="text-white font-bold text-2xl">{entry.position}</span>
            <span className="text-white/80 text-xs font-medium">{entry.score} pts</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function SeasonRankingPage() {
  const { id } = useParams<{ id: string }>();
  const seasonId = parseInt(id || "0");
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const rankingRef = useRef<HTMLDivElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const { data: season, isLoading: seasonLoading, isError: seasonError, refetch: refetchSeason } = useQuery<Season>({
    queryKey: ["/api/study/seasons", seasonId],
    enabled: isAuthenticated && !!seasonId,
  });

  const { data: ranking = [], isLoading: rankingLoading, isError: rankingError, refetch: refetchRanking } = useQuery<RankingEntry[]>({
    queryKey: ["/api/study/seasons", seasonId, "ranking"],
    enabled: isAuthenticated && !!seasonId,
  });

  const handleRetry = () => {
    refetchSeason();
    refetchRanking();
  };

  const generateShareImage = useCallback(async () => {
    if (!rankingRef.current) return;
    
    setIsGeneratingImage(true);
    try {
      const canvas = await html2canvas(rankingRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = `ranking-${season?.title || 'temporada'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({
        title: "Imagem salva!",
        description: "A imagem do ranking foi baixada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar imagem",
        description: "Não foi possível gerar a imagem do ranking.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  }, [season, toast]);

  const currentUserRank = ranking.find(r => r.isCurrentUser);
  const topThree = ranking.slice(0, 3);
  const restOfRanking = ranking.slice(3);

  if (seasonLoading || rankingLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (seasonError || rankingError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Erro ao carregar ranking</h2>
          <p className="text-muted-foreground mb-4">
            Não foi possível carregar o ranking. Tente novamente.
          </p>
          <Button onClick={handleRetry} data-testid="button-retry-ranking">
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Temporada não encontrada</h2>
          <p className="text-muted-foreground mb-4">
            A temporada que você está procurando não existe.
          </p>
          <Link href="/study/seasons">
            <Button data-testid="button-back-seasons">Voltar para temporadas</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={`/study/season/${seasonId}`}>
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold">Ranking</h1>
              <p className="text-xs text-muted-foreground">{season.title}</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={generateShareImage}
            disabled={isGeneratingImage}
            data-testid="button-share-ranking"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {currentUserRank && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Sua posicao</div>
                    <div className="text-2xl font-bold text-primary">
                      {currentUserRank.position}o lugar
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total de pontos</div>
                  <div className="text-2xl font-bold">{currentUserRank.score}</div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <div ref={rankingRef} className="bg-background p-4 rounded-lg">
          {topThree.length >= 3 && (
            <TopThreePodium entries={topThree} />
          )}

          <div className="space-y-3 mt-6">
            <AnimatePresence>
              {restOfRanking.map((entry, index) => (
                <RankingCard 
                  key={entry.userId} 
                  entry={entry} 
                  index={index} 
                />
              ))}
            </AnimatePresence>
          </div>
          
          {ranking.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">Nenhum participante ainda</h3>
              <p className="text-muted-foreground text-sm">
                Seja o primeiro a completar as licoes desta temporada!
              </p>
            </div>
          )}
        </div>

        {season.hasFinalChallenge && !season.isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <Card className="p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-amber-500" />
              <h3 className="font-semibold text-lg mb-2">Temporada Encerrada</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Parabens aos vencedores desta temporada!
              </p>
              
              {topThree.length > 0 && (
                <div className="flex justify-center gap-4">
                  {topThree.map((entry, index) => (
                    <div key={entry.userId} className="text-center">
                      <Avatar className="mx-auto mb-1 border-2 border-amber-500/50">
                        <AvatarImage src={entry.userAvatar || undefined} />
                        <AvatarFallback>
                          {entry.userName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-xs font-medium">{entry.userName.split(' ')[0]}</div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {index + 1}o lugar
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
