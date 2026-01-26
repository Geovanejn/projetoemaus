import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { BottomNav, CollectibleCard, CollectibleCardModal } from "@/components/study";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  Loader2,
  Sparkles,
  Trophy,
  Star,
  Crown,
  Calendar,
  BookOpen,
  Circle
} from "lucide-react";
import { motion } from "framer-motion";

interface CollectibleCardData {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sourceType: string;
  sourceId: number;
}

interface UserCard {
  id: number;
  userId: number;
  cardId: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  sourceType: string;
  sourceId: number;
  performance: number | null;
  earnedAt: string;
  card?: CollectibleCardData;
}

export default function CardsCollectionPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);

  const { data: userCards, isLoading, error } = useQuery<UserCard[]>({
    queryKey: ["/api/study/cards"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-muted-foreground">Erro ao carregar seus cards</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const cardsByRarity = {
    legendary: userCards?.filter(c => c.rarity === "legendary") || [],
    epic: userCards?.filter(c => c.rarity === "epic") || [],
    rare: userCards?.filter(c => c.rarity === "rare") || [],
    common: userCards?.filter(c => c.rarity === "common") || [],
  };

  const eventCards = userCards?.filter(c => c.sourceType === "event") || [];
  const seasonCards = userCards?.filter(c => c.sourceType === "season") || [];

  const totalCards = userCards?.length || 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-3 p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/study")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Minha Colecao
            </h1>
            <p className="text-xs text-muted-foreground">
              {totalCards} {totalCards === 1 ? "card" : "cards"} conquistado{totalCards !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        {totalCards === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-1">Nenhum card ainda</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Complete eventos especiais e revistas para conquistar cards exclusivos!
            </p>
            <Button onClick={() => setLocation("/study/events")} data-testid="button-view-events">
              Ver eventos
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-0.5">
              <Badge variant="outline" className="text-amber-600 border-amber-300 text-[9px] px-0.5 py-0 justify-center whitespace-nowrap">
                <Crown className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                {cardsByRarity.legendary.length} Lendarios
              </Badge>
              <Badge variant="outline" className="text-purple-600 border-purple-300 text-[9px] px-0.5 py-0 justify-center whitespace-nowrap">
                <Sparkles className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                {cardsByRarity.epic.length} Epicos
              </Badge>
              <Badge variant="outline" className="text-blue-600 border-blue-300 text-[9px] px-0.5 py-0 justify-center whitespace-nowrap">
                <Star className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                {cardsByRarity.rare.length} Raros
              </Badge>
              <Badge variant="outline" className="text-gray-600 border-gray-300 text-[9px] px-0.5 py-0 justify-center whitespace-nowrap">
                <Circle className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                {cardsByRarity.common.length} Comuns
              </Badge>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" data-testid="tab-all">
                  Todos ({totalCards})
                </TabsTrigger>
                <TabsTrigger value="events" data-testid="tab-events">
                  <Calendar className="h-4 w-4 mr-1" />
                  Eventos ({eventCards.length})
                </TabsTrigger>
                <TabsTrigger value="seasons" data-testid="tab-seasons">
                  <BookOpen className="h-4 w-4 mr-1" />
                  Revistas ({seasonCards.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <div className="grid grid-cols-3 gap-3 justify-items-center">
                  {userCards?.map(card => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CollectibleCard
                        name={card.card?.name || "Card"}
                        imageUrl={card.card?.imageUrl}
                        rarity={card.rarity}
                        sourceType={card.sourceType as "season" | "event"}
                        onClick={() => setSelectedCard(card)}
                        size="compact"
                      />
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="events" className="mt-4">
                {eventCards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum card de evento conquistado</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setLocation("/study/events")}
                    >
                      Ver eventos disponiveis
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 justify-items-center">
                    {eventCards.map(card => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <CollectibleCard
                          name={card.card?.name || "Card"}
                          imageUrl={card.card?.imageUrl}
                          rarity={card.rarity}
                          sourceType="event"
                          onClick={() => setSelectedCard(card)}
                          size="compact"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="seasons" className="mt-4">
                {seasonCards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum card de revista conquistado</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setLocation("/study")}
                    >
                      Ver revistas disponiveis
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 justify-items-center">
                    {seasonCards.map(card => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <CollectibleCard
                          name={card.card?.name || "Card"}
                          imageUrl={card.card?.imageUrl}
                          rarity={card.rarity}
                          sourceType="season"
                          onClick={() => setSelectedCard(card)}
                          size="compact"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {selectedCard && (
        <CollectibleCardModal
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          card={{
            name: selectedCard.card?.name || "Card",
            description: selectedCard.card?.description,
            imageUrl: selectedCard.card?.imageUrl,
            rarity: selectedCard.rarity,
            sourceType: selectedCard.sourceType as "season" | "event",
            earnedAt: selectedCard.earnedAt,
            performance: selectedCard.performance,
          }}
        />
      )}

      <BottomNav />
    </div>
  );
}
