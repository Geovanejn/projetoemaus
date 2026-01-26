import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Receipt, 
  Plus,
  TrendingUp,
  TrendingDown,
  Search,
  Calendar,
  Loader2,
  ShoppingBag,
  CreditCard,
  User as UserIcon,
  CheckCircle,
  Clock,
  AlertTriangle,
  Bell,
  QrCode,
  Copy,
  Check,
  Hand,
  ExternalLink
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { TreasuryEntry, User } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

const categoryLabels: Record<string, string> = {
  taxa_percapta: "Taxa Percapta",
  taxa_ump: "Taxa UMP",
  percapta: "Percapta",
  ump: "Taxa UMP",
  loan: "Emprestimo",
  misc: "Diversos",
  event: "Evento",
  events: "Eventos",
  marketing: "Marketing",
  shop: "Loja",
  donation: "Doacao",
  other: "Outros",
};

const incomeCategories = [
  { value: "taxa_percapta", label: "Taxa Percapta" },
  { value: "taxa_ump", label: "Taxa UMP" },
  { value: "events", label: "Eventos" },
  { value: "shop", label: "Loja" },
  { value: "donation", label: "Doacao" },
  { value: "loan", label: "Pagamento Emprestimo" },
  { value: "other", label: "Outros" },
];

const expenseCategories = [
  { value: "events", label: "Eventos" },
  { value: "marketing", label: "Marketing" },
  { value: "loan", label: "Emprestimo" },
  { value: "misc", label: "Diversos" },
  { value: "other", label: "Outros" },
];

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  paid: { label: "Pago", variant: "default" },
  completed: { label: "Pago", variant: "default" },
  expired: { label: "Expirado", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
};

const orderStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  awaiting_payment: { label: "Aguardando Pagamento", variant: "secondary" },
  paid: { label: "Pago", variant: "default" },
  producing: { label: "Em Producao", variant: "outline" },
  ready: { label: "Pronto", variant: "default" },
  delivered: { label: "Entregue", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

interface ShopOrderWithDetails {
  id: number;
  orderCode: string;
  userId: number;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  installmentCount: number | null;
  createdAt: string;
  paidAt: string | null;
  user: { id: number; fullName: string; email: string; phone: string | null } | null;
  items: Array<{
    id: number;
    quantity: number;
    gender: string | null;
    size: string | null;
    unitPrice: number;
    product: { id: number; name: string; price: number } | null;
  }>;
  installments: Array<{
    id: number;
    installmentNumber: number;
    amount: number;
    dueDate: string;
    status: string;
    paidAt: string | null;
    isOverdue: boolean;
    pixCode?: string | null;
    pixExpiresAt?: string | null;
  }>;
  manualCustomerName?: string | null;
  isManualOrder?: boolean;
}

interface PixData {
  type: "total" | "installment";
  orderId?: number;
  installmentId?: number;
  installmentNumber?: number;
  amount: number;
  qrCode: string;
  qrCodeBase64: string;
  expiresAt: string;
  customerName: string;
  customerEmail?: string;
  isExternalCustomer: boolean;
}

export default function TesourariaMovimentacoes() {
  const { hasTreasuryPanel } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("movimentacoes");
  const [shopSearchTerm, setShopSearchTerm] = useState("");
  const [shopStatusFilter, setShopStatusFilter] = useState<string>("all");
  const currentYear = new Date().getFullYear();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMemberId, setFormMemberId] = useState<number | undefined>(undefined);
  const [formReferenceMonth, setFormReferenceMonth] = useState<string>("");
  const [formReceipt, setFormReceipt] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  const { data: entries, isLoading } = useQuery<TreasuryEntry[]>({
    queryKey: [`/api/treasury/entries?year=${currentYear}`],
    enabled: hasTreasuryPanel,
  });

  const { data: shopOrders, isLoading: shopOrdersLoading } = useQuery<ShopOrderWithDetails[]>({
    queryKey: ["/api/treasury/shop/orders"],
    enabled: hasTreasuryPanel && activeTab === "loja",
  });

  const markInstallmentPaidMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return apiRequest("PATCH", `/api/treasury/shop/installments/${id}`, { status: "paid" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treasury/shop/orders"] });
      toast({ title: "Parcela marcada como paga" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar parcela", variant: "destructive" });
    },
  });

  const notifyOverdueMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/treasury/shop/notify-overdue", {});
      return res.json() as Promise<{ usersNotified: number; notificationsSent: number }>;
    },
    onSuccess: (data) => {
      toast({ 
        title: "Notificacoes enviadas",
        description: `${data.usersNotified} membro(s) notificado(s)`,
      });
    },
    onError: () => {
      toast({ title: "Erro ao enviar notificacoes", variant: "destructive" });
    },
  });

  const generatePix = async (orderId: number, installmentId?: number) => {
    setPixLoading(true);
    setPixCopied(false);
    try {
      const res = await apiRequest("POST", `/api/treasury/shop/orders/${orderId}/generate-pix`, {
        installmentId,
      });
      const data = await res.json() as PixData;
      setPixData(data);
      setPixDialogOpen(true);
    } catch (error) {
      toast({ 
        title: "Erro ao gerar PIX", 
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive" 
      });
    } finally {
      setPixLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (pixData?.qrCode) {
      await navigator.clipboard.writeText(pixData.qrCode);
      setPixCopied(true);
      toast({ title: "Codigo PIX copiado!" });
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  const getCustomerDisplayName = (order: ShopOrderWithDetails): string => {
    if (order.manualCustomerName) {
      return order.manualCustomerName;
    }
    return order.user?.fullName || "Cliente";
  };

  const needsMemberSelection = formType === "income" && 
    (formCategory === "taxa_percapta" || formCategory === "taxa_ump" || formCategory === "events");

  const { data: members } = useQuery<User[]>({
    queryKey: ["/api/admin/members"],
    enabled: hasTreasuryPanel && needsMemberSelection,
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: { type: string; category: string; description: string; amount: number; paymentStatus: string; paymentMethod: string; userId?: number; referenceMonth?: number; referenceYear?: number }) => {
      return apiRequest("POST", "/api/treasury/entries", data);
    },
    onSuccess: () => {
      // Invalidate all treasury queries using predicate to match any URL starting with the prefix
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/treasury/');
        }
      });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Movimentacao registrada com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao registrar movimentacao", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormType("income");
    setFormCategory("");
    setFormDescription("");
    setFormAmount("");
    setFormMemberId(undefined);
    setFormReferenceMonth("");
    setFormReceipt(null);
  };

  const handleSubmit = async () => {
    if (!formCategory || !formAmount) {
      toast({ title: "Preencha todos os campos obrigatorios", variant: "destructive" });
      return;
    }

    const amountCents = Math.round(parseFloat(formAmount.replace(",", ".")) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast({ title: "Valor invalido", variant: "destructive" });
      return;
    }

    let receiptUrl: string | undefined;

    // Upload receipt if provided
    if (formReceipt) {
      setUploadingReceipt(true);
      try {
        const formData = new FormData();
        formData.append("file", formReceipt);
        
        const uploadRes = await fetch("/api/treasury/upload-receipt", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          receiptUrl = data.url;
        } else {
          toast({ title: "Erro ao enviar comprovante", variant: "destructive" });
        }
      } catch (err) {
        console.error("Receipt upload error:", err);
        toast({ title: "Erro ao enviar comprovante", variant: "destructive" });
      } finally {
        setUploadingReceipt(false);
      }
    }

    createEntryMutation.mutate({
      type: formType,
      category: formCategory,
      description: formDescription,
      amount: amountCents,
      paymentStatus: "paid",
      paymentMethod: "manual",
      userId: formMemberId,
      referenceMonth: formReferenceMonth ? parseInt(formReferenceMonth) : undefined,
      referenceYear: currentYear,
      receiptUrl,
    });
  };

  if (!hasTreasuryPanel) {
    setLocation("/admin");
    return null;
  }

  const filteredEntries = entries?.filter((entry) => {
    const matchesSearch = !searchTerm || 
      entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.externalPayerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || entry.type === typeFilter;
    const matchesStatus = statusFilter === "all" || entry.paymentStatus === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  }) ?? [];

  const filteredShopOrders = shopOrders?.filter((order) => {
    const searchLower = shopSearchTerm.toLowerCase();
    const matchesSearch = !shopSearchTerm || 
      order.orderCode.toLowerCase().includes(searchLower) ||
      order.user?.fullName?.toLowerCase().includes(searchLower) ||
      order.user?.email?.toLowerCase().includes(searchLower) ||
      order.manualCustomerName?.toLowerCase().includes(searchLower);
    const matchesStatus = shopStatusFilter === "all" || order.paymentStatus === shopStatusFilter;
    return matchesSearch && matchesStatus;
  }) ?? [];

  const categories = formType === "income" ? incomeCategories : expenseCategories;

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
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-entries-title">
                    Movimentacoes
                  </h1>
                  <p className="text-white/80">
                    Entradas e saidas - {currentYear}
                  </p>
                </div>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-white/20" data-testid="button-new-entry">
                    <Plus className="h-4 w-4" />
                    Nova Movimentacao
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nova Movimentacao</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={formType === "income" ? "default" : "outline"}
                          className="flex-1 gap-2"
                          onClick={() => {
                            setFormType("income");
                            setFormCategory("");
                          }}
                          data-testid="button-type-income"
                        >
                          <TrendingUp className="h-4 w-4" />
                          Entrada
                        </Button>
                        <Button
                          type="button"
                          variant={formType === "expense" ? "default" : "outline"}
                          className="flex-1 gap-2"
                          onClick={() => {
                            setFormType("expense");
                            setFormCategory("");
                          }}
                          data-testid="button-type-expense"
                        >
                          <TrendingDown className="h-4 w-4" />
                          Saida
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Categoria *</Label>
                      <Select value={formCategory} onValueChange={(v) => { setFormCategory(v); setFormMemberId(undefined); setFormReferenceMonth(""); }}>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {needsMemberSelection && members && (
                      <div className="space-y-2">
                        <Label>Membro *</Label>
                        <Select
                          value={formMemberId?.toString() || ""}
                          onValueChange={(v) => setFormMemberId(parseInt(v))}
                        >
                          <SelectTrigger data-testid="select-member">
                            <SelectValue placeholder="Selecione o membro" />
                          </SelectTrigger>
                          <SelectContent>
                            {members.filter(m => formCategory === "events" || m.activeMember).map((m) => (
                              <SelectItem key={m.id} value={m.id.toString()}>
                                {m.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formCategory === "taxa_ump" && (
                      <div className="space-y-2">
                        <Label>Mes de Referencia</Label>
                        <Select
                          value={formReferenceMonth}
                          onValueChange={setFormReferenceMonth}
                        >
                          <SelectTrigger data-testid="select-reference-month">
                            <SelectValue placeholder="Selecione o mes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Janeiro</SelectItem>
                            <SelectItem value="2">Fevereiro</SelectItem>
                            <SelectItem value="3">Marco</SelectItem>
                            <SelectItem value="4">Abril</SelectItem>
                            <SelectItem value="5">Maio</SelectItem>
                            <SelectItem value="6">Junho</SelectItem>
                            <SelectItem value="7">Julho</SelectItem>
                            <SelectItem value="8">Agosto</SelectItem>
                            <SelectItem value="9">Setembro</SelectItem>
                            <SelectItem value="10">Outubro</SelectItem>
                            <SelectItem value="11">Novembro</SelectItem>
                            <SelectItem value="12">Dezembro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Valor (R$) *</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        data-testid="input-amount"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Descricao</Label>
                      <Textarea
                        placeholder="Descricao da movimentacao..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="resize-none"
                        rows={3}
                        data-testid="input-description"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Comprovante (opcional)</Label>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setFormReceipt(e.target.files?.[0] || null)}
                        data-testid="input-receipt"
                        className="cursor-pointer"
                      />
                      {formReceipt && (
                        <p className="text-xs text-muted-foreground">
                          Arquivo selecionado: {formReceipt.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={createEntryMutation.isPending || uploadingReceipt}
                      data-testid="button-submit-entry"
                    >
                      {(createEntryMutation.isPending || uploadingReceipt) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {uploadingReceipt ? "Enviando..." : "Registrar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-6 bg-background">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="movimentacoes" className="gap-2" data-testid="tab-movimentacoes">
                <Receipt className="h-4 w-4" />
                Movimentacoes
              </TabsTrigger>
              <TabsTrigger value="loja" className="gap-2" data-testid="tab-loja">
                <ShoppingBag className="h-4 w-4" />
                Pagamentos Loja
              </TabsTrigger>
            </TabsList>

            <TabsContent value="movimentacoes">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por descricao ou pagador..."
                          className="pl-10"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          data-testid="input-search-entries"
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | "income" | "expense")}>
                          <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="income">Entradas</SelectItem>
                            <SelectItem value="expense">Saidas</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="paid">Pago</SelectItem>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="expired">Expirado</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {entries?.length === 0 
                        ? "Nenhuma movimentacao registrada" 
                        : "Nenhuma movimentacao encontrada com os filtros aplicados"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * Math.min(index, 10) }}
                    >
                      <Card className="hover-elevate cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${
                              entry.type === "income" 
                                ? "bg-green-100 dark:bg-green-900/30" 
                                : "bg-red-100 dark:bg-red-900/30"
                            }`}>
                              {entry.type === "income" ? (
                                <TrendingUp className="h-5 w-5 text-green-600" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium truncate">
                                  {entry.description || categoryLabels[entry.category] || entry.category}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {categoryLabels[entry.category] || entry.category}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {entry.createdAt && format(new Date(entry.createdAt), "dd MMM yyyy", { locale: ptBR })}
                                {entry.externalPayerName && (
                                  <span>- {entry.externalPayerName}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-semibold ${
                                entry.type === "income" ? "text-green-600" : "text-red-600"
                              }`}>
                                {entry.type === "income" ? "+" : "-"}{formatCurrency(entry.amount)}
                              </div>
                              <Badge 
                                variant={statusLabels[entry.paymentStatus]?.variant ?? "secondary"}
                                className="text-xs"
                              >
                                {statusLabels[entry.paymentStatus]?.label ?? entry.paymentStatus}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="loja">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por codigo do pedido, nome ou email..."
                          className="pl-10"
                          value={shopSearchTerm}
                          onChange={(e) => setShopSearchTerm(e.target.value)}
                          data-testid="input-search-shop-orders"
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Select value={shopStatusFilter} onValueChange={setShopStatusFilter}>
                          <SelectTrigger className="w-[180px]" data-testid="select-shop-status-filter">
                            <SelectValue placeholder="Status Pagamento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="paid">Pago</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          onClick={() => notifyOverdueMutation.mutate()}
                          disabled={notifyOverdueMutation.isPending}
                          data-testid="button-notify-overdue"
                        >
                          {notifyOverdueMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Bell className="h-4 w-4 mr-2" />
                          )}
                          Notificar Vencidos
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {shopOrdersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredShopOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {shopOrders?.length === 0 
                        ? "Nenhum pedido registrado" 
                        : "Nenhum pedido encontrado com os filtros aplicados"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Accordion type="single" collapsible className="space-y-3">
                  {filteredShopOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * Math.min(index, 10) }}
                    >
                      <AccordionItem value={`order-${order.id}`} className="border rounded-md overflow-visible">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center gap-4 w-full">
                            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                              <ShoppingBag className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">#{order.orderCode}</span>
                                <Badge 
                                  variant={orderStatusLabels[order.orderStatus]?.variant ?? "secondary"}
                                  className="text-xs"
                                >
                                  {orderStatusLabels[order.orderStatus]?.label ?? order.orderStatus}
                                </Badge>
                                {order.isManualOrder && (
                                  <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-600 dark:text-amber-400">
                                    <Hand className="h-3 w-3" />
                                    Manual
                                  </Badge>
                                )}
                                {order.installmentCount && order.installmentCount > 1 && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    {order.installmentCount}x
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                <UserIcon className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate max-w-[150px] sm:max-w-none">
                                  {getCustomerDisplayName(order)}
                                  {order.manualCustomerName && (
                                    <span className="text-amber-600 dark:text-amber-400 ml-1">(externo)</span>
                                  )}
                                </span>
                                <span className="hidden sm:inline">-</span>
                                <Calendar className="h-3 w-3 flex-shrink-0 hidden sm:block" />
                                <span className="hidden sm:inline">{format(new Date(order.createdAt), "dd MMM yyyy", { locale: ptBR })}</span>
                              </div>
                            </div>
                            <div className="text-right mr-4">
                              <div className="font-semibold text-green-600">
                                {formatCurrency(order.totalAmount)}
                              </div>
                              <Badge 
                                variant={order.paymentStatus === "paid" ? "default" : order.paymentStatus === "pending" ? "secondary" : "destructive"}
                                className="text-xs"
                              >
                                {order.paymentStatus === "paid" ? "Pago" : order.paymentStatus === "pending" ? "Pendente" : "Cancelado"}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-4 pt-2">
                            <div className="grid gap-4 md:grid-cols-2">
                              <Card>
                                <CardContent className="p-4">
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <UserIcon className="h-4 w-4" />
                                    {order.manualCustomerName ? "Cliente Externo" : "Dados do Membro"}
                                  </h4>
                                  {order.manualCustomerName ? (
                                    <div className="text-sm space-y-2">
                                      <p><strong>Nome:</strong> {order.manualCustomerName}</p>
                                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                                        Cliente externo - sem cadastro no sistema
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm space-y-1">
                                      <p><strong>Nome:</strong> {order.user?.fullName || "-"}</p>
                                      <p><strong>Email:</strong> {order.user?.email || "-"}</p>
                                      <p><strong>Telefone:</strong> {order.user?.phone || "-"}</p>
                                    </div>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-2 sm:hidden">
                                    Criado em: {format(new Date(order.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="p-4">
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <ShoppingBag className="h-4 w-4" />
                                    Itens do Pedido
                                  </h4>
                                  <div className="text-sm space-y-1">
                                    {order.items.map((item) => (
                                      <p key={item.id}>
                                        {item.quantity}x {item.product?.name || "Produto"} 
                                        {item.size && ` (${item.size})`}
                                        {item.gender && ` - ${item.gender}`}
                                        <span className="text-muted-foreground ml-2">
                                          {formatCurrency(item.unitPrice * item.quantity)}
                                        </span>
                                      </p>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {order.isManualOrder && order.paymentStatus !== "paid" && order.installments.length === 0 && (
                              <Card>
                                <CardContent className="p-4">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div>
                                      <h4 className="font-medium flex items-center gap-2">
                                        <QrCode className="h-4 w-4" />
                                        Pagamento PIX
                                      </h4>
                                      <p className="text-sm text-muted-foreground">
                                        Gere o QR Code para pagamento do valor total
                                      </p>
                                    </div>
                                    <Button
                                      onClick={() => generatePix(order.id)}
                                      disabled={pixLoading}
                                      data-testid={`button-generate-pix-total-${order.id}`}
                                    >
                                      {pixLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      ) : (
                                        <QrCode className="h-4 w-4 mr-2" />
                                      )}
                                      <span className="hidden sm:inline">Gerar PIX</span>
                                      <span className="sm:hidden">PIX</span>
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {order.installments.length > 0 && (
                              <Card>
                                <CardContent className="p-4">
                                  <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    Parcelas PIX ({order.installments.length}x)
                                  </h4>
                                  <div className="space-y-2">
                                    {order.installments.map((inst) => (
                                      <div 
                                        key={inst.id} 
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md border gap-3 ${
                                          inst.isOverdue 
                                            ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800" 
                                            : inst.status === "paid" 
                                              ? "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-800" 
                                              : "border-border"
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          {inst.status === "paid" ? (
                                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                          ) : inst.isOverdue ? (
                                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                          ) : (
                                            <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                          )}
                                          <div className="min-w-0">
                                            <p className="font-medium">Parcela {inst.installmentNumber}</p>
                                            <p className="text-sm text-muted-foreground">
                                              Venc: {format(new Date(inst.dueDate), "dd/MM/yy", { locale: ptBR })}
                                              {inst.paidAt && (
                                                <span className="ml-1 text-green-600">
                                                  - Pago {format(new Date(inst.paidAt), "dd/MM", { locale: ptBR })}
                                                </span>
                                              )}
                                              {inst.isOverdue && (
                                                <span className="ml-1 text-red-600 font-medium">VENCIDA</span>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
                                          <span className="font-semibold">{formatCurrency(inst.amount)}</span>
                                          {inst.status !== "paid" && (
                                            <div className="flex gap-1 sm:gap-2">
                                              {order.isManualOrder && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => generatePix(order.id, inst.id)}
                                                  disabled={pixLoading}
                                                  data-testid={`button-generate-pix-installment-${inst.id}`}
                                                >
                                                  {pixLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                  ) : (
                                                    <QrCode className="h-4 w-4" />
                                                  )}
                                                  <span className="hidden sm:inline ml-1">PIX</span>
                                                </Button>
                                              )}
                                              <Button
                                                size="sm"
                                                onClick={() => markInstallmentPaidMutation.mutate({ id: inst.id })}
                                                disabled={markInstallmentPaidMutation.isPending}
                                                data-testid={`button-mark-paid-${inst.id}`}
                                              >
                                                {markInstallmentPaidMutation.isPending ? (
                                                  <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                  <>
                                                    <CheckCircle className="h-4 w-4 sm:hidden" />
                                                    <span className="hidden sm:inline">Marcar Pago</span>
                                                  </>
                                                )}
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  ))}
                </Accordion>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Dialog open={pixDialogOpen} onOpenChange={(open) => {
        setPixDialogOpen(open);
        if (!open) {
          queryClient.invalidateQueries({ queryKey: ["/api/treasury/shop/orders"] });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Pagamento PIX
            </DialogTitle>
          </DialogHeader>
          
          {pixData && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  {pixData.type === "installment" 
                    ? `Parcela ${pixData.installmentNumber}` 
                    : "Valor Total"}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {pixData.amount.toFixed(2).replace(".", ",")}
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                {pixData.qrCodeBase64 && (
                  <div className="p-3 bg-white rounded-lg border">
                    <img 
                      src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                      alt="QR Code PIX"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                )}
                
                <div className="w-full space-y-2">
                  <Label className="text-sm text-muted-foreground">Codigo PIX Copia e Cola:</Label>
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={pixData.qrCode} 
                      className="font-mono text-xs"
                      data-testid="input-pix-code"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={copyPixCode}
                      data-testid="button-copy-pix"
                    >
                      {pixCopied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-sm space-y-2 p-3 bg-muted/30 rounded-lg">
                <p className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <strong>Cliente:</strong> {pixData.customerName}
                  {pixData.isExternalCustomer && (
                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                      Externo
                    </Badge>
                  )}
                </p>
                {pixData.customerEmail && (
                  <p className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <strong>Email:</strong> {pixData.customerEmail}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <strong>Expira em:</strong> {format(new Date(pixData.expiresAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>

              {pixData.isExternalCustomer && (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
                  <strong>Cliente externo:</strong> Envie o QR Code ou codigo PIX diretamente ao cliente via WhatsApp ou outro canal.
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setPixDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Fechar
                </Button>
                <Button 
                  onClick={copyPixCode}
                  className="w-full sm:w-auto"
                >
                  {pixCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Codigo
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
