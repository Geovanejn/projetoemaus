import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Check, X, Clock, CheckCircle, MessageSquare, Star, Trash2 } from "lucide-react";
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
import type { DevotionalComment } from "@shared/schema";

export default function EspiritualidadeComentarios() {
  const { toast } = useToast();

  const { data: comments, isLoading } = useQuery<DevotionalComment[]>({
    queryKey: ["/api/espiritualidade/comments"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/espiritualidade/comments/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/comments"] });
      toast({ title: "Comentario aprovado!" });
    },
    onError: () => {
      toast({ title: "Erro ao aprovar comentario", variant: "destructive" });
    },
  });

  const highlightMutation = useMutation({
    mutationFn: async ({ id, isHighlighted }: { id: number; isHighlighted: boolean }) => {
      return apiRequest("PATCH", `/api/espiritualidade/comments/${id}/highlight`, { isHighlighted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/comments"] });
      toast({ title: "Destaque atualizado!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar destaque", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/espiritualidade/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/espiritualidade/comments"] });
      toast({ title: "Comentario removido!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover comentario", variant: "destructive" });
    },
  });

  const pendingComments = comments?.filter(c => !c.isApproved) || [];
  const approvedComments = comments?.filter(c => c.isApproved) || [];

  const renderCommentCard = (comment: DevotionalComment, showActions = false) => {
    return (
      <Card key={comment.id} className="flex flex-col" data-testid={`card-comment-${comment.id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {comment.isApproved ? (
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Aprovado
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Pendente
                </Badge>
              )}
              {comment.isHighlighted && (
                <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-900/20">
                  <Star className="h-3 w-3 mr-1 text-yellow-500" />
                  Destaque
                </Badge>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              Devocional #{comment.devotionalId}
            </Badge>
          </div>
          <CardTitle className="text-base font-medium">
            {comment.name}
          </CardTitle>
          <CardDescription className="text-xs">
            {comment.createdAt && format(new Date(comment.createdAt), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <p className="text-sm text-muted-foreground mb-4 flex-1">
            {comment.content}
          </p>
          
          {showActions && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => approveMutation.mutate(comment.id)}
                disabled={approveMutation.isPending}
                data-testid={`button-approve-${comment.id}`}
              >
                <Check className="h-3 w-3 mr-1" />
                Aprovar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    data-testid={`button-delete-${comment.id}`}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O comentário será removido permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(comment.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {!showActions && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant={comment.isHighlighted ? "default" : "outline"}
                onClick={() => highlightMutation.mutate({ id: comment.id, isHighlighted: !comment.isHighlighted })}
                disabled={highlightMutation.isPending}
                data-testid={`button-highlight-${comment.id}`}
              >
                <Star className={`h-3 w-3 mr-1 ${comment.isHighlighted ? "fill-current" : ""}`} />
                {comment.isHighlighted ? "Remover Destaque" : "Destacar"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    data-testid={`button-delete-approved-${comment.id}`}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O comentário será removido permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(comment.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
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

  const renderSkeleton = () => (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-5 w-32 mt-2" />
        <Skeleton className="h-4 w-24 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-16 w-full mb-4" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/espiritualidade">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Comentarios dos Devocionais
          </h1>
          <p className="text-muted-foreground">
            Modere os comentarios enviados pelos usuarios
          </p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-1">
            <Clock className="h-4 w-4" />
            Pendentes
            {pendingComments.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {pendingComments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1">
            <CheckCircle className="h-4 w-4" />
            Aprovados
            {approvedComments.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {approvedComments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i}>{renderSkeleton()}</div>
              ))}
            </div>
          ) : pendingComments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium mb-2">Nenhum comentario pendente</h3>
                <p className="text-sm text-muted-foreground">
                  Todos os comentarios foram moderados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingComments.map((comment) => renderCommentCard(comment, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i}>{renderSkeleton()}</div>
              ))}
            </div>
          ) : approvedComments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium mb-2">Nenhum comentario aprovado</h3>
                <p className="text-sm text-muted-foreground">
                  Nenhum comentario foi aprovado ainda.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedComments.map((comment) => renderCommentCard(comment, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
