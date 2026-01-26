import { useQuery } from "@tanstack/react-query";
import { DeoGloryAdminLayout } from "@/components/deoglory/DeoGloryAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  CheckCircle,
  Clock,
  FileText,
  Zap,
  BookOpen,
  Target,
  Award,
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
  LineChart,
  Line,
} from "recharts";

interface StudyStats {
  totalUsers: number;
  activeUsers: number;
  totalLessons: number;
  completedLessons: number;
  totalXpEarned: number;
  averageStreak: number;
}

interface MemberProgress {
  id: number;
  fullName: string;
  avatarUrl: string | null;
  currentXp: number;
  currentLevel: number;
  streak: number;
  lessonsCompleted: number;
}

interface MonthlyProgress {
  month: string;
  lessonsCompleted: number;
  xpEarned: number;
}

interface WeeklyActivity {
  day: string;
  date: string;
  lessonsCompleted: number;
  uniqueUsers: number;
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
    imageUrl: string | null;
  }[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
}

function StatCard({ title, value, icon: Icon, iconBgColor, iconColor }: StatCardProps) {
  return (
    <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1 sm:space-y-2 min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
            <p className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
          <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${iconBgColor}`}>
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PerformanceIndicatorProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}

function PerformanceIndicator({ title, value, subtitle, icon: Icon, color }: PerformanceIndicatorProps) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
      <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${color}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{subtitle}</p>
      </div>
    </div>
  );
}

export default function DeoGloryDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<StudyStats>({
    queryKey: ["/api/study/admin/stats"],
  });

  const { data: topMembers, isLoading: membersLoading } = useQuery<MemberProgress[]>({
    queryKey: ["/api/study/admin/weekly-top-members"],
  });

  const { data: monthlyProgress, isLoading: monthlyLoading } = useQuery<MonthlyProgress[]>({
    queryKey: ["/api/study/admin/monthly-progress"],
  });

  const { data: weeklyActivity, isLoading: weeklyLoading } = useQuery<WeeklyActivity[]>({
    queryKey: ["/api/study/admin/weekly-activity"],
  });

  const { data: eventStats, isLoading: eventsLoading } = useQuery<EventStats>({
    queryKey: ["/api/study/admin/events-stats"],
  });

  return (
    <DeoGloryAdminLayout title="Dashboard" subtitle="Visao geral do seu aplicativo de estudo biblico">
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-white dark:bg-gray-800 border-0 shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <Skeleton className="h-16 sm:h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Usuarios Ativos"
                value={stats?.activeUsers?.toLocaleString() || "0"}
                icon={Users}
                iconBgColor="bg-violet-100 dark:bg-violet-900/30"
                iconColor="text-violet-600 dark:text-violet-400"
              />
              <StatCard
                title="Estudos Concluidos"
                value={stats?.completedLessons?.toLocaleString() || "0"}
                icon={CheckCircle}
                iconBgColor="bg-green-100 dark:bg-green-900/30"
                iconColor="text-green-600 dark:text-green-400"
              />
              <StatCard
                title="Sequencia Media"
                value={`${Math.round(stats?.averageStreak || 0)} dias`}
                icon={Clock}
                iconBgColor="bg-blue-100 dark:bg-blue-900/30"
                iconColor="text-blue-600 dark:text-blue-400"
              />
              <StatCard
                title="Licoes Ativas"
                value={stats?.totalLessons || "0"}
                icon={FileText}
                iconBgColor="bg-purple-100 dark:bg-purple-900/30"
                iconColor="text-purple-600 dark:text-purple-400"
              />
            </>
          )}
        </div>

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
                <p className="text-xs sm:text-sm text-white/80">Resumo dos eventos do sistema</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {eventsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 bg-white/20" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-white">{eventStats?.totalEvents || 0}</p>
                  <p className="text-xs sm:text-sm text-white/80">Total de Eventos</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-green-300">{eventStats?.activeEvents || 0}</p>
                  <p className="text-xs sm:text-sm text-white/80">Ativos Agora</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-300">{eventStats?.upcomingEvents || 0}</p>
                  <p className="text-xs sm:text-sm text-white/80">Proximos</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                  <p className="text-2xl sm:text-3xl font-bold text-blue-300">{eventStats?.completedEvents || 0}</p>
                  <p className="text-xs sm:text-sm text-white/80">Concluidos</p>
                </div>
              </div>
            )}
            {eventStats?.recentEvents && eventStats.recentEvents.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-white/90">Eventos Recentes</p>
                {eventStats.recentEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="flex items-center gap-3 bg-white/10 rounded-lg p-2 sm:p-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{event.title}</p>
                      <p className="text-xs text-white/70">{event.theme}</p>
                    </div>
                    <Badge className={`shrink-0 border-0 ${
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Progresso de Estudos
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">Ultimos 6 meses</p>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {monthlyLoading ? (
                <Skeleton className="h-48 sm:h-64 w-full" />
              ) : monthlyProgress && monthlyProgress.length > 0 ? (
                <ResponsiveContainer width="100%" height={200} className="sm:!h-[250px]">
                  <LineChart data={monthlyProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ fontSize: 12 }}
                      formatter={(value: number, name: string) => [
                        value.toLocaleString('pt-BR'),
                        name === 'lessonsCompleted' ? 'Licoes' : 'XP'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="lessonsCompleted" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
                      name="Licoes"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm text-center px-4">Nenhum dado de progresso disponivel</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Atividade Semanal
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">Ultimos 7 dias</p>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {weeklyLoading ? (
                <Skeleton className="h-48 sm:h-64 w-full" />
              ) : weeklyActivity && weeklyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={200} className="sm:!h-[250px]">
                  <BarChart data={weeklyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="day" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ fontSize: 12 }}
                      formatter={(value: number, name: string) => [
                        value,
                        name === 'lessonsCompleted' ? 'Licoes' : 'Usuarios'
                      ]}
                    />
                    <Bar 
                      dataKey="lessonsCompleted" 
                      fill="#10B981" 
                      radius={[4, 4, 0, 0]}
                      name="Licoes"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm text-center px-4">Nenhuma atividade nos ultimos 7 dias</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
          <CardHeader className="pb-4 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Indicadores de Desempenho
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <PerformanceIndicator
                title="Media Ofensiva"
                value={stats?.averageStreak?.toFixed(1) || "0"}
                subtitle="dias consecutivos"
                icon={Zap}
                color="bg-orange-500"
              />
              <PerformanceIndicator
                title="XP Total"
                value={stats?.totalXpEarned?.toLocaleString() || "0"}
                subtitle="pontos de experiencia"
                icon={Award}
                color="bg-violet-600"
              />
              <PerformanceIndicator
                title="Taxa de Conclusao"
                value={stats?.totalLessons ? `${Math.round((stats.completedLessons / stats.totalLessons) * 100)}%` : "0%"}
                subtitle="licoes completadas"
                icon={Target}
                color="bg-green-500"
              />
              <PerformanceIndicator
                title="Membros Ativos"
                value={stats?.activeUsers || 0}
                subtitle="usuarios engajados"
                icon={Users}
                color="bg-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Top Membros
              </CardTitle>
              <Badge variant="outline" className="text-violet-600 border-violet-200 text-xs">
                Esta Semana
              </Badge>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-3 sm:space-y-4">
                {membersLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-6 w-16 shrink-0" />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {topMembers?.slice(0, 5).map((member, index) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        data-testid={`top-member-${member.id}`}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                            <AvatarImage src={member.avatarUrl || undefined} />
                            <AvatarFallback className="bg-violet-100 text-violet-600 text-sm">
                              {member.fullName?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          {index < 3 && (
                            <div className={`absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white ${
                              index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : "bg-amber-600"
                            }`}>
                              {index + 1}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
                            {member.fullName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Nivel {member.currentLevel} | {member.lessonsCompleted} licoes
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm sm:text-base text-violet-600">{member.currentXp?.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">XP</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Resumo do Sistema
              </CardTitle>
              <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                Tempo Real
              </Badge>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 shrink-0">
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      Total de Licoes
                    </p>
                  </div>
                  <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">
                    {stats?.totalLessons || 0}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-900/30 shrink-0">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      Estudos Concluidos
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                    {stats?.completedLessons || 0}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      Total de Usuarios
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                    {stats?.totalUsers || 0}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 shrink-0">
                    <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      XP Total Gerado
                    </p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                    {stats?.totalXpEarned?.toLocaleString() || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DeoGloryAdminLayout>
  );
}
