import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Check, X, Clock, CheckCircle, AlertCircle, Heart, Users, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { PrayerRequest } from "@shared/schema";

const categoryLabels: Record<string, string> = {
  saude: "Saúde",
  familia: "Família",
  trabalho: "Trabalho",
  espiritual: "Espiritual",
  relacionamento: "Relacionamento",
  outros: "Outros",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  approved: { label: "Aprovado", variant: "default" },
  rejected: { label: "Rejeitado", variant: "destructive" },
  praying: { label: "Em Oração", variant: "outline" },
  answered: { label: "Respondido", variant: "default" },
  archived: { label: "Arquivado", variant: "secondary" },
};

export default function EspiritualidadeOracoes() {
  const { toast } = useToast();

  const { data: pendingPrayers, isLoading: isLoadingPending } = useQuery<PrayerRequest[]>({
    queryKey: ["/api/espiritualidade/prayers?status=pending"],
  });

  const { data: approvedPrayers, isLoading: isLoadingApproved } = useQuery<PrayerRequest[]>({
    queryKey: ["/api/espiritualidade/prayers?status=approved"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/espiritualidade/prayers/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/prayers?status=pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/prayers?status=approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/stats"] });
      toast({ title: "Pedido aprovado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao aprovar pedido", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/espiritualidade/prayers/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/prayers?status=pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/prayers?status=approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/stats"] });
      toast({ title: "Pedido rejeitado!" });
    },
    onError: () => {
      toast({ title: "Erro ao rejeitar pedido", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/espiritualidade/prayers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/prayers?status=pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/prayers?status=approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/stats"] });
      toast({ title: "Pedido excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir pedido", variant: "destructive" });
    },
  });

  const renderPrayerCard = (prayer: PrayerRequest, showActions = false) => {
    const status = statusLabels[prayer.status] || statusLabels.pending;
    const category = categoryLabels[prayer.category] || prayer.category;

    return (
      <Card key={prayer.id} className="flex flex-col" data-testid={`card-prayer-${prayer.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={status.variant} className="text-xs">
                {status.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {category}
              </Badge>
            </div>
            {prayer.inPrayerCount > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3 w-3" />
                {prayer.inPrayerCount}
              </div>
            )}
          </div>
          <CardTitle className="text-base font-medium">
            {prayer.name}
          </CardTitle>
          <CardDescription className="text-xs">
            {prayer.createdAt && format(new Date(prayer.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <p className="text-sm text-muted-foreground mb-4 flex-1">
            {prayer.request}
          </p>
          
          {prayer.hasProfanity || prayer.hasHateSpeech || prayer.hasSexualContent ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2 mb-4">
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Alerta de Moderação</span>
              </div>
              <ul className="text-xs text-destructive/80 mt-1 ml-6 list-disc">
                {prayer.hasProfanity && <li>Linguagem imprópria detectada</li>}
                {prayer.hasHateSpeech && <li>Discurso de ódio detectado</li>}
                {prayer.hasSexualContent && <li>Conteúdo sexual detectado</li>}
              </ul>
            </div>
          ) : null}

          {showActions && (
            <div className="flex gap-2 flex-wrap pt-2 border-t">
              <Button
                size="sm"
                onClick={() => approveMutation.mutate(prayer.id)}
                disabled={approveMutation.isPending}
                data-testid={`button-approve-${prayer.id}`}
              >
                <Check className="h-4 w-4 mr-1" />
                Aprovar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive" data-testid={`button-reject-${prayer.id}`}>
                    <X className="h-4 w-4 mr-1" />
                    Rejeitar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Rejeitar pedido?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Este pedido será rejeitado e não aparecerá no mural de oração.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => rejectMutation.mutate(prayer.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Rejeitar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/espiritualidade">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Pedidos de Oração</h1>
          <p className="text-muted-foreground">
            Modere os pedidos de oração enviados pela comunidade
          </p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2" data-testid="tab-pending">
            <Clock className="h-4 w-4" />
            Pendentes
            {pendingPrayers && pendingPrayers.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingPrayers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2" data-testid="tab-approved">
            <CheckCircle className="h-4 w-4" />
            Aprovados
            {approvedPrayers && approvedPrayers.length > 0 && (
              <Badge variant="secondary" className="ml-1">{approvedPrayers.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoadingPending ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingPrayers?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum pedido pendente de aprovação</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingPrayers?.map((prayer) => renderPrayerCard(prayer, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {isLoadingApproved ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : approvedPrayers?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum pedido aprovado ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {approvedPrayers?.map((prayer) => (
                <Card key={prayer.id} className="flex flex-col" data-testid={`card-prayer-approved-${prayer.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">
                          Aprovado
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[prayer.category] || prayer.category}
                        </Badge>
                      </div>
                      {prayer.inPrayerCount > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {prayer.inPrayerCount}
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-base font-medium">
                      {prayer.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {prayer.createdAt && format(new Date(prayer.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground mb-4 flex-1">
                      {prayer.request}
                    </p>
                    <div className="flex gap-2 flex-wrap pt-2 border-t">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive" data-testid={`button-delete-prayer-${prayer.id}`}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir pedido de oração?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O pedido será removido permanentemente do mural de oração.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(prayer.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
