import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DeoGloryAdminLayout } from "@/components/deoglory/DeoGloryAdminLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Search,
  Flame,
  Gem,
  GraduationCap,
  Target,
  RefreshCw,
  Send,
  MessageSquare,
  Sparkles,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface StudyUser {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: "Ativo" | "Inativo" | "Suspenso";
  registrationDate: string | null;
  lastAccess: string | null;
  lessonsCompleted: number;
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  crystals: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  isLoading?: boolean;
}

function StatCard({ title, value, icon: Icon, iconBgColor, iconColor, isLoading }: StatCardProps) {
  return (
    <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${iconBgColor}`}>
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
          </div>
        </div>
        <div className="mt-3 sm:mt-4">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 sm:h-9 w-16 sm:w-20 mt-1" />
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    Ativo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Inativo: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    Suspenso: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  };

  return (
    <Badge className={`${colors[status as keyof typeof colors]} font-medium border-0 text-xs`}>
      {status}
    </Badge>
  );
}

function formatLastAccess(date: string | null): string {
  if (!date) return "Nunca acessou";
  try {
    const accessDate = new Date(date);
    return formatDistanceToNow(accessDate, { addSuffix: true, locale: ptBR });
  } catch {
    return "Data invalida";
  }
}

function formatRegistrationDate(date: string | null): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "-";
  }
}

interface UserDetailDialogProps {
  user: StudyUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function UserDetailDialog({ user, open, onOpenChange }: UserDetailDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-md sm:mx-auto max-h-[85vh] overflow-y-auto fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <DialogHeader>
          <DialogTitle className="text-lg">Detalhes do Usuario</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-violet-100 text-violet-700 text-xl">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-semibold text-lg truncate">{user.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <StatusBadge status={user.status} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="h-4 w-4 text-violet-600" />
                <span className="text-xs text-muted-foreground">Nivel</span>
              </div>
              <p className="font-bold text-lg">{user.currentLevel}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">XP Total</span>
              </div>
              <p className="font-bold text-lg">{user.totalXp.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="h-4 w-4 text-orange-600" />
                <span className="text-xs text-muted-foreground">Ofensiva</span>
              </div>
              <p className="font-bold text-lg">{user.currentStreak} dias</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Gem className="h-4 w-4 text-cyan-600" />
                <span className="text-xs text-muted-foreground">Cristais</span>
              </div>
              <p className="font-bold text-lg">{user.crystals}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Licoes</span>
              </div>
              <p className="font-bold text-lg">{user.lessonsCompleted}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="text-xs text-muted-foreground">Cadastro</span>
              </div>
              <p className="font-bold text-sm">{formatRegistrationDate(user.registrationDate)}</p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Ultimo acesso: {formatLastAccess(user.lastAccess)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface EncouragementMessage {
  key: string;
  title: string;
  body: string;
}

interface EventStats {
  totalEvents: number;
  activeEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  recentEvents: {
    id: number;
    title: string;
    theme: string;
    status: string;
    startDate: string;
    endDate: string;
  }[];
}

export default function DeoGloryUsuarios() {
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderBy, setOrderBy] = useState("xp");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<StudyUser | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string>("");
  const { toast } = useToast();

  const { data: users = [], isLoading, isError } = useQuery<StudyUser[]>({
    queryKey: ['/api/study/admin/users'],
  });

  const { data: encouragementMessagesData } = useQuery<{ messages: EncouragementMessage[] }>({
    queryKey: ['/api/study/encouragement-messages'],
  });
  const encouragementMessages = encouragementMessagesData?.messages || [];

  const { data: eventStats } = useQuery<EventStats>({
    queryKey: ['/api/study/admin/events-stats'],
  });

  const broadcastMutation = useMutation({
    mutationFn: async (messageKey: string) => {
      const selectedMsg = encouragementMessages.find(m => m.key === messageKey);
      const response = await apiRequest("POST", "/api/admin/study/encourage-all", { 
        messageKey,
        messageText: selectedMsg?.body || messageKey
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Mensagem enviada!",
        description: `Notificacao enviada para ${data.sentCount} membros.`,
      });
      setSelectedMessage("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Nao foi possivel enviar a mensagem.",
        variant: "destructive",
      });
    },
  });

  const recalculateLevelsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/study/admin/recalculate-levels");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Niveis recalculados",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/study/admin/users'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Nao foi possivel recalcular os niveis",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter(user => {
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "active" && user.status === "Ativo") ||
      (statusFilter === "inactive" && user.status === "Inativo") ||
      (statusFilter === "suspended" && user.status === "Suspenso");
    
    const matchesSearch = 
      !searchTerm || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (orderBy === "xp") return b.totalXp - a.totalXp;
    if (orderBy === "name") return a.name.localeCompare(b.name);
    if (orderBy === "lessons") return b.lessonsCompleted - a.lessonsCompleted;
    if (orderBy === "streak") return b.currentStreak - a.currentStreak;
    if (orderBy === "recent") {
      const dateA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
      const dateB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
      return dateB - dateA;
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedUsers.length / perPage);
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * perPage, currentPage * perPage);

  const activeCount = users.filter(u => u.status === "Ativo").length;
  const inactiveCount = users.filter(u => u.status === "Inativo").length;
  const suspendedCount = users.filter(u => u.status === "Suspenso").length;

  const handleViewUser = (user: StudyUser) => {
    setSelectedUser(user);
    setDetailDialogOpen(true);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Relatorio de Usuarios - DeoGlory", 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 30);
    doc.text(`Total: ${sortedUsers.length} usuarios`, 14, 36);

    const tableData = sortedUsers.map(user => [
      user.name,
      user.email,
      user.status,
      user.currentLevel.toString(),
      user.totalXp.toLocaleString(),
      user.lessonsCompleted.toString(),
      `${user.currentStreak} dias`,
    ]);

    autoTable(doc, {
      head: [['Nome', 'Email', 'Status', 'Nivel', 'XP', 'Licoes', 'Ofensiva']],
      body: tableData,
      startY: 42,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 92, 246] },
    });

    doc.save(`usuarios-deoglory-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <DeoGloryAdminLayout
      title="Usuarios"
      subtitle="Gerencie e visualize todos os usuarios do sistema"
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total de Usuarios"
            value={users.length}
            icon={Users}
            iconBgColor="bg-violet-100 dark:bg-violet-900/30"
            iconColor="text-violet-600 dark:text-violet-400"
            isLoading={isLoading}
          />
          <StatCard
            title="Usuarios Ativos"
            value={activeCount}
            icon={UserCheck}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            isLoading={isLoading}
          />
          <StatCard
            title="Inativos"
            value={inactiveCount}
            icon={Clock}
            iconBgColor="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
            isLoading={isLoading}
          />
          <StatCard
            title="Suspensos"
            value={suspendedCount}
            icon={UserPlus}
            iconBgColor="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
            isLoading={isLoading}
          />
        </div>

        {eventStats && (eventStats.activeEvents > 0 || eventStats.upcomingEvents > 0) && (
          <Card className="bg-gradient-to-r from-purple-600 to-pink-500 border-0 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-white/20">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Eventos Especiais</h3>
                  <p className="text-sm text-white/80">Engajamento dos usuarios em eventos</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-2xl font-bold text-white">{eventStats.activeEvents}</p>
                  <p className="text-xs text-white/80">Eventos Ativos</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-2xl font-bold text-yellow-300">{eventStats.upcomingEvents}</p>
                  <p className="text-xs text-white/80">Proximos Eventos</p>
                </div>
              </div>
              {eventStats.recentEvents.filter(e => e.status === 'published').slice(0, 2).map((event) => (
                <div key={event.id} className="flex items-center gap-3 bg-white/10 rounded-lg p-2 mt-3">
                  <Calendar className="h-4 w-4 text-white" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{event.title}</p>
                    <p className="text-xs text-white/70">{event.theme}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-violet-600" />
              <CardTitle className="text-base font-semibold">Enviar Mensagem para Todos</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Envie uma mensagem de incentivo para todos os membros ativos via notificacao push
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedMessage} onValueChange={setSelectedMessage}>
                <SelectTrigger className="flex-1" data-testid="select-broadcast-message">
                  <SelectValue placeholder="Selecione uma mensagem..." />
                </SelectTrigger>
                <SelectContent>
                  {encouragementMessages.map((msg) => (
                    <SelectItem key={msg.key} value={msg.key}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{msg.title}</span>
                        <span className="text-xs text-muted-foreground">{msg.body}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="gap-2 bg-violet-600 hover:bg-violet-700"
                disabled={!selectedMessage || broadcastMutation.isPending}
                onClick={() => selectedMessage && broadcastMutation.mutate(selectedMessage)}
                data-testid="button-broadcast"
              >
                <Send className="h-4 w-4" />
                {broadcastMutation.isPending ? "Enviando..." : "Enviar para Todos"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 px-4 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base sm:text-lg font-semibold">Gerenciar Usuarios</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    className="gap-2 w-full sm:w-auto" 
                    onClick={() => recalculateLevelsMutation.mutate()}
                    disabled={recalculateLevelsMutation.isPending}
                    data-testid="button-recalculate-levels"
                  >
                    <RefreshCw className={`h-4 w-4 ${recalculateLevelsMutation.isPending ? 'animate-spin' : ''}`} />
                    {recalculateLevelsMutation.isPending ? "Recalculando..." : "Sincronizar Niveis"}
                  </Button>
                  <Button 
                    variant="default" 
                    className="gap-2 bg-violet-600 hover:bg-violet-700 w-full sm:w-auto" 
                    onClick={handleExportPDF}
                    data-testid="button-export"
                  >
                    <Download className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="w-full sm:w-[140px] bg-gray-50 dark:bg-gray-700" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={orderBy} onValueChange={setOrderBy}>
                    <SelectTrigger className="w-full sm:w-[130px] bg-gray-50 dark:bg-gray-700" data-testid="select-order-by">
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xp">Maior XP</SelectItem>
                      <SelectItem value="streak">Ofensiva</SelectItem>
                      <SelectItem value="lessons">Licoes</SelectItem>
                      <SelectItem value="recent">Recentes</SelectItem>
                      <SelectItem value="name">Nome</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 sm:p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 sm:gap-4">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1 min-w-0">
                      <Skeleton className="h-4 w-32 sm:w-48" />
                      <Skeleton className="h-3 w-24 sm:w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>Erro ao carregar usuarios. Tente novamente.</p>
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum usuario encontrado</p>
              </div>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <Checkbox
                            checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                            onCheckedChange={(checked) => {
                              setSelectedUsers(checked ? paginatedUsers.map((u) => u.id) : []);
                            }}
                            data-testid="checkbox-select-all"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Usuario
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Nivel
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Licoes
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          XP
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Ofensiva
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Acoes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {paginatedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-4">
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) => {
                                setSelectedUsers(
                                  checked
                                    ? [...selectedUsers, user.id]
                                    : selectedUsers.filter((id) => id !== user.id)
                                );
                              }}
                              data-testid={`checkbox-user-${user.id}`}
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={user.avatarUrl || undefined} />
                                <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                  {user.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={user.status} />
                          </td>
                          <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                            {user.currentLevel}
                          </td>
                          <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                            {user.lessonsCompleted}
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-semibold text-violet-600 dark:text-violet-400">
                              {user.totalXp.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1">
                              <Flame className="h-4 w-4 text-orange-500" />
                              <span className="text-gray-600 dark:text-gray-300">{user.currentStreak}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleViewUser(user)}
                              data-testid={`button-view-user-${user.id}`}
                            >
                              <Eye className="h-4 w-4 text-gray-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {paginatedUsers.map((user) => (
                    <div 
                      key={user.id} 
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      data-testid={`user-card-${user.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback className="bg-violet-100 text-violet-700">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                            </div>
                            <StatusBadge status={user.status} />
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                            <span className="text-violet-600 font-semibold">{user.totalXp.toLocaleString()} XP</span>
                            <span className="text-muted-foreground">Nv. {user.currentLevel}</span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Flame className="h-3 w-3 text-orange-500" />
                              {user.currentStreak}
                            </span>
                            <span className="text-muted-foreground">{user.lessonsCompleted} licoes</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="shrink-0"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!isLoading && !isError && sortedUsers.length > 0 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>Mostrando</span>
                  <Select value={perPage.toString()} onValueChange={(v) => { setPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[70px]" data-testid="select-per-page">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>de {sortedUsers.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm text-muted-foreground">
                    {currentPage} / {totalPages || 1}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UserDetailDialog 
        user={selectedUser} 
        open={detailDialogOpen} 
        onOpenChange={setDetailDialogOpen} 
      />
    </DeoGloryAdminLayout>
  );
}
