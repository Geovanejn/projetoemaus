import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  CreditCard, 
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  Bell
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

type MemberTaxStatus = {
  userId: number;
  fullName: string;
  email: string;
  photoUrl: string | null;
  percaptaPaid: boolean;
  umpMonthsPaid: number[];
  totalOwed: number;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function TesourariaTaxas() {
  const { hasTreasuryPanel } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "uptodate" | "overdue">("all");
  const currentYear = new Date().getFullYear();
  const { toast } = useToast();

  const { data: members, isLoading } = useQuery<MemberTaxStatus[]>({
    queryKey: [`/api/treasury/members/tax-status/${currentYear}`],
    enabled: hasTreasuryPanel,
  });

  const sendRemindersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/treasury/notifications/bulk-reminder", { year: currentYear });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Lembretes enviados",
        description: data.message || `${data.sent ?? 0} lembrete(s) enviado(s)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar lembretes",
        description: error.message || "Nao foi possivel enviar os lembretes",
        variant: "destructive",
      });
    },
  });

  if (!hasTreasuryPanel) {
    setLocation("/admin");
    return null;
  }

  const filteredMembers = members?.filter((member) => {
    const matchesSearch = !searchTerm || 
      member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === "uptodate") {
      return matchesSearch && member.totalOwed === 0;
    }
    if (statusFilter === "overdue") {
      return matchesSearch && member.totalOwed > 0;
    }
    return matchesSearch;
  }) ?? [];

  const upToDateCount = members?.filter(m => m.totalOwed === 0).length ?? 0;
  const overdueCount = members?.filter(m => m.totalOwed > 0).length ?? 0;
  const totalDebt = members?.reduce((sum, m) => sum + m.totalOwed, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-br from-amber-600 via-orange-600 to-orange-700 text-white py-8">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link href="/admin/tesouraria">
              <Button 
                variant="ghost" 
                className="mb-4 text-white/80 gap-2"
                data-testid="button-back-treasury"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-taxes-title">
                    Taxas dos Membros
                  </h1>
                  <p className="text-white/80">
                    Percapta e Taxa UMP - {currentYear}
                  </p>
                </div>
              </div>
              <Button 
                className="gap-2 bg-white/20" 
                data-testid="button-send-reminders"
                onClick={() => sendRemindersMutation.mutate()}
                disabled={sendRemindersMutation.isPending || overdueCount === 0}
              >
                {sendRemindersMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {sendRemindersMutation.isPending ? "Enviando..." : "Enviar Lembretes"}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-6 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{members?.length ?? 0}</div>
                    <p className="text-sm text-muted-foreground">Total de Membros</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{upToDateCount}</div>
                    <p className="text-sm text-muted-foreground">Em Dia</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <CreditCard className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalDebt)}</div>
                    <p className="text-sm text-muted-foreground">Total em Debito</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <CardTitle>Lista de Membros</CardTitle>
                  <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar membro..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        data-testid="input-search-members"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="all" data-testid="tab-all">
                      Todos ({members?.length ?? 0})
                    </TabsTrigger>
                    <TabsTrigger value="uptodate" data-testid="tab-uptodate">
                      Em Dia ({upToDateCount})
                    </TabsTrigger>
                    <TabsTrigger value="overdue" data-testid="tab-overdue">
                      Pendentes ({overdueCount})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={statusFilter}>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <div className="py-12 text-center">
                        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Nenhum membro encontrado
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Membro</TableHead>
                              <TableHead className="text-center">Percapta</TableHead>
                              {monthNames.map((month, i) => (
                                <TableHead key={i} className="text-center px-2 text-xs">
                                  {month}
                                </TableHead>
                              ))}
                              <TableHead className="text-right">Total Devido</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredMembers.map((member) => (
                              <TableRow key={member.userId} data-testid={`row-member-${member.userId}`}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={member.photoUrl ?? undefined} />
                                      <AvatarFallback>
                                        {member.fullName.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <div className="font-medium truncate">{member.fullName}</div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {member.email}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {member.percaptaPaid ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                                  )}
                                </TableCell>
                                {monthNames.map((_, i) => (
                                  <TableCell key={i} className="text-center px-2">
                                    {member.umpMonthsPaid.includes(i + 1) ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                                    )}
                                  </TableCell>
                                ))}
                                <TableCell className="text-right">
                                  {member.totalOwed > 0 ? (
                                    <span className="font-medium text-red-600">
                                      {formatCurrency(member.totalOwed)}
                                    </span>
                                  ) : (
                                    <Badge variant="outline" className="text-green-600">
                                      Em dia
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
