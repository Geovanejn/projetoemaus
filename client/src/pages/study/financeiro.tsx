import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/study";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PixPaymentModal } from "@/components/PixPaymentModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronLeft,
  Wallet,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  Calendar,
  TrendingUp,
  Loader2,
  QrCode,
  RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MemberFinancialStatus {
  memberId: number;
  memberName: string;
  isActiveMember: boolean; // CRITICAL: Only active members pay percapta/UMP
  year: number;
  percaptaStatus: {
    amount: number;
    paidAmount: number;
    isPaid: boolean;
    dueDate: string | null;
  };
  umpStatus: {
    monthlyAmount: number;
    paidMonths: number[];
    unpaidMonths: number[];
    totalOwed: number;
    totalPaid: number;
  };
  totalOwed: number;
  transactions: {
    id: number;
    type: string;
    amount: number;
    description: string;
    status: string;
    createdAt: string;
  }[];
}

interface MemberEvent {
  id: number;
  eventId: number;
  eventName: string;
  eventDate: string | null;
  eventImageUrl: string | null;
  isVisitor: boolean;
  visitorCount: number;
  confirmedAt: string | null;
  totalAmount: number;
  hasFee: boolean;
  isPaid: boolean;
}

interface ShopInstallment {
  id: number;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
  pixTransactionId: string | null;
}

interface MemberShopOrder {
  id: number;
  orderCode: string;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  items: { productName: string; quantity: number }[];
  installments: ShopInstallment[];
  hasInstallments: boolean;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const monthNames = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export default function FinanceiroPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixPaymentData, setPixPaymentData] = useState<{
    entryId: number;
    amount: number;
    description: string;
  } | null>(null);

  const { data: financial, isLoading, error, refetch } = useQuery<MemberFinancialStatus>({
    queryKey: ["treasury-member-status", currentYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/treasury/member/status?year=${currentYear}`);
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: memberEvents, isLoading: isLoadingEvents, refetch: refetchEvents } = useQuery<MemberEvent[]>({
    queryKey: ["treasury-member-events", currentYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/treasury/member/events?year=${currentYear}`);
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: shopOrders, isLoading: isLoadingShopOrders, refetch: refetchShopOrders } = useQuery<MemberShopOrder[]>({
    queryKey: ["treasury-member-shop-orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/treasury/member/shop-orders");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: pixStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/pix/status"],
    enabled: isAuthenticated,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (params: { type: "percapta" | "ump"; months?: number[] }) => {
      const res = await apiRequest("POST", "/api/pix/member-fee", {
        type: params.type,
        year: currentYear,
        months: params.months,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPixPaymentData({
        entryId: data.entryId,
        amount: data.amount,
        description: data.type === "percapta" ? `Taxa Percapta ${currentYear}` : `Taxa UMP ${currentYear}`,
      });
      setPixModalOpen(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePayPercapta = () => {
    if (!pixStatus?.configured) {
      toast({
        title: "PIX não configurado",
        description: "Sistema de pagamento PIX ainda não está disponível.",
        variant: "destructive",
      });
      return;
    }
    createPaymentMutation.mutate({ type: "percapta" });
  };

  const handlePayUmp = () => {
    if (!pixStatus?.configured) {
      toast({
        title: "PIX não configurado",
        description: "Sistema de pagamento PIX ainda não está disponível.",
        variant: "destructive",
      });
      return;
    }
    if (!financial) return;
    createPaymentMutation.mutate({ type: "ump", months: financial.umpStatus.unpaidMonths });
  };

  const handlePaySingleUmpMonth = (month: number) => {
    if (!pixStatus?.configured) {
      toast({
        title: "PIX não configurado",
        description: "Sistema de pagamento PIX ainda não está disponível.",
        variant: "destructive",
      });
      return;
    }
    if (!financial) return;
    createPaymentMutation.mutate({ type: "ump", months: [month] });
  };

  // Pay full year (anticipate all remaining months until December)
  const handlePayFullYear = () => {
    if (!pixStatus?.configured) {
      toast({
        title: "PIX não configurado",
        description: "Sistema de pagamento PIX ainda não está disponível.",
        variant: "destructive",
      });
      return;
    }
    if (!financial) return;
    // Get all unpaid months (1-12) - includes past unpaid and future months
    const allUnpaidMonths = [];
    for (let m = 1; m <= 12; m++) {
      if (!financial.umpStatus.paidMonths.includes(m)) {
        allUnpaidMonths.push(m);
      }
    }
    if (allUnpaidMonths.length === 0) {
      toast({
        title: "Ano completo",
        description: "Todos os meses já estão pagos!",
      });
      return;
    }
    createPaymentMutation.mutate({ type: "ump", months: allUnpaidMonths });
  };

  const [payingEventId, setPayingEventId] = useState<number | null>(null);

  const createEventPaymentMutation = useMutation({
    mutationFn: async (eventId: number) => {
      setPayingEventId(eventId);
      const res = await apiRequest("POST", `/api/pix/event-fee/${eventId}`);
      return res.json();
    },
    onSuccess: (data, eventId) => {
      const event = memberEvents?.find(e => e.eventId === eventId);
      setPixPaymentData({
        entryId: data.entryId,
        amount: data.amount,
        description: event?.eventName ? `Taxa: ${event.eventName}` : `Taxa de Evento`,
      });
      setPixModalOpen(true);
      setPayingEventId(null);
    },
    onError: (error: Error) => {
      setPayingEventId(null);
      toast({
        title: "Erro ao gerar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePayEvent = (eventId: number) => {
    if (!pixStatus?.configured) {
      toast({
        title: "PIX não configurado",
        description: "Sistema de pagamento PIX ainda não está disponível.",
        variant: "destructive",
      });
      return;
    }
    createEventPaymentMutation.mutate(eventId);
  };

  const handlePaymentComplete = () => {
    refetch();
    refetchEvents();
    refetchShopOrders();
    setPixModalOpen(false);
    setPixPaymentData(null);
  };

  // Mutation for shop installment PIX payment
  const [payingInstallmentId, setPayingInstallmentId] = useState<number | null>(null);
  const [installmentPixData, setInstallmentPixData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    amount: number;
    expiresAt: string;
  } | null>(null);

  const createInstallmentPaymentMutation = useMutation({
    mutationFn: async (installmentId: number) => {
      setPayingInstallmentId(installmentId);
      const res = await apiRequest("POST", `/api/pix/shop-installment/${installmentId}`);
      return res.json();
    },
    onSuccess: (data) => {
      setInstallmentPixData({
        qrCode: data.qrCode,
        qrCodeBase64: data.qrCodeBase64,
        amount: data.amount,
        expiresAt: data.expiresAt,
      });
      setPayingInstallmentId(null);
    },
    onError: (error: Error) => {
      setPayingInstallmentId(null);
      toast({
        title: "Erro ao gerar PIX",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePayInstallment = (installmentId: number) => {
    if (!pixStatus?.configured) {
      toast({
        title: "PIX não configurado",
        description: "Sistema de pagamento PIX ainda não está disponível.",
        variant: "destructive",
      });
      return;
    }
    createInstallmentPaymentMutation.mutate(installmentId);
  };

  // Mutation to manually verify PIX payment status
  const [verifyingEntryId, setVerifyingEntryId] = useState<number | null>(null);
  const verifyPaymentMutation = useMutation({
    mutationFn: async (entryId: number) => {
      setVerifyingEntryId(entryId);
      const res = await apiRequest("GET", `/api/pix/check/${entryId}`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.approved || data.status === "completed") {
        toast({
          title: "Pagamento confirmado!",
          description: "Seu pagamento foi aprovado com sucesso.",
        });
        // Invalidate all treasury-member caches using predicate
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && key.startsWith('treasury-member');
          }
        });
        refetch();
        refetchEvents();
      } else if (data.status === "expired") {
        toast({
          title: "PIX expirado",
          description: "O QR Code expirou. Gere um novo pagamento.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Pagamento pendente",
          description: "O pagamento ainda não foi confirmado. Tente novamente em alguns instantes.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao verificar",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always reset spinner state when mutation completes (success or error)
      setVerifyingEntryId(null);
    },
  });

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const paidPercentage = financial 
    ? ((financial.umpStatus.paidMonths.length / 12) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background pb-10">
      <section className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 text-white py-6">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link href="/admin">
              <Button 
                variant="ghost" 
                className="mb-2 text-white/80 gap-2"
                data-testid="button-back-dashboard"
              >
                <ChevronLeft className="h-4 w-4" />
                Painéis
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-financeiro-title">
                  Meu Financeiro
                </h1>
                <p className="text-white/80">
                  Taxas e contribuições - {currentYear}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-6">
        <div className="container mx-auto px-4 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h3 className="font-medium mb-2">Erro ao carregar dados</h3>
                <p className="text-muted-foreground mb-4">
                  Não foi possível carregar suas informações financeiras. Verifique sua conexão e tente novamente.
                </p>
                <Button onClick={() => { refetch(); refetchEvents(); }} data-testid="button-retry-financial">
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : financial ? (
            <>
              {financial.isActiveMember && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={cn(
                    financial.totalOwed === 0 
                      ? "bg-green-50 dark:bg-green-900/20" 
                      : "bg-amber-50 dark:bg-amber-900/20"
                  )}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Situação Atual</p>
                          <p className="text-2xl font-bold">
                            {financial.totalOwed === 0 ? (
                              <span className="text-green-600 dark:text-green-400">Em dia</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">
                                {formatCurrency(financial.totalOwed)} pendente
                              </span>
                            )}
                          </p>
                        </div>
                        {financial.totalOwed === 0 ? (
                          <CheckCircle className="h-10 w-10 text-green-500" />
                        ) : (
                          <Clock className="h-10 w-10 text-amber-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="relative overflow-hidden">
                  {!financial.isActiveMember && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                      <div className="bg-primary px-4 py-2 rounded-md">
                        <span className="text-primary-foreground font-medium text-sm">
                          Seja um sócio ativo
                        </span>
                      </div>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">Taxa Percapta</CardTitle>
                      <Badge 
                        variant={financial.percaptaStatus.isPaid ? "default" : "secondary"}
                        className={financial.percaptaStatus.isPaid ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                        data-testid="badge-percapta-status"
                      >
                        {financial.percaptaStatus.isPaid ? "Pago" : "Pendente"}
                      </Badge>
                    </div>
                    <CardDescription>
                      Taxa anual obrigatória
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Valor anual:</span>
                      <span className="font-medium">
                        {formatCurrency(financial.percaptaStatus.amount)}
                      </span>
                    </div>
                    {!financial.percaptaStatus.isPaid && financial.isActiveMember && (
                      <Button 
                        className="w-full gap-2"
                        onClick={handlePayPercapta}
                        disabled={createPaymentMutation.isPending}
                        data-testid="button-pay-percapta"
                      >
                        {createPaymentMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <QrCode className="h-4 w-4" />
                        )}
                        Pagar via PIX
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="relative overflow-hidden">
                  {!financial.isActiveMember && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                      <div className="bg-primary px-4 py-2 rounded-md">
                        <span className="text-primary-foreground font-medium text-sm">
                          Seja um sócio ativo
                        </span>
                      </div>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">Taxa UMP Emaús</CardTitle>
                      <Badge 
                        variant={financial.umpStatus.unpaidMonths.length === 0 ? "default" : "secondary"}
                        className={financial.umpStatus.unpaidMonths.length === 0 ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                        data-testid="badge-ump-status"
                      >
                        {financial.umpStatus.paidMonths.length}/12 meses
                      </Badge>
                    </div>
                    <CardDescription>
                      Contribuição mensal - {formatCurrency(financial.umpStatus.monthlyAmount)}/mês
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progresso anual</span>
                        <span className="font-medium">{Math.round(paidPercentage)}%</span>
                      </div>
                      <Progress value={paidPercentage} className="h-2" />
                    </div>

                    <div className="grid grid-cols-6 gap-2">
                      {monthNames.map((month, index) => {
                        const monthNum = index + 1;
                        const isPaid = financial.umpStatus.paidMonths.includes(monthNum);
                        const currentMonth = new Date().getMonth() + 1;
                        const isFuture = monthNum > currentMonth;

                        return (
                          <div
                            key={month}
                            className={cn(
                              "p-2 rounded-md text-center text-xs font-medium",
                              isPaid && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                              !isPaid && !isFuture && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                              isFuture && !isPaid && "bg-muted text-muted-foreground"
                            )}
                            data-testid={`month-status-${monthNum}`}
                          >
                            {month}
                            <div className="mt-1">
                              {isPaid ? (
                                <CheckCircle className="h-3 w-3 mx-auto" />
                              ) : isFuture ? (
                                <Clock className="h-3 w-3 mx-auto opacity-50" />
                              ) : (
                                <AlertCircle className="h-3 w-3 mx-auto" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {(() => {
                      // Calculate all unpaid months (including future ones) for full year anticipation
                      const allUnpaidMonths = [];
                      for (let m = 1; m <= 12; m++) {
                        if (!financial.umpStatus.paidMonths.includes(m)) {
                          allUnpaidMonths.push(m);
                        }
                      }
                      const fullYearAmount = allUnpaidMonths.length * financial.umpStatus.monthlyAmount;
                      const hasUnpaidMonths = allUnpaidMonths.length > 0;
                      const firstUnpaidMonth = allUnpaidMonths.length > 0 ? allUnpaidMonths[0] : null;
                      
                      // Outstanding months = unpaid past months (using existing umpStatus)
                      const hasPendingMonths = financial.umpStatus.unpaidMonths.length > 0;
                      const hasOnlyFutureMonths = hasPendingMonths && financial.umpStatus.totalOwed === 0;
                      
                      // Show full year option only if there are more months to pay than just outstanding
                      const showFullYearOption = allUnpaidMonths.length > financial.umpStatus.unpaidMonths.length;

                      if (!hasUnpaidMonths) return null;

                      return (
                        <div className="pt-2 space-y-3">
                          {/* Show pending/outstanding amount if any */}
                          {financial.umpStatus.totalOwed > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total pendente:</span>
                              <span className="font-medium text-amber-600 dark:text-amber-400">
                                {formatCurrency(financial.umpStatus.totalOwed)}
                              </span>
                            </div>
                          )}
                          
                          {/* Show full year anticipation amount if different from pending */}
                          {showFullYearOption && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Antecipar ano completo:</span>
                              <span className="font-medium text-primary">
                                {formatCurrency(fullYearAmount)}
                              </span>
                            </div>
                          )}
                          
                          {financial.isActiveMember ? (
                            <div className="space-y-2">
                              {/* Row 1: Monthly payment + Outstanding payment */}
                              <div className="flex flex-col sm:flex-row gap-2">
                                {firstUnpaidMonth && (
                                  <Button
                                    className="flex-1 gap-2 min-w-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                                    onClick={() => handlePaySingleUmpMonth(firstUnpaidMonth)}
                                    disabled={createPaymentMutation.isPending}
                                    data-testid="button-ump-single"
                                  >
                                    {createPaymentMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                                    ) : (
                                      <QrCode className="h-4 w-4 flex-shrink-0" />
                                    )}
                                    <span className="truncate">Pagar {monthNames[firstUnpaidMonth - 1]} ({formatCurrency(financial.umpStatus.monthlyAmount)})</span>
                                  </Button>
                                )}
                                
                                {/* Pay all outstanding months (not future) */}
                                {financial.umpStatus.unpaidMonths.length > 1 && (
                                  <Button
                                    className="flex-1 gap-2 min-w-0 bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
                                    onClick={handlePayUmp}
                                    disabled={createPaymentMutation.isPending}
                                    data-testid="button-ump-all-pending"
                                  >
                                    {createPaymentMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                                    ) : (
                                      <QrCode className="h-4 w-4 flex-shrink-0" />
                                    )}
                                    <span className="truncate">Pagar pendentes ({financial.umpStatus.unpaidMonths.length}x)</span>
                                  </Button>
                                )}
                              </div>
                              
                              {/* Row 2: Full year anticipation button */}
                              {showFullYearOption && (
                                <Button
                                  className="w-full gap-2 overflow-hidden bg-emerald-500 hover:bg-emerald-600 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
                                  onClick={handlePayFullYear}
                                  disabled={createPaymentMutation.isPending}
                                  data-testid="button-ump-full-year"
                                >
                                  {createPaymentMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                                  ) : (
                                    <QrCode className="h-4 w-4 flex-shrink-0" />
                                  )}
                                  <span className="truncate">Antecipar ano ({allUnpaidMonths.length}x) - {formatCurrency(fullYearAmount)}</span>
                                </Button>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Histórico de Pagamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {financial.transactions.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum pagamento registrado</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {financial.transactions.map((tx) => (
                          <div 
                            key={tx.id}
                            className="flex items-center justify-between py-2 border-b last:border-0"
                            data-testid={`transaction-${tx.id}`}
                          >
                            <div>
                              <p className="font-medium text-sm">{tx.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(tx.createdAt)}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <div>
                                <p className={cn(
                                  "font-medium",
                                  tx.status === "completed" 
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-amber-600 dark:text-amber-400"
                                )}>
                                  {formatCurrency(tx.amount)}
                                </p>
                                <Badge 
                                  variant={tx.status === "completed" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {tx.status === "completed" ? "Confirmado" : 
                                   tx.status === "pending" ? "Pendente" : 
                                   tx.status === "cancelled" ? "Cancelado" : tx.status}
                                </Badge>
                              </div>
                              {tx.status === "pending" && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => verifyPaymentMutation.mutate(tx.id)}
                                  disabled={verifyingEntryId === tx.id}
                                  title="Verificar pagamento"
                                  data-testid={`button-verify-${tx.id}`}
                                >
                                  {verifyingEntryId === tx.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Eventos com Taxa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingEvents ? (
                      <div className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : !memberEvents || memberEvents.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma inscricao em eventos</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {memberEvents.map((event) => (
                          <div 
                            key={event.id}
                            className="flex items-center justify-between py-2 border-b last:border-0"
                            data-testid={`member-event-${event.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{event.eventName}</p>
                              <p className="text-xs text-muted-foreground">
                                {event.eventDate ? formatDate(event.eventDate) : "Sem data"}
                                {event.visitorCount > 0 && (
                                  <span className="ml-2">+ {event.visitorCount} visitante(s)</span>
                                )}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2 flex items-center gap-2">
                              {event.hasFee && event.totalAmount > 0 ? (
                                <>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {formatCurrency(event.totalAmount)}
                                    </p>
                                    <Badge 
                                      variant={event.isPaid ? "default" : "secondary"}
                                      className={`text-xs ${event.isPaid ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                                    >
                                      {event.isPaid ? "Pago" : "Pendente"}
                                    </Badge>
                                  </div>
                                  {!event.isPaid && pixStatus?.configured && (
                                    <Button
                                      size="sm"
                                      onClick={() => handlePayEvent(event.eventId)}
                                      disabled={payingEventId === event.eventId}
                                      className="gap-1"
                                      data-testid={`button-pay-event-${event.eventId}`}
                                    >
                                      {payingEventId === event.eventId ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <QrCode className="h-3 w-3" />
                                      )}
                                      Pagar
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Sem taxa
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Shop Orders Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Pedidos da Loja
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Acompanhe seus pedidos e parcelas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingShopOrders ? (
                      <div className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : !shopOrders || shopOrders.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum pedido realizado</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {shopOrders.map((order) => (
                          <div 
                            key={order.id}
                            className="border rounded-md p-3"
                            data-testid={`shop-order-${order.id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium text-sm">Pedido #{order.orderCode}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(order.createdAt)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-sm">{formatCurrency(order.totalAmount)}</p>
                                <Badge 
                                  variant={order.paymentStatus === "paid" ? "default" : "secondary"}
                                  className={`text-xs ${order.paymentStatus === "paid" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                                >
                                  {order.paymentStatus === "paid" ? "Pago" : 
                                   order.paymentStatus === "partial" ? "Parcial" : "Pendente"}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Items summary */}
                            <div className="text-xs text-muted-foreground mb-2">
                              {order.items.map((item, idx) => (
                                <span key={idx}>
                                  {item.quantity}x {item.productName}
                                  {idx < order.items.length - 1 ? ", " : ""}
                                </span>
                              ))}
                            </div>

                            {/* Installments */}
                            {order.hasInstallments && order.installments.length > 0 ? (
                              <div className="space-y-2 mt-3 pt-2 border-t">
                                <p className="text-xs font-medium text-muted-foreground">Parcelas:</p>
                                {order.installments.map((inst) => (
                                  <div 
                                    key={inst.id}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 text-sm border-b last:border-0"
                                    data-testid={`installment-${inst.id}`}
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-medium">
                                        {inst.installmentNumber}ª parcela
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Venc: {formatDate(inst.dueDate)}
                                      </span>
                                      <span className="text-sm font-medium">
                                        {formatCurrency(inst.amount)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {inst.status === "paid" ? (
                                        <Badge className="text-xs bg-green-600 hover:bg-green-700 text-white">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Pago
                                        </Badge>
                                      ) : (
                                        <>
                                          <Badge variant="secondary" className="text-xs">
                                            <Clock className="h-3 w-3 mr-1" />
                                            Pendente
                                          </Badge>
                                          {pixStatus?.configured && (
                                            <Button
                                              size="sm"
                                              onClick={() => handlePayInstallment(inst.id)}
                                              disabled={payingInstallmentId === inst.id}
                                              className="gap-1"
                                              data-testid={`button-pay-installment-${inst.id}`}
                                            >
                                              {payingInstallmentId === inst.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <QrCode className="h-3 w-3" />
                                              )}
                                              PIX
                                            </Button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : order.paymentStatus !== "paid" && pixStatus?.configured && (
                              <div className="mt-2 pt-2 border-t">
                                <Link href={`/loja/pedidos`}>
                                  <Button size="sm" className="gap-1 w-full">
                                    <QrCode className="h-3 w-3" />
                                    Ver Pedido para Pagar
                                  </Button>
                                </Link>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Suas informações financeiras ainda não foram configuradas.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* PIX Modal for installments - inline since we have qrCode directly */}
      {installmentPixData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setInstallmentPixData(null)}>
          <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-center mb-4">Pagar Parcela via PIX</h3>
            <div className="text-center mb-4">
              <p className="text-2xl font-bold">{formatCurrency(installmentPixData.amount * 100)}</p>
            </div>
            {installmentPixData.qrCodeBase64 && (
              <div className="flex justify-center mb-4">
                <img 
                  src={`data:image/png;base64,${installmentPixData.qrCodeBase64}`} 
                  alt="QR Code PIX" 
                  className="w-48 h-48"
                />
              </div>
            )}
            {installmentPixData.qrCode && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground text-center mb-2">Ou copie o código:</p>
                <div className="bg-muted p-2 rounded text-xs break-all max-h-20 overflow-y-auto">
                  {installmentPixData.qrCode}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(installmentPixData.qrCode);
                    toast({ title: "Código copiado!", description: "Cole no app do seu banco." });
                  }}
                >
                  Copiar Código PIX
                </Button>
              </div>
            )}
            <Button 
              className="w-full" 
              onClick={() => {
                setInstallmentPixData(null);
                refetchShopOrders();
              }}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      {pixPaymentData && (
        <PixPaymentModal
          open={pixModalOpen}
          onOpenChange={setPixModalOpen}
          entryId={pixPaymentData.entryId}
          amount={pixPaymentData.amount}
          description={pixPaymentData.description}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}
