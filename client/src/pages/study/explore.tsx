import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/study";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  BookOpen, 
  Heart, 
  Check,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { StudyProfile } from "@shared/schema";

interface DailyVerse {
  verse: string;
  reference: string;
}

interface DailyVerseStatusResponse {
  isRead: boolean;
  dateKey: string;
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery<StudyProfile>({
    queryKey: ['/api/study/profile'],
    enabled: isAuthenticated,
  });

  const { data: dailyVerseData, isLoading: dailyVerseLoading } = useQuery<DailyVerse>({
    queryKey: ['/api/study/daily-verse'],
    enabled: isAuthenticated,
  });

  const { data: dailyVerseStatus } = useQuery<DailyVerseStatusResponse>({
    queryKey: ['/api/study/daily-verse/status'],
    enabled: isAuthenticated,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/study/daily-verse/confirm");
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['/api/study/daily-verse/status'] });
      
      const previousStatus = queryClient.getQueryData<DailyVerseStatusResponse>(['/api/study/daily-verse/status']);
      
      queryClient.setQueryData<DailyVerseStatusResponse>(['/api/study/daily-verse/status'], (old) => ({
        isRead: true,
        dateKey: old?.dateKey || new Date().toISOString().split('T')[0]
      }));
      
      return { previousStatus };
    },
    onSuccess: (data) => {
      if (data?.success) {
        queryClient.setQueryData<DailyVerseStatusResponse>(['/api/study/daily-verse/status'], (old) => ({
          isRead: true,
          dateKey: old?.dateKey || new Date().toISOString().split('T')[0]
        }));
        queryClient.invalidateQueries({ queryKey: ['/api/study/profile'] });
      }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(['/api/study/daily-verse/status'], context.previousStatus);
      }
    }
  });

  const dailyVerseRead = dailyVerseStatus?.isRead === true;
  const currentHearts = profile?.hearts ?? 5;
  const maxHearts = profile?.heartsMax ?? 5;
  const streak = profile?.currentStreak ?? 0;
  const totalXP = profile?.totalXp ?? 0;
  const userName = user?.fullName?.split(' ')[0] || 'Usuario';

  const handleMarkAsRead = () => {
    if (dailyVerseRead || markAsReadMutation.isPending) {
      return;
    }
    markAsReadMutation.mutate();
  };

  if (profileLoading) {
    return <LoadingState />;
  }

  const dailyVerse: DailyVerse | null = dailyVerseData ? {
    verse: dailyVerseData.verse,
    reference: dailyVerseData.reference
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background pb-24" data-testid="explore-page">
      <main className="px-4 py-6 space-y-6">
        {/* Versiculo do Dia */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-foreground mb-1">Versiculo do Dia</h2>
          <p className="text-muted-foreground text-sm mb-6">Descubra a palavra de Deus para hoje</p>

          {/* Icone do livro */}
          <div className="flex justify-center mb-6">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
                boxShadow: '0 4px 0 0 #EA580C'
              }}
            >
              <BookOpen className="h-7 w-7 text-white" />
            </div>
          </div>

          {dailyVerseLoading ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              <p className="text-muted-foreground">Carregando versículo...</p>
            </div>
          ) : dailyVerse ? (
            <>
              {/* Versiculo */}
              <p className="text-foreground text-lg italic leading-relaxed px-4 mb-4">
                "{dailyVerse.verse}"
              </p>
              
              {/* Referencia */}
              <p className="text-orange-500 font-bold text-lg mb-6">{dailyVerse.reference}</p>

              {/* Card de reflexao */}
              <div 
                className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-xl p-4 mx-2"
              >
                <p className="text-foreground text-sm leading-relaxed">
                  "O amor de Deus é incondicional e eterno. Hoje, lembre-se de que você é profundamente amado e que este amor transformador está disponível para todos."
                </p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground py-8">Versículo indisponível no momento</p>
          )}
        </motion.div>

        {/* Marcar como Lido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-card rounded-xl border border-border shadow-sm overflow-hidden"
          data-testid="mark-as-read-card"
        >
          <div className="p-4">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: dailyVerseRead 
                    ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'
                    : 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                }}
              >
                <Check className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground">Marcar como Lido</h3>
                <p className="text-sm text-muted-foreground">Confirme sua leitura diária</p>
              </div>
              {dailyVerseRead ? (
                <div className="px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <span className="text-green-600 dark:text-green-400 font-bold text-sm">Concluído</span>
                </div>
              ) : (
                <Button
                  onClick={handleMarkAsRead}
                  disabled={markAsReadMutation.isPending}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold"
                  data-testid="button-mark-verse-read"
                >
                  {markAsReadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Marcar"
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {/* Dica */}
          <div className="bg-green-50 dark:bg-green-950/30 border-t border-green-100 dark:border-green-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-green-700 dark:text-green-400 text-sm">
                Marque como lido para manter sua sequência diária!
              </p>
            </div>
          </div>
        </motion.div>

        {/* Recuperar Vidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-card rounded-xl border border-border shadow-sm p-6 text-center"
          data-testid="hearts-recovery-card"
        >
          {/* Icone de coracao */}
          <div className="flex justify-center mb-4">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
              }}
            >
              <Heart className="h-7 w-7 text-white fill-white" />
            </div>
          </div>

          <h3 className="font-bold text-xl text-foreground mb-2">Recuperar Vidas</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Leia versículos para ganhar vidas extras
          </p>

          {/* Card de vidas */}
          <div className="bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-foreground font-medium">Vidas Atuais</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: maxHearts }).map((_, i) => (
                  <Heart
                    key={i}
                    className={cn(
                      "h-5 w-5",
                      i < currentHearts 
                        ? "fill-red-500 text-red-500" 
                        : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
                    )}
                  />
                ))}
                <span className="font-bold text-foreground ml-2">{currentHearts}/{maxHearts}</span>
              </div>
            </div>
            {currentHearts >= maxHearts ? (
              <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                Você já possui o máximo de vidas!
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Você pode recuperar {maxHearts - currentHearts} vida{maxHearts - currentHearts > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {currentHearts < maxHearts && (
            <Button
              onClick={() => setLocation("/study/verses")}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold"
              data-testid="button-recover-hearts"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Ler Versículos
            </Button>
          )}
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
