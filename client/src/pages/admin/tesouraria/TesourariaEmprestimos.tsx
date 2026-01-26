import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Landmark, 
  Plus,
  Calendar,
  Loader2,
  Check
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TreasuryLoan, TreasuryLoanInstallment, User } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type LoanWithInstallments = TreasuryLoan & {
  installments: TreasuryLoanInstallment[];
  originMemberName?: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

const originLabels: Record<string, string> = {
  church: "Igreja",
  member: "Membro",
  federation: "Federação",
  other: "Outro",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  paid: { label: "Quitado", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  pending: { label: "Pendente", variant: "secondary" },
};

export default function TesourariaEmprestimos() {
  const { hasTreasuryPanel } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    origin: "church" as string,
    originMemberId: undefined as number | undefined,
    totalAmount: "",
    isInstallment: false,
    installmentCount: "1",
    description: "",
    firstDueDate: "",
  });

  const { data: loans, isLoading } = useQuery<LoanWithInstallments[]>({
    queryKey: ["/api/treasury/loans"],
    enabled: hasTreasuryPanel,
  });

  const { data: members } = useQuery<User[]>({
    queryKey: ["/api/admin/members"],
    enabled: hasTreasuryPanel && formData.origin === "member",
  });

  const createLoanMutation = useMutation({
    mutationFn: async (data: {
      origin: string;
      originMemberId?: number;
      totalAmount: number;
      isInstallment: boolean;
      installmentCount: number;
      description: string;
      firstDueDate: string;
    }) => {
      return await apiRequest("POST", "/api/treasury/loans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treasury/loans"] });
      toast({ title: "Emprestimo registrado com sucesso" });
      setDialogOpen(false);
      setFormData({
        origin: "church",
        originMemberId: undefined,
        totalAmount: "",
        isInstallment: false,
        installmentCount: "1",
        description: "",
        firstDueDate: "",
      });
    },
    onError: () => {
      toast({ title: "Erro ao criar emprestimo", variant: "destructive" });
    },
  });

  const payInstallmentMutation = useMutation({
    mutationFn: async ({ loanId, installmentId }: { loanId: number; installmentId: number }) => {
      return await apiRequest("PUT", `/api/treasury/loans/${loanId}/installments/${installmentId}`, {
        status: "paid",
        paidAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treasury/loans"] });
      toast({ title: "Parcela paga com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao registrar pagamento", variant: "destructive" });
    },
  });

  if (!hasTreasuryPanel) {
    setLocation("/admin");
    return null;
  }

  const parseBrlCurrency = (value: string): number => {
    const cleaned = value
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    return parseFloat(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseBrlCurrency(formData.totalAmount) * 100;
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Valor invalido", variant: "destructive" });
      return;
    }
    if (!formData.firstDueDate) {
      toast({ title: "Informe a data de vencimento", variant: "destructive" });
      return;
    }
    const installmentCount = parseInt(formData.installmentCount) || 1;
    if (formData.isInstallment && installmentCount < 2) {
      toast({ title: "Numero de parcelas deve ser no minimo 2", variant: "destructive" });
      return;
    }
    createLoanMutation.mutate({
      origin: formData.origin,
      originMemberId: formData.originMemberId,
      totalAmount: Math.round(amount),
      isInstallment: formData.isInstallment,
      installmentCount: formData.isInstallment ? installmentCount : 1,
      description: formData.description,
      firstDueDate: formData.firstDueDate,
    });
  };

  const activeLoans = loans?.filter(l => l.status === "active") ?? [];
  const totalActive = activeLoans.reduce((sum, l) => sum + l.totalAmount, 0);
  const pendingInstallments = activeLoans.flatMap(l => 
    l.installments.filter(i => i.status === "pending")
  );

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
                  <Landmark className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-loans-title">
                    Empréstimos
                  </h1>
                  <p className="text-white/80">
                    Controle de empréstimos e parcelas
                  </p>
                </div>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-white/20" data-testid="button-new-loan">
                    <Plus className="h-4 w-4" />
                    Novo Emprestimo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Novo Emprestimo</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Origem</Label>
                      <Select
                        value={formData.origin}
                        onValueChange={(v) => setFormData({ ...formData, origin: v, originMemberId: undefined })}
                      >
                        <SelectTrigger data-testid="select-loan-origin">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="church">Igreja</SelectItem>
                          <SelectItem value="member">Membro</SelectItem>
                          <SelectItem value="federation">Federacao</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.origin === "member" && members && (
                      <div className="space-y-2">
                        <Label>Membro</Label>
                        <Select
                          value={formData.originMemberId?.toString() || ""}
                          onValueChange={(v) => setFormData({ ...formData, originMemberId: parseInt(v) })}
                        >
                          <SelectTrigger data-testid="select-loan-member">
                            <SelectValue placeholder="Selecione o membro" />
                          </SelectTrigger>
                          <SelectContent>
                            {members.map((m) => (
                              <SelectItem key={m.id} value={m.id.toString()}>
                                {m.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Valor Total (R$)</Label>
                      <Input
                        type="text"
                        value={formData.totalAmount}
                        onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                        placeholder="0,00"
                        data-testid="input-loan-amount"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={formData.isInstallment}
                        onCheckedChange={(v) => setFormData({ ...formData, isInstallment: v })}
                        data-testid="switch-loan-installment"
                      />
                      <Label>Parcelado</Label>
                    </div>

                    {formData.isInstallment && (
                      <div className="space-y-2">
                        <Label>Numero de Parcelas</Label>
                        <Input
                          type="number"
                          min="2"
                          max="24"
                          value={formData.installmentCount}
                          onChange={(e) => setFormData({ ...formData, installmentCount: e.target.value })}
                          data-testid="input-loan-installments"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Data do Primeiro Vencimento</Label>
                      <Input
                        type="date"
                        value={formData.firstDueDate}
                        onChange={(e) => setFormData({ ...formData, firstDueDate: e.target.value })}
                        data-testid="input-loan-due-date"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Descricao (opcional)</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Detalhes do emprestimo..."
                        data-testid="input-loan-description"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createLoanMutation.isPending}
                      data-testid="button-submit-loan"
                    >
                      {createLoanMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Registrar Emprestimo"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-6 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">Empréstimos Ativos</div>
                  <div className="text-2xl font-bold">{activeLoans.length}</div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">Total a Pagar</div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(totalActive)}
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
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">Parcelas Pendentes</div>
                  <div className="text-2xl font-bold">{pendingInstallments.length}</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !loans || loans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Landmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum empréstimo registrado
                </p>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Lista de Empréstimos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="space-y-2">
                    {loans.map((loan) => (
                      <AccordionItem 
                        key={loan.id} 
                        value={`loan-${loan.id}`}
                        className="border rounded-lg px-4"
                        data-testid={`loan-item-${loan.id}`}
                      >
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-4 flex-1 text-left">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">
                                  {loan.originName || originLabels[loan.origin] || loan.origin}
                                </span>
                                <Badge variant={statusLabels[loan.status]?.variant ?? "secondary"}>
                                  {statusLabels[loan.status]?.label ?? loan.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {loan.description || `Origem: ${originLabels[loan.origin]}`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-red-600">
                                {formatCurrency(loan.totalAmount)}
                              </div>
                              {loan.isInstallment && (
                                <div className="text-xs text-muted-foreground">
                                  {loan.installmentCount}x de {formatCurrency(loan.installmentAmount ?? 0)}
                                </div>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          {loan.installments && loan.installments.length > 0 ? (
                            <div className="space-y-2 mt-2">
                              <div className="text-sm font-medium text-muted-foreground mb-3">
                                Parcelas
                              </div>
                              {loan.installments.map((installment) => (
                                <div 
                                  key={installment.id}
                                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="text-sm font-medium">
                                      Parcela {installment.installmentNumber}
                                    </div>
                                    <Badge 
                                      variant={statusLabels[installment.status]?.variant ?? "secondary"}
                                      className="text-xs"
                                    >
                                      {statusLabels[installment.status]?.label ?? installment.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      {installment.dueDate && format(new Date(installment.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                                    </div>
                                    <div className="font-medium">
                                      {formatCurrency(installment.amount)}
                                    </div>
                                    {installment.status === "pending" && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => payInstallmentMutation.mutate({ 
                                          loanId: loan.id, 
                                          installmentId: installment.id 
                                        })}
                                        disabled={payInstallmentMutation.isPending}
                                        data-testid={`button-pay-installment-${installment.id}`}
                                      >
                                        {payInstallmentMutation.isPending ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <Check className="h-3 w-3 mr-1" />
                                            Pagar
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Pagamento único - sem parcelas
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
