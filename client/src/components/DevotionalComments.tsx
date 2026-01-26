import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { MessageSquare, Send, Loader2, User, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

interface Comment {
  id: number;
  name: string;
  content: string;
  isHighlighted: boolean;
  createdAt: string;
}

interface DevotionalCommentsProps {
  devotionalId: number;
}

const commentFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  content: z.string().min(3, "Comentario deve ter pelo menos 3 caracteres").max(500, "Comentario deve ter no maximo 500 caracteres"),
});

type CommentFormValues = z.infer<typeof commentFormSchema>;

function formatCommentDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min atras`;
  if (diffHours < 24) return `${diffHours}h atras`;
  if (diffDays < 7) return `${diffDays}d atras`;
  
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function DevotionalComments({ devotionalId }: DevotionalCommentsProps) {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: ['/api/site/devotionals', devotionalId, 'comments'],
    queryFn: async () => {
      const res = await fetch(`/api/site/devotionals/${devotionalId}/comments`);
      if (!res.ok) throw new Error("Erro ao buscar comentarios");
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      name: user?.fullName || "",
      content: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: CommentFormValues) => {
      return apiRequest("POST", `/api/site/devotionals/${devotionalId}/comments`, {
        name: data.name,
        content: data.content,
        userId: user?.id || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Comentario enviado!",
        description: "Seu comentario sera exibido apos aprovacao.",
      });
      form.reset({ name: user?.fullName || "", content: "" });
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CommentFormValues) => {
    submitMutation.mutate(data);
  };

  const highlightedComments = comments?.filter(c => c.isHighlighted) || [];
  const regularComments = comments?.filter(c => !c.isHighlighted) || [];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Comentarios
            {comments && comments.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {comments.length}
              </Badge>
            )}
          </span>
          {!showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              data-testid="button-show-comment-form"
            >
              <Send className="h-3 w-3 mr-1" />
              Comentar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border rounded-lg p-4 bg-muted/30"
          >
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Seu nome"
                          {...field}
                          disabled={isAuthenticated && !!user?.fullName}
                          data-testid="input-comment-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comentario</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Compartilhe sua reflexao..."
                          className="min-h-[80px] resize-none"
                          {...field}
                          data-testid="textarea-comment-content"
                        />
                      </FormControl>
                      <div className="flex items-center justify-between">
                        <FormMessage />
                        <span className="text-xs text-muted-foreground">
                          {field.value.length}/500
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                    data-testid="button-cancel-comment"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    data-testid="button-submit-comment"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Send className="h-4 w-4 mr-1" />
                    )}
                    Enviar
                  </Button>
                </div>
              </form>
            </Form>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Seu comentario sera exibido apos aprovacao.
            </p>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-3">
            {highlightedComments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-primary/5 border border-primary/20"
                data-testid={`comment-highlighted-${comment.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{comment.name}</span>
                      <Badge variant="outline" className="text-xs bg-primary/10">
                        Destaque
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatCommentDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 mt-1">{comment.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            {regularComments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-muted/30"
                data-testid={`comment-${comment.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{comment.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatCommentDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 mt-1">{comment.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum comentario ainda.</p>
            <p className="text-xs mt-1">Seja o primeiro a comentar!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
