import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { Calendar, Users, Plus, Download, CalendarDays, UserPlus, ArrowUpRight, FileText, Instagram, RefreshCw, Star, ExternalLink, Cake, ArrowLeft, Send, BookOpen, MessageCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MarketingStats {
  events: {
    total: number;
    upcoming: number;
    past: number;
  };
  boardMembers: {
    total: number;
    active: number;
  };
}

interface InstagramPost {
  id: number;
  caption: string | null;
  imageUrl: string;
  permalink: string;
  postedAt: string;
  isActive: boolean;
  isFeaturedBanner: boolean;
}

interface InstagramApiResponse {
  configured: boolean;
  posts: InstagramPost[];
  message: string | null;
}

export default function MarketingDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: stats, isLoading } = useQuery<MarketingStats>({
    queryKey: ["/api/marketing/stats"],
  });

  const { data: instagramData, isLoading: isLoadingInstagram, isError: isInstagramError } = useQuery<InstagramApiResponse>({
    queryKey: ["/api/admin/instagram"],
  });

  const instagramPosts = instagramData?.posts;
  const isInstagramConfigured = instagramData?.configured ?? false;

  const syncInstagramMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/instagram/sync");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/instagram"] });
      toast({
        title: "Sincronizado",
        description: `${data.synced} posts sincronizados do Instagram`,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao sincronizar posts do Instagram",
        variant: "destructive",
      });
    },
  });

  const featurePostMutation = useMutation({
    mutationFn: async ({ id, feature }: { id: number; feature: boolean }) => {
      if (feature) {
        await apiRequest("PATCH", `/api/admin/instagram/${id}/feature`);
      } else {
        await apiRequest("DELETE", `/api/admin/instagram/${id}/feature`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/instagram"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site/highlights"] });
      toast({
        title: "Atualizado",
        description: "Post atualizado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar post",
        variant: "destructive",
      });
    },
  });

  const triggerBirthdayEmailsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/trigger-birthday-emails");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "E-mails Enviados",
        description: data.message || "E-mails de aniversário disparados com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao disparar e-mails de aniversário",
        variant: "destructive",
      });
    },
  });

  const publishVerseStoryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/instagram/publish-verse-story");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Story Publicado",
        description: data.message || "Story do versículo publicado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao publicar story do versículo",
        variant: "destructive",
      });
    },
  });

  const publishReflectionStoryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/instagram/publish-reflection-story");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Story Publicado",
        description: data.message || "Story da reflexão publicado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao publicar story da reflexão",
        variant: "destructive",
      });
    },
  });

  const publishBirthdayStoryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/instagram/publish-birthday-story");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Story Publicado",
        description: data.message || "Story de aniversário publicado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao publicar story de aniversário",
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
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Painel Marketing</h1>
            <p className="text-muted-foreground">
              Gerencie eventos e a diretoria da UMP
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/marketing/aniversarios">
            <Button variant="outline" data-testid="button-birthday-art">
              <Cake className="h-4 w-4 mr-2" />
              Arte de Aniversário
            </Button>
          </Link>
          <Link href="/admin/marketing/eventos/novo">
            <Button data-testid="button-new-event">
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-events">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-events">
                {stats?.events.total || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-upcoming-events">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos Eventos</CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-blue-600" data-testid="text-upcoming-events">
                {stats?.events.upcoming || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-total-members">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros da Diretoria</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-members">
                {stats?.boardMembers.total || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-active-members">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros Ativos</CardTitle>
            <UserPlus className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600" data-testid="text-active-members">
                {stats?.boardMembers.active || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card data-testid="card-events-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Eventos
            </CardTitle>
            <CardDescription>
              Gerencie os eventos e a agenda da UMP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Link href="/admin/marketing/eventos">
                <Button variant="outline" className="w-full justify-start" data-testid="button-manage-events">
                  <Calendar className="h-4 w-4 mr-2" />
                  Gerenciar Eventos
                  <ArrowUpRight className="h-4 w-4 ml-auto" />
                </Button>
              </Link>
              <Link href="/admin/marketing/eventos/novo">
                <Button variant="outline" className="w-full justify-start" data-testid="button-create-event">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Novo Evento
                </Button>
              </Link>
              <a href="/api/site/events/calendar.ics" download>
                <Button variant="outline" className="w-full justify-start" data-testid="button-export-calendar">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Calendario (ICS)
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-board-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Diretoria
            </CardTitle>
            <CardDescription>
              Gerencie os membros da diretoria da UMP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Link href="/admin/marketing/diretoria">
                <Button variant="outline" className="w-full justify-start" data-testid="button-manage-board">
                  <Users className="h-4 w-4 mr-2" />
                  Gerenciar Diretoria
                  <ArrowUpRight className="h-4 w-4 ml-auto" />
                </Button>
              </Link>
              <Link href="/admin/marketing/diretoria/novo">
                <Button variant="outline" className="w-full justify-start" data-testid="button-add-member">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Membro
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-site-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Paginas do Site
            </CardTitle>
            <CardDescription>
              Edite o conteudo das paginas do site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Link href="/admin/marketing/quem-somos">
                <Button variant="outline" className="w-full justify-start" data-testid="button-edit-quem-somos">
                  <FileText className="h-4 w-4 mr-2" />
                  Editar Quem Somos
                  <ArrowUpRight className="h-4 w-4 ml-auto" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-instagram-stories-test">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Publicar Stories no Instagram
          </CardTitle>
          <CardDescription>
            Teste a publicação manual de Stories. Os Stories são publicados automaticamente: 07:05 (versículo), 07:10 (reflexão), 08:05 (aniversários).
            Em desenvolvimento, use "Apenas Gerar" para visualizar as imagens sem publicar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => publishVerseStoryMutation.mutate()}
              disabled={publishVerseStoryMutation.isPending || !isInstagramConfigured}
              variant="outline"
              data-testid="button-publish-verse-story"
            >
              <BookOpen className={`h-4 w-4 mr-2 ${publishVerseStoryMutation.isPending ? "animate-spin" : ""}`} />
              {publishVerseStoryMutation.isPending ? "Publicando..." : "Versículo do Dia"}
            </Button>
            <Button
              onClick={() => publishReflectionStoryMutation.mutate()}
              disabled={publishReflectionStoryMutation.isPending || !isInstagramConfigured}
              variant="outline"
              data-testid="button-publish-reflection-story"
            >
              <MessageCircle className={`h-4 w-4 mr-2 ${publishReflectionStoryMutation.isPending ? "animate-spin" : ""}`} />
              {publishReflectionStoryMutation.isPending ? "Publicando..." : "Reflexão do Dia"}
            </Button>
          </div>
          {!isInstagramConfigured && (
            <p className="text-sm text-muted-foreground">
              Configure as credenciais do Instagram para habilitar a publicação de Stories.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            As imagens são geradas automaticamente às 07:01 (versículo/reflexão) e às 08:01 (aniversários). Para publicar aniversários, use a aba Aniversários.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="card-instagram-section">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5" />
                Instagram @umpemaus
              </CardTitle>
              <CardDescription>
                Gerencie os posts do Instagram e escolha qual destacar no banner da home
              </CardDescription>
            </div>
            <Button
              onClick={() => syncInstagramMutation.mutate()}
              disabled={syncInstagramMutation.isPending}
              variant="outline"
              data-testid="button-sync-instagram"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncInstagramMutation.isPending ? "animate-spin" : ""}`} />
              {syncInstagramMutation.isPending ? "Sincronizando..." : "Sincronizar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingInstagram ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
            </div>
          ) : isInstagramError ? (
            <div className="text-center py-8 text-muted-foreground">
              <Instagram className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Erro ao carregar posts do Instagram</p>
              <p className="text-sm">Tente novamente mais tarde</p>
            </div>
          ) : !isInstagramConfigured ? (
            <div className="text-center py-8 text-muted-foreground">
              <Instagram className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Instagram não configurado</p>
              <p className="text-sm">{instagramData?.message || "Configure INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_USER_ID nos secrets."}</p>
            </div>
          ) : instagramPosts && instagramPosts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {instagramPosts.map((post) => (
                <div
                  key={post.id}
                  className={`relative group rounded-md overflow-hidden border ${
                    post.isFeaturedBanner ? "ring-2 ring-primary" : ""
                  }`}
                  data-testid={`card-instagram-post-${post.id}`}
                >
                  <img
                    src={post.imageUrl}
                    alt={post.caption || "Post do Instagram"}
                    className="aspect-square object-cover w-full"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    <div className="flex justify-end gap-2">
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white/20 rounded-full"
                        data-testid={`link-instagram-post-${post.id}`}
                      >
                        <ExternalLink className="h-4 w-4 text-white" />
                      </a>
                    </div>
                    <div className="space-y-2">
                      {post.caption && (
                        <p className="text-white text-xs line-clamp-2">{post.caption}</p>
                      )}
                      <Button
                        size="sm"
                        variant={post.isFeaturedBanner ? "secondary" : "default"}
                        onClick={() => featurePostMutation.mutate({ id: post.id, feature: !post.isFeaturedBanner })}
                        disabled={featurePostMutation.isPending}
                        className="w-full"
                        data-testid={`button-feature-post-${post.id}`}
                      >
                        <Star className={`h-4 w-4 mr-2 ${post.isFeaturedBanner ? "fill-current" : ""}`} />
                        {post.isFeaturedBanner ? "Remover Destaque" : "Destacar no Banner"}
                      </Button>
                    </div>
                  </div>
                  {post.isFeaturedBanner && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Destaque
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Instagram className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum post do Instagram sincronizado</p>
              <p className="text-sm">Clique em "Sincronizar" para buscar os posts mais recentes</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
