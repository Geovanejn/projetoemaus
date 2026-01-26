import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  Loader2,
  Sparkles,
  Plus,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wand2,
  ImageIcon
} from "lucide-react";
import { ImageUpload, IMAGE_UPLOAD_CONFIGS } from "@/components/ui/image-upload";
import { format, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StudyEvent {
  id: number;
  title: string;
  description: string | null;
  theme: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  status: string;
  forceUnlock: boolean | null;
  cardId: number | null;
  lessonsCount: number | null;
  xpMultiplier: number | null;
  createdAt: string;
}

interface EventLesson {
  id: number;
  eventId: number;
  dayNumber: number;
  title: string;
  status: string | null;
}

const MONTHS = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1).padStart(2, "0"),
}));

function getEventStatus(event: StudyEvent): "upcoming" | "active" | "ended" {
  const now = new Date();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  
  // If event is force unlocked, it's active even if date hasn't started
  if (event.forceUnlock && event.status === "published") {
    if (isAfter(now, end)) return "ended";
    return "active";
  }
  
  if (isBefore(now, start)) return "upcoming";
  if (isAfter(now, end)) return "ended";
  return "active";
}

function StatusBadge({ status, eventStatus }: { status: string; eventStatus: string }) {
  if (status === "ended") {
    return <Badge variant="secondary">Encerrado</Badge>;
  }
  if (status === "published") {
    if (eventStatus === "active") {
      return <Badge className="bg-green-500">Ativo</Badge>;
    } else if (eventStatus === "ended") {
      return <Badge variant="secondary">Encerrado</Badge>;
    } else {
      return <Badge className="bg-blue-500">Publicado</Badge>;
    }
  }
  return <Badge variant="outline">Rascunho</Badge>;
}

export default function AdminEventosPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("list");
  
  const [formData, setFormData] = useState({
    text: "",
    theme: "",
    imageUrl: "",
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    startDay: "1",
    endDay: "5",
    keyNumber: "auto",
  });

  const { data: events, isLoading } = useQuery<StudyEvent[]>({
    queryKey: ["/api/admin/study-events"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/study-events/ai-generate", {
        text: data.text,
        theme: data.theme,
        imageUrl: data.imageUrl || null,
        year: parseInt(data.year),
        month: parseInt(data.month),
        startDay: parseInt(data.startDay),
        endDay: parseInt(data.endDay),
        keyNumber: data.keyNumber === "auto" ? undefined : data.keyNumber,
      });
    },
    onSuccess: async (response) => {
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/study-events"] });
      toast({
        title: "Evento criado com sucesso",
        description: result.message,
      });
      setActiveTab("list");
      setFormData({
        text: "",
        theme: "",
        imageUrl: "",
        year: new Date().getFullYear().toString(),
        month: (new Date().getMonth() + 1).toString(),
        startDay: "1",
        endDay: "5",
        keyNumber: "auto",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ eventId, forceUnlock }: { eventId: number; forceUnlock: boolean }) => {
      return apiRequest("PATCH", `/api/admin/study-events/${eventId}`, {
        status: "published",
        forceUnlock,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/study-events"] });
      toast({
        title: "Evento publicado",
        description: variables.forceUnlock 
          ? "O evento está disponível imediatamente para os membros."
          : "O evento ficará disponível na data de início.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiRequest("DELETE", `/api/admin/study-events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/study-events"] });
      toast({
        title: "Evento removido",
      });
    },
  });

  const handleGenerate = () => {
    if (!formData.text.trim()) {
      toast({
        title: "Texto obrigatório",
        description: "Insira o texto base para gerar o evento.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.theme.trim()) {
      toast({
        title: "Tema obrigatório",
        description: "Insira o tema do evento.",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate(formData);
  };

  const sortedEvents = events?.slice().sort((a, b) => {
    const statusA = getEventStatus(a);
    const statusB = getEventStatus(b);
    const order = { active: 0, upcoming: 1, ended: 2 };
    if (order[statusA] !== order[statusB]) {
      return order[statusA] - order[statusB];
    }
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/admin")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Eventos Especiais</h1>
            <p className="text-sm text-muted-foreground">Gerenciar eventos do DeoGlory</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" data-testid="tab-list">
              Eventos
            </TabsTrigger>
            <TabsTrigger value="create" data-testid="tab-create">
              Criar com IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : sortedEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium text-lg mb-1">Nenhum evento criado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crie seu primeiro evento especial usando IA
                  </p>
                  <Button onClick={() => setActiveTab("create")} data-testid="button-create-first">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Evento
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sortedEvents.map((event) => {
                  const eventStatus = getEventStatus(event);
                  return (
                    <Card key={event.id} data-testid={`card-event-${event.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium truncate">{event.title}</h3>
                              <StatusBadge status={event.status} eventStatus={eventStatus} />
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                              {event.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                  {format(new Date(event.startDate), "dd/MM")} - {format(new Date(event.endDate), "dd/MM/yyyy")}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{event.lessonsCount || 5} lições</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {event.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const now = new Date();
                                  const startDate = new Date(event.startDate);
                                  const isFuture = now < startDate;
                                  
                                  if (isFuture) {
                                    // First confirm publication
                                    if (!confirm("Publicar este evento agora?")) {
                                      return; // User cancelled publication
                                    }
                                    // Then ask about immediate access - default YES for liberation
                                    const wantToSchedule = confirm(
                                      "O evento começa em uma data futura.\n\n" +
                                      "Deseja AGENDAR para a data de início?\n\n" +
                                      "OK = Agendar (bloqueado até " + format(startDate, "dd/MM") + ")\n" +
                                      "Cancelar = Liberar AGORA (acesso imediato)"
                                    );
                                    // If user wants to schedule (OK), forceUnlock = false
                                    // If user cancels (wants immediate), forceUnlock = true
                                    publishMutation.mutate({ eventId: event.id, forceUnlock: !wantToSchedule });
                                  } else {
                                    publishMutation.mutate({ eventId: event.id, forceUnlock: false });
                                  }
                                }}
                                disabled={publishMutation.isPending}
                                data-testid={`button-publish-${event.id}`}
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setLocation(`/admin/study/eventos/${event.id}`)}
                              data-testid={`button-edit-${event.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja excluir este evento?")) {
                                  deleteMutation.mutate(event.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${event.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-purple-500" />
                  Gerar Evento com IA
                </CardTitle>
                <CardDescription>
                  Insira o tema e o texto base. A IA gerará automaticamente 5 lições para o evento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema do Evento</Label>
                  <Input
                    id="theme"
                    placeholder="Ex: Semana da Reforma, Natal, Páscoa..."
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                    data-testid="input-theme"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Imagem do Evento (opcional)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Esta imagem aparecerá no card do evento e nos cards colecionáveis. Use formato 16:9 (paisagem).
                  </p>
                  <ImageUpload
                    value={formData.imageUrl}
                    onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                    aspectRatio={IMAGE_UPLOAD_CONFIGS.event.aspectRatio}
                    placeholder={IMAGE_UPLOAD_CONFIGS.event.placeholder}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Select
                      value={formData.year}
                      onValueChange={(value) => setFormData({ ...formData, year: value })}
                    >
                      <SelectTrigger data-testid="select-year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2025, 2026, 2027].map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mês</Label>
                    <Select
                      value={formData.month}
                      onValueChange={(value) => setFormData({ ...formData, month: value })}
                    >
                      <SelectTrigger data-testid="select-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dia Inicial</Label>
                    <Select
                      value={formData.startDay}
                      onValueChange={(value) => setFormData({ ...formData, startDay: value })}
                    >
                      <SelectTrigger data-testid="select-start-day">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dia Final</Label>
                    <Select
                      value={formData.endDay}
                      onValueChange={(value) => setFormData({ ...formData, endDay: value })}
                    >
                      <SelectTrigger data-testid="select-end-day">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    As 5 lições serão liberadas uma por dia às 00:00, começando no dia {formData.startDay}/{formData.month}/{formData.year}.
                    Os cards serão distribuídos às 23:59 do dia {formData.endDay}/{formData.month}/{formData.year}.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Chave API Gemini</Label>
                  <Select
                    value={formData.keyNumber}
                    onValueChange={(value) => setFormData({ ...formData, keyNumber: value })}
                  >
                    <SelectTrigger data-testid="select-api-key">
                      <SelectValue placeholder="Automático (tenta todas)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automático (tenta todas)</SelectItem>
                      <SelectItem value="1">Chave 1 (GEMINI_API_KEY_1)</SelectItem>
                      <SelectItem value="2">Chave 2 (GEMINI_API_KEY_2)</SelectItem>
                      <SelectItem value="3">Chave 3 (GEMINI_API_KEY_3)</SelectItem>
                      <SelectItem value="4">Chave 4 (GEMINI_API_KEY_4)</SelectItem>
                      <SelectItem value="5">Chave 5 (GEMINI_API_KEY_5)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Selecione uma chave específica ou deixe no automático para tentar todas as disponíveis.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text">Texto Base para Geração</Label>
                  <Textarea
                    id="text"
                    placeholder="Cole aqui o texto, tema bíblico ou descrição do conteúdo que você deseja que a IA use para gerar as 5 lições do evento..."
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    className="min-h-[200px]"
                    data-testid="input-text"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  data-testid="button-generate"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando evento...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Gerar Evento com IA
                    </>
                  )}
                </Button>

                {generateMutation.isPending && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-md">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                      <div>
                        <p className="font-medium text-purple-700 dark:text-purple-400">
                          Gerando conteúdo com IA...
                        </p>
                        <p className="text-sm text-purple-600 dark:text-purple-500">
                          Isso pode levar alguns segundos. A IA está criando 5 lições completas.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
