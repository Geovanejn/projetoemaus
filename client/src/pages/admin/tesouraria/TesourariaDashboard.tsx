import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Wallet, 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  Receipt,
  FileText,
  Settings,
  CreditCard,
  Landmark,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { TreasuryDashboardSummary } from "@shared/schema";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

type MonthlyData = {
  month: number;
  monthName: string;
  income: number;
  expense: number;
};

type CategoryExpense = {
  category: string;
  amount: number;
};

const CATEGORY_COLORS = [
  "#f97316", "#ef4444", "#3b82f6", "#22c55e", "#8b5cf6", 
  "#ec4899", "#14b8a6", "#f59e0b", "#6366f1", "#84cc16"
];

const categoryLabels: Record<string, string> = {
  "taxa_ump": "Taxa UMP",
  "taxa_percapta": "Percapta",
  "emprestimo": "Emprestimo",
  "evento": "Evento",
  "loja": "Loja",
  "oferta": "Oferta",
  "doacao": "Doacao",
  "projeto": "Projeto",
  "manutencao": "Manutencao",
  "outros": "Outros",
};

const menuItems = [
  {
    id: "entradas-saidas",
    title: "Entradas e Saídas",
    description: "Registrar e visualizar movimentações financeiras",
    icon: Receipt,
    href: "/admin/tesouraria/movimentacoes",
    color: "text-green-600 dark:text-green-400",
  },
  {
    id: "taxas",
    title: "Taxas dos Membros",
    description: "Gerenciar Percapta e Taxa UMP",
    icon: CreditCard,
    href: "/admin/tesouraria/taxas",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "emprestimos",
    title: "Empréstimos",
    description: "Controlar empréstimos e parcelas",
    icon: Landmark,
    href: "/admin/tesouraria/emprestimos",
    color: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "relatorios",
    title: "Relatórios",
    description: "Gerar relatórios financeiros",
    icon: FileText,
    href: "/admin/tesouraria/relatorios",
    color: "text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "configuracoes",
    title: "Configurações",
    description: "Valores anuais e chave PIX",
    icon: Settings,
    href: "/admin/tesouraria/configuracoes",
    color: "text-gray-600 dark:text-gray-400",
  },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

export default function TesourariaDashboard() {
  const { user, hasTreasuryPanel } = useAuth();
  const [, setLocation] = useLocation();

  const { data: summary, isLoading } = useQuery<TreasuryDashboardSummary>({
    queryKey: ["/api/treasury/dashboard/summary"],
    enabled: hasTreasuryPanel,
  });

  const { data: monthlyData, isLoading: isLoadingMonthly } = useQuery<MonthlyData[]>({
    queryKey: ["/api/treasury/dashboard/monthly"],
    enabled: hasTreasuryPanel,
  });

  const { data: categoryData, isLoading: isLoadingCategory } = useQuery<CategoryExpense[]>({
    queryKey: ["/api/treasury/dashboard/category-expenses"],
    enabled: hasTreasuryPanel,
  });

  const { data: incomeData, isLoading: isLoadingIncome } = useQuery<CategoryExpense[]>({
    queryKey: ["/api/treasury/dashboard/category-income"],
    enabled: hasTreasuryPanel,
  });

  if (!hasTreasuryPanel) {
    setLocation("/admin");
    return null;
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-br from-amber-600 via-orange-600 to-orange-700 text-white py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link href="/admin">
              <Button 
                variant="ghost" 
                className="mb-4 text-white/80 gap-2"
                data-testid="button-back-admin"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Admin
              </Button>
            </Link>
            <div className="flex items-center gap-4 mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20">
                <Wallet className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-treasury-title">
                  Tesouraria
                </h1>
                <p className="text-white/80">
                  Gestão Financeira - {currentYear}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-8 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Entradas
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-total-income">
                    {isLoading ? "..." : formatCurrency(summary?.totalIncome ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total do ano
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Saídas
                  </CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600" data-testid="text-total-expense">
                    {isLoading ? "..." : formatCurrency(summary?.totalExpense ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total do ano
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Saldo
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div 
                    className={`text-2xl font-bold ${
                      (summary?.balance ?? 0) >= 0 ? "text-primary" : "text-red-600"
                    }`}
                    data-testid="text-balance"
                  >
                    {isLoading ? "..." : formatCurrency(summary?.balance ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Atual
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Membros
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-green-600" data-testid="text-members-uptodate">
                      {isLoading ? "..." : summary?.membersUpToDate ?? 0}
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-lg text-red-600" data-testid="text-members-overdue">
                      {isLoading ? "..." : summary?.membersOverdue ?? 0}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Em dia / Pendentes
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {(summary?.pendingLoans ?? 0) > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                <CardContent className="flex items-center gap-4 p-4">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      {summary?.pendingLoans} emprestimo(s) ativo(s)
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      {summary?.pendingInstallments} parcela(s) pendente(s) de pagamento
                    </p>
                  </div>
                  <Link href="/admin/tesouraria/emprestimos">
                    <Button variant="outline" size="sm" data-testid="button-view-loans">
                      Ver Detalhes
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Movimentacao Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingMonthly ? (
                  <div className="flex items-center justify-center h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <XAxis 
                          dataKey="monthName" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `R$${(value / 100).toFixed(0)}`}
                        />
                        <Tooltip 
                          formatter={(value: number) => 
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)
                          }
                          labelFormatter={(label) => `Mes: ${label}`}
                        />
                        <Legend />
                        <Bar 
                          dataKey="income" 
                          name="Entradas" 
                          fill="#22c55e" 
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="expense" 
                          name="Saidas" 
                          fill="#ef4444" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Income and Expense Charts - Side by side on desktop, stacked on mobile */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {/* Income by Category */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Entradas por Categoria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingIncome ? (
                    <div className="flex items-center justify-center h-[200px]">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : !incomeData || incomeData.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                      Sem entradas registradas
                    </div>
                  ) : (
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={incomeData}
                            cx="50%"
                            cy="45%"
                            innerRadius={30}
                            outerRadius={60}
                            paddingAngle={2}
                            dataKey="amount"
                            nameKey="category"
                          >
                            {incomeData.map((_, index) => (
                              <Cell 
                                key={`cell-income-${index}`} 
                                fill={["#22c55e", "#16a34a", "#15803d", "#166534", "#14532d", "#84cc16", "#65a30d"][index % 7]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => 
                              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)
                            }
                            labelFormatter={(label) => categoryLabels[label] || label}
                          />
                          <Legend 
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            formatter={(value) => categoryLabels[value] || value}
                            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Expenses by Category */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    Despesas por Categoria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingCategory ? (
                    <div className="flex items-center justify-center h-[200px]">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : !categoryData || categoryData.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                      Sem despesas registradas
                    </div>
                  ) : (
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="45%"
                            innerRadius={30}
                            outerRadius={60}
                            paddingAngle={2}
                            dataKey="amount"
                            nameKey="category"
                          >
                            {categoryData.map((_, index) => (
                              <Cell 
                                key={`cell-expense-${index}`} 
                                fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => 
                              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)
                            }
                            labelFormatter={(label) => categoryLabels[label] || label}
                          />
                          <Legend 
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            formatter={(value) => categoryLabels[value] || value}
                            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 4) }}
              >
                <Link href={item.href}>
                  <Card className="hover-elevate cursor-pointer h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1" data-testid={`menu-title-${item.id}`}>
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
