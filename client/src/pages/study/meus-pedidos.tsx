import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/study";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PixPaymentModal } from "@/components/PixPaymentModal";
import { useState } from "react";
import { 
  ChevronLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Receipt,
  Copy,
  QrCode
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
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

const paymentStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Aguardando", variant: "secondary" },
  paid: { label: "Pago", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  refunded: { label: "Estornado", variant: "outline" },
};

const orderStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  awaiting_payment: { label: "Aguardando Pagamento", variant: "secondary" },
  paid: { label: "Pago", variant: "default" },
  producing: { label: "Em Producao", variant: "outline" },
  ready: { label: "Pronto para Retirada", variant: "default" },
  delivered: { label: "Entregue", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function MeusPedidosPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixPaymentData, setPixPaymentData] = useState<{
    entryId: number;
    amount: number;
    description: string;
  } | null>(null);

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

  const handlePixPaymentComplete = () => {
    setPixModalOpen(false);
    setPixPaymentData(null);
    refetch();
    toast({
      title: "Pagamento confirmado!",
      description: "Seu pedido foi pago com sucesso.",
    });
  };

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const copyPixCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Codigo copiado",
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
    <div className="min-h-screen bg-background pb-20">
      <section className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 text-white py-6">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link href="/loja">
              <Button 
                variant="ghost" 
                className="mb-2 text-white/80 gap-2"
                data-testid="button-back-shop"
              >
                <ChevronLeft className="h-4 w-4" />
                Loja
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-orders-title">
                  Meus Pedidos
                </h1>
                <p className="text-white/80">
                  Acompanhe seus pedidos
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

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
                  Voce ainda nao fez nenhum pedido.
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
                      <Badge variant={paymentStatusLabels[order.paymentStatus]?.variant || "secondary"}>
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
                      <Badge variant={orderStatusLabels[order.orderStatus]?.variant || "secondary"}>
                        {orderStatusLabels[order.orderStatus]?.label || order.orderStatus}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </section>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Pedido #{selectedOrder.id}</DialogTitle>
                <DialogDescription>
                  {formatDate(selectedOrder.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge variant={paymentStatusLabels[selectedOrder.paymentStatus]?.variant || "secondary"}>
                    Pagamento: {paymentStatusLabels[selectedOrder.paymentStatus]?.label}
                  </Badge>
                  <Badge variant={orderStatusLabels[selectedOrder.orderStatus]?.variant || "secondary"}>
                    {orderStatusLabels[selectedOrder.orderStatus]?.label}
                  </Badge>
                </div>

                <div className="border rounded-md p-3 space-y-3">
                  <h4 className="font-medium text-sm">Itens do Pedido</h4>
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex gap-3 items-start">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {item.product?.firstImage ? (
                          <img
                            src={item.product.firstImage}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product?.name || "Item"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity}x {formatCurrency(item.unitPrice)}
                          {item.size && ` - Tam: ${item.size}`}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
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

                {selectedOrder.paymentStatus === "pending" && (
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
                            Ou copie o codigo PIX:
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

      <BottomNav />

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
    </div>
  );
}
