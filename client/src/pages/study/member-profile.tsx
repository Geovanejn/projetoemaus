import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  Trophy, 
  Flame, 
  Star, 
  Heart,
  Send,
  Loader2,
  Medal,
  BookOpen,
  Target,
  Sparkles
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CollectibleCard, CollectibleCardModal } from "@/components/study/CollectibleCard";

interface AchievementWithLikes {
  id: number;
  name: string;
  icon: string;
  category: string;
  xpReward: number;
  unlockedAt: string;
  likesCount: number;
  isLikedByMe: boolean;
}

interface PublicMemberProfile {
  userId: number;
  username: string;
  photoUrl: string | null;
  level: number;
  totalXp: number;
  currentStreak: number;
  rankingPosition: number;
  achievements: AchievementWithLikes[];
  isOnline: boolean;
  lastSeenAt: string | null;
}

interface EncouragementMessage {
  key: string;
  text: string;
  icon: string;
}

interface UserCardWithDetails {
  id: number;
  cardId: number;
  rarity: string;
  score: number;
  earnedAt: string;
  card: {
    name: string;
    imageUrl: string | null;
    description: string | null;
  };
  event: {
    id: number;
    title: string;
    theme: string;
  } | null;
  season: {
    id: number;
    name: string;
  } | null;
}

const rarityColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  legendary: { 
    bg: "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500", 
    border: "border-yellow-400",
    text: "text-yellow-400",
    glow: "shadow-yellow-500/50"
  },
  epic: { 
    bg: "bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-500", 
    border: "border-purple-400",
    text: "text-purple-400",
    glow: "shadow-purple-500/50"
  },
  rare: { 
    bg: "bg-gradient-to-br from-blue-400 via-cyan-500 to-teal-500", 
    border: "border-blue-400",
    text: "text-blue-400",
    glow: "shadow-blue-500/50"
  },
  common: { 
    bg: "bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600", 
    border: "border-gray-400",
    text: "text-gray-400",
    glow: "shadow-gray-500/50"
  },
};

const rarityLabels: Record<string, string> = {
  legendary: "Lendario",
  epic: "Epico",
  rare: "Raro",
  common: "Comum",
};

const iconMap: Record<string, LucideIcon> = {
  flame: Flame,
  book: BookOpen,
  trophy: Trophy,
  star: Star,
  medal: Medal,
  target: Target,
};

function OnlineStatus({ isOnline, lastSeenAt }: { isOnline: boolean; lastSeenAt: string | null }) {
  if (isOnline) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm text-green-600 dark:text-green-400">Online agora</span>
      </div>
    );
  }
  
  if (lastSeenAt) {
    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
    
    let timeText = "";
    if (diffMinutes < 60) {
      timeText = `há ${diffMinutes} min`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      timeText = `há ${hours}h`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      timeText = `há ${days}d`;
    }
    
    return (
      <span className="text-sm text-muted-foreground">Visto {timeText}</span>
    );
  }
  
  return null;
}

export default function MemberProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<EncouragementMessage | null>(null);
  const [selectedCard, setSelectedCard] = useState<UserCardWithDetails | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  
  const isOwnProfile = user?.id === parseInt(userId || "0");
  
  const { data: profile, isLoading } = useQuery<PublicMemberProfile>({
    queryKey: ["/api/study/member", userId],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/study/member/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Membro não encontrado");
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: messagesData } = useQuery<{ messages: EncouragementMessage[] }>({
    queryKey: ["/api/study/encouragement-messages"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/study/encouragement-messages", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return { messages: [] };
      return res.json();
    },
    enabled: showMessageDialog,
  });

  const { data: userCards = [] } = useQuery<UserCardWithDetails[]>({
    queryKey: ["/api/study/member", userId, "cards"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/study/member/${userId}/cards`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId,
  });

  const likeMutation = useMutation({
    mutationFn: async ({ achievementId, liked }: { achievementId: number; liked: boolean }) => {
      if (liked) {
        await apiRequest("DELETE", `/api/study/member/${userId}/achievement/${achievementId}/like`);
      } else {
        await apiRequest("POST", `/api/study/member/${userId}/achievement/${achievementId}/like`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/member", userId] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: EncouragementMessage) => {
      await apiRequest("POST", `/api/study/member/${userId}/encourage`, {
        messageKey: message.key,
        messageText: message.text,
      });
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada!",
        description: "Sua mensagem de incentivo foi enviada com sucesso.",
      });
      setShowMessageDialog(false);
      setSelectedMessage(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleLikeToggle = (achievement: AchievementWithLikes) => {
    likeMutation.mutate({ 
      achievementId: achievement.id, 
      liked: achievement.isLikedByMe 
    });
  };

  const handleSendMessage = () => {
    if (selectedMessage) {
      sendMessageMutation.mutate(selectedMessage);
    }
  };

  const getIcon = (iconName: string) => iconMap[iconName?.toLowerCase()] || Star;

  const handleOpenCard = (card: UserCardWithDetails) => {
    setSelectedCard(card);
    setShowCardModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Membro não encontrado</p>
        <Button variant="outline" onClick={() => navigate("/study/ranking")}>
          Voltar ao ranking
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" data-testid="member-profile-page">
      {/* Header */}
      <div 
        className="px-4 pt-4 pb-20"
        style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)'
        }}
      >
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white"
            onClick={() => navigate("/study/ranking")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-bold text-white">Perfil do Membro</h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-4 -mt-16">
        <Card className="p-6">
          <div className="flex flex-col items-center">
            <div className="relative -mt-16 mb-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile.photoUrl || ""} />
                <AvatarFallback className="text-2xl font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  {profile.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {profile.isOnline && (
                <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
              )}
            </div>

            <h2 className="text-xl font-bold text-foreground mb-1" data-testid="text-username">
              {profile.username}
            </h2>
            
            <OnlineStatus isOnline={profile.isOnline} lastSeenAt={profile.lastSeenAt} />

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full mt-6">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-1">
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-sm font-bold" data-testid="text-level">{profile.level}</p>
                <p className="text-xs text-muted-foreground">Nível</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-1">
                  <Trophy className="h-5 w-5 text-violet-600" />
                </div>
                <p className="text-sm font-bold" data-testid="text-xp">{profile.totalXp.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-1">
                  <Flame className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-sm font-bold" data-testid="text-streak">{profile.currentStreak}</p>
                <p className="text-xs text-muted-foreground">Dias</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-1">
                  <Medal className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-sm font-bold" data-testid="text-rank">#{profile.rankingPosition || '—'}</p>
                <p className="text-xs text-muted-foreground">Rank</p>
              </div>
            </div>

            {/* Send Message Button */}
            {user?.id !== profile.userId && (
              <Button 
                className="w-full mt-6"
                onClick={() => setShowMessageDialog(true)}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar mensagem de incentivo
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Achievements Section */}
      <div className="px-4 mt-6">
        <h3 className="font-bold text-lg mb-3">Conquistas ({profile.achievements.length})</h3>
        
        {profile.achievements.length === 0 ? (
          <Card className="p-6 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Nenhuma conquista ainda</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {profile.achievements.map((achievement) => {
              const IconComponent = getIcon(achievement.icon);
              
              return (
                <Card 
                  key={achievement.id} 
                  className="p-4"
                  data-testid={`card-achievement-${achievement.id}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <IconComponent className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{achievement.name}</p>
                      <p className="text-xs text-muted-foreground">+{achievement.xpReward} XP</p>
                    </div>
                  </div>
                  
                  {/* Like Button */}
                  {user?.id !== profile.userId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-center gap-1.5",
                        achievement.isLikedByMe && "text-red-500"
                      )}
                      onClick={() => handleLikeToggle(achievement)}
                      disabled={likeMutation.isPending}
                      data-testid={`button-like-${achievement.id}`}
                    >
                      <Heart 
                        className={cn(
                          "h-4 w-4",
                          achievement.isLikedByMe && "fill-current"
                        )} 
                      />
                      <span>{achievement.likesCount}</span>
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Collectible Cards Section */}
      {userCards.length > 0 && (
        <div className="px-4 mt-6">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Cards Colecionaveis ({userCards.length})
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {userCards.map((userCard) => {
              const colors = rarityColors[userCard.rarity] || rarityColors.common;
              
              return (
                <div
                  key={userCard.id}
                  className={cn(
                    "relative rounded-xl p-1 cursor-pointer transition-all duration-300 hover:scale-105",
                    colors.bg,
                    "shadow-lg",
                    colors.glow
                  )}
                  onClick={() => handleOpenCard(userCard)}
                  data-testid={`card-collectible-${userCard.id}`}
                >
                  <div className="bg-background rounded-lg p-3">
                    <div className="aspect-square relative mb-2 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      {userCard.card.imageUrl ? (
                        <img 
                          src={userCard.card.imageUrl} 
                          alt={userCard.card.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Sparkles className={cn("h-12 w-12", colors.text)} />
                      )}
                    </div>
                    <p className="font-semibold text-sm truncate">{userCard.card.name}</p>
                    <Badge className={cn("mt-1 text-xs", colors.bg, "text-white border-0")}>
                      {rarityLabels[userCard.rarity]}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card Modal - Using same design as owner's profile */}
      {selectedCard && (
        <CollectibleCardModal
          isOpen={showCardModal}
          onClose={() => setShowCardModal(false)}
          card={{
            name: selectedCard.card.name,
            description: selectedCard.card.description,
            imageUrl: selectedCard.card.imageUrl,
            rarity: selectedCard.rarity as "common" | "rare" | "epic" | "legendary",
            sourceType: selectedCard.event ? "event" : "season",
            sourceName: selectedCard.event?.title || selectedCard.season?.name,
            earnedAt: selectedCard.earnedAt,
            performance: selectedCard.score,
          }}
        />
      )}

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar mensagem de incentivo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {messagesData?.messages.map((message) => (
              <div
                key={message.key}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedMessage?.key === message.key 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover-elevate"
                )}
                onClick={() => setSelectedMessage(message)}
                data-testid={`message-option-${message.key}`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            ))}
          </div>
          
          <Button 
            className="w-full mt-4"
            disabled={!selectedMessage || sendMessageMutation.isPending}
            onClick={handleSendMessage}
            data-testid="button-confirm-send"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Enviar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
