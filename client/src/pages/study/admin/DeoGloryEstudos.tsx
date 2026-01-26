import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { DeoGloryAdminLayout } from "@/components/deoglory/DeoGloryAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Upload,
  BookOpen,
  Loader2,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  X,
  Eye,
  Trash2,
  MoreVertical,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ImageCropDialog from "@/components/ImageCropDialog";
import type { Season } from "@shared/schema";

const MAGAZINE_COVER_ASPECT_RATIO = 3 / 4;

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", label: "Rascunho" },
  processing: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", label: "Processando" },
  published: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "Publicado" },
  archived: { bg: "bg-gray-100 dark:bg-gray-900/30", text: "text-gray-700 dark:text-gray-400", label: "Arquivado" },
};

export default function DeoGloryEstudos() {
  const { toast } = useToast();
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [highlightedSeasonId, setHighlightedSeasonId] = useState<number | null>(null);
  const [newSeasonTitle, setNewSeasonTitle] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const { data: seasons = [], isLoading } = useQuery<Season[]>({
    queryKey: ["/api/study/admin/seasons"],
  });

  const [hasHandledQueryParam, setHasHandledQueryParam] = useState(false);

  useEffect(() => {
    if (hasHandledQueryParam) return;
    const params = new URLSearchParams(searchString);
    const revistaId = params.get("revista");
    if (revistaId && seasons.length > 0) {
      const id = parseInt(revistaId, 10);
      const season = seasons.find(s => s.id === id);
      if (season) {
        setHighlightedSeasonId(id);
        setSelectedSeason(season);
        setShowUploadModal(true);
        setHasHandledQueryParam(true);
        navigate("/study/admin/estudos", { replace: true });
        setTimeout(() => setHighlightedSeasonId(null), 5000);
      }
    }
  }, [searchString, seasons, navigate, hasHandledQueryParam]);

  const createSeasonMutation = useMutation({
    mutationFn: async (data: { title: string; coverImageUrl?: string }) => {
      return apiRequest("POST", "/api/study/admin/seasons", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
      toast({ title: "Revista criada com sucesso!" });
      resetCreateModal();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar revista", description: error.message, variant: "destructive" });
    },
  });

  const deleteSeasonMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/study/admin/seasons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
      toast({ title: "Revista removida com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover revista", description: error.message, variant: "destructive" });
    },
  });

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setNewSeasonTitle("");
    setCoverPreview(null);
    setCoverFile(null);
  };

  const resetUploadModal = () => {
    setShowUploadModal(false);
    setSelectedSeason(null);
    setPdfFile(null);
    setIsProcessingPdf(false);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Selecione uma imagem valida", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setTempImageSrc(reader.result as string);
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedImage: string) => {
    try {
      const blob = await fetch(croppedImage).then((r) => r.blob());
      const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
      setCoverFile(file);
      setCoverPreview(croppedImage);
    } catch (error) {
      console.error("Error processing cropped image:", error);
      toast({ title: "Erro ao processar imagem", variant: "destructive" });
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    } else {
      toast({ title: "Selecione um arquivo PDF válido", variant: "destructive" });
    }
  };

  const handleCreateSeason = async () => {
    if (!newSeasonTitle.trim()) {
      toast({ title: "Digite o nome da revista", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      let coverImageUrl: string | undefined;

      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        const token = localStorage.getItem("token");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
          credentials: "include",
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          coverImageUrl = uploadData.url;
        } else if (uploadRes.status === 401) {
          toast({ title: "Sessão expirada", description: "Por favor, faça login novamente", variant: "destructive" });
          setIsUploading(false);
          return;
        } else {
          toast({ title: "Aviso", description: "Não foi possível enviar a imagem de capa. A revista será criada sem imagem." });
        }
      }

      await createSeasonMutation.mutateAsync({
        title: newSeasonTitle.trim(),
        coverImageUrl,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadPdf = async () => {
    if (!selectedSeason || !pdfFile) {
      toast({ title: "Selecione um arquivo PDF", variant: "destructive" });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast({ title: "Sessao expirada", description: "Por favor, faca login novamente", variant: "destructive" });
      return;
    }

    setIsProcessingPdf(true);
    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const response = await fetch(`/api/study/admin/seasons/${selectedSeason.id}/import-pdf-exact`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        credentials: "include",
      });

      if (response.status === 401) {
        toast({ title: "Sessao expirada", description: "Por favor, faca login novamente", variant: "destructive" });
        return;
      }

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "PDF processado com sucesso!",
          description: `Lição "${data.lessonTitle}" criada com ${data.questionsCount} perguntas.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
        resetUploadModal();
      } else {
        toast({ title: "Erro ao processar PDF", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro ao processar PDF", variant: "destructive" });
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const openUploadModal = (season: Season) => {
    setSelectedSeason(season);
    setShowUploadModal(true);
  };

  return (
    <DeoGloryAdminLayout title="Gerar Estudos" subtitle="Crie revistas e gere lições a partir de PDFs usando inteligência artificial">
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">
              Crie uma revista, faça upload do PDF da lição e a IA irá gerar o conteúdo automaticamente.
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-violet-600 hover:bg-violet-700" data-testid="button-criar-revista">
            <Plus className="h-4 w-4 mr-2" />
            Nova Revista
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        ) : seasons.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-violet-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhuma revista criada
              </h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                Crie sua primeira revista e faça upload de um PDF para gerar lições automaticamente com IA.
              </p>
              <Button onClick={() => setShowCreateModal(true)} className="bg-violet-600 hover:bg-violet-700" data-testid="button-criar-primeira-revista">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Revista
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {seasons.map((season) => (
              <Card key={season.id} className={`overflow-visible ${highlightedSeasonId === season.id ? "ring-2 ring-violet-500" : ""}`} data-testid={`card-revista-${season.id}`}>
                <div className="relative bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden" style={{ aspectRatio: '3/4' }}>
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
                  {season.status === "processing" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <span className="text-sm">Processando...</span>
                      </div>
                    </div>
                  )}
                </div>
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <Badge size="sm" className={`${statusColors[season.status]?.bg} ${statusColors[season.status]?.text} border-0 text-xs`}>
                      {statusColors[season.status]?.label || season.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {season.totalLessons} {season.totalLessons === 1 ? "lição" : "lições"}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1 text-sm">
                    {season.aiExtractedTitle || season.title}
                  </h3>
                  {season.aiExtractedTitle && season.aiExtractedTitle !== season.title && (
                    <p className="text-[10px] text-muted-foreground mb-1">
                      Revista: {season.title}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 bg-violet-600 hover:bg-violet-700 text-xs"
                      onClick={() => navigate(`/admin/study/revista/${season.id}`)}
                      disabled={season.status === "processing"}
                      data-testid={`button-gerenciar-${season.id}`}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Gerenciar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        if (confirm("Tem certeza que deseja remover esta revista?")) {
                          deleteSeasonMutation.mutate(season.id);
                        }
                      }}
                      data-testid={`button-delete-${season.id}`}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="border-dashed flex flex-col items-center justify-center min-h-[180px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" onClick={() => setShowCreateModal(true)}>
              <CardContent className="text-center p-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2">
                  <Plus className="h-5 w-5 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1 text-sm">Nova Revista</h3>
                <p className="text-xs text-muted-foreground">
                  Criar nova revista
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Revista</DialogTitle>
            <DialogDescription>
              Dê um nome para a revista e opcionalmente adicione uma imagem de capa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Nome da Revista</Label>
              <Input
                id="title"
                placeholder="Ex: Revista Trimestral - 1o Trim 2025"
                value={newSeasonTitle}
                onChange={(e) => setNewSeasonTitle(e.target.value)}
                data-testid="input-nome-revista"
              />
            </div>
            <div className="space-y-2">
              <Label>Imagem de Capa (opcional)</Label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverChange}
              />
              {coverPreview ? (
                <div className="relative flex justify-center">
                  <div className="relative" style={{ aspectRatio: '2/3', maxHeight: '280px' }}>
                    <img
                      src={coverPreview}
                      alt="Preview da capa"
                      className="h-full w-full object-cover rounded-md"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                      onClick={() => {
                        setCoverPreview(null);
                        setCoverFile(null);
                      }}
                    >
                      <X className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  style={{ aspectRatio: '2/3', maxHeight: '180px' }}
                  onClick={() => coverInputRef.current?.click()}
                  data-testid="button-upload-capa"
                >
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique para adicionar capa</span>
                    <span className="text-xs text-muted-foreground">Formato revista (2:3)</span>
                  </div>
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCreateModal} disabled={isUploading}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSeason}
              disabled={isUploading || !newSeasonTitle.trim()}
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="button-confirmar-criar"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Revista"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUploadModal} onOpenChange={(open) => !isProcessingPdf && setShowUploadModal(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de PDF</DialogTitle>
            <DialogDescription>
              Faça upload do PDF da lição para a revista "{selectedSeason?.title}". A IA irá extrair o conteúdo e criar a lição automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handlePdfChange}
            />
            {pdfFile ? (
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex-shrink-0">
                  <FileText className="h-6 w-6 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                    {pdfFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!isProcessingPdf && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
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
              disabled={isProcessingPdf || !pdfFile}
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

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={tempImageSrc || ""}
        onCropComplete={handleCropComplete}
        aspectRatio={MAGAZINE_COVER_ASPECT_RATIO}
      />
    </DeoGloryAdminLayout>
  );
}
