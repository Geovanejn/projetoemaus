import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChartBar, LogOut, Trophy, ArrowLeft, Share2 } from "lucide-react";
import { useLocation } from "wouter";
import { useRef, useState, useEffect } from "react";
import type { ElectionResults } from "@shared/schema";
import ExportResultsImage, { type ExportResultsImageHandle, type AspectRatio } from "@/components/ExportResultsImage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoUrl from "@assets/EMAÚS v3 sem fundo_1762038215610.png";
import { getFirstAndLastName } from "@shared/utils";

interface Winner {
  positionId: number;
  positionName: string;
  candidateName: string;
  photoUrl?: string;
  voteCount: number;
  wonAtScrutiny: number;
}

export default function ResultsPage() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const exportRef = useRef<ExportResultsImageHandle>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  
  // Get electionId from query string
  const searchParams = new URLSearchParams(window.location.search);
  const electionId = searchParams.get('electionId');

  const { data: results, isLoading, refetch } = useQuery<ElectionResults | null>({
    queryKey: electionId ? ["/api/results", electionId] : ["/api/results/latest"],
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.isActive ? 10000 : false;
    },
    staleTime: 8000,
  });

  const { data: winners } = useQuery<Winner[]>({
    queryKey: results?.electionId ? ["/api/elections", results.electionId, "winners"] : [],
    queryFn: async () => {
      if (!results?.electionId) return [];
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/elections/${results.electionId}/winners`, {
        headers,
        credentials: "include",
      });
      if (!response.ok) throw new Error('Failed to fetch winners');
      return response.json();
    },
    enabled: !!results?.electionId && !results?.isActive,
  });

  const handleExportImage = async () => {
    if (exportRef.current) {
      await exportRef.current.exportImage();
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const handleBack = () => {
    if (user?.isAdmin) {
      setLocation("/admin");
    } else {
      setLocation("/vote");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando resultados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <div className="h-2 bg-primary w-full" />
      
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <ChartBar className="w-6 h-6 sm:w-8 sm:h-8" />
              Resultados
            </h1>
            {results && (
              <>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">{results.electionName}</p>
                {results.createdAt && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Data de Abertura: {new Date(results.createdAt).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      timeZone: 'America/Sao_Paulo'
                    })} às {new Date(results.createdAt).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      timeZone: 'America/Sao_Paulo',
                      hour12: false
                    })}
                  </p>
                )}
                {results.closedAt && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Data de Fechamento: {new Date(results.closedAt).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      timeZone: 'America/Sao_Paulo'
                    })} às {new Date(results.closedAt).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      timeZone: 'America/Sao_Paulo',
                      hour12: false
                    })}
                  </p>
                )}
                {results.isActive && (
                  <p className="text-xs sm:text-sm text-primary font-medium">
                    Escrutínio atual: {results.currentScrutiny}º Escrutínio • Eleição em andamento
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            {!results?.isActive && winners && winners.length > 0 && user?.isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="default" 
                    data-testid="button-export-results" 
                    size="sm" 
                    className="sm:h-9"
                    aria-label="Compartilhar Resultados"
                  >
                    <Share2 className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Compartilhar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Escolha o formato</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      setAspectRatio("9:16");
                      setTimeout(() => handleExportImage(), 100);
                    }}
                    data-testid="menu-export-9-16"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">9:16 (Stories)</span>
                      <span className="text-xs text-muted-foreground">Instagram/Facebook Stories</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setAspectRatio("4:5");
                      setTimeout(() => handleExportImage(), 100);
                    }}
                    data-testid="menu-export-4-5"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">4:5 (Feed)</span>
                      <span className="text-xs text-muted-foreground">Instagram/Facebook Feed</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isAuthenticated && (
              <Button 
                variant="outline" 
                onClick={handleBack} 
                data-testid="button-back" 
                size="sm" 
                className="sm:h-9"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
            )}
            {isAuthenticated && (
              <Button 
                variant="outline" 
                onClick={handleLogout} 
                data-testid="button-logout" 
                size="sm" 
                className="sm:h-9"
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            )}
          </div>
        </div>

        {!results ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum resultado disponível</CardTitle>
              <CardDescription>
                Não há eleições para exibir resultados
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-8 sm:space-y-12">
            {results.positions
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((position) => {
              const sortedCandidates = [...position.candidates].sort(
                (a, b) => b.voteCount - a.voteCount
              );
              const winner = sortedCandidates[0];
              const totalVotes = sortedCandidates.reduce((sum, c) => sum + c.voteCount, 0);

              const getPositionStatus = () => {
                if (position.status === 'completed' && position.winnerId) {
                  return {
                    type: 'completed',
                    bgClass: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
                    textClass: 'text-green-800 dark:text-green-200',
                    descClass: 'text-green-600 dark:text-green-300',
                    label: 'Concluído'
                  };
                } else if (position.status === 'active') {
                  return {
                    type: 'active',
                    bgClass: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
                    textClass: 'text-blue-800 dark:text-blue-200',
                    descClass: 'text-blue-600 dark:text-blue-300',
                    label: `Em Votação - ${position.currentScrutiny}º Escrutínio`
                  };
                } else if (position.status === 'pending') {
                  return {
                    type: 'pending',
                    bgClass: 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800',
                    textClass: 'text-gray-800 dark:text-gray-200',
                    descClass: 'text-gray-600 dark:text-gray-400',
                    label: 'Aguardando Votação'
                  };
                }
                return {
                  type: 'other',
                  bgClass: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
                  textClass: 'text-amber-900 dark:text-amber-100',
                  descClass: 'text-amber-600 dark:text-amber-300',
                  label: 'Indefinido'
                };
              };

              const statusInfo = getPositionStatus();

              return (
                <div key={position.positionId} data-testid={`position-${position.positionId}`}>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span>{position.positionName}</span>
                    <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                      ({totalVotes} votos • {position.candidates.length} candidatos)
                    </span>
                  </h2>

                  <div className={`mb-4 p-3 border rounded-lg ${statusInfo.bgClass}`}>
                    <p className={`text-sm font-medium ${statusInfo.textClass}`}>
                      Status: {statusInfo.label}
                    </p>
                    {position.winnerId && statusInfo.type === 'completed' && (() => {
                      const electedCandidate = position.candidates.find(c => c.candidateId === position.winnerId);
                      return electedCandidate ? (
                        <p className={`text-xs mt-1 ${statusInfo.descClass}`}>
                          Eleito: {getFirstAndLastName(electedCandidate.candidateName)} com {electedCandidate.voteCount} votos
                          {electedCandidate.wonAtScrutiny && ` (${electedCandidate.wonAtScrutiny}º Escrutínio)`}
                        </p>
                      ) : null;
                    })()}
                    {position.status === 'active' && (
                      <p className={`text-xs mt-1 ${statusInfo.descClass}`}>
                        Votação em andamento. Resultados atualizados automaticamente.
                      </p>
                    )}
                    {position.status === 'pending' && position.candidates.length > 0 && (
                      <p className={`text-xs mt-1 ${statusInfo.descClass}`}>
                        Candidatos já selecionados. Aguardando início da votação.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {position.candidates.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="p-6 text-center">
                          <p className="text-sm text-muted-foreground">
                            Nenhum candidato adicionado ainda para este cargo
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      sortedCandidates.map((candidate, index) => {
                        const isElected = candidate.candidateId === position.winnerId && position.status === 'completed';
                        const isLeading = index === 0 && candidate.voteCount > 0 && position.status === 'active';
                        const percentage = totalVotes > 0 
                          ? ((candidate.voteCount / totalVotes) * 100).toFixed(1) 
                          : "0.0";

                        const getScrutinyLabel = (scrutiny?: number) => {
                          if (!scrutiny) return null;
                          const ordinals = ["1º", "2º", "3º"];
                          return `Eleito no ${ordinals[scrutiny - 1]} Escrutínio`;
                        };

                        return (
                          <Card
                            key={candidate.candidateId}
                            className={
                              isElected
                                ? "bg-green-50 dark:bg-green-950/30 border-l-4 border-l-green-600 shadow-md"
                                : isLeading
                                ? "bg-blue-50 dark:bg-blue-950/30 border-l-4 border-l-blue-600 shadow-md"
                                : "border-border"
                            }
                            data-testid={`candidate-result-${candidate.candidateId}`}
                          >
                            <CardContent className="p-4 sm:p-6">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                  {isElected && (
                                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400 shrink-0" />
                                  )}
                                  <Avatar className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                                    <AvatarImage 
                                      src={candidate.photoUrl} 
                                      alt={candidate.candidateName}
                                    />
                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                      {candidate.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium text-base sm:text-lg truncate">
                                      {getFirstAndLastName(candidate.candidateName)}
                                    </p>
                                    {isElected && candidate.wonAtScrutiny && (
                                      <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
                                        {getScrutinyLabel(candidate.wonAtScrutiny)}
                                      </p>
                                    )}
                                    {isElected && !candidate.wonAtScrutiny && (
                                      <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
                                        Eleito
                                      </p>
                                    )}
                                    {isLeading && (
                                      <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">
                                        Liderando
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xl sm:text-2xl font-bold" data-testid={`vote-count-${candidate.candidateId}`}>
                                    {candidate.voteCount}
                                  </p>
                                  <p className="text-xs sm:text-sm text-muted-foreground">
                                    {percentage}%
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mt-3 sm:mt-4 bg-muted/30 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 rounded-full ${
                                    isElected ? 'bg-green-600 dark:bg-green-500' :
                                    isLeading ? 'bg-blue-600 dark:bg-blue-500' :
                                    'bg-primary'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}

            <Card className="bg-muted/30 border-muted">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <ChartBar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium mb-1 text-sm sm:text-base">Resultados finais</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Estes são os resultados oficiais da eleição. Todos os votos foram contabilizados de forma segura e transparente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Hidden export component */}
      {!results?.isActive && winners && winners.length > 0 && (
        <ExportResultsImage
          ref={exportRef}
          electionTitle={results?.electionName || ''}
          winners={winners}
          aspectRatio={aspectRatio}
        />
      )}

      {/* Footer with UMP Emaús Logo */}
      <div className="mt-8 mb-4 flex justify-center">
        <img 
          src={logoUrl} 
          alt="UMP Emaús" 
          className="h-48 transition-opacity"
          data-testid="img-logo-footer-results"
        />
      </div>
    </div>
  );
}
