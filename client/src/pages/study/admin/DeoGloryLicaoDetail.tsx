import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { DeoGloryAdminLayout } from "@/components/deoglory/DeoGloryAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  Loader2,
  BookOpen,
  Heart,
  HelpCircle,
  Pencil,
  Trash2,
  GripVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { StudyLesson, StudyUnit } from "@shared/schema";

const STAGE_CONFIG = {
  estude: { label: "Estude", icon: BookOpen, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  medite: { label: "Medite", icon: Heart, color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" },
  responda: { label: "Responda", icon: HelpCircle, color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
};

const UNIT_TYPES = [
  { value: "text", label: "Texto" },
  { value: "verse", label: "Versículo" },
  { value: "question", label: "Pergunta" },
  { value: "fill_blank", label: "Preencher Lacuna" },
  { value: "multiple_choice", label: "Múltipla Escolha" },
  { value: "reflection", label: "Reflexão" },
];

export default function DeoGloryLiçãoDetail() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const lessonId = parseInt(params.id || "0", 10);
  
  const [activeTab, setActiveTab] = useState("estude");
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<StudyUnit | null>(null);
  const [unitForm, setUnitForm] = useState({
    type: "text",
    content: "",
    stage: "estude",
  });

  const { data: lesson, isLoading: loadingLesson } = useQuery<StudyLesson>({
    queryKey: ["/api/study/admin/lessons", lessonId],
    queryFn: async () => {
      const res = await fetch(`/api/study/admin/lessons/${lessonId}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch lesson");
      return res.json();
    },
    enabled: lessonId > 0,
  });

  const { data: units = [], isLoading: loadingUnits } = useQuery<StudyUnit[]>({
    queryKey: ["/api/study/admin/lessons", lessonId, "units"],
    queryFn: async () => {
      const res = await fetch(`/api/study/admin/lessons/${lessonId}/units`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch units");
      return res.json();
    },
    enabled: lessonId > 0,
  });

  const createUnitMutation = useMutation({
    mutationFn: async (data: { lessonId: number; type: string; content: string; stage: string }) => {
      const stageUnits = units.filter(u => u.stage === data.stage);
      const nextOrderIndex = stageUnits.length > 0 
        ? Math.max(...stageUnits.map(u => u.orderIndex)) + 1 
        : 0;
      return apiRequest("POST", "/api/study/admin/units", { ...data, orderIndex: nextOrderIndex });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/lessons", lessonId, "units"] });
      toast({ title: "Conteúdo adicionado!" });
      resetUnitModal();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao adicionar conteúdo", description: error.message, variant: "destructive" });
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: async ({ unitId, data }: { unitId: number; data: { type?: string; content?: string; stage?: string } }) => {
      return apiRequest("PUT", `/api/study/admin/units/${unitId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/lessons", lessonId, "units"] });
      toast({ title: "Conteúdo atualizado!" });
      resetUnitModal();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar conteúdo", description: error.message, variant: "destructive" });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (unitId: number) => {
      return apiRequest("DELETE", `/api/study/admin/units/${unitId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/admin/lessons", lessonId, "units"] });
      toast({ title: "Conteúdo removido!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover conteúdo", description: error.message, variant: "destructive" });
    },
  });

  const resetUnitModal = () => {
    setShowUnitModal(false);
    setEditingUnit(null);
    setUnitForm({ type: "text", content: "", stage: activeTab });
  };

  const openAddModal = (stage: string) => {
    setUnitForm({ type: "text", content: "", stage });
    setEditingUnit(null);
    setShowUnitModal(true);
  };

  const openEditModal = (unit: StudyUnit) => {
    setEditingUnit(unit);
    setUnitForm({
      type: unit.type,
      content: typeof unit.content === "string" ? unit.content : JSON.stringify(unit.content),
      stage: unit.stage || "estude",
    });
    setShowUnitModal(true);
  };

  const handleSaveUnit = () => {
    if (!unitForm.content.trim()) {
      toast({ title: "Conteúdo é obrigatório", variant: "destructive" });
      return;
    }

    if (editingUnit) {
      updateUnitMutation.mutate({
        unitId: editingUnit.id,
        data: { type: unitForm.type, content: unitForm.content },
      });
    } else {
      createUnitMutation.mutate({
        lessonId,
        type: unitForm.type,
        content: unitForm.content,
        stage: unitForm.stage,
      });
    }
  };

  const getUnitsForStage = (stage: string) => {
    return units
      .filter((u) => u.stage === stage)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  };

  const parseContent = (content: string | object): string => {
    const extractFromObj = (obj: Record<string, unknown>): string => {
      // Handle title/body format
      if (obj.title && obj.body) {
        return `${obj.title}: ${String(obj.body).substring(0, 200)}${String(obj.body).length > 200 ? '...' : ''}`;
      }
      if (obj.body) return String(obj.body);
      if (obj.text) return String(obj.text);
      if (obj.question) return String(obj.question);
      if (obj.statement) return String(obj.statement);
      if (obj.verse) return `${obj.verse} - ${obj.reference || ""}`;
      // Handle nested content structure (for questions)
      if (obj.content && typeof obj.content === 'object') {
        const nested = obj.content as Record<string, unknown>;
        if (nested.question) return String(nested.question);
        if (nested.statement) return String(nested.statement);
        if (nested.text) return String(nested.text);
      }
      return JSON.stringify(obj);
    };

    if (typeof content === "string") {
      try {
        const parsed = JSON.parse(content);
        return extractFromObj(parsed as Record<string, unknown>);
      } catch {
        return content;
      }
    }
    return extractFromObj(content as Record<string, unknown>);
  };

  if (loadingLesson) {
    return (
      <DeoGloryAdminLayout title="Carregando..." subtitle="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </DeoGloryAdminLayout>
    );
  }

  if (!lesson) {
    return (
      <DeoGloryAdminLayout title="Lição não encontrada" subtitle="">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">A lição solicitada não foi encontrada.</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </DeoGloryAdminLayout>
    );
  }

  return (
    <DeoGloryAdminLayout 
      title={`Lição ${lesson.lessonNumber || lesson.orderIndex + 1}: ${lesson.title}`}
      subtitle="Gerencie o conteúdo da lição"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            data-testid="button-voltar"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            {Object.entries(STAGE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const count = getUnitsForStage(key).length;
              return (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className="gap-2"
                  data-testid={`tab-${key}`}
                >
                  <Icon className="h-4 w-4" />
                  {config.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(STAGE_CONFIG).map(([stageKey, stageConfig]) => (
            <TabsContent key={stageKey} value={stageKey}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <stageConfig.icon className="h-5 w-5" />
                    {stageConfig.label}
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => openAddModal(stageKey)}
                    className="bg-violet-600 hover:bg-violet-700"
                    data-testid={`button-add-${stageKey}`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingUnits ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                    </div>
                  ) : getUnitsForStage(stageKey).length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                        <stageConfig.icon className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                        Nenhum conteúdo em {stageConfig.label}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Adicione textos, versículos ou perguntas.
                      </p>
                      <Button
                        onClick={() => openAddModal(stageKey)}
                        className="bg-violet-600 hover:bg-violet-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Conteúdo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getUnitsForStage(stageKey).map((unit, index) => (
                        <div
                          key={unit.id}
                          className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg group"
                          data-testid={`unit-row-${unit.id}`}
                        >
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                            <span className="text-sm font-medium w-6">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {UNIT_TYPES.find(t => t.value === unit.type)?.label || unit.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap line-clamp-3">
                              {parseContent(unit.content)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(unit)}
                              data-testid={`button-edit-unit-${unit.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja remover este conteúdo?")) {
                                  deleteUnitMutation.mutate(unit.id);
                                }
                              }}
                              disabled={deleteUnitMutation.isPending}
                              data-testid={`button-delete-unit-${unit.id}`}
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
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={showUnitModal} onOpenChange={(open) => !createUnitMutation.isPending && !updateUnitMutation.isPending && setShowUnitModal(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Editar Conteúdo" : "Adicionar Conteúdo"}</DialogTitle>
            <DialogDescription>
              {editingUnit 
                ? "Edite o conteúdo desta seção."
                : `Adicione conteúdo à seção ${STAGE_CONFIG[unitForm.stage as keyof typeof STAGE_CONFIG]?.label || unitForm.stage}.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Conteúdo</Label>
              <Select 
                value={unitForm.type} 
                onValueChange={(v) => setUnitForm({ ...unitForm, type: v })}
                disabled={createUnitMutation.isPending || updateUnitMutation.isPending}
              >
                <SelectTrigger data-testid="select-unit-type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea
                value={unitForm.content}
                onChange={(e) => setUnitForm({ ...unitForm, content: e.target.value })}
                placeholder={
                  unitForm.type === "verse" 
                    ? 'Ex: {"verse": "Texto do versículo", "reference": "João 3:16"}'
                    : unitForm.type === "question" || unitForm.type === "multiple_choice"
                    ? 'Ex: {"question": "Qual a pergunta?", "options": ["A", "B", "C"], "correctAnswer": "A"}'
                    : "Digite o conteúdo aqui..."
                }
                rows={8}
                className="font-mono text-sm"
                disabled={createUnitMutation.isPending || updateUnitMutation.isPending}
                data-testid="input-unit-content"
              />
              <p className="text-xs text-muted-foreground">
                Para tipos complexos (versículo, pergunta), use formato JSON.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={resetUnitModal} 
              disabled={createUnitMutation.isPending || updateUnitMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveUnit}
              disabled={createUnitMutation.isPending || updateUnitMutation.isPending || !unitForm.content.trim()}
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="button-save-unit"
            >
              {createUnitMutation.isPending || updateUnitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingUnit ? "Salvar Alterações" : "Adicionar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DeoGloryAdminLayout>
  );
}
