import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  ArrowLeft,
  Upload,
  BookOpen,
  FileText,
  Plus,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Loader2,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Play,
  Settings,
  BarChart3,
  Users,
  Zap,
  Target,
  RefreshCw,
  Brain,
  ListChecks,
  ChevronRight,
  FileUp,
  X,
  Lock,
  Unlock,
  CalendarClock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

interface StudyWeek {
  id: number;
  weekNumber: number;
  year: number;
  title: string;
  description: string | null;
  pdfUrl: string | null;
  status: string;
  publishedAt: string | null;
  createdBy: number | null;
  aiMetadata: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StudyLesson {
  id: number;
  studyWeekId: number;
  orderIndex: number;
  title: string;
  type: string;
  description: string | null;
  xpReward: number;
  estimatedMinutes: number;
  icon: string | null;
  isBonus: boolean;
  isLocked: boolean;
  unlockDate: string | null;
  unitsCount?: number;
}

interface StudyUnit {
  id: number;
  lessonId: number;
  orderIndex: number;
  type: string;
  content: any;
  xpValue: number;
  createdAt: string;
}

interface StudyStats {
  totalUsers: number;
  activeUsers: number;
  totalLessons: number;
  completedLessons: number;
  totalXpEarned: number;
  averageStreak: number;
}

interface AIStatus {
  configured: boolean;
  message: string;
}

interface Season {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  coverImageUrl: string | null;
  pdfUrl: string | null;
  aiExtractedTitle: string | null;
  status: string;
  totalLessons: number;
  publishedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdBy: number | null;
  aiMetadata: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SeasonLesson {
  id: number;
  seasonId: number;
  title: string;
  description: string | null;
  type: string;
  orderIndex: number;
  xpReward: number;
  icon: string | null;
  isLocked: boolean;
  unlockDate: string | null;
  unitsCount?: number;
}

interface FinalChallenge {
  id: number;
  seasonId: number;
  title: string;
  description: string | null;
  questions: string;
  timeLimitSeconds: number;
  questionCount: number;
  xpReward: number;
  perfectXpBonus: number;
  isActive: boolean;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  published: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  archived: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  processing: "Processando",
  published: "Publicado",
  archived: "Arquivado",
};

const lessonTypeLabels: Record<string, string> = {
  intro: "Introdução",
  study: "Estudo",
  meditation: "Meditação",
  challenge: "Desafio",
  review: "Revisão",
};

const unitTypeLabels: Record<string, string> = {
  text: "Texto",
  multiple_choice: "Múltipla Escolha",
  true_false: "Verdadeiro/Falso",
  fill_blank: "Preencher Lacuna",
  meditation: "Meditação",
  reflection: "Reflexão",
  verse: "Versículo",
};

export default function StudyAdminPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isCreateWeekOpen, setIsCreateWeekOpen] = useState(false);
  const [isEditLessonOpen, setIsEditLessonOpen] = useState(false);
  const [isEditUnitOpen, setIsEditUnitOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; name: string } | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<StudyWeek | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<StudyLesson | null>(null);
  const [editingLesson, setEditingLesson] = useState<StudyLesson | null>(null);
  const [editingUnit, setEditingUnit] = useState<StudyUnit | null>(null);
  const [viewingUnits, setViewingUnits] = useState(false);
  
  const [newWeek, setNewWeek] = useState({
    title: "",
    description: "",
  });

  const [generateInput, setGenerateInput] = useState({
    text: "",
    geminiKey: "1" as "1" | "2" | "3" | "4" | "5",
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [generateMode, setGenerateMode] = useState<"text" | "pdf">("text");

  const [lessonForm, setLessonForm] = useState({
    title: "",
    type: "study",
    description: "",
    xpReward: 10,
    estimatedMinutes: 5,
    isBonus: false,
  });

  const [unitForm, setUnitForm] = useState({
    type: "multiple_choice",
    xpValue: 5,
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
    text: "",
    title: "",
  });

  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [isCreateSeasonOpen, setIsCreateSeasonOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [seasonPdfFile, setSeasonPdfFile] = useState<File | null>(null);
  const [generateFinalChallenge, setGenerateFinalChallenge] = useState(true);
  const [viewingSeasonLessons, setViewingSeasonLessons] = useState(false);
  const [selectedSeasonLesson, setSelectedSeasonLesson] = useState<SeasonLesson | null>(null);
  const [viewingSeasonUnits, setViewingSeasonUnits] = useState(false);
  
  const [newSeason, setNewSeason] = useState({
    title: "",
    subtitle: "",
    description: "",
  });

  const { data: weeks = [], isLoading: loadingWeeks } = useQuery<StudyWeek[]>({
    queryKey: ["/api/study/admin/weeks"],
    staleTime: 30000,
    enabled: !!user?.isAdmin,
  });

  const { data: stats } = useQuery<StudyStats>({
    queryKey: ["/api/study/admin/stats"],
    staleTime: 60000,
    enabled: !!user?.isAdmin,
  });

  const { data: lessons = [], isLoading: loadingLessons } = useQuery<StudyLesson[]>({
    queryKey: ["/api/study/admin/lessons", selectedWeek?.id],
    enabled: !!selectedWeek && !!user?.isAdmin,
    staleTime: 30000,
  });

  const { data: units = [], isLoading: loadingUnits } = useQuery<StudyUnit[]>({
    queryKey: ["/api/study/admin/lessons", selectedLesson?.id, "units"],
    enabled: !!selectedLesson && viewingUnits && !!user?.isAdmin,
    staleTime: 30000,
  });

  const { data: aiStatus } = useQuery<AIStatus>({
    queryKey: ["/api/ai/status"],
    staleTime: 60000,
    enabled: !!user?.isAdmin,
  });

  const { data: seasons = [], isLoading: loadingSeasons } = useQuery<Season[]>({
    queryKey: ["/api/study/admin/seasons"],
    staleTime: 30000,
    enabled: !!user?.isAdmin,
  });

  const { data: seasonLessons = [], isLoading: loadingSeasonLessons } = useQuery<SeasonLesson[]>({
    queryKey: ["/api/study/admin/seasons", selectedSeason?.id, "lessons"],
    enabled: !!selectedSeason && viewingSeasonLessons && !!user?.isAdmin,
    staleTime: 30000,
  });

  const { data: seasonUnits = [], isLoading: loadingSeasonUnits } = useQuery<StudyUnit[]>({
    queryKey: ["/api/study/admin/lessons", selectedSeasonLesson?.id, "units"],
    enabled: !!selectedSeasonLesson && viewingSeasonUnits && !!user?.isAdmin,
    staleTime: 30000,
  });

  const { data: finalChallenge } = useQuery<FinalChallenge>({
    queryKey: ["/api/study/seasons", selectedSeason?.id, "final-challenge"],
    enabled: !!selectedSeason && !!user?.isAdmin,
    staleTime: 30000,
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    setLocation("/");
    return null;
  }

  const createWeekMutation = useMutation({
    mutationFn: async (data: typeof newWeek) => {
      return apiRequest("POST", "/api/study/admin/weeks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/weeks"] });
      setIsCreateWeekOpen(false);
      setNewWeek({ title: "", description: "" });
      toast({ title: "Unidade criada", description: "A nova unidade de estudo foi criada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar unidade", description: error.message, variant: "destructive" });
    },
  });

  const publishWeekMutation = useMutation({
    mutationFn: async (weekId: number) => {
      return apiRequest("POST", `/api/study/admin/weeks/${weekId}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/weeks"] });
      toast({ title: "Unidade publicada", description: "O conteúdo está disponível para os usuários." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao publicar", description: error.message, variant: "destructive" });
    },
  });

  const deleteWeekMutation = useMutation({
    mutationFn: async (weekId: number) => {
      return apiRequest("DELETE", `/api/study/admin/weeks/${weekId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/weeks"] });
      setSelectedWeek(null);
      toast({ title: "Unidade excluída", description: "A unidade foi excluída com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const generateWithAIMutation = useMutation({
    mutationFn: async (data: typeof generateInput) => {
      return apiRequest("POST", "/api/ai/create-week-with-content", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/weeks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/stats"] });
      setIsGenerateDialogOpen(false);
      setGenerateInput({ text: "", geminiKey: "1" });
      toast({ title: "Conteúdo gerado com IA", description: "A unidade foi criada com lições e exercícios automaticamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao gerar conteúdo", description: error.message, variant: "destructive" });
    },
  });

  const generateFromPDFMutation = useMutation({
    mutationFn: async ({ file, geminiKey }: { file: File; geminiKey: string }) => {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("geminiKey", geminiKey);
      
      const token = localStorage.getItem("token");
      const response = await fetch("/api/ai/generate-week-from-pdf", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao processar PDF");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/weeks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/stats"] });
      setIsGenerateDialogOpen(false);
      setPdfFile(null);
      setGenerateMode("text");
      setGenerateInput({ text: "", geminiKey: "1" });
      toast({ title: "Conteúdo gerado com IA", description: "A unidade foi criada a partir do PDF com lições e exercícios." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao gerar conteúdo", description: error.message, variant: "destructive" });
    },
  });

  const seedDataMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/study/seed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/weeks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/stats"] });
      toast({ title: "Dados carregados", description: "Os dados de exemplo foram criados com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/study/admin/lessons", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/lessons", selectedWeek?.id] });
      setIsEditLessonOpen(false);
      setLessonForm({ title: "", type: "study", description: "", xpReward: 10, estimatedMinutes: 5, isBonus: false });
      toast({ title: "Lição criada", description: "A lição foi adicionada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar lição", description: error.message, variant: "destructive" });
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest("PUT", `/api/study/admin/lessons/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/lessons", selectedWeek?.id] });
      setIsEditLessonOpen(false);
      setEditingLesson(null);
      toast({ title: "Lição atualizada", description: "As alterações foram salvas." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      return apiRequest("DELETE", `/api/study/admin/lessons/${lessonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/lessons", selectedWeek?.id] });
      setSelectedLesson(null);
      setViewingUnits(false);
      toast({ title: "Lição excluída", description: "A lição foi removida com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/study/admin/units", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/lessons", selectedLesson?.id, "units"] });
      setIsEditUnitOpen(false);
      resetUnitForm();
      toast({ title: "Exercício criado", description: "O exercício foi adicionado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar exercício", description: error.message, variant: "destructive" });
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest("PUT", `/api/study/admin/units/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/lessons", selectedLesson?.id, "units"] });
      setIsEditUnitOpen(false);
      setEditingUnit(null);
      resetUnitForm();
      toast({ title: "Exercício atualizado", description: "As alterações foram salvas." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (unitId: number) => {
      return apiRequest("DELETE", `/api/study/admin/units/${unitId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/lessons", selectedLesson?.id, "units"] });
      toast({ title: "Exercício excluído", description: "O exercício foi removido com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const lockLessonMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      return apiRequest("POST", `/api/study/admin/lessons/${lessonId}/lock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/lessons", selectedWeek?.id] });
      toast({ title: "Lição bloqueada", description: "A lição foi bloqueada para os alunos." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao bloquear", description: error.message, variant: "destructive" });
    },
  });

  const unlockLessonMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      return apiRequest("POST", `/api/study/admin/lessons/${lessonId}/unlock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/lessons", selectedWeek?.id] });
      toast({ title: "Lição liberada", description: "A lição foi liberada para os alunos." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao liberar", description: error.message, variant: "destructive" });
    },
  });

  const unlockAllLessonsMutation = useMutation({
    mutationFn: async (weekId: number) => {
      return apiRequest("POST", `/api/study/admin/weeks/${weekId}/unlock-all`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/lessons", selectedWeek?.id] });
      toast({ title: "Todas as lições liberadas", description: "Todas as lições da unidade foram liberadas." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao liberar", description: error.message, variant: "destructive" });
    },
  });

  const lockAllLessonsMutation = useMutation({
    mutationFn: async (weekId: number) => {
      return apiRequest("POST", `/api/study/admin/weeks/${weekId}/lock-all`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/lessons", selectedWeek?.id] });
      toast({ title: "Todas as lições bloqueadas", description: "Todas as lições da unidade foram bloqueadas." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao bloquear", description: error.message, variant: "destructive" });
    },
  });

  const createSeasonMutation = useMutation({
    mutationFn: async (data: typeof newSeason) => {
      return apiRequest("POST", "/api/study/admin/seasons", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
      setIsCreateSeasonOpen(false);
      setNewSeason({ title: "", subtitle: "", description: "" });
      toast({ title: "Temporada criada", description: "A nova temporada foi criada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar temporada", description: error.message, variant: "destructive" });
    },
  });

  const updateSeasonMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; title?: string; subtitle?: string; description?: string }) => {
      return apiRequest("PUT", `/api/study/admin/seasons/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
      setIsCreateSeasonOpen(false);
      setEditingSeason(null);
      toast({ title: "Temporada atualizada", description: "As alterações foram salvas." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const deleteSeasonMutation = useMutation({
    mutationFn: async (seasonId: number) => {
      return apiRequest("DELETE", `/api/study/admin/seasons/${seasonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
      setSelectedSeason(null);
      setViewingSeasonLessons(false);
      toast({ title: "Temporada excluída", description: "A temporada foi removida com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const publishSeasonMutation = useMutation({
    mutationFn: async (seasonId: number) => {
      return apiRequest("POST", `/api/study/admin/seasons/${seasonId}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
      toast({ title: "Temporada publicada", description: "A temporada está disponível para os usuários." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao publicar", description: error.message, variant: "destructive" });
    },
  });

  const importSeasonPDFMutation = useMutation({
    mutationFn: async ({ seasonId, file, generateChallenge }: { seasonId: number; file: File; generateChallenge: boolean }) => {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("generateFinalChallenge", generateChallenge.toString());
      
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/study/admin/seasons/${seasonId}/import-pdf`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao importar PDF");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons", selectedSeason?.id, "lessons"] });
      setSeasonPdfFile(null);
      toast({ 
        title: "PDF importado com sucesso", 
        description: `${data.lessonsCreated} lições foram criadas a partir do PDF.` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao importar PDF", description: error.message, variant: "destructive" });
    },
  });

  const generateFinalChallengeMutation = useMutation({
    mutationFn: async (seasonId: number) => {
      return apiRequest("POST", `/api/study/admin/seasons/${seasonId}/generate-final-challenge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/seasons", selectedSeason?.id, "final-challenge"] });
      toast({ title: "Desafio final gerado", description: "O desafio final foi criado com IA." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao gerar desafio", description: error.message, variant: "destructive" });
    },
  });

  const toggleSeasonLessonLockMutation = useMutation({
    mutationFn: async ({ seasonId, lessonId }: { seasonId: number; lessonId: number }) => {
      return apiRequest("POST", `/api/study/admin/seasons/${seasonId}/lessons/${lessonId}/toggle-lock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/seasons", selectedSeason?.id, "lessons"] });
      toast({ title: "Status alterado", description: "O bloqueio da lição foi alterado." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao alterar bloqueio", description: error.message, variant: "destructive" });
    },
  });

  const resetUnitForm = () => {
    setUnitForm({
      type: "multiple_choice",
      xpValue: 5,
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
      text: "",
      title: "",
    });
  };

  const openEditLesson = (lesson: StudyLesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      type: lesson.type,
      description: lesson.description || "",
      xpReward: lesson.xpReward,
      estimatedMinutes: lesson.estimatedMinutes,
      isBonus: lesson.isBonus,
    });
    setIsEditLessonOpen(true);
  };

  const openEditUnit = (unit: StudyUnit) => {
    setEditingUnit(unit);
    const content = unit.content;
    setUnitForm({
      type: unit.type,
      xpValue: unit.xpValue,
      question: content.question || "",
      options: content.options || ["", "", "", ""],
      correctAnswer: content.correctAnswer ?? 0,
      explanation: content.explanation || "",
      text: content.text || "",
      title: content.title || "",
    });
    setIsEditUnitOpen(true);
  };

  const handleSaveLesson = () => {
    if (editingLesson) {
      updateLessonMutation.mutate({ id: editingLesson.id, ...lessonForm });
    } else if (selectedWeek) {
      createLessonMutation.mutate({ studyWeekId: selectedWeek.id, ...lessonForm });
    }
  };

  const handleSaveUnit = () => {
    let content: any = {};
    
    if (unitForm.type === "text") {
      content = { title: unitForm.title, text: unitForm.text };
    } else if (unitForm.type === "multiple_choice") {
      content = {
        question: unitForm.question,
        options: unitForm.options.filter(o => o.trim()),
        correctAnswer: unitForm.correctAnswer,
        explanation: unitForm.explanation,
      };
    } else if (unitForm.type === "true_false") {
      content = {
        question: unitForm.question,
        correctAnswer: unitForm.correctAnswer === 1,
        explanation: unitForm.explanation,
      };
    } else if (unitForm.type === "fill_blank") {
      content = {
        question: unitForm.question,
        correctAnswer: unitForm.text,
        explanation: unitForm.explanation,
      };
    } else if (unitForm.type === "reflection") {
      content = { title: unitForm.title, reflectionPrompt: unitForm.question };
    } else if (unitForm.type === "verse") {
      content = { verseReference: unitForm.title, verseText: unitForm.text, reflectionPrompt: unitForm.question };
    } else if (unitForm.type === "meditation") {
      content = { title: unitForm.title, meditationDuration: 60, meditationGuide: unitForm.text };
    }

    if (editingUnit) {
      updateUnitMutation.mutate({ id: editingUnit.id, type: unitForm.type, content, xpValue: unitForm.xpValue });
    } else if (selectedLesson) {
      createUnitMutation.mutate({ lessonId: selectedLesson.id, type: unitForm.type, content, xpValue: unitForm.xpValue });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "week") {
      deleteWeekMutation.mutate(deleteTarget.id);
    } else if (deleteTarget.type === "lesson") {
      deleteLessonMutation.mutate(deleteTarget.id);
    } else if (deleteTarget.type === "unit") {
      deleteUnitMutation.mutate(deleteTarget.id);
    }
    setIsDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const confirmDelete = (type: string, id: number, name: string) => {
    setDeleteTarget({ type, id, name });
    setIsDeleteDialogOpen(true);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-l-4 border-l-[#58CC02]">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Usuários Ativos</CardTitle>
              <Users className="h-4 w-4 text-[#58CC02]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
              <p className="text-xs text-muted-foreground">de {stats?.totalUsers || 0} registrados</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-l-4 border-l-[#FFC800]">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">XP Total</CardTitle>
              <Zap className="h-4 w-4 text-[#FFC800]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalXpEarned?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">pontos distribuídos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-l-4 border-l-[#1CB0F6]">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lições Completas</CardTitle>
              <Target className="h-4 w-4 text-[#1CB0F6]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completedLessons || 0}</div>
              <p className="text-xs text-muted-foreground">de {stats?.totalLessons || 0} disponíveis</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-l-4 border-l-[#FF9600]">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Média Ofensiva</CardTitle>
              <BarChart3 className="h-4 w-4 text-[#FF9600]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.averageStreak?.toFixed(1) || 0}</div>
              <p className="text-xs text-muted-foreground">dias consecutivos</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Ações Rápidas
            </CardTitle>
            <CardDescription>Gerencie o conteúdo do sistema de estudos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={() => setIsGenerateDialogOpen(true)} data-testid="button-generate-ai">
              <Sparkles className="w-4 h-4 mr-2 text-[#FFA500]" />
              Gerar Conteúdo com IA
              {aiStatus?.configured && <Badge className="ml-auto bg-green-100 text-green-800">IA Pronta</Badge>}
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => setIsCreateWeekOpen(true)} data-testid="button-create-week">
              <Plus className="w-4 h-4 mr-2" />
              Criar Nova Unidade Manualmente
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => seedDataMutation.mutate()} disabled={seedDataMutation.isPending} data-testid="button-seed-data">
              {seedDataMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Carregar Dados de Exemplo
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/study")} data-testid="button-view-study">
              <Eye className="w-4 h-4 mr-2" />
              Visualizar Sistema
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Unidades Recentes
            </CardTitle>
            <CardDescription>Últimas unidades de estudo criadas</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingWeeks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : weeks.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">Nenhuma unidade criada ainda</p>
                <Button className="mt-4" size="sm" onClick={() => setIsCreateWeekOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Unidade
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {weeks.slice(0, 3).map((week) => (
                  <div
                    key={week.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                    onClick={() => { setSelectedWeek(week); setActiveTab("weeks"); }}
                    data-testid={`week-item-${week.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{week.title}</p>
                        <p className="text-xs text-muted-foreground">{statusLabels[week.status]}</p>
                      </div>
                    </div>
                    <Badge className={statusColors[week.status]}>{statusLabels[week.status]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderWeeks = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold">Unidades de Estudo</h2>
          <p className="text-sm text-muted-foreground">Gerencie o conteúdo das unidades</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setIsGenerateDialogOpen(true)} data-testid="button-generate-week">
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar com IA
          </Button>
          <Button onClick={() => setIsCreateWeekOpen(true)} data-testid="button-new-week">
            <Plus className="w-4 h-4 mr-2" />
            Nova Unidade
          </Button>
        </div>
      </div>

      {loadingWeeks ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : weeks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma unidade criada</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              Comece gerando conteúdo com IA ou crie uma unidade manualmente.
            </p>
            <div className="flex gap-3 mt-6 flex-wrap">
              <Button onClick={() => setIsGenerateDialogOpen(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar com IA
              </Button>
              <Button variant="outline" onClick={() => setIsCreateWeekOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Manualmente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {weeks.map((week, index) => (
              <motion.div key={week.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ delay: index * 0.1 }}>
                <Card className="overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-[#FFA500] to-[#FFB733]" />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{week.title}</CardTitle>
                        <CardDescription>{week.description ? week.description.substring(0, 50) + (week.description.length > 50 ? '...' : '') : 'Unidade de estudo'}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`week-menu-${week.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedWeek(week); setViewingUnits(false); }}>
                            <Settings className="w-4 h-4 mr-2" />
                            Gerenciar Lições
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLocation(`/study`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          {week.status === "draft" && (
                            <DropdownMenuItem onClick={() => publishWeekMutation.mutate(week.id)} className="text-green-600">
                              <Play className="w-4 h-4 mr-2" />
                              Publicar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => confirmDelete("week", week.id, week.title)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{week.description || "Sem descrição"}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusColors[week.status]}>{statusLabels[week.status]}</Badge>
                      {week.aiMetadata && <Badge variant="outline"><Brain className="w-3 h-3 mr-1" />IA</Badge>}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/30 px-4 py-3">
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => { setSelectedWeek(week); setViewingUnits(false); }} data-testid={`manage-lessons-${week.id}`}>
                      <Settings className="w-4 h-4 mr-2" />
                      Gerenciar Lições
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  const renderLessons = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => { setSelectedWeek(null); setViewingUnits(false); setSelectedLesson(null); }} data-testid="button-back-weeks">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold truncate">{selectedWeek?.title}</h2>
          <p className="text-sm text-muted-foreground">{selectedWeek?.description ? selectedWeek.description.substring(0, 60) + (selectedWeek.description.length > 60 ? '...' : '') : 'Gerenciar lições desta unidade'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-bulk-actions">
                <Lock className="w-4 h-4 mr-2" />
                Controle de Acesso
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => selectedWeek && unlockAllLessonsMutation.mutate(selectedWeek.id)}
                disabled={unlockAllLessonsMutation.isPending}
              >
                <Unlock className="w-4 h-4 mr-2" />
                Liberar Todas as Lições
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => selectedWeek && lockAllLessonsMutation.mutate(selectedWeek.id)}
                disabled={lockAllLessonsMutation.isPending}
              >
                <Lock className="w-4 h-4 mr-2" />
                Bloquear Todas as Lições
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => { setEditingLesson(null); setLessonForm({ title: "", type: "study", description: "", xpReward: 10, estimatedMinutes: 5, isBonus: false }); setIsEditLessonOpen(true); }} data-testid="button-add-lesson">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Lição
          </Button>
        </div>
      </div>

      {loadingLessons ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : lessons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma lição ainda</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">Adicione lições manualmente ou use IA para gerar conteúdo.</p>
            <Button className="mt-6" onClick={() => { setEditingLesson(null); setIsEditLessonOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Lição
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson, index) => (
            <motion.div key={lesson.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className={`hover-elevate ${lesson.isLocked ? 'opacity-60' : ''}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 relative"
                    style={{
                      background: lesson.isLocked 
                        ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                        : lesson.isBonus 
                          ? 'linear-gradient(135deg, #FF9600 0%, #FFB020 100%)' 
                          : 'linear-gradient(135deg, #58CC02 0%, #7BD937 100%)',
                      boxShadow: lesson.isLocked 
                        ? '0 4px 0 0 #4B5563'
                        : lesson.isBonus 
                          ? '0 4px 0 0 #CC7700' 
                          : '0 4px 0 0 #46A302',
                    }}
                  >
                    {lesson.isLocked ? <Lock className="w-5 h-5" /> : lesson.orderIndex + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium truncate">{lesson.title}</h3>
                      {lesson.isBonus && <Badge className="bg-[#FF9600] text-white">Bonus</Badge>}
                      {lesson.isLocked && (
                        <Badge variant="secondary" className="bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          <Lock className="w-3 h-3 mr-1" />
                          Bloqueada
                        </Badge>
                      )}
                      {lesson.unlockDate && (
                        <Badge variant="outline" className="text-xs">
                          <CalendarClock className="w-3 h-3 mr-1" />
                          {new Date(lesson.unlockDate).toLocaleDateString('pt-BR')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.estimatedMinutes} min</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#FFC800]" />{lesson.xpReward} XP</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{lessonTypeLabels[lesson.type] || lesson.type}</Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => lesson.isLocked ? unlockLessonMutation.mutate(lesson.id) : lockLessonMutation.mutate(lesson.id)}
                      disabled={lockLessonMutation.isPending || unlockLessonMutation.isPending}
                      data-testid={`toggle-lock-${lesson.id}`}
                    >
                      {lesson.isLocked ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-gray-500" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedLesson(lesson); setViewingUnits(true); }} data-testid={`view-units-${lesson.id}`}>
                      <ListChecks className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditLesson(lesson)} data-testid={`edit-lesson-${lesson.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete("lesson", lesson.id, lesson.title)} data-testid={`delete-lesson-${lesson.id}`}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderUnits = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => { setViewingUnits(false); setSelectedLesson(null); }} data-testid="button-back-lessons">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{selectedWeek?.title}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-semibold truncate">{selectedLesson?.title}</h2>
        </div>
        <Button onClick={() => { setEditingUnit(null); resetUnitForm(); setIsEditUnitOpen(true); }} data-testid="button-add-unit">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Exercício
        </Button>
      </div>

      {loadingUnits ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : units.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListChecks className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum exercício ainda</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">Adicione exercícios para esta lição.</p>
            <Button className="mt-6" onClick={() => { setEditingUnit(null); resetUnitForm(); setIsEditUnitOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Exercício
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {units.map((unit, index) => (
            <motion.div key={unit.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="hover-elevate">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                    {unit.orderIndex + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{unitTypeLabels[unit.type] || unit.type}</Badge>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Zap className="w-3 h-3 text-[#FFC800]" />{unit.xpValue} XP
                      </span>
                    </div>
                    <p className="text-sm mt-1 truncate text-muted-foreground">
                      {unit.content.question || unit.content.title || unit.content.text?.substring(0, 50) || "Conteúdo"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditUnit(unit)} data-testid={`edit-unit-${unit.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete("unit", unit.id, `Exercício ${unit.orderIndex + 1}`)} data-testid={`delete-unit-${unit.id}`}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSeasons = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold">Temporadas</h2>
          <p className="text-sm text-muted-foreground">Gerencie as temporadas de estudo (como séries de estudos)</p>
        </div>
        <Button onClick={() => { setEditingSeason(null); setNewSeason({ title: "", subtitle: "", description: "" }); setIsCreateSeasonOpen(true); }} data-testid="button-new-season">
          <Plus className="w-4 h-4 mr-2" />
          Nova Temporada
        </Button>
      </div>

      {loadingSeasons ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : seasons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma temporada criada</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              Crie uma temporada e depois importe um PDF para gerar lições automaticamente com IA.
            </p>
            <Button className="mt-6" onClick={() => { setEditingSeason(null); setNewSeason({ title: "", subtitle: "", description: "" }); setIsCreateSeasonOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Temporada
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {seasons.map((season, index) => (
              <motion.div key={season.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ delay: index * 0.1 }}>
                <Card className="overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-[#58CC02] to-[#7BD937]" />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{season.title}</CardTitle>
                        {season.subtitle && <CardDescription className="truncate">{season.subtitle}</CardDescription>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`season-menu-${season.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { 
                            setEditingSeason(season); 
                            setNewSeason({ title: season.title, subtitle: season.subtitle || "", description: season.description || "" }); 
                            setIsCreateSeasonOpen(true); 
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedSeason(season); setViewingSeasonLessons(true); }}>
                            <Settings className="w-4 h-4 mr-2" />
                            Gerenciar Lições
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLocation(`/study/seasons/${season.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          {season.status === "draft" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => publishSeasonMutation.mutate(season.id)} className="text-green-600">
                                <Play className="w-4 h-4 mr-2" />
                                Publicar
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => confirmDelete("season", season.id, season.title)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{season.description || "Sem descrição"}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusColors[season.status]}>{statusLabels[season.status]}</Badge>
                      {season.totalLessons > 0 && (
                        <Badge variant="outline">
                          <BookOpen className="w-3 h-3 mr-1" />
                          {season.totalLessons} lições
                        </Badge>
                      )}
                      {season.aiMetadata && <Badge variant="outline"><Brain className="w-3 h-3 mr-1" />IA</Badge>}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/30 px-4 py-3 flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setSelectedSeason(season); setViewingSeasonLessons(true); }} data-testid={`manage-season-${season.id}`}>
                      <Settings className="w-4 h-4 mr-2" />
                      Gerenciar
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  const renderSeasonLessons = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => { setSelectedSeason(null); setViewingSeasonLessons(false); setSelectedSeasonLesson(null); setViewingSeasonUnits(false); }} data-testid="button-back-seasons">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold truncate">{selectedSeason?.title}</h2>
          <p className="text-sm text-muted-foreground">{selectedSeason?.subtitle || "Temporada de estudos"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            id="season-pdf-upload"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setSeasonPdfFile(file);
            }}
          />
          {seasonPdfFile ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="max-w-[150px]">
                <FileText className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{seasonPdfFile.name}</span>
              </Badge>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setSeasonPdfFile(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={generateFinalChallenge} 
                  onCheckedChange={setGenerateFinalChallenge}
                  data-testid="switch-generate-challenge"
                />
                <Label className="text-xs">Desafio Final</Label>
              </div>
              <Button 
                onClick={() => selectedSeason && importSeasonPDFMutation.mutate({ 
                  seasonId: selectedSeason.id, 
                  file: seasonPdfFile, 
                  generateChallenge: generateFinalChallenge 
                })}
                disabled={importSeasonPDFMutation.isPending}
                data-testid="button-import-pdf"
              >
                {importSeasonPDFMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Gerar Lições com IA</>
                )}
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => document.getElementById("season-pdf-upload")?.click()} data-testid="button-upload-pdf">
              <FileUp className="w-4 h-4 mr-2" />
              Importar PDF
            </Button>
          )}
        </div>
      </div>

      {importSeasonPDFMutation.isPending && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h3 className="font-semibold">Processando PDF com IA...</h3>
              <p className="text-sm text-muted-foreground">Extraindo conteúdo e gerando lições. Isso pode levar alguns minutos.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {finalChallenge && (
        <Card className="border-[#58CC02]/30 bg-[#58CC02]/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-[#58CC02]/20 flex items-center justify-center">
              <Target className="h-6 w-6 text-[#58CC02]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Desafio Final Configurado</h3>
              <p className="text-sm text-muted-foreground">{finalChallenge.questionCount} questões - {Math.floor(finalChallenge.timeLimitSeconds / 60)}:{String(finalChallenge.timeLimitSeconds % 60).padStart(2, '0')} minutos</p>
            </div>
            <Badge className="bg-[#58CC02] text-white">{finalChallenge.xpReward} XP</Badge>
          </CardContent>
        </Card>
      )}

      {!finalChallenge && seasonLessons.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Desafio Final</h3>
              <p className="text-sm text-muted-foreground">Gere um desafio final com IA baseado nas lições da temporada.</p>
            </div>
            <Button 
              onClick={() => selectedSeason && generateFinalChallengeMutation.mutate(selectedSeason.id)}
              disabled={generateFinalChallengeMutation.isPending}
              data-testid="button-generate-challenge"
            >
              {generateFinalChallengeMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Gerar Desafio
            </Button>
          </CardContent>
        </Card>
      )}

      {loadingSeasonLessons ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : seasonLessons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma lição ainda</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
              Importe um PDF para gerar lições automaticamente com IA.
            </p>
            <Button className="mt-6" variant="outline" onClick={() => document.getElementById("season-pdf-upload")?.click()}>
              <FileUp className="w-4 h-4 mr-2" />
              Importar PDF
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {seasonLessons.map((lesson, index) => (
            <motion.div key={lesson.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className={`hover-elevate ${lesson.isLocked ? 'opacity-60' : ''}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{
                      background: lesson.isLocked 
                        ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                        : 'linear-gradient(135deg, #58CC02 0%, #7BD937 100%)',
                      boxShadow: lesson.isLocked 
                        ? '0 4px 0 0 #4B5563'
                        : '0 4px 0 0 #46A302',
                    }}
                  >
                    {lesson.isLocked ? <Lock className="w-5 h-5" /> : lesson.orderIndex}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium truncate">{lesson.title}</h3>
                      {lesson.isLocked && (
                        <Badge variant="secondary" className="bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          <Lock className="w-3 h-3 mr-1" />
                          Bloqueada
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">{lesson.description || "Sem descrição"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">
                      <Zap className="w-3 h-3 mr-1 text-[#FFC800]" />
                      {lesson.xpReward} XP
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => selectedSeason && toggleSeasonLessonLockMutation.mutate({ seasonId: selectedSeason.id, lessonId: lesson.id })}
                      disabled={toggleSeasonLessonLockMutation.isPending}
                      data-testid={`toggle-season-lock-${lesson.id}`}
                    >
                      {lesson.isLocked ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-gray-500" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { setSelectedSeasonLesson(lesson); setViewingSeasonUnits(true); }} 
                      data-testid={`view-season-units-${lesson.id}`}
                    >
                      <ListChecks className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSeasonUnits = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => { setViewingSeasonUnits(false); setSelectedSeasonLesson(null); }} data-testid="button-back-season-lessons">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{selectedSeason?.title}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-semibold truncate">{selectedSeasonLesson?.title}</h2>
        </div>
      </div>

      {loadingSeasonUnits ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : seasonUnits.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListChecks className="h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum exercício ainda</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">Os exercícios são gerados automaticamente pelo PDF.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {seasonUnits.map((unit, index) => (
            <motion.div key={unit.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="hover-elevate">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                    {unit.orderIndex + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{unitTypeLabels[unit.type] || unit.type}</Badge>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Zap className="w-3 h-3 text-[#FFC800]" />{unit.xpValue} XP
                      </span>
                    </div>
                    <p className="text-sm mt-1 truncate text-muted-foreground">
                      {unit.content.question || unit.content.title || unit.content.text?.substring(0, 50) || "Conteúdo"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderUnitFormFields = () => {
    switch (unitForm.type) {
      case "text":
        return (
          <>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={unitForm.title} onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })} placeholder="Título do texto" data-testid="input-unit-title" />
            </div>
            <div className="space-y-2">
              <Label>Texto</Label>
              <Textarea value={unitForm.text} onChange={(e) => setUnitForm({ ...unitForm, text: e.target.value })} placeholder="Conteúdo do texto..." rows={4} data-testid="input-unit-text" />
            </div>
          </>
        );
      case "multiple_choice":
        return (
          <>
            <div className="space-y-2">
              <Label>Pergunta</Label>
              <Textarea value={unitForm.question} onChange={(e) => setUnitForm({ ...unitForm, question: e.target.value })} placeholder="Digite a pergunta..." data-testid="input-unit-question" />
            </div>
            <div className="space-y-2">
              <Label>Opções</Label>
              {unitForm.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={opt} onChange={(e) => { const opts = [...unitForm.options]; opts[i] = e.target.value; setUnitForm({ ...unitForm, options: opts }); }} placeholder={`Opção ${i + 1}`} data-testid={`input-unit-option-${i}`} />
                  <Button type="button" variant={unitForm.correctAnswer === i ? "default" : "outline"} size="sm" onClick={() => setUnitForm({ ...unitForm, correctAnswer: i })} data-testid={`button-correct-${i}`}>
                    {unitForm.correctAnswer === i ? <CheckCircle2 className="w-4 h-4" /> : "Correta"}
                  </Button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Explicação</Label>
              <Textarea value={unitForm.explanation} onChange={(e) => setUnitForm({ ...unitForm, explanation: e.target.value })} placeholder="Explicação da resposta..." data-testid="input-unit-explanation" />
            </div>
          </>
        );
      case "true_false":
        return (
          <>
            <div className="space-y-2">
              <Label>Afirmação</Label>
              <Textarea value={unitForm.question} onChange={(e) => setUnitForm({ ...unitForm, question: e.target.value })} placeholder="Digite a afirmação..." data-testid="input-unit-statement" />
            </div>
            <div className="space-y-2">
              <Label>Resposta Correta</Label>
              <Select value={unitForm.correctAnswer.toString()} onValueChange={(v) => setUnitForm({ ...unitForm, correctAnswer: parseInt(v) })}>
                <SelectTrigger data-testid="select-unit-correct">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Verdadeiro</SelectItem>
                  <SelectItem value="0">Falso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Explicação</Label>
              <Textarea value={unitForm.explanation} onChange={(e) => setUnitForm({ ...unitForm, explanation: e.target.value })} placeholder="Explicação..." data-testid="input-unit-explanation" />
            </div>
          </>
        );
      case "fill_blank":
        return (
          <>
            <div className="space-y-2">
              <Label>Frase (use ___ para a lacuna)</Label>
              <Textarea value={unitForm.question} onChange={(e) => setUnitForm({ ...unitForm, question: e.target.value })} placeholder="Complete: A fé é a certeza daquilo que ___" data-testid="input-unit-sentence" />
            </div>
            <div className="space-y-2">
              <Label>Resposta Correta</Label>
              <Input value={unitForm.text} onChange={(e) => setUnitForm({ ...unitForm, text: e.target.value })} placeholder="esperamos" data-testid="input-unit-answer" />
            </div>
            <div className="space-y-2">
              <Label>Explicação</Label>
              <Textarea value={unitForm.explanation} onChange={(e) => setUnitForm({ ...unitForm, explanation: e.target.value })} placeholder="Explicação..." data-testid="input-unit-explanation" />
            </div>
          </>
        );
      case "reflection":
        return (
          <>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={unitForm.title} onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })} placeholder="Título da reflexão" data-testid="input-unit-title" />
            </div>
            <div className="space-y-2">
              <Label>Pergunta de Reflexão</Label>
              <Textarea value={unitForm.question} onChange={(e) => setUnitForm({ ...unitForm, question: e.target.value })} placeholder="O que esse versículo significa para você?" data-testid="input-unit-prompt" />
            </div>
          </>
        );
      case "verse":
        return (
          <>
            <div className="space-y-2">
              <Label>Referência</Label>
              <Input value={unitForm.title} onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })} placeholder="João 3:16" data-testid="input-unit-reference" />
            </div>
            <div className="space-y-2">
              <Label>Texto do Versículo</Label>
              <Textarea value={unitForm.text} onChange={(e) => setUnitForm({ ...unitForm, text: e.target.value })} placeholder="Porque Deus amou o mundo..." data-testid="input-unit-verse-text" />
            </div>
            <div className="space-y-2">
              <Label>Pergunta de Reflexão (opcional)</Label>
              <Textarea value={unitForm.question} onChange={(e) => setUnitForm({ ...unitForm, question: e.target.value })} placeholder="Como aplicar isso na sua vida?" data-testid="input-unit-prompt" />
            </div>
          </>
        );
      case "meditation":
        return (
          <>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={unitForm.title} onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })} placeholder="Momento de Reflexão" data-testid="input-unit-title" />
            </div>
            <div className="space-y-2">
              <Label>Instruções da Meditação</Label>
              <Textarea value={unitForm.text} onChange={(e) => setUnitForm({ ...unitForm, text: e.target.value })} placeholder="Feche os olhos e respire profundamente..." rows={4} data-testid="input-unit-guide" />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-2 bg-gradient-to-r from-[#FFA500] to-[#FFB733]" />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")} data-testid="button-back-admin">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Sistema de Estudos</h1>
              <p className="text-sm text-muted-foreground">Painel Administrativo</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setLocation("/study")} data-testid="button-preview-study">
            <Eye className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
        </div>

        {viewingUnits && selectedLesson ? (
          renderUnits()
        ) : selectedWeek ? (
          renderLessons()
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="overview" data-testid="tab-overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="weeks" data-testid="tab-weeks">Unidades</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">{renderOverview()}</TabsContent>
            <TabsContent value="weeks">{renderWeeks()}</TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={isCreateWeekOpen} onOpenChange={setIsCreateWeekOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Unidade</DialogTitle>
            <DialogDescription>Crie uma nova unidade para adicionar lições e exercícios.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="week-title">Título</Label>
              <Input id="week-title" placeholder="Ex: Não Jogue Sua Vida Fora" value={newWeek.title} onChange={(e) => setNewWeek({ ...newWeek, title: e.target.value })} data-testid="input-week-title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="week-description">Descrição</Label>
              <Textarea id="week-description" placeholder="Descreva o tema desta unidade..." value={newWeek.description} onChange={(e) => setNewWeek({ ...newWeek, description: e.target.value })} data-testid="input-week-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateWeekOpen(false)}>Cancelar</Button>
            <Button onClick={() => createWeekMutation.mutate(newWeek)} disabled={!newWeek.title || createWeekMutation.isPending} data-testid="button-confirm-create-week">
              {createWeekMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar Unidade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#FFA500]" />
              Gerar Conteúdo com IA
            </DialogTitle>
            <DialogDescription>Envie um PDF ou cole o texto da revista/devocional para gerar lições automaticamente.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0 py-4">
            <div className="space-y-4 pr-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {aiStatus?.configured ? (
                    <><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-sm font-medium text-green-700">IA Configurada</span></>
                  ) : (
                    <><Loader2 className="w-4 h-4 text-orange-500" /><span className="text-sm font-medium text-orange-700">Configurando IA...</span></>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{aiStatus?.message}</p>
              </div>

              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <Button
                  variant={generateMode === "text" ? "default" : "ghost"}
                  className="flex-1"
                  onClick={() => setGenerateMode("text")}
                  data-testid="button-mode-text"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Colar Texto
                </Button>
                <Button
                  variant={generateMode === "pdf" ? "default" : "ghost"}
                  className="flex-1"
                  onClick={() => setGenerateMode("pdf")}
                  data-testid="button-mode-pdf"
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Enviar PDF
                </Button>
              </div>


              <div className="space-y-2">
                <Label>Chave Gemini</Label>
                <Select 
                  value={generateInput.geminiKey} 
                  onValueChange={(v) => setGenerateInput({ ...generateInput, geminiKey: v as "1" | "2" | "3" | "4" | "5" })}
                >
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
                <p className="text-xs text-muted-foreground">Selecione qual chave API do Gemini usar para gerar o conteúdo.</p>
              </div>

              {generateMode === "text" ? (
                <div className="space-y-2">
                  <Label>Texto Base</Label>
                  <Textarea
                    placeholder="Cole aqui o texto da revista, devocional ou conteúdo que deseja transformar em lições..."
                    value={generateInput.text}
                    onChange={(e) => setGenerateInput({ ...generateInput, text: e.target.value })}
                    rows={12}
                    data-testid="input-generate-text"
                  />
                  <p className="text-xs text-muted-foreground">Mínimo de 100 caracteres. Quanto mais conteúdo, mais lições serão geradas.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Arquivo PDF</Label>
                  {pdfFile ? (
                    <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
                      <FileText className="w-8 h-8 text-red-500" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{pdfFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => setPdfFile(null)} data-testid="button-remove-pdf">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileUp className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Clique para enviar</span> ou arraste o arquivo
                        </p>
                        <p className="text-xs text-muted-foreground">PDF (max. 10MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setPdfFile(file);
                        }}
                        data-testid="input-pdf-file"
                      />
                    </label>
                  )}
                </div>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">O que a IA irá fazer:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" />Extrair título e tema principal</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" />Criar 3-5 lições estruturadas</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" />Gerar exercícios variados (múltipla escolha, V/F, lacunas)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" />Adicionar versículos e reflexões</li>
                </ul>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (generateMode === "pdf" && pdfFile) {
                  generateFromPDFMutation.mutate({
                    file: pdfFile,
                    geminiKey: generateInput.geminiKey,
                  });
                } else {
                  generateWithAIMutation.mutate(generateInput);
                }
              }}
              disabled={
                !aiStatus?.configured || 
                (generateMode === "text" && generateInput.text.length < 100) || 
                (generateMode === "pdf" && !pdfFile) ||
                generateWithAIMutation.isPending || 
                generateFromPDFMutation.isPending
              }
              data-testid="button-generate-content"
            >
              {(generateWithAIMutation.isPending || generateFromPDFMutation.isPending) ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Gerar Conteúdo</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditLessonOpen} onOpenChange={setIsEditLessonOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Editar Lição" : "Nova Lição"}</DialogTitle>
            <DialogDescription>{editingLesson ? "Atualize os dados da lição." : "Adicione uma nova lição a esta unidade."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="Título da lição" data-testid="input-lesson-title" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={lessonForm.type} onValueChange={(v) => setLessonForm({ ...lessonForm, type: v })}>
                <SelectTrigger data-testid="select-lesson-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="intro">Introdução</SelectItem>
                  <SelectItem value="study">Estudo</SelectItem>
                  <SelectItem value="meditation">Meditação</SelectItem>
                  <SelectItem value="challenge">Desafio</SelectItem>
                  <SelectItem value="review">Revisão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} placeholder="Descrição breve..." data-testid="input-lesson-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>XP</Label>
                <Input type="number" min={1} value={lessonForm.xpReward} onChange={(e) => setLessonForm({ ...lessonForm, xpReward: parseInt(e.target.value) })} data-testid="input-lesson-xp" />
              </div>
              <div className="space-y-2">
                <Label>Minutos</Label>
                <Input type="number" min={1} value={lessonForm.estimatedMinutes} onChange={(e) => setLessonForm({ ...lessonForm, estimatedMinutes: parseInt(e.target.value) })} data-testid="input-lesson-minutes" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={lessonForm.isBonus} onCheckedChange={(v) => setLessonForm({ ...lessonForm, isBonus: v })} data-testid="switch-lesson-bonus" />
              <Label>Lição Bônus</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditLessonOpen(false); setEditingLesson(null); }}>Cancelar</Button>
            <Button onClick={handleSaveLesson} disabled={!lessonForm.title || createLessonMutation.isPending || updateLessonMutation.isPending} data-testid="button-save-lesson">
              {(createLessonMutation.isPending || updateLessonMutation.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingLesson ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditUnitOpen} onOpenChange={setIsEditUnitOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Editar Exercício" : "Novo Exercício"}</DialogTitle>
            <DialogDescription>{editingUnit ? "Atualize os dados do exercício." : "Adicione um novo exercício a esta lição."}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0 py-4">
            <div className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={unitForm.type} onValueChange={(v) => setUnitForm({ ...unitForm, type: v })}>
                    <SelectTrigger data-testid="select-unit-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                      <SelectItem value="true_false">Verdadeiro/Falso</SelectItem>
                      <SelectItem value="fill_blank">Preencher Lacuna</SelectItem>
                      <SelectItem value="reflection">Reflexão</SelectItem>
                      <SelectItem value="verse">Versículo</SelectItem>
                      <SelectItem value="meditation">Meditação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>XP</Label>
                  <Input type="number" min={1} value={unitForm.xpValue} onChange={(e) => setUnitForm({ ...unitForm, xpValue: parseInt(e.target.value) })} data-testid="input-unit-xp" />
                </div>
              </div>
              {renderUnitFormFields()}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditUnitOpen(false); setEditingUnit(null); resetUnitForm(); }}>Cancelar</Button>
            <Button onClick={handleSaveUnit} disabled={createUnitMutation.isPending || updateUnitMutation.isPending} data-testid="button-save-unit">
              {(createUnitMutation.isPending || updateUnitMutation.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingUnit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.name}"? Esta ação não pode ser desfeita.
              {deleteTarget?.type === "week" && " Todas as lições e exercícios desta unidade serão excluídos."}
              {deleteTarget?.type === "lesson" && " Todos os exercícios desta lição serão excluídos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
