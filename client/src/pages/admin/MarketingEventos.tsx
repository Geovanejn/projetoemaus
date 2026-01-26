import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar,
  MapPin,
  ArrowLeft,
  Eye,
  EyeOff
} from "lucide-react";

interface SiteEvent {
  id: number;
  title: string;
  description?: string;
  shortDescription?: string;
  imageUrl?: string;
  startDate: string;
  endDate?: string;
  time?: string;
  location?: string;
  category: string;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
}

const categoryLabels: Record<string, string> = {
  geral: "Geral",
  culto: "Culto",
  retiro: "Retiro",
  estudo: "Estudo",
  social: "Social",
  confraternizacao: "Confraternização",
};

export default function MarketingEventos() {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: events, isLoading } = useQuery<SiteEvent[]>({
    queryKey: ["/api/admin/events"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/stats"] });
      toast({
        title: "Evento removido",
        description: "O evento foi removido com sucesso.",
      });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o evento.",
        variant: "destructive",
      });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: number; isPublished: boolean }) => {
      return apiRequest("PATCH", `/api/admin/events/${id}`, { isPublished });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({
        title: "Status atualizado",
        description: "O status do evento foi atualizado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateStr: string) => {
    try {
      // Add T12:00:00 to avoid timezone issues (noon is safe from date boundary issues)
      return format(new Date(dateStr + 'T12:00:00'), "dd MMM yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const isUpcoming = (dateStr: string) => {
    // Get today's date in Brazil timezone (America/Sao_Paulo)
    const today = new Date().toLocaleDateString('en-CA', { 
      timeZone: 'America/Sao_Paulo' 
    });
    // Compare as strings in YYYY-MM-DD format
    return dateStr >= today;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/marketing">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Eventos</h1>
            <p className="text-muted-foreground">
              Gerencie os eventos da UMP
            </p>
          </div>
        </div>
        <Link href="/admin/marketing/eventos/novo">
          <Button data-testid="button-new-event">
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lista de Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !events || events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum evento cadastrado</p>
              <Link href="/admin/marketing/eventos/novo">
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro evento
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                    <TableCell>
                      <div className="font-medium">{event.title}</div>
                      {event.shortDescription && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {event.shortDescription}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(event.startDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.location ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{event.location}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {categoryLabels[event.category] || event.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={event.isPublished ? "default" : "outline"}>
                          {event.isPublished ? "Publicado" : "Rascunho"}
                        </Badge>
                        {isUpcoming(event.startDate) ? (
                          <Badge variant="secondary" className="text-xs">Próximo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Passado</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePublishMutation.mutate({ 
                            id: event.id, 
                            isPublished: !event.isPublished 
                          })}
                          disabled={togglePublishMutation.isPending}
                          data-testid={`button-toggle-publish-${event.id}`}
                        >
                          {event.isPublished ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Link href={`/admin/marketing/eventos/${event.id}`}>
                          <Button variant="ghost" size="icon" data-testid={`button-edit-${event.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(event.id)}
                          data-testid={`button-delete-${event.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este evento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
