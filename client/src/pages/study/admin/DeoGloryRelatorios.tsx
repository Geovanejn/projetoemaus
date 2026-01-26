import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DeoGloryAdminLayout } from "@/components/deoglory/DeoGloryAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  BookOpen,
  TrendingUp,
  Download,
  Zap,
  Trophy,
  Flame,
  Target,
  GraduationCap,
  FileText,
  Filter,
  Sparkles,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface StudyStats {
  totalWeeks: number;
  totalLessons: number;
  totalUnits: number;
  totalStudents: number;
}

interface StudyUser {
  id: number;
  name: string;
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  lessonsCompleted: number;
  status: string;
  crystals: number;
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

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  isLoading?: boolean;
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconBgColor,
  iconColor,
  isLoading = false,
}: StatCardProps) {
  return (
    <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
          <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${iconBgColor}`}>
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 sm:h-9 w-16 sm:w-20" />
        ) : (
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface ReportFilters {
  reportType: string;
  statusFilter: string;
  levelFilter: string;
  includeXp: boolean;
  includeLessons: boolean;
  includeStreak: boolean;
  includeCrystals: boolean;
  sortBy: string;
}

export default function DeoGloryRelatorios() {
  const [filters, setFilters] = useState<ReportFilters>({
    reportType: "users",
    statusFilter: "all",
    levelFilter: "all",
    includeXp: true,
    includeLessons: true,
    includeStreak: true,
    includeCrystals: false,
    sortBy: "xp",
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<StudyStats>({
    queryKey: ["/api/study/admin/stats"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<StudyUser[]>({
    queryKey: ["/api/study/admin/users"],
  });

  const { data: eventStats } = useQuery<EventStats>({
    queryKey: ["/api/study/admin/events-stats"],
  });

  const isLoading = statsLoading || usersLoading;

  const activeUsers = users.filter(u => u.status === "Ativo").length;
  const totalXpEarned = users.reduce((sum, u) => sum + (u.totalXp || 0), 0);
  const totalLessonsCompleted = users.reduce((sum, u) => sum + (u.lessonsCompleted || 0), 0);
  
  // Calculate average streak only for users who have actually studied (have XP or lessons completed)
  const usersWithActivity = users.filter(u => (u.totalXp || 0) > 0 || (u.lessonsCompleted || 0) > 0);
  const averageStreak = usersWithActivity.length > 0 
    ? Math.round(usersWithActivity.reduce((sum, u) => sum + (u.currentStreak || 0), 0) / usersWithActivity.length) 
    : 0;
  
  // Calculate average level only for users who have activity
  const averageLevel = usersWithActivity.length > 0 
    ? Math.round(usersWithActivity.reduce((sum, u) => sum + (u.currentLevel || 1), 0) / usersWithActivity.length) 
    : 1;

  const levelDistribution = [
    { name: "Nivel 1-5", value: users.filter(u => (u.currentLevel || 1) <= 5).length, color: "#8B5CF6" },
    { name: "Nivel 6-10", value: users.filter(u => (u.currentLevel || 1) > 5 && (u.currentLevel || 1) <= 10).length, color: "#3B82F6" },
    { name: "Nivel 11-20", value: users.filter(u => (u.currentLevel || 1) > 10 && (u.currentLevel || 1) <= 20).length, color: "#10B981" },
    { name: "Nivel 21+", value: users.filter(u => (u.currentLevel || 1) > 20).length, color: "#F59E0B" },
  ].filter(d => d.value > 0);

  const topUsers = [...users]
    .sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0))
    .slice(0, 10)
    .map(u => ({
      name: u.name?.split(' ')[0] || 'Usuario',
      xp: u.totalXp || 0,
    }));

  const streakDistribution = [
    { range: "0 dias", count: users.filter(u => (u.currentStreak || 0) === 0).length },
    { range: "1-7 dias", count: users.filter(u => (u.currentStreak || 0) >= 1 && (u.currentStreak || 0) <= 7).length },
    { range: "8-30 dias", count: users.filter(u => (u.currentStreak || 0) >= 8 && (u.currentStreak || 0) <= 30).length },
    { range: "31+ dias", count: users.filter(u => (u.currentStreak || 0) > 30).length },
  ];

  const handleGeneratePDF = () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const now = new Date();
      
      doc.setFontSize(20);
      doc.setTextColor(139, 92, 246);
      doc.text("DeoGlory - Relatorio", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em: ${format(now, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`, 14, 28);

      let filteredUsers = [...users];
      
      if (filters.statusFilter !== "all") {
        const statusMap: Record<string, string> = {
          active: "Ativo",
          inactive: "Inativo",
          suspended: "Suspenso",
        };
        filteredUsers = filteredUsers.filter(u => u.status === statusMap[filters.statusFilter]);
      }
      
      if (filters.levelFilter !== "all") {
        const [min, max] = filters.levelFilter.split("-").map(Number);
        filteredUsers = filteredUsers.filter(u => {
          const level = u.currentLevel || 1;
          if (max) {
            return level >= min && level <= max;
          }
          return level >= min;
        });
      }

      switch (filters.sortBy) {
        case "xp":
          filteredUsers.sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0));
          break;
        case "level":
          filteredUsers.sort((a, b) => (b.currentLevel || 1) - (a.currentLevel || 1));
          break;
        case "streak":
          filteredUsers.sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0));
          break;
        case "lessons":
          filteredUsers.sort((a, b) => (b.lessonsCompleted || 0) - (a.lessonsCompleted || 0));
          break;
        case "name":
          filteredUsers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          break;
      }

      if (filters.reportType === "summary") {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Resumo Geral do Sistema", 14, 42);

        const summaryData = [
          ["Total de Usuarios", users.length.toString()],
          ["Usuarios Ativos", activeUsers.toString()],
          ["XP Total Distribuido", totalXpEarned.toLocaleString("pt-BR")],
          ["Licoes Concluidas", totalLessonsCompleted.toString()],
          ["Sequencia Media", `${averageStreak} dias`],
          ["Nivel Medio", averageLevel.toString()],
          ["Total de Revistas", (stats?.totalWeeks || 0).toString()],
          ["Total de Licoes", (stats?.totalLessons || 0).toString()],
        ];

        autoTable(doc, {
          head: [["Metrica", "Valor"]],
          body: summaryData,
          startY: 48,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [139, 92, 246] },
          alternateRowStyles: { fillColor: [245, 243, 255] },
        });

        doc.setFontSize(14);
        doc.text("Distribuicao por Nivel", 14, (doc as any).lastAutoTable.finalY + 15);

        const levelData = levelDistribution.map(d => [d.name, d.value.toString()]);
        autoTable(doc, {
          head: [["Faixa de Nivel", "Usuarios"]],
          body: levelData,
          startY: (doc as any).lastAutoTable.finalY + 20,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] },
        });

      } else if (filters.reportType === "ranking") {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Ranking de Usuarios", 14, 42);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Top ${Math.min(50, filteredUsers.length)} usuarios`, 14, 50);

        const headers = ["#", "Nome", "Status", "Nivel"];
        if (filters.includeXp) headers.push("XP");
        if (filters.includeLessons) headers.push("Licoes");
        if (filters.includeStreak) headers.push("Ofensiva");
        if (filters.includeCrystals) headers.push("Cristais");

        const rankingData = filteredUsers.slice(0, 50).map((u, i) => {
          const row: (string | number)[] = [
            i + 1,
            u.name || "Usuario",
            u.status || "-",
            u.currentLevel || 1,
          ];
          if (filters.includeXp) row.push((u.totalXp || 0).toLocaleString("pt-BR"));
          if (filters.includeLessons) row.push(u.lessonsCompleted || 0);
          if (filters.includeStreak) row.push(`${u.currentStreak || 0} dias`);
          if (filters.includeCrystals) row.push(u.crystals || 0);
          return row;
        });

        autoTable(doc, {
          head: [headers],
          body: rankingData,
          startY: 56,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [139, 92, 246] },
          alternateRowStyles: { fillColor: [245, 243, 255] },
        });

      } else {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Lista de Usuarios", 14, 42);
        
        const filterInfo = [];
        if (filters.statusFilter !== "all") {
          const statusLabels: Record<string, string> = { active: "Ativos", inactive: "Inativos", suspended: "Suspensos" };
          filterInfo.push(statusLabels[filters.statusFilter]);
        }
        if (filters.levelFilter !== "all") {
          filterInfo.push(`Nivel ${filters.levelFilter}`);
        }
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`${filteredUsers.length} usuarios${filterInfo.length > 0 ? ` (${filterInfo.join(", ")})` : ""}`, 14, 50);

        const headers = ["Nome", "Email", "Status", "Nivel"];
        if (filters.includeXp) headers.push("XP");
        if (filters.includeLessons) headers.push("Licoes");
        if (filters.includeStreak) headers.push("Ofensiva");
        if (filters.includeCrystals) headers.push("Cristais");

        const userData = filteredUsers.map(u => {
          const row: (string | number)[] = [
            u.name || "Usuario",
            "-",
            u.status || "-",
            u.currentLevel || 1,
          ];
          if (filters.includeXp) row.push((u.totalXp || 0).toLocaleString("pt-BR"));
          if (filters.includeLessons) row.push(u.lessonsCompleted || 0);
          if (filters.includeStreak) row.push(`${u.currentStreak || 0} dias`);
          if (filters.includeCrystals) row.push(u.crystals || 0);
          return row;
        });

        autoTable(doc, {
          head: [headers],
          body: userData,
          startY: 56,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [139, 92, 246] },
          alternateRowStyles: { fillColor: [245, 243, 255] },
        });
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Pagina ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
        doc.text("DeoGlory - Sistema de Estudos", 14, doc.internal.pageSize.height - 10);
      }

      const filename = `deoglory-${filters.reportType}-${format(now, "yyyy-MM-dd-HHmm")}.pdf`;
      doc.save(filename);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DeoGloryAdminLayout
      title="Relatorios"
      subtitle="Estatisticas e exportacao de dados do sistema"
    >
      <div className="space-y-4 sm:space-y-6">
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
          <CardHeader className="pb-4 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-violet-600" />
                <CardTitle className="text-base sm:text-lg font-semibold">Gerar Relatorio</CardTitle>
              </div>
              <Button 
                className="bg-violet-600 hover:bg-violet-700 gap-2 w-full sm:w-auto" 
                onClick={handleGeneratePDF}
                disabled={isGenerating || isLoading}
                data-testid="button-generate-pdf"
              >
                <Download className="h-4 w-4" />
                {isGenerating ? "Gerando..." : "Exportar PDF"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Tipo de Relatorio</Label>
                <Select 
                  value={filters.reportType} 
                  onValueChange={(v) => setFilters(f => ({ ...f, reportType: v }))}
                >
                  <SelectTrigger data-testid="select-report-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="users">Lista de Usuarios</SelectItem>
                    <SelectItem value="ranking">Ranking</SelectItem>
                    <SelectItem value="summary">Resumo Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Filtrar por Status</Label>
                <Select 
                  value={filters.statusFilter} 
                  onValueChange={(v) => setFilters(f => ({ ...f, statusFilter: v }))}
                >
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                    <SelectItem value="suspended">Suspensos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Filtrar por Nivel</Label>
                <Select 
                  value={filters.levelFilter} 
                  onValueChange={(v) => setFilters(f => ({ ...f, levelFilter: v }))}
                >
                  <SelectTrigger data-testid="select-level-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os niveis</SelectItem>
                    <SelectItem value="1-5">Nivel 1-5</SelectItem>
                    <SelectItem value="6-10">Nivel 6-10</SelectItem>
                    <SelectItem value="11-20">Nivel 11-20</SelectItem>
                    <SelectItem value="21-999">Nivel 21+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Ordenar por</Label>
                <Select 
                  value={filters.sortBy} 
                  onValueChange={(v) => setFilters(f => ({ ...f, sortBy: v }))}
                >
                  <SelectTrigger data-testid="select-sort-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xp">Maior XP</SelectItem>
                    <SelectItem value="level">Nivel</SelectItem>
                    <SelectItem value="streak">Ofensiva</SelectItem>
                    <SelectItem value="lessons">Licoes</SelectItem>
                    <SelectItem value="name">Nome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Label className="text-sm mb-3 block">Colunas a incluir</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="includeXp" 
                    checked={filters.includeXp}
                    onCheckedChange={(c) => setFilters(f => ({ ...f, includeXp: !!c }))}
                  />
                  <Label htmlFor="includeXp" className="text-sm font-normal cursor-pointer">XP</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="includeLessons" 
                    checked={filters.includeLessons}
                    onCheckedChange={(c) => setFilters(f => ({ ...f, includeLessons: !!c }))}
                  />
                  <Label htmlFor="includeLessons" className="text-sm font-normal cursor-pointer">Licoes</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="includeStreak" 
                    checked={filters.includeStreak}
                    onCheckedChange={(c) => setFilters(f => ({ ...f, includeStreak: !!c }))}
                  />
                  <Label htmlFor="includeStreak" className="text-sm font-normal cursor-pointer">Ofensiva</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="includeCrystals" 
                    checked={filters.includeCrystals}
                    onCheckedChange={(c) => setFilters(f => ({ ...f, includeCrystals: !!c }))}
                  />
                  <Label htmlFor="includeCrystals" className="text-sm font-normal cursor-pointer">Cristais</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total de Usuarios"
            value={users.length}
            icon={Users}
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600 dark:text-blue-400"
            isLoading={usersLoading}
          />
          <StatCard
            title="Usuarios Ativos"
            value={activeUsers}
            icon={TrendingUp}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            isLoading={usersLoading}
          />
          <StatCard
            title="Total de Licoes"
            value={stats?.totalLessons || 0}
            icon={BookOpen}
            iconBgColor="bg-violet-100 dark:bg-violet-900/30"
            iconColor="text-violet-600 dark:text-violet-400"
            isLoading={statsLoading}
          />
          <StatCard
            title="XP Total"
            value={totalXpEarned.toLocaleString('pt-BR')}
            icon={Zap}
            iconBgColor="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
            isLoading={usersLoading}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Licoes Concluidas"
            value={totalLessonsCompleted}
            icon={Target}
            iconBgColor="bg-indigo-100 dark:bg-indigo-900/30"
            iconColor="text-indigo-600 dark:text-indigo-400"
            isLoading={usersLoading}
          />
          <StatCard
            title="Sequencia Media"
            value={`${averageStreak} dias`}
            icon={Flame}
            iconBgColor="bg-orange-100 dark:bg-orange-900/30"
            iconColor="text-orange-600 dark:text-orange-400"
            isLoading={usersLoading}
          />
          <StatCard
            title="Nivel Medio"
            value={averageLevel}
            icon={GraduationCap}
            iconBgColor="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            isLoading={usersLoading}
          />
          <StatCard
            title="Total de Revistas"
            value={stats?.totalWeeks || 0}
            icon={Trophy}
            iconBgColor="bg-rose-100 dark:bg-rose-900/30"
            iconColor="text-rose-600 dark:text-rose-400"
            isLoading={statsLoading}
          />
        </div>

        {eventStats && eventStats.totalEvents > 0 && (
          <Card className="bg-gradient-to-r from-purple-600 to-pink-500 border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-white/20">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold text-white">
                    Eventos Especiais
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-white/80">Metricas dos eventos do sistema</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-white">{eventStats.totalEvents}</p>
                  <p className="text-xs sm:text-sm text-white/80">Total de Eventos</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-green-300">{eventStats.activeEvents}</p>
                  <p className="text-xs sm:text-sm text-white/80">Ativos</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-300">{eventStats.upcomingEvents}</p>
                  <p className="text-xs sm:text-sm text-white/80">Proximos</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-blue-300">{eventStats.completedEvents}</p>
                  <p className="text-xs sm:text-sm text-white/80">Concluidos</p>
                </div>
              </div>
              {eventStats.recentEvents && eventStats.recentEvents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-white/90">Historico de Eventos</p>
                  {eventStats.recentEvents.slice(0, 4).map((event) => (
                    <div key={event.id} className="flex items-center gap-3 bg-white/10 rounded-lg p-2 sm:p-3">
                      <Calendar className="h-4 w-4 text-white shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{event.title}</p>
                        <p className="text-xs text-white/70">{event.theme}</p>
                      </div>
                      <Badge className={`shrink-0 border-0 text-xs ${
                        event.status === 'published' ? 'bg-green-400/20 text-green-200' :
                        event.status === 'completed' ? 'bg-blue-400/20 text-blue-200' :
                        'bg-yellow-400/20 text-yellow-200'
                      }`}>
                        {event.status === 'published' ? 'Ativo' : event.status === 'completed' ? 'Concluido' : 'Rascunho'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg font-semibold">Top 10 Usuarios por XP</CardTitle>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Ranking de pontuacao</p>
            </CardHeader>
            <CardContent className="pt-4 px-2 sm:px-6">
              {isLoading ? (
                <Skeleton className="h-[250px] sm:h-[300px] w-full" />
              ) : topUsers.length > 0 ? (
                <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
                  <BarChart data={topUsers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={60} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: number) => [value.toLocaleString('pt-BR'), 'XP']} />
                    <Bar dataKey="xp" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground">
                  <p className="text-sm">Nenhum usuario encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg font-semibold">Distribuicao por Nivel</CardTitle>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Usuarios por faixa de nivel</p>
            </CardHeader>
            <CardContent className="pt-4 px-2 sm:px-6">
              {isLoading ? (
                <Skeleton className="h-[250px] sm:h-[300px] w-full" />
              ) : levelDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
                  <PieChart>
                    <Pie
                      data={levelDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                    >
                      {levelDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Usuarios']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground">
                  <p className="text-sm">Nenhum dado disponivel</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg font-semibold">Distribuicao de Sequencias</CardTitle>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Usuarios por dias de sequencia</p>
          </CardHeader>
          <CardContent className="pt-4 px-2 sm:px-6">
            {isLoading ? (
              <Skeleton className="h-[200px] sm:h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200} className="sm:!h-[250px]">
                <BarChart data={streakDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="range" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => [value, 'Usuarios']} />
                  <Bar dataKey="count" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 px-4 sm:px-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold">Resumo do Sistema</CardTitle>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Metricas principais</p>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                Atualizado
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {[
                { icon: Users, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30", label: "Total de Usuarios Cadastrados", value: users.length },
                { icon: TrendingUp, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30", label: "Usuarios Ativos (7 dias)", value: activeUsers },
                { icon: BookOpen, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900/30", label: "Total de Revistas", value: stats?.totalWeeks || 0 },
                { icon: Target, color: "text-indigo-500", bg: "bg-indigo-100 dark:bg-indigo-900/30", label: "Total de Licoes", value: stats?.totalLessons || 0 },
                { icon: Zap, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30", label: "XP Total Distribuido", value: totalXpEarned.toLocaleString('pt-BR') },
                { icon: Flame, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30", label: "Sequencia Media", value: `${averageStreak} dias` },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className={`p-2 rounded-lg shrink-0 ${item.bg}`}>
                    <item.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${item.color}`} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">{item.label}</span>
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DeoGloryAdminLayout>
  );
}
