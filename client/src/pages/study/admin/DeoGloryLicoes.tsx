import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DeoGloryAdminLayout } from "@/components/deoglory/DeoGloryAdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Sparkles,
  Upload,
  ArrowRight,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
  FileUp,
  Loader2,
  Lock,
  Unlock,
  CheckCircle,
  Key,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StudyWeek {
  id: number;
  title: string;
  description: string | null;
  weekNumber: number;
  year: number;
  status: string;
  createdAt: string;
}

interface CreateOptionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  buttonText: string;
  variant: "primary" | "secondary";
  onClick: () => void;
}

function CreateOptionCard({ title, description, icon: Icon, buttonText, variant, onClick }: CreateOptionCardProps) {
  const bgClasses = {
    primary: "bg-gradient-to-br from-violet-500 to-violet-700 text-white",
    secondary: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
  };

  const iconBgClasses = {
    primary: "bg-white/20",
    secondary: "bg-teal-500",
  };

  const buttonClasses = {
    primary: "bg-white text-violet-700",
    secondary: "bg-teal-500 text-white",
  };

  return (
    <Card className={`${bgClasses[variant]} border-0 shadow-sm overflow-visible`}>
      <CardContent className="p-6">
        <div className={`w-12 h-12 rounded-xl ${iconBgClasses[variant]} flex items-center justify-center mb-4`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h3 className={`text-lg font-bold mb-2 ${variant === "primary" ? "text-white" : "text-gray-900 dark:text-white"}`}>
          {title}
        </h3>
        <p className={`text-sm mb-6 ${variant === "primary" ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>
          {description}
        </p>
        <Button
          className={`w-full ${buttonClasses[variant]}`}
          onClick={onClick}
          data-testid={`button-${title.toLowerCase().replace(/\s/g, "-")}`}
        >
          {buttonText}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DeoGloryLicoes() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<StudyWeek | null>(null);
  
  const [geminiKey, setGeminiKey] = useState<string>("1");
  const [openaiKey, setOpenaiKey] = useState<string>("1");
  const [aiProvider, setAiProvider] = useState<"gemini" | "openai">("gemini");
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const { data: weeks, isLoading } = useQuery<StudyWeek[]>({
    queryKey: ["/api/study/admin/weeks"],
  });

  const generateFromTextMutation = useMutation({
    mutationFn: async (data: { text: string; weekNumber: number; year: number; geminiKey: string; aiProvider: string; openaiKey: string }) => {
      const response = await apiRequest("POST", "/api/ai/create-week-with-content", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Licoes geradas com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/weeks"] });
      setShowTextDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const generateFromPdfMutation = useMutation({
    mutationFn: async (data: { file: File; weekNumber: number; year: number; geminiKey: string; aiProvider: string; openaiKey: string }) => {
      const formData = new FormData();
      formData.append("pdf", data.file);
      formData.append("weekNumber", data.weekNumber.toString());
      formData.append("year", data.year.toString());
      formData.append("geminiKey", data.geminiKey);
      formData.append("aiProvider", data.aiProvider);
      formData.append("openaiKey", data.openaiKey);
      
      const response = await fetch("/api/ai/generate-week-from-pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao gerar licoes");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Licoes geradas do PDF com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/weeks"] });
      setShowPdfDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateWeekMutation = useMutation({
    mutationFn: async (data: { weekId: number; title: string; description: string }) => {
      const response = await apiRequest("PUT", `/api/study/admin/weeks/${data.weekId}`, {
        title: data.title,
        description: data.description,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Semana atualizada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/weeks"] });
      setShowEditDialog(false);
      setSelectedWeek(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteWeekMutation = useMutation({
    mutationFn: async (weekId: number) => {
      const response = await apiRequest("DELETE", `/api/study/admin/weeks/${weekId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Semana excluida com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/weeks"] });
      setShowDeleteDialog(false);
      setSelectedWeek(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const publishWeekMutation = useMutation({
    mutationFn: async (weekId: number) => {
      const response = await apiRequest("POST", `/api/study/admin/weeks/${weekId}/publish`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Semana publicada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/weeks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const lockAllMutation = useMutation({
    mutationFn: async (weekId: number) => {
      const response = await apiRequest("POST", `/api/study/admin/weeks/${weekId}/lock-all`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Licoes bloqueadas!" });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/weeks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const unlockAllMutation = useMutation({
    mutationFn: async (weekId: number) => {
      const response = await apiRequest("POST", `/api/study/admin/weeks/${weekId}/unlock-all`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Licoes liberadas!" });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/weeks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTextContent("");
    setSelectedFile(null);
    setWeekNumber(1);
    setYear(new Date().getFullYear());
  };

  const handleGenerateFromText = () => {
    if (textContent.trim().length < 100) {
      toast({ title: "Erro", description: "O texto deve ter pelo menos 100 caracteres.", variant: "destructive" });
      return;
    }
    generateFromTextMutation.mutate({ text: textContent, weekNumber, year, geminiKey, aiProvider, openaiKey });
  };

  const handleGenerateFromPdf = () => {
    if (!selectedFile) {
      toast({ title: "Erro", description: "Selecione um arquivo PDF.", variant: "destructive" });
      return;
    }
    generateFromPdfMutation.mutate({ file: selectedFile, weekNumber, year, geminiKey, aiProvider, openaiKey });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Erro", description: "Apenas arquivos PDF sao aceitos.", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Erro", description: "O arquivo deve ter no maximo 10MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const openEditDialog = (week: StudyWeek) => {
    setSelectedWeek(week);
    setEditTitle(week.title);
    setEditDescription(week.description || "");
    setShowEditDialog(true);
  };

  const openDeleteDialog = (week: StudyWeek) => {
    setSelectedWeek(week);
    setShowDeleteDialog(true);
  };

  const handleUpdateWeek = () => {
    if (!selectedWeek) return;
    updateWeekMutation.mutate({
      weekId: selectedWeek.id,
      title: editTitle,
      description: editDescription,
    });
  };

  const handleDeleteWeek = () => {
    if (!selectedWeek) return;
    deleteWeekMutation.mutate(selectedWeek.id);
  };

  const AIProviderSelector = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Provedor de IA
        </Label>
        <Select value={aiProvider} onValueChange={(v) => setAiProvider(v as "gemini" | "openai")}>
          <SelectTrigger data-testid="select-ai-provider">
            <SelectValue placeholder="Selecione o provedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini">Google Gemini</SelectItem>
            <SelectItem value="openai">OpenAI (GPT)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {aiProvider === "gemini" && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Chave Gemini
          </Label>
          <Select value={geminiKey} onValueChange={setGeminiKey}>
            <SelectTrigger data-testid="select-gemini-key">
              <SelectValue placeholder="Selecione a chave" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Chave 1</SelectItem>
              <SelectItem value="2">Chave 2</SelectItem>
              <SelectItem value="3">Chave 3</SelectItem>
              <SelectItem value="4">Chave 4</SelectItem>
              <SelectItem value="5">Chave 5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {aiProvider === "openai" && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Chave OpenAI
          </Label>
          <Select value={openaiKey} onValueChange={setOpenaiKey}>
            <SelectTrigger data-testid="select-openai-key">
              <SelectValue placeholder="Selecione a chave" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Chave 1</SelectItem>
              <SelectItem value="2">Chave 2</SelectItem>
              <SelectItem value="3">Chave 3</SelectItem>
              <SelectItem value="4">Chave 4</SelectItem>
              <SelectItem value="5">Chave 5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const UnitNumberSelector = () => (
    <div className="space-y-2">
      <Label>Número da Unidade</Label>
      <Input
        type="number"
        min={1}
        max={99}
        value={weekNumber}
        onChange={(e) => setWeekNumber(parseInt(e.target.value) || 1)}
        data-testid="input-unit-number"
      />
    </div>
  );

  return (
    <DeoGloryAdminLayout title="Gerenciar Lições" subtitle="Crie e gerencie lições de estudo bíblico">
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Criar Nova Lição
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CreateOptionCard
              title="Criar com IA"
              description="Escreva um texto e deixe a IA gerar as lições automaticamente"
              icon={Sparkles}
              buttonText="Começar"
              variant="primary"
              onClick={() => setShowTextDialog(true)}
            />
            <CreateOptionCard
              title="Upload de PDF"
              description="Envie um arquivo PDF e deixe a IA extrair e organizar o conteúdo"
              icon={Upload}
              buttonText="Começar"
              variant="secondary"
              onClick={() => setShowPdfDialog(true)}
            />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Lições Existentes
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : weeks && weeks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeks.map((week) => (
                <Card
                  key={week.id}
                  className="bg-white dark:bg-gray-800 border-0 shadow-sm overflow-visible"
                  data-testid={`card-week-${week.id}`}
                >
                  <div className={`h-1 ${week.status === "published" ? "bg-green-500" : "bg-gray-300"}`} />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Badge className={week.status === "published" ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-700 border-0"}>
                        {week.status === "published" ? "Publicado" : "Rascunho"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(week)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {week.status !== "published" && (
                            <DropdownMenuItem onClick={() => publishWeekMutation.mutate(week.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Publicar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => unlockAllMutation.mutate(week.id)}>
                            <Unlock className="h-4 w-4 mr-2" />
                            Liberar Licoes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => lockAllMutation.mutate(week.id)}>
                            <Lock className="h-4 w-4 mr-2" />
                            Bloquear Licoes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(week)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {week.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                      {week.description || "Sem descricao"}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Unidade {week.weekNumber}
                      </span>
                      <span className="flex items-center gap-1">
                        {new Date(week.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {week.status !== "published" ? (
                        <Button 
                          className="flex-1 bg-green-600 text-white" 
                          size="sm"
                          onClick={() => publishWeekMutation.mutate(week.id)}
                          disabled={publishWeekMutation.isPending}
                          data-testid={`button-publish-week-${week.id}`}
                        >
                          {publishWeekMutation.isPending ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          Publicar
                        </Button>
                      ) : (
                        <Button 
                          className="flex-1 bg-violet-600 text-white" 
                          size="sm"
                          onClick={() => openEditDialog(week)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="shrink-0"
                        onClick={() => openEditDialog(week)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Nenhuma lição encontrada
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Crie sua primeira lição usando IA ou enviando um PDF.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              Gerar Lições com IA
            </DialogTitle>
            <DialogDescription>
              Escreva ou cole o texto base e a IA gerará as lições automaticamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <AIProviderSelector />
            <UnitNumberSelector />
            <div className="space-y-2">
              <Label>Texto Base (mínimo 100 caracteres)</Label>
              <Textarea
                placeholder="Cole aqui o texto bíblico, devocional ou tema para gerar as lições..."
                className="min-h-40"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                data-testid="textarea-text-content"
              />
              <p className="text-xs text-gray-500">{textContent.length} caracteres</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTextDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-violet-600 text-white"
              onClick={handleGenerateFromText}
              disabled={generateFromTextMutation.isPending}
              data-testid="button-generate-text"
            >
              {generateFromTextMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Licoes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-teal-600" />
              Gerar Licoes a partir de PDF
            </DialogTitle>
            <DialogDescription>
              Envie um arquivo PDF e a IA extraira o conteudo para gerar as licoes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <AIProviderSelector />
            <UnitNumberSelector />
            <div className="space-y-2">
              <Label>Arquivo PDF</Label>
              <div 
                className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-teal-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-pdf-file"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileUp className="h-6 w-6 text-teal-500" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <Badge variant="outline" className="ml-2">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  </div>
                ) : (
                  <>
                    <FileUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Clique para selecionar ou arraste o arquivo
                    </p>
                    <p className="text-xs text-gray-400 mt-2">PDF (max. 10MB)</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-teal-500 text-white"
              onClick={handleGenerateFromPdf}
              disabled={generateFromPdfMutation.isPending || !selectedFile}
              data-testid="button-generate-pdf"
            >
              {generateFromPdfMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Licoes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Semana</DialogTitle>
            <DialogDescription>
              Atualize as informacoes da semana de estudo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titulo</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                data-testid="input-edit-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                data-testid="textarea-edit-description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-violet-600 text-white"
              onClick={handleUpdateWeek}
              disabled={updateWeekMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateWeekMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Semana</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{selectedWeek?.title}"? Esta ação não pode ser desfeita e todas as lições associadas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white"
              onClick={handleDeleteWeek}
              disabled={deleteWeekMutation.isPending}
            >
              {deleteWeekMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DeoGloryAdminLayout>
  );
}
