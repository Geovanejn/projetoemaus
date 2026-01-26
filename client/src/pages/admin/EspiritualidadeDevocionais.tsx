import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Edit, Trash2, Eye, EyeOff, Star, ArrowLeft } from "lucide-react";
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
import type { Devotional } from "@shared/schema";

export default function EspiritualidadeDevocionais() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: devotionals, isLoading } = useQuery<Devotional[]>({
    queryKey: ["/api/espiritualidade/devotionals"],
  });

  const publishMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/espiritualidade/devotionals/${id}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/devotionals"] });
      toast({ title: "Devocional publicado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao publicar devocional", variant: "destructive" });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/espiritualidade/devotionals/${id}/unpublish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/devotionals"] });
      toast({ title: "Devocional despublicado!" });
    },
    onError: () => {
      toast({ title: "Erro ao despublicar devocional", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/espiritualidade/devotionals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/devotionals"] });
      toast({ title: "Devocional excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir devocional", variant: "destructive" });
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/espiritualidade">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Devocionais</h1>
            <p className="text-muted-foreground">
              Gerencie todos os devocionais da UMP
            </p>
          </div>
        </div>
        <Link href="/admin/espiritualidade/devocionais/novo">
          <Button data-testid="button-new-devotional">
            <Plus className="h-4 w-4 mr-2" />
            Novo Devocional
          </Button>
        </Link>
      </div>

      {isLoading ? (
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
      ) : devotionals?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum devocional encontrado</p>
            <Link href="/admin/espiritualidade/devocionais/novo">
              <Button data-testid="button-create-first">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro devocional
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devotionals?.map((devotional) => (
            <Card key={devotional.id} className="flex flex-col" data-testid={`card-devotional-${devotional.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{devotional.title}</CardTitle>
                  <div className="flex gap-1 flex-shrink-0">
                    {devotional.isFeatured && (
                      <Badge variant="secondary" className="flex-shrink-0">
                        <Star className="h-3 w-3 mr-1" />
                        Destaque
                      </Badge>
                    )}
                    <Badge variant={devotional.isPublished ? "default" : "secondary"}>
                      {devotional.isPublished ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="line-clamp-1">
                  {devotional.verseReference}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                  {devotional.verse}
                </p>
                <div className="text-xs text-muted-foreground mb-4">
                  {devotional.author && <span>Por {devotional.author} • </span>}
                  {devotional.createdAt && format(new Date(devotional.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/admin/espiritualidade/devocionais/${devotional.id}`)}
                    data-testid={`button-edit-${devotional.id}`}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  {devotional.isPublished ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unpublishMutation.mutate(devotional.id)}
                      disabled={unpublishMutation.isPending}
                      data-testid={`button-unpublish-${devotional.id}`}
                    >
                      <EyeOff className="h-4 w-4 mr-1" />
                      Ocultar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => publishMutation.mutate(devotional.id)}
                      disabled={publishMutation.isPending}
                      data-testid={`button-publish-${devotional.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Publicar
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive" data-testid={`button-delete-${devotional.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir devocional?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O devocional será permanentemente removido.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(devotional.id)}
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
    </div>
  );
}
