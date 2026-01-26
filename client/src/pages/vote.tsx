import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle, LogOut, Vote, ChartBar } from "lucide-react";
import { useLocation } from "wouter";
import type { Election, Position } from "@shared/schema";
import logoUrl from "@assets/EMAÚS v3 sem fundo_1762038215610.png";
import { getFirstAndLastName } from "@shared/utils";

type CandidateWithEmail = {
  id: number;
  name: string;
  email: string;
  positionId: number;
  electionId: number;
  photoUrl?: string;
};

export default function VotePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [hasVoted, setHasVoted] = useState(false);
  const [votedCandidateId, setVotedCandidateId] = useState<number | null>(null);

  const { data: activeElection, isLoading: loadingElection } = useQuery<Election | null>({
    queryKey: ["/api/elections/active"],
  });

  // Active position for sequential voting
  const { data: activePosition, isLoading: loadingActivePosition } = useQuery<{
    id: number;
    electionId: number;
    positionId: number;
    positionName: string;
    status: "active";
    currentScrutiny: number;
    orderIndex: number;
  } | null>({
    queryKey: ["/api/elections", activeElection?.id, "positions", "active"],
    enabled: !!activeElection,
    staleTime: 10000,
  });

  // Get candidates only for the active position
  const { data: activeCandidates = [] } = useQuery<CandidateWithEmail[]>({
    queryKey: ["/api/elections", activeElection?.id, "positions", activePosition?.positionId, "candidates"],
    enabled: !!activeElection && !!activePosition,
    staleTime: 15000,
  });

  const voteMutation = useMutation({
    mutationFn: async (data: { candidateId: number; positionId: number; electionId: number }) => {
      return await apiRequest("POST", "/api/vote", data);
    },
    onSuccess: (_, variables) => {
      setHasVoted(true);
      setVotedCandidateId(variables.candidateId);
      toast({
        title: "Voto registrado com sucesso!",
        description: "Seu voto foi computado com segurança",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao votar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVote = (candidateId: number) => {
    if (!activeElection || !activePosition) return;

    if (confirm("Confirma seu voto? Esta ação não pode ser desfeita.")) {
      voteMutation.mutate({
        candidateId,
        positionId: activePosition.positionId,
        electionId: activeElection.id,
      });
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const isLoading = loadingElection || loadingActivePosition;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!activeElection) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-2 bg-primary w-full" />
        <div className="container mx-auto px-4 py-4 sm:py-8 max-w-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">Votação</h1>
            <div className="flex gap-2 self-end sm:self-auto flex-wrap">
              <Button variant="outline" onClick={() => setLocation("/admin")} data-testid="button-panels">
                <ChartBar className="w-4 h-4 mr-2" />
                Painéis
              </Button>
              <Button variant="outline" onClick={() => setLocation("/results")} data-testid="button-results">
                <ChartBar className="w-4 h-4 mr-2" />
                Resultados
              </Button>
              <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Nenhuma eleição ativa</CardTitle>
              <CardDescription>
                Não há eleições abertas no momento. Aguarde o administrador abrir uma nova eleição.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!activePosition) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-2 bg-primary w-full" />
        <div className="container mx-auto px-4 py-4 sm:py-8 max-w-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">Votação</h1>
            <div className="flex gap-2 self-end sm:self-auto flex-wrap">
              <Button variant="outline" onClick={() => setLocation("/admin")} data-testid="button-panels">
                <ChartBar className="w-4 h-4 mr-2" />
                Painéis
              </Button>
              <Button variant="outline" onClick={() => setLocation("/results")} data-testid="button-results">
                <ChartBar className="w-4 h-4 mr-2" />
                Resultados
              </Button>
              <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Aguarde o próximo cargo</CardTitle>
              <CardDescription>
                Nenhum cargo está aberto para votação no momento. O administrador abrirá o próximo cargo em breve.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <div className="h-2 bg-primary w-full" />
      
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Votação</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {activeElection.name}
            </p>
            <p className="text-xs sm:text-sm text-primary font-medium mt-1">
              {activePosition.positionName} • Escrutínio atual: {activePosition.currentScrutiny}º Escrutínio
            </p>
          </div>
          <div className="flex gap-2 self-end sm:self-auto flex-wrap">
            <Button variant="outline" onClick={() => setLocation("/admin")} data-testid="button-panels">
              <ChartBar className="w-4 h-4 mr-2" />
              Painéis
            </Button>
            <Button variant="outline" onClick={() => setLocation("/results")} data-testid="button-results">
              <ChartBar className="w-4 h-4 mr-2" />
              Resultados
            </Button>
            <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        <div className="space-y-6 sm:space-y-8">
          <Card className="border-border">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg sm:text-xl">{activePosition.positionName}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Escrutínio atual: {activePosition.currentScrutiny}º Escrutínio
                  </p>
                </div>
                {hasVoted && (
                  <div className="flex items-center gap-1 sm:gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-medium">Votado</span>
                  </div>
                )}
              </div>
              <CardDescription className="text-sm">
                {activeCandidates.length} candidatos disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {activeCandidates.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">
                  Nenhum candidato registrado para este cargo
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {activeCandidates.map((candidate) => {
                    const isVotedFor = votedCandidateId === candidate.id;
                    return (
                      <Card 
                        key={candidate.id} 
                        className={`border-border hover-elevate transition-all ${isVotedFor ? 'ring-2 ring-green-500 dark:ring-green-400' : ''}`}
                        data-testid={`card-candidate-${candidate.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="relative">
                              <Avatar className="w-12 h-12">
                                <AvatarImage 
                                  src={candidate.photoUrl} 
                                  alt={candidate.name}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                  {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {isVotedFor && (
                                <div className="absolute -top-1 -right-1 bg-green-500 dark:bg-green-400 rounded-full p-0.5">
                                  <CheckCircle className="w-5 h-5 text-white" />
                                </div>
                              )}
                            </div>
                            <p className="font-medium flex-1">{getFirstAndLastName(candidate.name)}</p>
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => handleVote(candidate.id)}
                            disabled={hasVoted || voteMutation.isPending}
                            data-testid={`button-vote-${candidate.id}`}
                            variant={isVotedFor ? "default" : "outline"}
                          >
                            {isVotedFor ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Seu Voto
                              </>
                            ) : hasVoted ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Votado
                              </>
                            ) : (
                              <>
                                <Vote className="w-4 h-4 mr-2" />
                                Votar
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border-muted">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div>
                  <p className="font-medium mb-1">Lembre-se</p>
                  <p className="text-sm text-muted-foreground">
                    Você pode votar uma vez por escrutínio. Escolha com cuidado, pois seu voto não pode ser alterado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer with UMP Emaús Logo */}
        <div className="mt-8 mb-4 flex justify-center">
          <img 
            src={logoUrl} 
            alt="UMP Emaús" 
            className="h-48 transition-opacity"
            data-testid="img-logo-footer-vote"
          />
        </div>
      </div>
    </div>
  );
}
