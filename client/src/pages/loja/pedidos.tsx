import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PixPaymentModal } from "@/components/PixPaymentModal";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { useState, useEffect } from "react";
import { 
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Receipt,
  Copy,
  QrCode,
  ShoppingBag,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface OrderItemProduct {
  id: number;
  name: string;
  price: number;
  firstImage: string | null;
}

interface OrderItem {
  id: number;
  orderId: number;
  itemId: number;
  quantity: number;
  gender: string | null;
  size: string | null;
  unitPrice: number;
  product: OrderItemProduct | null;
}

interface Installment {
  id: number;
  orderId: number;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  paymentId: string | null;
  pixCode: string | null;
  pixQrCodeBase64: string | null;
  pixExpiresAt: string | null;
  paidAt: string | null;
}

interface Order {
  id: number;
  orderCode: string;
  userId: number;
  totalAmount: number;
  paymentStatus: "pending" | "paid" | "cancelled" | "refunded";
  orderStatus: "awaiting_payment" | "paid" | "producing" | "ready" | "cancelled";
  pixCode: string | null;
  pixQrCode: string | null;
  pixExpiresAt: string | null;
  observation: string | null;
  createdAt: string;
  items: OrderItem[];
  installments?: Installment[];
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

const paymentStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  pending: { label: "Aguardando Pagamento", variant: "secondary" },
  paid: { label: "Pago", variant: "default", className: "bg-green-600 hover:bg-green-700 text-white" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  refunded: { label: "Estornado", variant: "outline" },
};

const orderStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  awaiting_payment: { label: "Aguardando Pagamento", variant: "secondary" },
  paid: { label: "Pago", variant: "default" },
  producing: { label: "Em Produção", variant: "outline" },
  ready: { label: "Pronto para Retirada", variant: "default" },
  delivered: { label: "Entregue", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const installmentStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  pending: { label: "Pendente", variant: "secondary" },
  paid: { label: "Paga", variant: "default", className: "bg-green-600 hover:bg-green-700 text-white" },
  overdue: { label: "Atrasada", variant: "destructive" },
};

export default function MeusPedidosPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [generatingInstallmentId, setGeneratingInstallmentId] = useState<number | null>(null);
  const [pixPaymentData, setPixPaymentData] = useState<{
    entryId: number;
    amount: number;
    description: string;
  } | null>(null);
  
  const [installmentPixData, setInstallmentPixData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    amount: number;
    expiresAt: string;
    description: string;
    installmentId: number;
  } | null>(null);
  
  const [installmentPaymentStatus, setInstallmentPaymentStatus] = useState<"pending" | "approved">("pending");

  const { data: orders, isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/shop/my-orders"],
    enabled: isAuthenticated,
  });

  const { data: pixStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/pix/status"],
    enabled: isAuthenticated,
  });

  const generatePixMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/pix/shop-order/${orderId}`);
      return res.json();
    },
    onSuccess: (data, orderId) => {
      const order = orders?.find(o => o.id === orderId);
      setPixPaymentData({
        entryId: data.entryId,
        amount: data.amount,
        description: `Pedido #${order?.orderCode || orderId}`,
      });
      setSelectedOrder(null);
      setPixModalOpen(true);
    },
    onError: () => {
      toast({
        title: "Erro ao gerar PIX",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const generateInstallmentPixMutation = useMutation({
    mutationFn: async (installmentId: number) => {
      setGeneratingInstallmentId(installmentId);
      const res = await apiRequest("POST", `/api/pix/shop-installment/${installmentId}`);
      return res.json();
    },
    onSuccess: (data, installmentId) => {
      const installment = selectedOrder?.installments?.find(i => i.id === installmentId);
      setInstallmentPixData({
        qrCode: data.qrCode,
        qrCodeBase64: data.qrCodeBase64,
        amount: data.amount,
        expiresAt: data.expiresAt,
        description: `Pedido #${selectedOrder?.orderCode} - Parcela ${installment?.installmentNumber || ''}`,
        installmentId: installmentId,
      });
      setInstallmentPaymentStatus("pending");
      setSelectedOrder(null);
      setGeneratingInstallmentId(null);
    },
    onError: () => {
      toast({
        title: "Erro ao gerar PIX",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      setGeneratingInstallmentId(null);
    },
  });

  const handlePixPaymentComplete = () => {
    setPixModalOpen(false);
    setPixPaymentData(null);
    refetch();
    toast({
      title: "Pagamento confirmado!",
      description: "Seu pedido foi pago com sucesso.",
    });
  };

  useEffect(() => {
    if (!installmentPixData || installmentPaymentStatus !== "pending") return;
    
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const checkInstallmentStatus = async () => {
      if (!isMounted) return;
      
      try {
        const res = await apiRequest("GET", `/api/shop/my-orders`);
        if (!isMounted) return;
        
        const updatedOrders: Order[] = await res.json();
        const foundOrder = updatedOrders.find(o => 
          o.installments?.some(i => i.id === installmentPixData.installmentId && i.status === "paid")
        );
        
        if (foundOrder && isMounted) {
          setInstallmentPaymentStatus("approved");
          toast({
            title: "Pagamento confirmado!",
            description: "Sua parcela foi paga com sucesso.",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/shop/my-orders"] });
          queryClient.invalidateQueries({ queryKey: ["treasury-member-status"] });
          queryClient.invalidateQueries({ queryKey: ["treasury-member-shop-orders"] });
          timeoutId = setTimeout(() => {
            if (isMounted) {
              setInstallmentPixData(null);
            }
          }, 2000);
        } else if (isMounted) {
          timeoutId = setTimeout(checkInstallmentStatus, 5000);
        }
      } catch (error) {
        console.error("Error checking installment status:", error);
        if (isMounted) {
          timeoutId = setTimeout(checkInstallmentStatus, 5000);
        }
      }
    };
    
    timeoutId = setTimeout(checkInstallmentStatus, 5000);
    
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [installmentPixData, installmentPaymentStatus, toast]);

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const copyPixCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Código copiado",
        description: "Cole no app do seu banco para pagar.",
      });
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Tente selecionar e copiar manualmente.",
        variant: "destructive",
      });
    }
  };

  const isPixExpired = (expiresAt: string | null) => {
    if (!expiresAt) return true;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="min-h-screen bg-white">
      <ShopHeader />

      {/* Breadcrumb */}
      <nav className="px-4 py-2 text-xs text-gray-500">
        <Link href="/loja" className="hover:text-black">Início</Link>
        <span className="mx-1">&gt;</span>
        <span className="text-black">Meus Pedidos</span>
      </nav>

      {/* Title */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black" data-testid="text-orders-title">
              Meus Pedidos
            </h1>
            <p className="text-sm text-gray-500">Acompanhe seus pedidos</p>
          </div>
        </div>
      </div>

      <section className="py-6">
        <div className="container mx-auto px-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : !orders || orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum pedido</h3>
                <p className="text-muted-foreground mb-4">
                  Você ainda não fez nenhum pedido.
                </p>
                <Link href="/loja">
                  <Button data-testid="button-go-shop">
                    Ir para a Loja
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                  data-testid={`card-order-${order.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        Pedido #{order.id}
                      </CardTitle>
                      <Badge 
                        variant={paymentStatusLabels[order.paymentStatus]?.variant || "secondary"}
                        className={paymentStatusLabels[order.paymentStatus]?.className}
                      >
                        {paymentStatusLabels[order.paymentStatus]?.label || order.paymentStatus}
                      </Badge>
                    </div>
                    <CardDescription>
                      {formatDate(order.createdAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} {order.items.length === 1 ? "item" : "itens"}
                        </p>
                        <p className="font-bold text-primary">
                          {formatCurrency(order.totalAmount)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </section>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Pedido #{selectedOrder.id}</DialogTitle>
                <DialogDescription>
                  {formatDate(selectedOrder.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={paymentStatusLabels[selectedOrder.paymentStatus]?.variant || "secondary"}
                    className={paymentStatusLabels[selectedOrder.paymentStatus]?.className}
                  >
                    Pagamento: {paymentStatusLabels[selectedOrder.paymentStatus]?.label}
                  </Badge>
                  <Badge variant={orderStatusLabels[selectedOrder.orderStatus]?.variant || "secondary"}>
                    {orderStatusLabels[selectedOrder.orderStatus]?.label}
                  </Badge>
                </div>

                <div className="border rounded-md p-3 space-y-3">
                  <h4 className="font-medium text-sm">Itens do Pedido</h4>
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex gap-2 sm:gap-3 items-start">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {item.product?.firstImage ? (
                          <img
                            src={item.product.firstImage}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium line-clamp-2">{item.product?.name || "Item"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity}x {formatCurrency(item.unitPrice)}
                          {item.size && ` - ${item.size}`}
                        </p>
                      </div>
                      <span className="text-xs sm:text-sm font-medium flex-shrink-0">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatCurrency(selectedOrder.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Seção de Parcelas */}
                {selectedOrder.installments && selectedOrder.installments.length > 0 && (
                  <div className="border rounded-md p-3 space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Parcelas ({selectedOrder.installments.length}x)
                    </h4>
                    <div className="space-y-2">
                      {selectedOrder.installments.map((inst) => {
                        const isInstExpired = inst.pixExpiresAt ? new Date(inst.pixExpiresAt) < new Date() : true;
                        const needsNewPix = inst.status === "pending" && (!inst.pixCode || isInstExpired);
                        
                        return (
                          <div 
                            key={inst.id} 
                            className="flex flex-col gap-2 p-2 bg-muted/50 rounded-md"
                            data-testid={`installment-row-${inst.id}`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {inst.installmentNumber}ª Parcela
                                </span>
                                <Badge 
                                  variant={installmentStatusLabels[inst.status]?.variant || "secondary"}
                                  className={`text-xs ${installmentStatusLabels[inst.status]?.className || ''}`}
                                >
                                  {installmentStatusLabels[inst.status]?.label || inst.status}
                                </Badge>
                              </div>
                              <span className="text-sm font-bold">
                                {formatCurrency(inst.amount)}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                              <span>
                                Vencimento: {new Date(inst.dueDate).toLocaleDateString("pt-BR")}
                              </span>
                              {inst.paidAt && (
                                <span className="text-green-600">
                                  Pago em: {new Date(inst.paidAt).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                            </div>

                            {inst.status === "pending" && pixStatus?.configured && (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {needsNewPix ? (
                                  <Button
                                    size="sm"
                                    onClick={() => generateInstallmentPixMutation.mutate(inst.id)}
                                    disabled={generatingInstallmentId === inst.id}
                                    className="gap-1 flex-1 min-w-0"
                                    data-testid={`button-generate-pix-installment-${inst.id}`}
                                  >
                                    {generatingInstallmentId === inst.id ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span className="truncate">Gerando...</span>
                                      </>
                                    ) : (
                                      <>
                                        <QrCode className="h-3 w-3" />
                                        <span className="truncate">Gerar PIX</span>
                                      </>
                                    )}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyPixCode(inst.pixCode!)}
                                    className="gap-1 flex-1 min-w-0"
                                    data-testid={`button-copy-pix-installment-${inst.id}`}
                                  >
                                    <Copy className="h-3 w-3" />
                                    <span className="truncate">Copiar PIX</span>
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Seção de Pagamento PIX (para pedidos sem parcelamento) */}
                {selectedOrder.paymentStatus === "pending" && (!selectedOrder.installments || selectedOrder.installments.length === 0) && (
                  <div className="border rounded-md p-3 space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      Pagamento PIX
                    </h4>

                    {!selectedOrder.pixCode || isPixExpired(selectedOrder.pixExpiresAt) ? (
                      <div className="text-center py-4 space-y-3">
                        <Clock className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {selectedOrder.pixCode ? "QR Code expirado" : "PIX não gerado"}
                        </p>
                        {pixStatus?.configured && (
                          <Button
                            onClick={() => generatePixMutation.mutate(selectedOrder.id)}
                            disabled={generatePixMutation.isPending}
                            className="gap-2"
                            data-testid="button-generate-pix"
                          >
                            {generatePixMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              <>
                                <QrCode className="h-4 w-4" />
                                Gerar QR Code PIX
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        {selectedOrder.pixQrCode && (
                          <div className="flex justify-center">
                            <img
                              src={selectedOrder.pixQrCode}
                              alt="QR Code PIX"
                              className="w-48 h-48"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Ou copie o código PIX:
                          </p>
                          <div className="flex gap-2">
                            <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                              {selectedOrder.pixCode.substring(0, 50)}...
                            </code>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => copyPixCode(selectedOrder.pixCode!)}
                              data-testid="button-copy-pix"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {selectedOrder.pixExpiresAt && (
                          <p className="text-xs text-muted-foreground text-center">
                            Expira em: {formatDate(selectedOrder.pixExpiresAt)}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>


      {pixPaymentData && (
        <PixPaymentModal
          open={pixModalOpen}
          onOpenChange={setPixModalOpen}
          entryId={pixPaymentData.entryId}
          amount={pixPaymentData.amount}
          description={pixPaymentData.description}
          onPaymentComplete={handlePixPaymentComplete}
        />
      )}

      {installmentPixData && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" 
          onClick={() => {
            setInstallmentPixData(null);
            setInstallmentPaymentStatus("pending");
            refetch();
          }}
        >
          <div 
            className="bg-background rounded-lg p-4 sm:p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto" 
            onClick={e => e.stopPropagation()}
          >
            {installmentPaymentStatus === "approved" ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-4">
                  <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">Pagamento Confirmado!</p>
                  <p className="text-sm text-muted-foreground">
                    {(installmentPixData.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-center mb-2">
                  Pagar Parcela via PIX
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {installmentPixData.description}
                </p>
                <div className="text-center mb-4">
                  <p className="text-2xl font-bold">
                    {(installmentPixData.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                {installmentPixData.qrCodeBase64 && (
                  <div className="flex justify-center mb-4">
                    <img 
                      src={`data:image/png;base64,${installmentPixData.qrCodeBase64}`} 
                      alt="QR Code PIX" 
                      className="w-40 h-40 sm:w-48 sm:h-48"
                    />
                  </div>
                )}
                {installmentPixData.qrCode && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground text-center mb-2">Ou copie o codigo:</p>
                    <div className="bg-muted p-2 rounded text-xs break-all max-h-16 overflow-y-auto">
                      {installmentPixData.qrCode.substring(0, 80)}...
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-2 gap-2"
                      onClick={() => {
                        navigator.clipboard.writeText(installmentPixData.qrCode);
                        toast({ title: "Codigo copiado!", description: "Cole no app do seu banco." });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                      Copiar Codigo PIX
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Aguardando pagamento...</span>
                </div>
              </>
            )}
            <Button 
              className="w-full" 
              onClick={() => {
                setInstallmentPixData(null);
                setInstallmentPaymentStatus("pending");
                refetch();
              }}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
