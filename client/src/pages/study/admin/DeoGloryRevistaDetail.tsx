import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { DeoGloryAdminLayout } from "@/components/deoglory/DeoGloryAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Upload,
  BookOpen,
  Loader2,
  FileText,
  CheckCircle,
  X,
  Lock,
  Unlock,
  Trash2,
  Eye,
  AlertCircle,
  Pencil,
  Sparkles,
  Gift,
  Image as ImageIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { CollectibleCard } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Season, StudyLesson } from "@shared/schema";

const MAGAZINE_COVER_ASPECT_RATIO = 2 / 3;

export default function DeoGloryRevistaDetail() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const seasonId = parseInt(params.id || "0", 10);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const [showEditLessonModal, setShowEditLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<{ id: number; title: string } | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedLessonNumber, setSelectedLessonNumber] = useState<string>("");
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardDescription, setCardDescription] = useState("");
  const [cardImageFile, setCardImageFile] = useState<File | null>(null);
  const [cardImagePreview, setCardImagePreview] = useState<string | null>(null);
  const cardImageInputRef = useRef<HTMLInputElement>(null);
  const [geminiKey, setGeminiKey] = useState<string>("1");
  const [openaiKey, setOpenaiKey] = useState<string>("1");
  const [aiProvider, setAiProvider] = useState<string>("gemini");

  const { data: season, isLoading: loadingSeason } = useQuery<Season>({
    queryKey: ["/api/study/admin/seasons", seasonId],
    queryFn: async () => {
      const res = await fetch(`/api/study/admin/seasons/${seasonId}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch season");
      return res.json();
    },
    enabled: seasonId > 0,
  });

  const { data: lessons = [], isLoading: loadingLessons } = useQuery<StudyLesson[]>({
    queryKey: ["/api/study/admin/seasons", seasonId, "lessons"],
    queryFn: async () => {
      const res = await fetch(`/api/study/admin/seasons/${seasonId}/lessons`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch lessons");
      return res.json();
    },
    enabled: seasonId > 0,
  });

  const { data: seasonCard } = useQuery<CollectibleCard | null>({
    queryKey: ["/api/admin/cards/season", seasonId],
    queryFn: async () => {
      if (!season?.cardId) return null;
      const res = await fetch(`/api/admin/cards`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!res.ok) return null;
      const cards = await res.json();
      return cards.find((c: CollectibleCard) => c.id === season.cardId) || null;
    },
    enabled: !!season?.cardId,
  });

  const createCardMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; imageData?: string }) => {
      const cardData = {
        name: data.name,
        description: data.description,
        sourceType: "season",
        sourceId: seasonId,
        imageUrl: data.imageData || null,
      };
      const card = await apiRequest("POST", `/api/admin/cards`, cardData);
      await apiRequest("PUT", `/api/study/admin/seasons/${seasonId}`, { cardId: card.id });
      return card;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons", seasonId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cards/season", seasonId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cards"] });
      toast({ title: "Card criado com sucesso!", description: "Ao encerrar a revista, todos os participantes receberão este card." });
      resetCardModal();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar card", description: error.message, variant: "destructive" });
    },
  });

  const removeCardMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", `/api/study/admin/seasons/${seasonId}`, { cardId: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons", seasonId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cards/season", seasonId] });
      toast({ title: "Card removido da revista" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover card", description: error.message, variant: "destructive" });
    },
  });

  const resetCardModal = () => {
    setShowCardModal(false);
    setCardName("");
    setCardDescription("");
    setCardImageFile(null);
    setCardImagePreview(null);
  };

  const handleCardImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCardImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCardImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateCard = async () => {
    if (!cardName.trim()) {
      toast({ title: "Digite o nome do card", variant: "destructive" });
      return;
    }
    
    let imageData: string | undefined;
    if (cardImageFile) {
      const reader = new FileReader();
      imageData = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(cardImageFile);
      });
    }
    
    createCardMutation.mutate({
      name: cardName.trim(),
      description: cardDescription.trim(),
      imageData,
    });
  };

  const toggleLessonLockMutation = useMutation({
    mutationFn: async ({ lessonId, isLocked }: { lessonId: number; isLocked: boolean }) => {
      return apiRequest("PATCH", `/api/study/admin/lessons/${lessonId}`, { isLocked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons", seasonId, "lessons"] });
      toast({ title: "Lição atualizada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar lição", description: error.message, variant: "destructive" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      return apiRequest("DELETE", `/api/study/admin/lessons/${lessonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons", seasonId, "lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
      toast({ title: "Lição removida com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover lição", description: error.message, variant: "destructive" });
    },
  });

  const publishSeasonMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/study/admin/seasons/${seasonId}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons", seasonId] });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
      toast({ title: "Revista publicada com sucesso!", description: "Agora os usuários podem acessar os estudos." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao publicar revista", description: error.message, variant: "destructive" });
    },
  });

  const toggleSeasonLockMutation = useMutation({
    mutationFn: async (isLocked: boolean) => {
      return apiRequest("POST", `/api/study/admin/seasons/${seasonId}/toggle-lock`, { isLocked });
    },
    onSuccess: (_, isLocked) => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons", seasonId] });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
      toast({ 
        title: isLocked ? "Revista bloqueada" : "Revista desbloqueada",
        description: isLocked ? "Os usuários não podem acessar esta revista." : "Os usuários podem acessar esta revista."
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao alterar bloqueio", description: error.message, variant: "destructive" });
    },
  });

  const endSeasonMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/study/admin/seasons/${seasonId}/end`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons", seasonId] });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
      toast({ 
        title: "Revista encerrada com sucesso!",
        description: "O ranking foi calculado e emails de parabéns foram enviados aos top 3."
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao encerrar revista", description: error.message, variant: "destructive" });
    },
  });

  const updateSeasonTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      return apiRequest("PUT", `/api/study/admin/seasons/${seasonId}`, { title: newTitle.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons", seasonId] });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
      toast({ title: "Nome da revista atualizado!" });
      setShowEditNameModal(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar nome", description: error.message, variant: "destructive" });
    },
  });

  const updateLessonTitleMutation = useMutation({
    mutationFn: async ({ lessonId, title }: { lessonId: number; title: string }) => {
      return apiRequest("PATCH", `/api/study/admin/lessons/${lessonId}`, { title: title.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons", seasonId, "lessons"] });
      toast({ title: "Nome da lição atualizado!" });
      setShowEditLessonModal(false);
      setEditingLesson(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar nome da lição", description: error.message, variant: "destructive" });
    },
  });

  const resetUploadModal = () => {
    setShowUploadModal(false);
    setPdfFile(null);
    setSelectedLessonNumber("");
    setIsProcessingPdf(false);
    setGeminiKey("1");
    setOpenaiKey("1");
    setAiProvider("gemini");
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    } else {
      toast({ title: "Selecione um arquivo PDF válido", variant: "destructive" });
    }
  };

  const handleUploadPdf = async () => {
    if (!pdfFile) {
      toast({ title: "Selecione um arquivo PDF", variant: "destructive" });
      return;
    }

    if (!selectedLessonNumber) {
      toast({ title: "Selecione o número da lição", variant: "destructive" });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast({ title: "Sessão expirada", description: "Por favor, faça login novamente", variant: "destructive" });
      return;
    }

    setIsProcessingPdf(true);
    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("lessonNumber", selectedLessonNumber);

      const response = await fetch(`/api/study/admin/seasons/${seasonId}/import-pdf-exact`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        credentials: "include",
      });

      if (response.status === 401) {
        toast({ title: "Sessão expirada", description: "Por favor, faça login novamente", variant: "destructive" });
        return;
      }

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "PDF processado com sucesso!",
          description: `Lição ${selectedLessonNumber} - "${data.lessonTitle}" criada com ${data.questionsCount} perguntas.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons", seasonId, "lessons"] });
        queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
        resetUploadModal();
      } else {
        let errorTitle = "Erro ao processar PDF";
        let errorDescription = data.message || "Erro desconhecido";
        
        if (data.errorType === "rate_limit") {
          errorTitle = "Limite de requisições atingido";
          errorDescription = `${data.message} Aguarde alguns minutos e tente novamente.`;
        } else if (data.errorType === "auth") {
          errorTitle = "Erro de autenticação";
        } else if (data.errorType === "service_unavailable") {
          errorTitle = "Serviço indisponível";
        } else if (data.errorType === "timeout") {
          errorTitle = "Tempo limite excedido";
        }
        
        toast({ title: errorTitle, description: errorDescription, variant: "destructive" });
      }
    } catch (error) {
      console.error("[PDF Upload] Error caught:", error);
      // Only show connection error if it's actually a network/fetch error
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      if (errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("abort")) {
        toast({ title: "Erro de conexão", description: "Verifique sua internet e tente novamente.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao processar", description: errorMessage, variant: "destructive" });
      }
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const usedLessonNumbers = lessons.map(l => l.lessonNumber).filter(Boolean) as number[];
  const availableLessonNumbers = Array.from({ length: 100 }, (_, i) => i + 1).filter(
    n => !usedLessonNumbers.includes(n)
  );

  if (loadingSeason) {
    return (
      <DeoGloryAdminLayout title="Carregando..." subtitle="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </DeoGloryAdminLayout>
    );
  }

  if (!season) {
    return (
      <DeoGloryAdminLayout title="Revista não encontrada" subtitle="">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">A revista solicitada não foi encontrada.</p>
          <Button onClick={() => navigate("/admin/study/estudos")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Revistas
          </Button>
        </div>
      </DeoGloryAdminLayout>
    );
  }

  return (
    <DeoGloryAdminLayout 
      title={season.aiExtractedTitle || season.title} 
      subtitle="Gerencie as lições desta revista"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => navigate("/admin/study/estudos")}
            data-testid="button-voltar"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            {season && season.status !== "published" && lessons.length > 0 && (
              <Button 
                onClick={() => publishSeasonMutation.mutate()}
                disabled={publishSeasonMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-publish-season"
              >
                {publishSeasonMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Publicar Revista
              </Button>
            )}
            <Button 
              onClick={() => setShowUploadModal(true)} 
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="button-upload-pdf"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload PDF
            </Button>
            {season.status === "published" && !season.isEnded && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => toggleSeasonLockMutation.mutate(!season.isLocked)}
                  disabled={toggleSeasonLockMutation.isPending}
                  data-testid="button-toggle-lock"
                >
                  {toggleSeasonLockMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : season.isLocked ? (
                    <Unlock className="h-4 w-4 mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  {season.isLocked ? "Desbloquear" : "Bloquear"}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja encerrar esta revista? Esta ação é irreversível e enviará emails de parabéns para os top 3.")) {
                      endSeasonMutation.mutate();
                    }
                  }}
                  disabled={endSeasonMutation.isPending}
                  data-testid="button-end-season"
                >
                  {endSeasonMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Encerrar Revista
                </Button>
              </>
            )}
            {season.isEnded && (
              <Badge variant="secondary" className="bg-gray-200 dark:bg-gray-700">
                Encerrada
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardContent className="p-4">
              <div 
                className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-4" 
                style={{ aspectRatio: '2/3' }}
              >
                {season.coverImageUrl ? (
                  <img
                    src={season.coverImageUrl}
                    alt={season.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-white flex-1">
                  {season.title}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingTitle(season.title);
                    setShowEditNameModal(true);
                  }}
                  data-testid="button-edit-name"
                >
                  <Pencil className="h-4 w-4 text-violet-600" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {season.totalLessons} {season.totalLessons === 1 ? "lição" : "lições"}
              </p>
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lições</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLessons ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                  </div>
                ) : lessons.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      Nenhuma lição criada
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Faça upload de um PDF para criar a primeira lição.
                    </p>
                    <Button 
                      onClick={() => setShowUploadModal(true)} 
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload PDF
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lessons
                      .sort((a, b) => (a.lessonNumber || 0) - (b.lessonNumber || 0))
                      .map((lesson) => (
                        <div 
                          key={lesson.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          data-testid={`lesson-row-${lesson.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30">
                              <span className="text-sm font-bold text-violet-600">
                                {lesson.lessonNumber || lesson.orderIndex + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base line-clamp-2 sm:truncate">
                                {lesson.title}
                              </h4>
                              {lesson.description && (
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                  {lesson.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
                            <Badge 
                              className={cn(
                                "text-xs",
                                lesson.isLocked 
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-0" 
                                  : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0"
                              )}
                            >
                              {lesson.isLocked ? "Bloqueada" : "Liberada"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingLesson({ id: lesson.id, title: lesson.title });
                                setShowEditLessonModal(true);
                              }}
                              data-testid={`button-edit-lesson-title-${lesson.id}`}
                            >
                              <Pencil className="h-4 w-4 text-violet-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/admin/study/licao/${lesson.id}`)}
                              data-testid={`button-view-lesson-${lesson.id}`}
                            >
                              <Eye className="h-4 w-4 text-violet-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleLessonLockMutation.mutate({ 
                                lessonId: lesson.id, 
                                isLocked: !lesson.isLocked 
                              })}
                              disabled={toggleLessonLockMutation.isPending}
                              data-testid={`button-toggle-lock-${lesson.id}`}
                            >
                              {lesson.isLocked ? (
                                <Unlock className="h-4 w-4 text-green-600" />
                              ) : (
                                <Lock className="h-4 w-4 text-red-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja remover esta lição?")) {
                                  deleteLessonMutation.mutate(lesson.id);
                                }
                              }}
                              disabled={deleteLessonMutation.isPending}
                              data-testid={`button-delete-lesson-${lesson.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showUploadModal} onOpenChange={(open) => !isProcessingPdf && setShowUploadModal(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Upload de PDF</DialogTitle>
            <DialogDescription>
              Selecione o número da lição e faça upload do PDF
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-x-hidden">
            <div className="space-y-2">
              <Label>Número da Lição</Label>
              <Select 
                value={selectedLessonNumber} 
                onValueChange={setSelectedLessonNumber}
                disabled={isProcessingPdf}
              >
                <SelectTrigger data-testid="select-lesson-number">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {availableLessonNumbers.map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      Lição {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableLessonNumbers.length === 0 && (
                <p className="text-sm text-amber-600">
                  Todas as 20 lições já foram criadas.
                </p>
              )}
            </div>

            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handlePdfChange}
            />
            {pdfFile ? (
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                  <FileText className="h-6 w-6 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {pdfFile.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!isProcessingPdf && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPdfFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-32 border-dashed"
                onClick={() => pdfInputRef.current?.click()}
                disabled={availableLessonNumbers.length === 0}
                data-testid="button-selecionar-pdf"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">Clique para selecionar PDF</span>
                  <span className="text-xs text-muted-foreground">Máximo 10MB</span>
                </div>
              </Button>
            )}

            {isProcessingPdf && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Processando com IA...
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Isso pode levar alguns segundos.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetUploadModal} disabled={isProcessingPdf}>
              Cancelar
            </Button>
            <Button
              onClick={handleUploadPdf}
              disabled={isProcessingPdf || !pdfFile || !selectedLessonNumber}
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="button-processar-pdf"
            >
              {isProcessingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Gerar Lição
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditNameModal} onOpenChange={setShowEditNameModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Nome da Revista</DialogTitle>
            <DialogDescription>
              Altere o nome da revista abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="magazine-title">Nome da Revista</Label>
            <Input
              id="magazine-title"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              placeholder="Digite o nome da revista"
              className="mt-2"
              data-testid="input-edit-magazine-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditNameModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateSeasonTitleMutation.mutate(editingTitle)}
              disabled={updateSeasonTitleMutation.isPending || !editingTitle.trim()}
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="button-save-magazine-name"
            >
              {updateSeasonTitleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditLessonModal} onOpenChange={(open) => {
        setShowEditLessonModal(open);
        if (!open) setEditingLesson(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Nome da Lição</DialogTitle>
            <DialogDescription>
              Altere o nome da lição abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="lesson-title">Nome da Lição</Label>
            <Input
              id="lesson-title"
              value={editingLesson?.title || ""}
              onChange={(e) => setEditingLesson(prev => prev ? { ...prev, title: e.target.value } : null)}
              placeholder="Digite o nome da lição"
              className="mt-2"
              data-testid="input-edit-lesson-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditLessonModal(false);
              setEditingLesson(null);
            }}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingLesson) {
                  updateLessonTitleMutation.mutate({ lessonId: editingLesson.id, title: editingLesson.title });
                }
              }}
              disabled={updateLessonTitleMutation.isPending || !editingLesson?.title.trim()}
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="button-save-lesson-name"
            >
              {updateLessonTitleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DeoGloryAdminLayout>
  );
}
