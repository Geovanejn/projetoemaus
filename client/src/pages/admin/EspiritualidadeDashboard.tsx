import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { BookOpen, Heart, Plus, FileText, Clock, CheckCircle, AlertCircle, MessageSquare, ArrowLeft, Send, Sparkles, ImagePlus, Trash2, Calendar, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface EspiritualidadeStats {
  devotionals: {
    total: number;
    published: number;
    drafts: number;
  };
  prayers: {
    pending: number;
    approved: number;
  };
}

interface DailyVersePost {
  id: number;
  verse: string;
  reference: string;
  reflection?: string;
  imageUrl?: string;
  isActive: boolean;
  publishedAt: string;
}

export default function EspiritualidadeDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  
  const { data: stats, isLoading } = useQuery<EspiritualidadeStats>({
    queryKey: ["/api/espiritualidade/stats"],
  });

  const { data: dailyVerses, isLoading: loadingVerses } = useQuery<DailyVersePost[]>({
    queryKey: ["/api/admin/daily-verses", showInactive],
    queryFn: async () => {
      const url = showInactive 
        ? "/api/admin/daily-verses?includeInactive=true" 
        : "/api/admin/daily-verses";
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(url, { headers, credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch verses");
      }
      return res.json();
    },
  });

  const deleteVerseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/daily-verse/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/daily-verses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site/daily-verse"] });
      toast({
        title: "Versículo desativado",
        description: "O versículo foi desativado e não aparecerá mais no histórico.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao desativar",
        description: error.message || "Não foi possível desativar o versículo.",
        variant: "destructive",
      });
    },
  });
  
  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/daily-verse/${id}/permanent`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/daily-verses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site/daily-verse"] });
      toast({
        title: "Versículo excluído",
        description: "O versículo foi excluído permanentemente do banco de dados.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o versículo.",
        variant: "destructive",
      });
    },
  });

  const testPushMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/devotionals/test-push");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Notificação de versículo enviada para todos os inscritos.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar a notificação de teste.",
        variant: "destructive",
      });
    },
  });

  const generateDailyVerseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/daily-verse/force-generate");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Versículo do Dia Gerado!",
        description: data.message || "Versículo publicado com sucesso e notificações enviadas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar",
        description: error.message || "Não foi possível gerar o versículo do dia.",
        variant: "destructive",
      });
    },
  });

  const populateStockMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/daily-verse/populate-stock");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Imagens Adicionadas!",
        description: data.message || "Imagens stock populadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao popular",
        description: error.message || "Não foi possível adicionar imagens stock.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation("/admin")}
            data-testid="button-back-panels"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Painel Espiritualidade</h1>
            <p className="text-muted-foreground">
              Gerencie devocionais e pedidos de oração
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => populateStockMutation.mutate()} 
            disabled={populateStockMutation.isPending}
            data-testid="button-populate-stock"
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            {populateStockMutation.isPending ? "Adicionando..." : "Popular Imagens"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => generateDailyVerseMutation.mutate()} 
            disabled={generateDailyVerseMutation.isPending}
            data-testid="button-generate-daily-verse"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generateDailyVerseMutation.isPending ? "Gerando..." : "Gerar Versículo do Dia"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => testPushMutation.mutate()} 
            disabled={testPushMutation.isPending}
            data-testid="button-test-push"
          >
            <Send className="h-4 w-4 mr-2" />
            {testPushMutation.isPending ? "Enviando..." : "Testar Notificação Push"}
          </Button>
          <Link href="/admin/espiritualidade/devocionais/novo">
            <Button data-testid="button-new-devotional">
              <Plus className="h-4 w-4 mr-2" />
              Novo Devocional
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-devotionals">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Devocionais</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-devotionals">
                {stats?.devotionals.total || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-published-devotionals">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600" data-testid="text-published-devotionals">
                {stats?.devotionals.published || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-draft-devotionals">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-draft-devotionals">
                {stats?.devotionals.drafts || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-pending-prayers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orações Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending-prayers">
                {stats?.prayers.pending || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-devotionals-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Devocionais
            </CardTitle>
            <CardDescription>
              Crie e gerencie os devocionais da UMP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Link href="/admin/espiritualidade/devocionais">
                <Button variant="outline" className="w-full justify-start" data-testid="button-manage-devotionals">
                  <FileText className="h-4 w-4 mr-2" />
                  Gerenciar Devocionais
                </Button>
              </Link>
              <Link href="/admin/espiritualidade/devocionais/novo">
                <Button variant="outline" className="w-full justify-start" data-testid="button-create-devotional">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Novo Devocional
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-prayers-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Pedidos de Oração
            </CardTitle>
            <CardDescription>
              Modere os pedidos de oração enviados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Pendentes de aprovação</span>
              </div>
              <span className="font-bold" data-testid="text-pending-count">
                {isLoading ? <Skeleton className="h-4 w-8" /> : stats?.prayers.pending || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Aprovados no Mural</span>
              </div>
              <span className="font-bold" data-testid="text-approved-count">
                {isLoading ? <Skeleton className="h-4 w-8" /> : stats?.prayers.approved || 0}
              </span>
            </div>
            <Link href="/admin/espiritualidade/oracoes">
              <Button variant="outline" className="w-full justify-start" data-testid="button-manage-prayers">
                <Heart className="h-4 w-4 mr-2" />
                Moderar Pedidos de Oração
              </Button>
            </Link>
            <Link href="/admin/espiritualidade/comentarios">
              <Button variant="outline" className="w-full justify-start" data-testid="button-manage-comments">
                <MessageSquare className="h-4 w-4 mr-2" />
                Moderar Comentarios
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Daily Verses Management */}
      <Card data-testid="card-daily-verses-section">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Versículos do Dia
              </CardTitle>
              <CardDescription>
                Gerencie os versículos do dia publicados
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
                data-testid="switch-show-inactive"
              />
              <Label htmlFor="show-inactive" className="text-xs text-muted-foreground cursor-pointer">
                {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingVerses ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !dailyVerses || dailyVerses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {showInactive ? "Nenhum versículo encontrado." : "Nenhum versículo ativo."}
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {dailyVerses.map((verse) => (
                <div 
                  key={verse.id} 
                  className={`flex items-center justify-between p-3 border rounded-md gap-2 ${!verse.isActive ? 'opacity-60 bg-muted/50' : ''}`}
                  data-testid={`verse-item-${verse.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(verse.publishedAt), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      {verse.isActive ? (
                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded">
                          Ativo
                        </span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 px-2 py-0.5 rounded">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{verse.reference}</p>
                    <p className="text-xs text-muted-foreground truncate">{verse.verse}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive flex-shrink-0"
                        data-testid={`button-delete-verse-${verse.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {verse.isActive ? "Desativar Versículo" : "Excluir Permanentemente"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {verse.isActive 
                            ? `Desativar o versículo "${verse.reference}"? Ele não aparecerá mais no histórico público.`
                            : `Excluir permanentemente o versículo "${verse.reference}"? Esta ação não pode ser desfeita.`
                          }
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => verse.isActive 
                            ? deleteVerseMutation.mutate(verse.id)
                            : permanentDeleteMutation.mutate(verse.id)
                          }
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          data-testid={`button-confirm-delete-${verse.id}`}
                        >
                          {verse.isActive ? "Desativar" : "Excluir"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
