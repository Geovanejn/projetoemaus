import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  PlayCircle, 
  XCircle, 
  PlusCircle, 
  ChartBar, 
  LogOut, 
  Users,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Square,
  UserCheck,
  Download,
  ChevronDown,
  ChevronUp,
  RotateCw,
  BookOpen,
  Heart,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLocation } from "wouter";
import type { Election, Position, CandidateWithDetails, ElectionResults } from "@shared/schema";
import ExportResultsImage, { type ExportResultsImageHandle } from "@/components/ExportResultsImage";
import ImageCropDialog from "@/components/ImageCropDialog";
import logoUrl from "@assets/EMAÚS v3 sem fundo_1762038215610.png";
import { generateElectionAuditPDF, generateElectionAuditPDFBase64 } from "@/lib/pdfGenerator";

export default function AdminPage() {
  const { user, logout, token } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isNominationDialogOpen, setIsNominationDialogOpen] = useState(false);
  const [nominatedMemberIds, setNominatedMemberIds] = useState<Set<number>>(new Set());
  const [nominationPositionId, setNominationPositionId] = useState<number | null>(null);
  const [isCreateElectionOpen, setIsCreateElectionOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [newMember, setNewMember] = useState({
    fullName: "",
    email: "",
    photoUrl: "",
    birthdate: "",
    activeMember: false,
    isTreasurer: false,
    secretaria: "" as string,
  });
  const [editingMember, setEditingMember] = useState<{
    id: number;
    fullName: string;
    email: string;
    photoUrl?: string;
    birthdate?: string;
    activeMember?: boolean;
    isTreasurer?: boolean;
    secretaria?: string;
  } | null>(null);
  
  const exportImageRef = useRef<ExportResultsImageHandle>(null);
  const [exportAspectRatio, setExportAspectRatio] = useState<"9:16" | "4:5">("9:16");
  const [isForceCloseDialogOpen, setIsForceCloseDialogOpen] = useState(false);
  const [forceCloseReason, setForceCloseReason] = useState("");
  const [forceClosePositionId, setForceClosePositionId] = useState<number | null>(null);
  const [forceCloseAction, setForceCloseAction] = useState<"permanent" | "reopen">("permanent");
  const [showForceCloseOptions, setShowForceCloseOptions] = useState(false);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState("");
  const [cropContext, setCropContext] = useState<"add" | "edit">("add");
  const [isPresidentDialogOpen, setIsPresidentDialogOpen] = useState(false);
  const [selectedPresidentId, setSelectedPresidentId] = useState("");
  const [pendingPdfElectionId, setPendingPdfElectionId] = useState<number | null>(null);
  const [pdfAction, setPdfAction] = useState<"finalize" | "download">("download");
  const [isAttendanceListOpen, setIsAttendanceListOpen] = useState(false);
  const [isMembersListOpen, setIsMembersListOpen] = useState(false);

  const { data: activeElection, isLoading: loadingElection } = useQuery<Election | null>({
    queryKey: ["/api/elections/active"],
    staleTime: 30000,
  });

  const { data: positions = [], isLoading: loadingPositions } = useQuery<Position[]>({
    queryKey: ["/api/positions"],
    staleTime: 60000,
  });

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery<CandidateWithDetails[]>({
    queryKey: ["/api/candidates"],
    enabled: !!activeElection,
    staleTime: 10000,
  });

  const { data: members = [] } = useQuery<Array<{ id: number; fullName: string; email: string; isAdmin: boolean; photoUrl?: string; birthdate?: string; activeMember?: boolean; secretaria?: string }>>({
    queryKey: ["/api/members"],
    staleTime: 30000,
  });

  // Non-admin members for candidate selection (excluding winners from current election)
  const { data: availableMembers = [] } = useQuery<Array<{ id: number; fullName: string; email: string }>>({
    queryKey: ["/api/members/non-admins", { electionId: activeElection?.id }],
    queryFn: async () => {
      if (!activeElection) {
        throw new Error("No active election");
      }
      const url = `/api/members/non-admins?electionId=${activeElection.id}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
    enabled: isAddCandidateOpen && !!activeElection, // Only fetch when dialog is open AND election exists
    staleTime: 0, // Always fetch fresh data to ensure elected candidates are filtered
    refetchOnMount: true, // Refetch when component mounts to get latest winners
  });

  // Election results for scrutiny management
  const { data: results } = useQuery<ElectionResults | null>({
    queryKey: ["/api/results/latest"],
    enabled: !!activeElection,
    staleTime: 10000,
  });

  // Election positions for sequential voting
  const { data: electionPositions = [] } = useQuery<Array<{
    id: number;
    electionId: number;
    positionId: number;
    positionName: string;
    status: "pending" | "active" | "completed";
    currentScrutiny: number;
    orderIndex: number;
  }>>({
    queryKey: ["/api/elections", activeElection?.id, "positions"],
    enabled: !!activeElection,
    staleTime: 10000,
  });

  // Active position
  const { data: activePosition } = useQuery<{
    id: number;
    electionId: number;
    positionId: number;
    positionName: string;
    status: "active";
    currentScrutiny: number;
    orderIndex: number;
  } | null>({
    queryKey: ["/api/elections", activeElection?.id, "positions", "active"],
    enabled: !!activeElection,
    staleTime: 10000,
  });

  // Attendance for current election
  const { data: attendance = [] } = useQuery<Array<{
    id: number;
    electionId: number;
    memberId: number;
    memberName: string;
    memberEmail: string;
    isPresent: boolean;
  }>>({
    queryKey: ["/api/elections", activeElection?.id, "attendance"],
    enabled: !!activeElection,
    staleTime: 5000,
  });

  // Present count
  const { data: presentCountData } = useQuery<{ presentCount: number }>({
    queryKey: ["/api/elections", activeElection?.id, "attendance", "count"],
    enabled: !!activeElection,
    staleTime: 5000,
  });

  // Election history
  const { data: electionHistory = [] } = useQuery<Election[]>({
    queryKey: ["/api/elections/history"],
    staleTime: 30000,
  });

  const createElectionMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/elections", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Eleição criada com sucesso!",
        description: "A nova eleição está ativa agora",
      });
      setIsCreateElectionOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar eleição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const closeElectionMutation = useMutation({
    mutationFn: async (electionId: number) => {
      return await apiRequest("PATCH", `/api/elections/${electionId}/close`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections/active"] });
      toast({
        title: "Eleição encerrada",
        description: "A eleição foi encerrada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao encerrar eleição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const finalizeElectionMutation = useMutation({
    mutationFn: async (electionId: number) => {
      return await apiRequest("POST", `/api/elections/${electionId}/finalize`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Eleição finalizada!",
        description: "A eleição foi arquivada no histórico",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao finalizar eleição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addCandidateMutation = useMutation({
    mutationFn: async (candidate: { name: string; email: string; userId: number; positionId: number; electionId: number }) => {
      return await apiRequest("POST", "/api/candidates", candidate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Candidato adicionado!",
        description: "O candidato foi registrado na eleição",
      });
      setIsAddCandidateOpen(false);
      setSelectedMemberId("");
      setSelectedPositionId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar candidato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addBatchCandidatesMutation = useMutation({
    mutationFn: async (data: { candidates: Array<{ name: string; email: string; userId: number }>; positionId: number; electionId: number }) => {
      return await apiRequest("POST", "/api/candidates/batch", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results/latest"] });
      toast({
        title: "Candidatos adicionados!",
        description: "Todos os candidatos indicados foram registrados na eleição",
      });
      setIsNominationDialogOpen(false);
      setNominatedMemberIds(new Set());
      setNominationPositionId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar candidatos",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (member: { fullName: string; email: string; photoUrl?: string; birthdate?: string; activeMember: boolean; isTreasurer?: boolean; secretaria?: string }) => {
      return await apiRequest("POST", "/api/admin/members", member);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: "Membro cadastrado!",
        description: "O membro foi cadastrado com sucesso",
      });
      setIsAddMemberOpen(false);
      setNewMember({ fullName: "", email: "", photoUrl: "", birthdate: "", activeMember: false, isTreasurer: false, secretaria: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cadastrar membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return await apiRequest("DELETE", `/api/admin/members/${memberId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: "Membro removido!",
        description: "O membro foi removido com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ fullName: string; email: string; photoUrl?: string; birthdate?: string; activeMember?: boolean; isTreasurer?: boolean; secretaria?: string }> }) => {
      return await apiRequest("PATCH", `/api/admin/members/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: "Membro atualizado!",
        description: "Os dados do membro foram atualizados com sucesso",
      });
      setIsEditMemberOpen(false);
      setEditingMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const initializeAttendanceMutation = useMutation({
    mutationFn: async (electionId: number) => {
      return await apiRequest("POST", `/api/elections/${electionId}/attendance/initialize`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "attendance"] });
      toast({
        title: "Lista de presença inicializada!",
        description: "Todos os membros foram adicionados à lista",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao inicializar presença",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setAttendanceMutation = useMutation({
    mutationFn: async ({ electionId, memberId, isPresent }: { electionId: number; memberId: number; isPresent: boolean }) => {
      return await apiRequest("PATCH", `/api/elections/${electionId}/attendance/${memberId}`, { isPresent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "attendance", "count"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar presença",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const advanceScrutinyMutation = useMutation({
    mutationFn: async (electionId: number) => {
      return await apiRequest("POST", `/api/elections/${electionId}/positions/advance-scrutiny`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions", "active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members/non-admins"] });
      toast({
        title: "Escrutínio avançado!",
        description: "A votação passou para o próximo escrutínio",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao avançar escrutínio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openNextPositionMutation = useMutation({
    mutationFn: async (electionId: number) => {
      return await apiRequest("POST", `/api/elections/${electionId}/positions/open-next`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions", "active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members/non-admins"] });
      toast({
        title: "Próximo cargo aberto!",
        description: "Votação iniciada para o próximo cargo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao abrir próximo cargo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openPositionMutation = useMutation({
    mutationFn: async (data: { electionId: number; electionPositionId: number }) => {
      return await apiRequest("POST", `/api/elections/${data.electionId}/positions/${data.electionPositionId}/open`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions", "active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members/non-admins"] });
      toast({
        title: "Cargo aberto!",
        description: "Votação iniciada para o cargo selecionado",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao abrir cargo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resolveTieMutation = useMutation({
    mutationFn: async (data: { electionId: number; electionPositionId: number; winnerId: number }) => {
      return await apiRequest("POST", `/api/elections/${data.electionId}/positions/resolve-tie`, {
        electionPositionId: data.electionPositionId,
        winnerId: data.winnerId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions", "active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members/non-admins"] });
      toast({
        title: "Vencedor definido!",
        description: "O empate foi resolvido com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao definir vencedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  const forceClosePositionMutation = useMutation({
    mutationFn: async (data: { electionId: number; electionPositionId: number; reason: string; shouldReopen: boolean }) => {
      return await apiRequest("POST", `/api/elections/${data.electionId}/positions/${data.electionPositionId}/force-close`, {
        reason: data.reason,
        shouldReopen: data.shouldReopen,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "positions", "active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members/non-admins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", activeElection?.id, "attendance"] });
      toast({
        title: "Cargo fechado manualmente",
        description: "O cargo foi encerrado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao fechar cargo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const handleFinalizeElection = async () => {
    if (!activeElection) return;
    if (confirm("Tem certeza que deseja finalizar a eleição? A eleição será arquivada no histórico e não poderá mais ser modificada.")) {
      finalizeElectionMutation.mutate(activeElection.id);
    }
  };

  const handleDownloadAuditPDF = async (electionId: number) => {
    setPendingPdfElectionId(electionId);
    setPdfAction("download");
    setIsPresidentDialogOpen(true);
  };

  const handleGeneratePdfWithPresident = async () => {
    if (!token || !pendingPdfElectionId || !selectedPresidentId) return;
    
    const selectedPresident = members.find(m => m.id === parseInt(selectedPresidentId));
    if (!selectedPresident) return;
    
    try {
      const response = await fetch(`/api/elections/${pendingPdfElectionId}/audit`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Erro ao buscar dados de auditoria");
      }
      
      const auditData = await response.json();
      auditData.presidentName = selectedPresident.fullName;
      
      // Save verification hash to database
      if (auditData.verificationHash) {
        try {
          await apiRequest("POST", `/api/elections/${pendingPdfElectionId}/audit/save-hash`, {
            verificationHash: auditData.verificationHash,
            presidentName: selectedPresident.fullName,
          });
        } catch (hashError) {
          console.error("Error saving verification hash:", hashError);
          // Continue even if hash saving fails
        }
      }
      
      const pdfBase64 = await generateElectionAuditPDFBase64(auditData);
      
      const blob = await fetch(`data:application/pdf;base64,${pdfBase64}`).then(res => res.blob());
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Auditoria_${auditData.results?.electionName || 'Eleicao'}_${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      const emailResponse = await apiRequest("POST", `/api/elections/${pendingPdfElectionId}/audit/send-email`, {
        presidentEmail: selectedPresident.email,
        presidentName: selectedPresident.fullName,
        pdfBase64,
      });
      
      toast({
        title: "PDF enviado e baixado!",
        description: `O relatório foi baixado e enviado para ${selectedPresident.email}`,
      });
      
      setIsPresidentDialogOpen(false);
      setSelectedPresidentId("");
      setPendingPdfElectionId(null);
      
      if (pdfAction === "finalize" && activeElection) {
        setTimeout(() => {
          finalizeElectionMutation.mutate(activeElection.id);
        }, 500);
      }
    } catch (error) {
      toast({
        title: "Erro ao processar PDF",
        description: error instanceof Error ? error.message : "Não foi possível gerar ou enviar o relatório",
        variant: "destructive",
      });
    }
  };

  const handleCreateElection = () => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    createElectionMutation.mutate(`Eleição ${currentYear}/${nextYear}`);
  };

  const handleForceClosePosition = (action: "permanent" | "reopen") => {
    if (!activeElection || !forceClosePositionId || !forceCloseReason.trim()) {
      return;
    }
    
    forceClosePositionMutation.mutate({
      electionId: activeElection.id,
      electionPositionId: forceClosePositionId,
      reason: forceCloseReason.trim(),
      shouldReopen: action === "reopen",
    });
    
    setIsForceCloseDialogOpen(false);
    setShowForceCloseOptions(false);
    setForceCloseReason("");
    setForceClosePositionId(null);
    setForceCloseAction("permanent");
  };

  const handleCloseElection = () => {
    if (!activeElection) return;
    if (confirm("Tem certeza que deseja encerrar a eleição atual?")) {
      closeElectionMutation.mutate(activeElection.id);
    }
  };

  const handleAddCandidate = () => {
    if (!selectedMemberId || !selectedPositionId || !activeElection) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um membro e um cargo",
        variant: "destructive",
      });
      return;
    }

    const selectedMember = availableMembers.find((m: { id: number; fullName: string; email: string }) => m.id === parseInt(selectedMemberId));
    if (!selectedMember) return;

    addCandidateMutation.mutate({
      name: selectedMember.fullName,
      email: selectedMember.email,
      userId: selectedMember.id,
      positionId: parseInt(selectedPositionId),
      electionId: activeElection.id,
    });
  };

  const handleOpenNominationDialog = (positionId: number) => {
    setNominationPositionId(positionId);
    setNominatedMemberIds(new Set());
    setIsNominationDialogOpen(true);
  };

  const handleToggleNomination = (memberId: number) => {
    setNominatedMemberIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const handleConfirmNominations = () => {
    if (!activeElection || !nominationPositionId || nominatedMemberIds.size === 0) {
      toast({
        title: "Nenhum candidato indicado",
        description: "Indique pelo menos um membro para continuar",
        variant: "destructive",
      });
      return;
    }

    const presentMembers = attendance?.filter(a => a.isPresent) || [];
    const candidates = Array.from(nominatedMemberIds).map(memberId => {
      const member = presentMembers.find(a => a.memberId === memberId);
      if (!member) return null;
      return {
        name: member.memberName,
        email: member.memberEmail,
        userId: memberId,
      };
    }).filter(Boolean) as Array<{ name: string; email: string; userId: number }>;

    addBatchCandidatesMutation.mutate({
      candidates,
      positionId: nominationPositionId,
      electionId: activeElection.id,
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem",
        variant: "destructive",
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      const MAX_SIZE = 1200;
      let width = img.width;
      let height = img.height;

      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setImageToCrop(resizedDataUrl);
        setCropContext("add");
        setIsCropDialogOpen(true);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast({
        title: "Erro ao carregar imagem",
        description: "Não foi possível processar a imagem",
        variant: "destructive",
      });
    };

    img.src = objectUrl;
  };

  const handleEditPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem",
        variant: "destructive",
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      const MAX_SIZE = 1200;
      let width = img.width;
      let height = img.height;

      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setImageToCrop(resizedDataUrl);
        setCropContext("edit");
        setIsCropDialogOpen(true);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast({
        title: "Erro ao carregar imagem",
        description: "Não foi possível processar a imagem",
        variant: "destructive",
      });
    };

    img.src = objectUrl;
  };

  const handleCropComplete = (croppedImage: string) => {
    if (cropContext === "add") {
      setNewMember({ ...newMember, photoUrl: croppedImage });
    } else if (cropContext === "edit" && editingMember) {
      setEditingMember({ ...editingMember, photoUrl: croppedImage });
    }
  };

  const handleAddMember = () => {
    if (!newMember.fullName || !newMember.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    addMemberMutation.mutate({
      fullName: newMember.fullName,
      email: newMember.email,
      photoUrl: newMember.photoUrl || undefined,
      birthdate: newMember.birthdate || undefined,
      activeMember: newMember.activeMember,
      isTreasurer: newMember.isTreasurer,
      secretaria: newMember.secretaria || undefined,
    });
  };

  const handleDeleteMember = (memberId: number) => {
    if (confirm("Tem certeza que deseja remover este membro?")) {
      deleteMemberMutation.mutate(memberId);
    }
  };

  const handleEditMember = (member: { id: number; fullName: string; email: string; photoUrl?: string; birthdate?: string; activeMember?: boolean; isTreasurer?: boolean; secretaria?: string }) => {
    setEditingMember(member);
    setIsEditMemberOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingMember) return;

    if (!editingMember.fullName || !editingMember.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e email são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    updateMemberMutation.mutate({
      id: editingMember.id,
      data: {
        fullName: editingMember.fullName,
        email: editingMember.email,
        photoUrl: editingMember.photoUrl || undefined,
        birthdate: editingMember.birthdate || undefined,
        activeMember: editingMember.activeMember,
        isTreasurer: editingMember.isTreasurer,
        secretaria: editingMember.secretaria || undefined,
      },
    });
  };

  const isLoading = loadingElection || loadingPositions || loadingCandidates;

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <div className="h-2 bg-primary w-full" />
      
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Administração</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Bem-vindo, {user?.fullName}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="button-logout" className="self-end sm:self-auto">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="manage" data-testid="tab-manage">Gerenciar</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className={activeElection ? "border-green-500" : "border-border"}>
                <CardHeader>
                  <CardTitle className="text-xl">Status da Eleição</CardTitle>
                  <CardDescription>
                    {activeElection 
                      ? `Eleição ativa: ${activeElection.name}` 
                      : "Nenhuma eleição ativa"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeElection ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Eleição em andamento
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleCloseElection}
                        disabled={closeElectionMutation.isPending}
                        data-testid="button-close-election"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {closeElectionMutation.isPending ? "Encerrando..." : "Encerrar Eleição"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => setIsCreateElectionOpen(true)}
                      data-testid="button-create-election"
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Abrir Nova Eleição
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Ações Rápidas</CardTitle>
                  <CardDescription>Gerenciar eleição e resultados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      if (activePosition) {
                        handleOpenNominationDialog(activePosition.positionId);
                      } else {
                        toast({
                          title: "Nenhum cargo ativo",
                          description: "Abra um cargo para votação primeiro",
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={!activeElection || !activePosition}
                    data-testid="button-manage-nominations"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Gerenciar Indicações
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setIsAddMemberOpen(true)}
                    data-testid="button-add-member"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Cadastrar Membro
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setLocation("/results")}
                    data-testid="button-view-results"
                  >
                    <ChartBar className="w-4 h-4 mr-2" />
                    Ver Resultados
                  </Button>
                </CardContent>
              </Card>
            </div>

            {activeElection && (
              <Card className="border-purple-500">
                <CardHeader>
                  <CardTitle className="text-xl">Controle de Presença</CardTitle>
                  <CardDescription>
                    Marque os membros presentes antes de iniciar a votação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {attendance.length === 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Inicialize a lista de presença para marcar quem está presente na assembleia
                        </p>
                        <Button
                          className="w-full"
                          onClick={() => initializeAttendanceMutation.mutate(activeElection.id)}
                          disabled={initializeAttendanceMutation.isPending}
                          data-testid="button-initialize-attendance"
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          {initializeAttendanceMutation.isPending ? "Inicializando..." : "Inicializar Lista de Presença"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
                          <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                            Presentes: {presentCountData?.presentCount || 0} de {members.filter(m => !m.isAdmin && m.activeMember).length} membros
                          </p>
                          <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                            Selecione os presentes e clique em confirmar
                          </p>
                        </div>

                        <Collapsible open={isAttendanceListOpen} onOpenChange={setIsAttendanceListOpen}>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between"
                              data-testid="button-toggle-attendance-list"
                            >
                              <span>Lista de Presença</span>
                              {isAttendanceListOpen ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                              {attendance.map((att) => {
                                const member = members.find(m => m.id === att.memberId);
                                const isAdmin = member?.isAdmin || false;
                                
                                // Skip admin in attendance list
                                if (isAdmin) return null;
                                
                                return (
                                  <button
                                    key={att.memberId}
                                    onClick={() => setAttendanceMutation.mutate({
                                      electionId: activeElection.id,
                                      memberId: att.memberId,
                                      isPresent: !att.isPresent
                                    })}
                                    className="w-full flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors text-left"
                                    data-testid={`button-toggle-attendance-${att.memberId}`}
                                  >
                                    {att.isPresent ? (
                                      <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                                    ) : (
                                      <Square className="w-5 h-5 text-muted-foreground shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className={`font-medium truncate ${att.isPresent ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {att.memberName}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {att.memberEmail}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>

                        <Button
                          className="w-full"
                          onClick={() => {
                            setIsAttendanceListOpen(false);
                            toast({
                              title: "Presença confirmada!",
                              description: `${presentCountData?.presentCount || 0} membros marcados como presentes`,
                            });
                          }}
                          data-testid="button-confirm-attendance"
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Confirmar Presença
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeElection && results && (
              <Card className="border-blue-500">
                <CardHeader>
                  <CardTitle className="text-xl">Gerenciamento de Votação por Cargo</CardTitle>
                  <CardDescription>
                    Abra a votação para cada cargo individualmente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activePosition && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Cargo Ativo: {activePosition.positionName}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          Escrutínio atual: {activePosition.currentScrutiny}º Escrutínio
                        </p>
                      </div>
                    )}

                    {/* Show progress of all positions with individual open buttons */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Cargos da Eleição:</p>
                      {electionPositions.map((pos) => (
                        <div
                          key={pos.id}
                          className={`p-3 border rounded-lg ${
                            pos.status === "completed"
                              ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950"
                              : pos.status === "active"
                              ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950"
                              : "border-border bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <p className={`font-medium ${
                                pos.status === "active" ? "text-blue-900 dark:text-blue-100" :
                                pos.status === "completed" ? "text-green-900 dark:text-green-100" :
                                "text-muted-foreground"
                              }`}>
                                {pos.positionName}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {pos.status === "completed" ? "Concluído" :
                                 pos.status === "active" ? `Escrutínio atual: ${pos.currentScrutiny}º Escrutínio` :
                                 "Pendente"}
                              </p>
                            </div>
                            {pos.status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => openPositionMutation.mutate({ electionId: activeElection.id, electionPositionId: pos.id })}
                                disabled={openPositionMutation.isPending}
                                data-testid={`button-open-position-${pos.id}`}
                              >
                                <PlayCircle className="w-4 h-4 mr-1" />
                                {openPositionMutation.isPending ? "Abrindo..." : "Abrir"}
                              </Button>
                            )}
                            {pos.status === "active" && (
                              <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            )}
                            {pos.status === "completed" && (
                              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Show active position result */}
                    {activePosition && results.positions
                      .filter(p => p.positionId === activePosition.positionId)
                      .map(position => (
                        <div key={position.positionId}>
                          {position.needsNextScrutiny && activePosition.currentScrutiny < 3 && (
                            <div className="space-y-3">
                              <div className="p-3 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-lg">
                                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                  Resultado: Indefinido (nenhum candidato alcançou maioria absoluta)
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                  Necessário avançar para o próximo escrutínio
                                </p>
                              </div>
                              <Button
                                className="w-full"
                                onClick={() => advanceScrutinyMutation.mutate(activeElection.id)}
                                disabled={advanceScrutinyMutation.isPending}
                                data-testid="button-advance-scrutiny"
                              >
                                <ArrowRight className="w-4 h-4 mr-2" />
                                {advanceScrutinyMutation.isPending 
                                  ? "Abrindo..." 
                                  : activePosition.currentScrutiny === 1 
                                    ? "Abrir Segundo Escrutínio" 
                                    : "Abrir Terceiro Escrutínio"}
                              </Button>
                            </div>
                          )}

                          {/* Position completed - show button to open next */}
                          {!position.needsNextScrutiny && position.winnerId && (
                            <div className="space-y-3">
                              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                      Resultado: Concluído
                                    </p>
                                    {position.candidates.find(c => c.isElected) && (
                                      <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                                        Eleito: {position.candidates.find(c => c.isElected)?.candidateName} com {position.candidates.find(c => c.isElected)?.voteCount} votos
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {electionPositions.some(p => p.status === "pending") && (
                                <Button
                                  className="w-full"
                                  onClick={() => openNextPositionMutation.mutate(activeElection.id)}
                                  disabled={openNextPositionMutation.isPending}
                                  data-testid="button-open-next-position"
                                >
                                  <ArrowRight className="w-4 h-4 mr-2" />
                                  {openNextPositionMutation.isPending ? "Abrindo..." : "Abrir Próximo Cargo"}
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Show tied positions in 3rd scrutiny */}
                          {activePosition.currentScrutiny === 3 && position.needsNextScrutiny && (
                            <div className="space-y-3">
                              <div className="p-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 rounded-lg">
                                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                                  Resultado: Indefinido (empate no 3º escrutínio)
                                </p>
                                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                  Escolha o vencedor manualmente
                                </p>
                              </div>
                              <div className="space-y-2">
                                {(() => {
                                  // Get all candidates sorted by votes
                                  const sorted = position.candidates.sort((a, b) => b.voteCount - a.voteCount);
                                  if (sorted.length === 0) return [];
                                  
                                  // Get the top vote count
                                  const topVotes = sorted[0].voteCount;
                                  
                                  // Return ALL candidates with the top vote count (all tied candidates)
                                  return sorted.filter(c => c.voteCount === topVotes);
                                })().map(candidate => (
                                    <Button
                                      key={candidate.candidateId}
                                      variant="outline"
                                      className="w-full justify-between"
                                      onClick={() => resolveTieMutation.mutate({
                                        electionId: activeElection.id,
                                        electionPositionId: activePosition.id,
                                        winnerId: candidate.candidateId,
                                      })}
                                      disabled={resolveTieMutation.isPending}
                                      data-testid={`button-resolve-tie-${candidate.candidateId}`}
                                    >
                                      <span>{candidate.candidateName}</span>
                                      <span className="text-xs text-muted-foreground">{candidate.voteCount} votos</span>
                                    </Button>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Force close button for active positions (in case of abstentions) */}
                          {position.status === 'active' && !position.winnerId && position.totalVoters < (presentCountData?.presentCount || 0) && activePosition && (
                            <div className="mt-3">
                              <div className="p-3 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950 rounded-lg mb-2">
                                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                                  Votação em Andamento
                                </p>
                                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                  {position.totalVoters} de {presentCountData?.presentCount || 0} presentes votaram
                                </p>
                              </div>
                              
                              {!showForceCloseOptions ? (
                                <Button
                                  variant="outline"
                                  className="w-full border-orange-500 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950"
                                  onClick={() => {
                                    setForceClosePositionId(activePosition.id);
                                    setShowForceCloseOptions(true);
                                  }}
                                  disabled={forceClosePositionMutation.isPending}
                                  data-testid="button-force-close-position"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Fechar Cargo Manualmente
                                </Button>
                              ) : (
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    <Label htmlFor="force-close-reason-inline">Motivo do Fechamento Manual</Label>
                                    <Input
                                      id="force-close-reason-inline"
                                      placeholder="Ex: Membros saíram antes de votar"
                                      value={forceCloseReason}
                                      onChange={(e) => setForceCloseReason(e.target.value)}
                                      data-testid="input-force-close-reason"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Button
                                      onClick={() => handleForceClosePosition("permanent")}
                                      className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                                      disabled={!forceCloseReason.trim() || forceClosePositionMutation.isPending}
                                      data-testid="button-force-close-permanent"
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      {forceClosePositionMutation.isPending ? "Fechando..." : "Fechar Permanentemente"}
                                    </Button>
                                    <Button
                                      onClick={() => handleForceClosePosition("reopen")}
                                      className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                                      disabled={!forceCloseReason.trim() || forceClosePositionMutation.isPending}
                                      data-testid="button-force-close-reopen"
                                    >
                                      <RotateCw className="w-4 h-4 mr-2" />
                                      {forceClosePositionMutation.isPending ? "Fechando..." : "Fechar e Reabrir Cargo"}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setShowForceCloseOptions(false);
                                        setForceCloseReason("");
                                        setForceClosePositionId(null);
                                      }}
                                      className="w-full"
                                      data-testid="button-cancel-force-close"
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    <strong>Fechar Permanentemente:</strong> Encerra a votação deste cargo e passa para o próximo.<br />
                                    <strong>Fechar e Reabrir:</strong> Encerra a votação atual e reabre para nova votação do mesmo cargo.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                    {/* Show success message if all positions are completed */}
                    {electionPositions.every(p => p.status === "completed") && (
                      <div className="space-y-3">
                        <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <p className="text-sm font-medium text-green-800 dark:text-green-200">
                              Todos os cargos foram decididos!
                            </p>
                          </div>
                          <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                            Você pode finalizar a eleição e arquivá-la no histórico.
                          </p>
                        </div>
                        <Button
                          className="w-full"
                          variant="default"
                          onClick={handleFinalizeElection}
                          disabled={finalizeElectionMutation.isPending}
                          data-testid="button-finalize-election"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {finalizeElectionMutation.isPending ? "Finalizando..." : "Finalizar Eleição"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeElection && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Candidatos Registrados</CardTitle>
                  <CardDescription>
                    {candidates.length} candidatos na eleição atual
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {candidates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhum candidato registrado ainda</p>
                      <p className="text-sm mt-1">Adicione candidatos para começar</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile view - Cards */}
                      <div className="block sm:hidden space-y-3">
                        {candidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                            data-testid={`row-candidate-${candidate.id}`}
                          >
                            <p className="font-medium">{candidate.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">{candidate.positionName}</p>
                          </div>
                        ))}
                      </div>

                      {/* Desktop view - Table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="text-left px-6 py-3 font-semibold text-sm">Nome</th>
                              <th className="text-left px-6 py-3 font-semibold text-sm">Cargo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {candidates.map((candidate) => (
                              <tr 
                                key={candidate.id} 
                                className="border-b border-border hover:bg-muted/30 transition-colors"
                                data-testid={`row-candidate-${candidate.id}`}
                              >
                                <td className="px-6 py-4">{candidate.name}</td>
                                <td className="px-6 py-4">{candidate.positionName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Membros Cadastrados</CardTitle>
                <CardDescription>
                  {members.length} membros registrados no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum membro cadastrado ainda</p>
                    <p className="text-sm mt-1">Cadastre membros para permitir votação</p>
                  </div>
                ) : (
                  <Collapsible open={isMembersListOpen} onOpenChange={setIsMembersListOpen}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between mb-3"
                        data-testid="button-toggle-members-list"
                      >
                        <span>Ver Lista de Membros</span>
                        {isMembersListOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {/* Mobile view - Cards */}
                      <div className="block sm:hidden space-y-3">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="p-4 border border-border rounded-lg"
                            data-testid={`row-member-${member.id}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate" data-testid={`text-member-name-${member.id}`}>
                                  {member.fullName}
                                </p>
                                <p className="text-sm text-muted-foreground truncate mt-1">
                                  {member.email}
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditMember(member)}
                                  data-testid={`button-edit-member-${member.id}`}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteMember(member.id)}
                                  data-testid={`button-delete-member-${member.id}`}
                                >
                                  Remover
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop view - Table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="text-left px-6 py-3 font-semibold text-sm">Nome</th>
                              <th className="text-left px-6 py-3 font-semibold text-sm">Email</th>
                              <th className="text-right px-6 py-3 font-semibold text-sm">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {members.map((member) => (
                              <tr 
                                key={member.id} 
                                className="border-b border-border hover:bg-muted/30 transition-colors"
                                data-testid={`row-member-${member.id}`}
                              >
                                <td className="px-6 py-4" data-testid={`text-member-name-${member.id}`}>{member.fullName}</td>
                                <td className="px-6 py-4 text-muted-foreground">{member.email}</td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditMember(member)}
                                      data-testid={`button-edit-member-${member.id}`}
                                    >
                                      Editar
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteMember(member.id)}
                                      data-testid={`button-delete-member-${member.id}`}
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          </div>
        )}
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Histórico de Eleições</CardTitle>
                  <CardDescription>Visualize eleições finalizadas anteriormente</CardDescription>
                </CardHeader>
                <CardContent>
                  {electionHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma eleição finalizada ainda
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {electionHistory.map((election) => (
                        <Card key={election.id} className="hover-elevate" data-testid={`card-election-${election.id}`}>
                          <CardHeader>
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div>
                                <CardTitle className="text-lg">{election.name}</CardTitle>
                                <CardDescription className="text-sm">
                                  Finalizada em {new Date(election.closedAt || '').toLocaleDateString('pt-BR')}
                                </CardDescription>
                              </div>
                              <div className="flex flex-col gap-2 md:flex-row">
                                <Button
                                  variant="outline"
                                  onClick={() => handleDownloadAuditPDF(election.id)}
                                  data-testid={`button-download-pdf-${election.id}`}
                                  className="w-full md:w-auto"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  PDF Auditoria
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setLocation(`/results?electionId=${election.id}`)}
                                  data-testid={`button-view-election-${election.id}`}
                                  className="w-full md:w-auto"
                                >
                                  <ChartBar className="w-4 h-4 mr-2" />
                                  Ver Resultados
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isCreateElectionOpen} onOpenChange={setIsCreateElectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Eleição</DialogTitle>
            <DialogDescription>
              Criar eleição para {new Date().getFullYear()}/{new Date().getFullYear() + 1} com todos os cargos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Uma nova eleição será criada para todos os cargos: Presidente, Vice-Presidente, 1º Secretário, 2º Secretário e Tesoureiro.
            </p>
            <p className="text-sm text-muted-foreground">
              Os cargos serão votados sequencialmente, um de cada vez.
            </p>
            <Button
              className="w-full"
              onClick={handleCreateElection}
              disabled={createElectionMutation.isPending}
              data-testid="button-confirm-create-election"
            >
              {createElectionMutation.isPending ? "Criando..." : "Criar Eleição"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isNominationDialogOpen} onOpenChange={setIsNominationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Indicação de Membros para Candidatura</DialogTitle>
            <DialogDescription>
              Marque os membros conforme forem sendo indicados. Membros que não aceitarem a indicação podem ser desmarcados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {nominationPositionId && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium">
                  Cargo: {positions.find(p => p.id === nominationPositionId)?.name}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Membros Presentes ({attendance?.filter(a => a.isPresent).length || 0})</Label>
              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {attendance?.filter(a => a.isPresent).length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Nenhum membro presente disponível para indicação.
                  </div>
                ) : (
                  attendance
                    ?.filter(a => a.isPresent)
                    .map((member) => {
                      const isNominated = nominatedMemberIds.has(member.memberId);
                      return (
                        <div
                          key={member.memberId}
                          className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                          data-testid={`nomination-member-${member.memberId}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              onClick={() => handleToggleNomination(member.memberId)}
                              className="flex-shrink-0"
                              data-testid={`button-toggle-nomination-${member.memberId}`}
                            >
                              {isNominated ? (
                                <CheckSquare className="w-5 h-5 text-primary" />
                              ) : (
                                <Square className="w-5 h-5 text-muted-foreground" />
                              )}
                            </button>
                            <div className="flex-1">
                              <p className="font-medium">{member.memberName}</p>
                              <p className="text-sm text-muted-foreground">{member.memberEmail}</p>
                            </div>
                          </div>
                          {isNominated && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleNomination(member.memberId)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              data-testid={`button-remove-nomination-${member.memberId}`}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Total de Indicados:</span>
              <span className="text-lg font-bold text-primary">{nominatedMemberIds.size}</span>
            </div>
            <Button
              className="w-full"
              onClick={handleConfirmNominations}
              disabled={addBatchCandidatesMutation.isPending || nominatedMemberIds.size === 0}
              data-testid="button-confirm-nominations"
            >
              {addBatchCandidatesMutation.isPending 
                ? "Adicionando candidatos..." 
                : `Confirmar ${nominatedMemberIds.size} Candidato${nominatedMemberIds.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCandidateOpen} onOpenChange={setIsAddCandidateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Candidato</DialogTitle>
            <DialogDescription>
              Selecione um membro cadastrado para concorrer a um cargo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="candidate-member">Membro</Label>
              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
                <SelectTrigger id="candidate-member" data-testid="select-member">
                  <SelectValue placeholder="Selecione o membro" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Nenhum membro disponível. Verifique se há membros presentes na lista de presença.
                    </div>
                  ) : (
                    availableMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.fullName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidate-position">Cargo</Label>
              <Select
                value={selectedPositionId}
                onValueChange={setSelectedPositionId}
              >
                <SelectTrigger id="candidate-position" data-testid="select-position">
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  {positions
                    .filter(position => {
                      // If electionPositions not loaded yet, show all positions
                      if (!electionPositions || electionPositions.length === 0) return true;
                      const electionPosition = electionPositions.find(ep => ep.positionId === position.id);
                      return !electionPosition || electionPosition.status !== 'completed';
                    })
                    .map((position) => (
                      <SelectItem key={position.id} value={position.id.toString()}>
                        {position.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleAddCandidate}
              disabled={addCandidateMutation.isPending}
              data-testid="button-confirm-add-candidate"
            >
              {addCandidateMutation.isPending ? "Adicionando..." : "Adicionar Candidato"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Membro</DialogTitle>
            <DialogDescription>
              Adicione um novo membro que poderá votar nas eleições
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="member-name">Nome Completo</Label>
              <Input
                id="member-name"
                placeholder="Nome completo do membro"
                value={newMember.fullName}
                onChange={(e) =>
                  setNewMember({ ...newMember, fullName: e.target.value })
                }
                data-testid="input-member-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="email@exemplo.com"
                value={newMember.email}
                onChange={(e) =>
                  setNewMember({ ...newMember, email: e.target.value })
                }
                data-testid="input-member-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-birthdate">Data de Nascimento (Opcional)</Label>
              <Input
                id="member-birthdate"
                type="date"
                value={newMember.birthdate || ""}
                onChange={(e) =>
                  setNewMember({ ...newMember, birthdate: e.target.value })
                }
                data-testid="input-member-birthdate"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="member-active"
                checked={newMember.activeMember}
                onCheckedChange={(checked) =>
                  setNewMember({ ...newMember, activeMember: checked === true })
                }
                data-testid="checkbox-member-active"
              />
              <Label htmlFor="member-active" className="cursor-pointer">
                Sócio Ativo
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="member-treasurer"
                checked={newMember.isTreasurer}
                onCheckedChange={(checked) =>
                  setNewMember({ ...newMember, isTreasurer: checked === true })
                }
                data-testid="checkbox-member-treasurer"
              />
              <Label htmlFor="member-treasurer" className="cursor-pointer">
                Tesoureiro
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-secretaria">Secretaria (Opcional)</Label>
              <Select
                value={newMember.secretaria}
                onValueChange={(value) =>
                  setNewMember({ ...newMember, secretaria: value })
                }
              >
                <SelectTrigger id="member-secretaria" data-testid="select-member-secretaria">
                  <SelectValue placeholder="Selecione uma secretaria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="espiritualidade">Espiritualidade</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="tesouraria">Tesouraria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-photo">Foto do Membro (Opcional)</Label>
              <Input
                id="member-photo"
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp"
                onChange={handlePhotoUpload}
                data-testid="input-member-photo"
              />
              {newMember.photoUrl && (
                <div className="mt-2 flex justify-center">
                  <img
                    src={newMember.photoUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-full border-2 border-primary"
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleAddMember}
              className="w-full"
              disabled={addMemberMutation.isPending}
              data-testid="button-submit-member"
            >
              {addMemberMutation.isPending ? "Cadastrando..." : "Cadastrar Membro"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditMemberOpen} onOpenChange={(open) => {
        setIsEditMemberOpen(open);
        if (!open) setEditingMember(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Dados do Membro</DialogTitle>
            <DialogDescription>
              Atualize as informações do membro cadastrado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-member-name">Nome Completo</Label>
              <Input
                id="edit-member-name"
                placeholder="Nome completo do membro"
                value={editingMember?.fullName || ""}
                onChange={(e) =>
                  setEditingMember(editingMember ? { ...editingMember, fullName: e.target.value } : null)
                }
                data-testid="input-edit-member-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-member-email">Email</Label>
              <Input
                id="edit-member-email"
                type="email"
                placeholder="email@exemplo.com"
                value={editingMember?.email || ""}
                onChange={(e) =>
                  setEditingMember(editingMember ? { ...editingMember, email: e.target.value } : null)
                }
                data-testid="input-edit-member-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-member-birthdate">Data de Nascimento (Opcional)</Label>
              <Input
                id="edit-member-birthdate"
                type="date"
                value={editingMember?.birthdate || ""}
                onChange={(e) =>
                  setEditingMember(editingMember ? { ...editingMember, birthdate: e.target.value } : null)
                }
                data-testid="input-edit-member-birthdate"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-member-active"
                checked={editingMember?.activeMember ?? true}
                onCheckedChange={(checked) =>
                  setEditingMember(editingMember ? { ...editingMember, activeMember: checked === true } : null)
                }
                data-testid="checkbox-edit-member-active"
              />
              <Label htmlFor="edit-member-active" className="cursor-pointer">
                Sócio Ativo
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-member-treasurer"
                checked={editingMember?.isTreasurer ?? false}
                onCheckedChange={(checked) =>
                  setEditingMember(editingMember ? { ...editingMember, isTreasurer: checked === true } : null)
                }
                data-testid="checkbox-edit-member-treasurer"
              />
              <Label htmlFor="edit-member-treasurer" className="cursor-pointer">
                Tesoureiro
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-member-secretaria">Secretaria (Opcional)</Label>
              <Select
                value={editingMember?.secretaria || "none"}
                onValueChange={(value) =>
                  setEditingMember(editingMember ? { ...editingMember, secretaria: value } : null)
                }
              >
                <SelectTrigger id="edit-member-secretaria" data-testid="select-edit-member-secretaria">
                  <SelectValue placeholder="Selecione uma secretaria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="espiritualidade">Espiritualidade</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="tesouraria">Tesouraria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-member-photo">Foto do Membro (Opcional)</Label>
              <Input
                id="edit-member-photo"
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp"
                onChange={handleEditPhotoUpload}
                data-testid="input-edit-member-photo"
              />
              {editingMember?.photoUrl && (
                <div className="mt-2 flex justify-center">
                  <img
                    src={editingMember.photoUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-full border-2 border-primary"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditMemberOpen(false);
                  setEditingMember(null);
                }}
                className="flex-1"
                data-testid="button-cancel-edit"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="flex-1"
                disabled={updateMemberMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateMemberMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isForceCloseDialogOpen} onOpenChange={setIsForceCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar Cargo Manualmente</DialogTitle>
            <DialogDescription>
              Use esta opção apenas em caso de abstenções. Escolha como deseja proceder com este cargo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="force-close-reason">Motivo do Fechamento Manual</Label>
              <Input
                id="force-close-reason"
                placeholder="Ex: Membros saíram antes de votar"
                value={forceCloseReason}
                onChange={(e) => setForceCloseReason(e.target.value)}
                data-testid="input-force-close-reason"
              />
            </div>

            <div className="space-y-2">
              <Label>Opções de Fechamento</Label>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleForceClosePosition("permanent")}
                  className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                  disabled={!forceCloseReason.trim() || forceClosePositionMutation.isPending}
                  data-testid="button-force-close-permanent"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {forceClosePositionMutation.isPending ? "Fechando..." : "Fechar Permanentemente"}
                </Button>
                <Button
                  onClick={() => handleForceClosePosition("reopen")}
                  className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                  disabled={!forceCloseReason.trim() || forceClosePositionMutation.isPending}
                  data-testid="button-force-close-reopen"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  {forceClosePositionMutation.isPending ? "Fechando..." : "Fechar e Reabrir Cargo"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Fechar Permanentemente:</strong> Encerra a votação deste cargo e passa para o próximo.<br />
                <strong>Fechar e Reabrir:</strong> Encerra a votação atual e reabre para nova votação do mesmo cargo.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsForceCloseDialogOpen(false);
                  setForceCloseReason("");
                  setForceClosePositionId(null);
                  setForceCloseAction("permanent");
                }}
                className="w-full"
                data-testid="button-cancel-force-close"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* President Selection Dialog for PDF Generation */}
      <Dialog open={isPresidentDialogOpen} onOpenChange={setIsPresidentDialogOpen}>
        <DialogContent data-testid="dialog-select-president">
          <DialogHeader>
            <DialogTitle>Selecionar Presidente</DialogTitle>
            <DialogDescription>
              Selecione o membro que assinará como Presidente em Exercício no relatório de auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="president-select">Presidente em Exercício</Label>
              <Select
                value={selectedPresidentId}
                onValueChange={setSelectedPresidentId}
              >
                <SelectTrigger id="president-select" data-testid="select-president">
                  <SelectValue placeholder="Selecione um membro" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem 
                      key={member.id} 
                      value={member.id.toString()}
                      data-testid={`select-president-option-${member.id}`}
                    >
                      {member.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsPresidentDialogOpen(false);
                  setSelectedPresidentId("");
                  setPendingPdfElectionId(null);
                }}
                className="flex-1"
                data-testid="button-cancel-president-selection"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGeneratePdfWithPresident}
                className="flex-1"
                disabled={!selectedPresidentId}
                data-testid="button-generate-pdf"
              >
                Gerar PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={isCropDialogOpen}
        onOpenChange={setIsCropDialogOpen}
        imageSrc={imageToCrop}
        onCropComplete={handleCropComplete}
      />

      {/* Export Results Component (hidden, used for image generation) */}
      {activeElection && results && electionPositions.every(p => p.status === "completed") && (
        <ExportResultsImage
          ref={exportImageRef}
          electionTitle={activeElection.name}
          aspectRatio={exportAspectRatio}
          winners={results.positions
            .filter(p => p.winnerId)
            .map(p => {
              const winner = p.candidates.find(c => c.isElected);
              return {
                positionId: p.positionId,
                positionName: p.positionName,
                candidateName: winner?.candidateName || '',
                photoUrl: winner?.photoUrl || '',
                voteCount: winner?.voteCount || 0,
                wonAtScrutiny: winner?.electedInScrutiny || 1,
              };
            })}
        />
      )}

      {/* Footer with UMP Emaús Logo */}
      <div className="mt-8 mb-4 flex justify-center">
        <img 
          src={logoUrl} 
          alt="UMP Emaús" 
          className="h-48 transition-opacity"
          data-testid="img-logo-footer-admin"
        />
      </div>
    </div>
  );
}
