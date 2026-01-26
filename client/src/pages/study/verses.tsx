import { useLocation } from "wouter";
import { ArrowLeft, Heart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { HeartsDisplay } from "@/components/study/HeartsDisplay";
import { Skeleton } from "@/components/ui/skeleton";
import { useSounds } from "@/hooks/use-sounds";

interface BibleVerse {
  id: number;
  reference: string;
  text: string;
  reflection?: string;
  book: string;
  chapter: number;
  verse: number;
}

interface StudyProfile {
  id: number;
  userId: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  hearts: number;
  maxHearts: number;
  weeklyXp: number;
  level: number;
  heartsContributedToRecovery: number;
}

interface RecoveryProgress {
  versesRead: number;
  versesNeeded: number;
  hearts: number;
  maxHearts: number;
}

export default function VersesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { sounds } = useSounds();

  const { data: verses, isLoading: versesLoading } = useQuery<BibleVerse[]>({
    queryKey: ['/api/study/verses'],
  });

  const { data: profile, isLoading: profileLoading } = useQuery<StudyProfile>({
    queryKey: ['/api/study/profile'],
  });

  const { data: recoveryProgress, isLoading: progressLoading } = useQuery<RecoveryProgress>({
    queryKey: ['/api/study/verses/recovery-progress'],
  });

  const readVerseMutation = useMutation({
    mutationFn: async (verseId: number) => {
      const response = await apiRequest("POST", `/api/study/verses/${verseId}/read`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/study/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study/verses/recovery-progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study/verses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/study/weekly-goal'] });
      
      if (data.alreadyRead) {
        sounds.click();
        toast({
          title: "Versículo já lido!",
          description: "Você já leu este versículo antes.",
        });
      } else if (data.heartRecovered) {
        sounds.success();
        sounds.streak();
        toast({
          title: "Vida recuperada!",
          description: "Você leu 3 versículos e ganhou +1 vida!",
        });
      } else if (data.heartsFull) {
        sounds.click();
        toast({
          title: "Vidas cheias!",
          description: "Suas vidas já estão no máximo. O progresso foi reiniciado.",
        });
      } else {
        sounds.xp();
        toast({
          title: "Versículo lido!",
          description: `${data.versesRead}/${data.versesNeeded} versículos para recuperar uma vida.`,
        });
      }
    },
    onError: () => {
      sounds.error();
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível registrar a leitura do versículo.",
      });
    }
  });

  const handleVerseRead = (verseId: number) => {
    readVerseMutation.mutate(verseId);
  };

  const isLoading = versesLoading || profileLoading || progressLoading;
  const currentHearts = profile?.hearts || 0;
  const maxHearts = profile?.maxHearts || 5;
  const versesRead = recoveryProgress?.versesRead || 0;
  const versesNeeded = recoveryProgress?.versesNeeded || 3;
  const progressPercent = (versesRead / versesNeeded) * 100;

  return (
    <div className="min-h-screen bg-background" data-testid="verses-page">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/study")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg">Versículos (ARA)</h1>
          </div>
          <HeartsDisplay current={currentHearts} max={maxHearts} size="md" />
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Recovery Progress Card */}
        <Card className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/50">
                <Heart className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Recuperar Vidas</h3>
                <p className="text-xs text-muted-foreground">
                  Leia 3 versículos para ganhar +1 vida
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{versesRead} de {versesNeeded} versículos</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Verses List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-16 w-full mb-2" />
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : currentHearts >= maxHearts ? (
          <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-3">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50">
                  <Heart className="h-8 w-8 text-green-500 fill-green-500" />
                </div>
              </div>
              <h3 className="font-bold text-lg mb-2">Vidas Cheias!</h3>
              <p className="text-muted-foreground text-sm">
                Você está com todas as suas vidas. Continue estudando para ganhar XP!
              </p>
              <Button 
                className="mt-4" 
                onClick={() => setLocation("/study")}
                data-testid="button-continue-study"
              >
                Continuar Estudando
              </Button>
            </CardContent>
          </Card>
        ) : verses && verses.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Toque em um versículo para ler e progredir na recuperação de vidas
            </p>
            {verses.slice(0, 10).map((verse) => (
              <Card 
                key={verse.id} 
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => handleVerseRead(verse.id)}
                data-testid={`card-verse-${verse.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10 shrink-0">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-primary mb-1">
                        {verse.reference}
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">
                        "{verse.text}"
                      </p>
                      {verse.reflection && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {verse.reflection}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={readVerseMutation.isPending}
                      data-testid={`button-read-verse-${verse.id}`}
                    >
                      {readVerseMutation.isPending ? "Lendo..." : "Marcar como Lido"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-bold mb-2">Nenhum versículo disponível</h3>
              <p className="text-muted-foreground text-sm">
                Os versículos serão adicionados em breve.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
