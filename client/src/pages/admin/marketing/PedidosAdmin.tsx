import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Package, 
  Search,
  Loader2,
  ShoppingBag,
  User,
  Calendar,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  RefreshCw,
  Eye,
  Filter,
  Plus,
  Trash2
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Member {
  id: number;
  fullName: string;
  email: string;
}

interface ShopProduct {
  id: number;
  name: string;
  price: number;
  sizes?: string | null;
  hasGenderOption?: boolean;
}

interface OrderUser {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
}

interface OrderItemProduct {
  id: number;
  name: string;
  price: number;
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

interface ShopOrder {
  id: number;
  orderCode: string;
  userId: number;
  totalAmount: number;
  discountAmount?: number;
  observation: string | null;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  paidAt: string | null;
  user: OrderUser | null;
  manualCustomerName: string | null;
  items: OrderItem[];
}

function getCustomerName(order: ShopOrder): string {
  if (order.manualCustomerName) {
    return `${order.manualCustomerName} (externo)`;
  }
  return order.user?.fullName || 'Cliente desconhecido';
}

const ORDER_STATUSES = [
  { value: "awaiting_payment", label: "Aguardando Pagamento", icon: Clock, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "paid", label: "Pago", icon: CheckCircle, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "producing", label: "Em Produção", icon: Package, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "ready", label: "Pronto", icon: ShoppingBag, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "delivered", label: "Entregue", icon: Truck, color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  { value: "cancelled", label: "Cancelado", icon: XCircle, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

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

function getStatusInfo(status: string) {
  return ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
}

export default function PedidosAdminPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [detailsOrder, setDetailsOrder] = useState<ShopOrder | null>(null);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [newBulkStatus, setNewBulkStatus] = useState("");
  const [manualOrderDialogOpen, setManualOrderDialogOpen] = useState(false);
  const [manualOrderMemberId, setManualOrderMemberId] = useState<string>("");
  const [manualOrderName, setManualOrderName] = useState("");
  const [manualOrderItems, setManualOrderItems] = useState<Array<{
    itemId: number;
    quantity: number;
    size: string;
    gender: string;
  }>>([]);
  const [manualOrderInstallments, setManualOrderInstallments] = useState("1");

  const isMarketing = user?.secretaria === "marketing";
  
  const { data: orders, isLoading } = useQuery<ShopOrder[]>({
    queryKey: ["/api/admin/shop/orders"],
    enabled: isAuthenticated && (user?.isAdmin || isMarketing),
  });

  const { data: members } = useQuery<Member[]>({
    queryKey: ["/api/admin/shop/members"],
    enabled: isAuthenticated && (user?.isAdmin || isMarketing) && manualOrderDialogOpen,
  });

  const { data: products } = useQuery<ShopProduct[]>({
    queryKey: ["/api/admin/shop/items"],
    enabled: isAuthenticated && (user?.isAdmin || isMarketing) && manualOrderDialogOpen,
  });

  const createManualOrderMutation = useMutation({
    mutationFn: async (data: {
      memberId?: number;
      manualName?: string;
      items: Array<{ itemId: number; quantity: number; size?: string; gender?: string }>;
      installmentCount: number;
    }) => {
      const response = await apiRequest("POST", "/api/admin/shop/orders/manual", data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/orders"] });
      setManualOrderDialogOpen(false);
      setManualOrderMemberId("");
      setManualOrderName("");
      setManualOrderItems([]);
      setManualOrderInstallments("1");
      toast({ title: data.message || "Pedido criado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar pedido", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, orderStatus }: { orderId: number; orderStatus: string }) => {
      return apiRequest("PATCH", `/api/admin/shop/orders/${orderId}/status`, { orderStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/orders"] });
      toast({ title: "Status atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ orderIds, orderStatus }: { orderIds: number[]; orderStatus: string }) => {
      const response = await apiRequest("PATCH", "/api/admin/shop/orders/bulk-status", { orderIds, orderStatus });
      return await response.json() as { updated: number; orders: ShopOrder[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop/orders"] });
      setSelectedOrders([]);
      setBulkStatusDialogOpen(false);
      toast({ title: `${data?.updated ?? selectedOrders.length} pedidos atualizados` });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar pedidos", variant: "destructive" });
    },
  });

  if (!isAuthenticated || (!user?.isAdmin && !isMarketing)) {
    setLocation("/");
    return null;
  }

  const filteredOrders = orders?.filter(order => {
    const matchesStatus = statusFilter === "all" || order.orderStatus === statusFilter;
    const customerName = getCustomerName(order).toLowerCase();
    const matchesSearch = searchQuery === "" || 
      order.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const handleSelectOrder = (orderId: number) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const handleBulkStatusUpdate = () => {
    if (selectedOrders.length === 0 || !newBulkStatus) return;
    bulkUpdateMutation.mutate({ orderIds: selectedOrders, orderStatus: newBulkStatus });
  };

  const statusCounts = orders?.reduce((acc, order) => {
    acc[order.orderStatus] = (acc[order.orderStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="min-h-screen bg-background pb-20">
      <section className="bg-gradient-to-br from-pink-600 via-rose-600 to-red-600 text-white py-6">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link href="/admin/loja">
              <Button 
                variant="ghost" 
                className="mb-2 text-white/80 gap-2"
                data-testid="button-back-loja"
              >
                <ArrowLeft className="h-4 w-4" />
                Gestao da Loja
              </Button>
            </Link>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold" data-testid="text-pedidos-title">
                    Gestão de Pedidos
                  </h1>
                  <p className="text-white/80">
                    {orders?.length || 0} pedidos no total
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setManualOrderDialogOpen(true)}
                className="bg-white text-rose-600 gap-2"
                data-testid="button-create-manual-order"
              >
                <Plus className="h-4 w-4" />
                Criar Pedido
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-6">
        <div className="container mx-auto px-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-orders"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos ({orders?.length || 0})</SelectItem>
                {ORDER_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label} ({statusCounts[status.value] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedOrders.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="py-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-sm font-medium">
                    {selectedOrders.length} pedido(s) selecionado(s)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Select value={newBulkStatus} onValueChange={setNewBulkStatus}>
                      <SelectTrigger className="w-40" data-testid="select-bulk-status">
                        <SelectValue placeholder="Novo status" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => setBulkStatusDialogOpen(true)}
                      disabled={!newBulkStatus || bulkUpdateMutation.isPending}
                      data-testid="button-apply-bulk-status"
                    >
                      {bulkUpdateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Aplicar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedOrders([])}
                      data-testid="button-clear-selection"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {statusFilter !== "all" 
                    ? "Nenhum pedido encontrado com esse status"
                    : "Nenhum pedido realizado ainda"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-2">
                <Checkbox
                  checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm text-muted-foreground">Selecionar todos</span>
              </div>

              {filteredOrders.map((order) => {
                const statusInfo = getStatusInfo(order.orderStatus);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="hover-elevate">
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedOrders.includes(order.id)}
                            onCheckedChange={() => handleSelectOrder(order.id)}
                            data-testid={`checkbox-order-${order.id}`}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="font-mono font-bold text-sm" data-testid={`text-order-code-${order.id}`}>
                                #{order.orderCode}
                              </span>
                              <Badge className={cn("text-xs", statusInfo.color)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{getCustomerName(order)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(order.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {order.items.length} {order.items.length === 1 ? "item" : "itens"}
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(order.totalAmount)}
                                </span>
                              </div>
                            </div>

                            {order.observation && (
                              <p className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded-md">
                                Obs: {order.observation}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDetailsOrder(order)}
                              data-testid={`button-view-order-${order.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Select
                              value={order.orderStatus}
                              onValueChange={(value) => updateStatusMutation.mutate({ orderId: order.id, orderStatus: value })}
                            >
                              <SelectTrigger className="w-32" data-testid={`select-order-status-${order.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ORDER_STATUSES.map(status => (
                                  <SelectItem key={status.value} value={status.value}>
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Dialog open={!!detailsOrder} onOpenChange={() => setDetailsOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Pedido #{detailsOrder?.orderCode}
              {detailsOrder && (
                <Badge className={cn("text-xs", getStatusInfo(detailsOrder.orderStatus).color)}>
                  {getStatusInfo(detailsOrder.orderStatus).label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Detalhes completos para logistica
            </DialogDescription>
          </DialogHeader>
          
          {detailsOrder && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Dados do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="font-medium">{getCustomerName(detailsOrder)}</span>
                  </div>
                  {!detailsOrder.manualCustomerName && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span>{detailsOrder.user?.email || "N/A"}</span>
                      </div>
                      {detailsOrder.user?.phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Telefone:</span>
                          <span className="font-medium">{detailsOrder.user.phone}</span>
                        </div>
                      )}
                    </>
                  )}
                  {detailsOrder.manualCustomerName && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                      Cliente externo - sem cadastro no sistema
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Informacoes do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data do pedido:</span>
                    <span>{formatDate(detailsOrder.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pagamento:</span>
                    <Badge variant={detailsOrder.paymentStatus === "paid" ? "default" : "secondary"}>
                      {detailsOrder.paymentStatus === "paid" ? "Pago" : 
                       detailsOrder.paymentStatus === "pending" ? "Pendente" : detailsOrder.paymentStatus}
                    </Badge>
                  </div>
                  {detailsOrder.paidAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pago em:</span>
                      <span>{formatDate(detailsOrder.paidAt)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Itens do Pedido ({detailsOrder.items.reduce((acc, i) => acc + i.quantity, 0)} unidades)
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-2">
                  {detailsOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start p-3 bg-muted/50 rounded-md border">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{item.product?.name || "Produto nao encontrado"}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {item.gender && (
                            <Badge variant="outline" className="text-xs">
                              {item.gender === "male" ? "Masculino" : item.gender === "female" ? "Feminino" : "Unissex"}
                            </Badge>
                          )}
                          {item.size && (
                            <Badge variant="outline" className="text-xs font-bold">
                              Tam: {item.size}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            Qtd: {item.quantity}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {detailsOrder.observation && (
                <Card className="border-amber-200 dark:border-amber-800">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm text-amber-700 dark:text-amber-400">Observacao do Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-sm">{detailsOrder.observation}</p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2 pt-2 border-t">
                {detailsOrder.discountAmount && detailsOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto aplicado:</span>
                    <span>-{formatCurrency(detailsOrder.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total do Pedido</span>
                  <span className="font-bold text-xl">{formatCurrency(detailsOrder.totalAmount)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <h4 className="font-medium text-sm">Atualizar Status</h4>
                <Select
                  value={detailsOrder.orderStatus}
                  onValueChange={(value) => {
                    updateStatusMutation.mutate({ orderId: detailsOrder.id, orderStatus: value });
                    setDetailsOrder({ ...detailsOrder, orderStatus: value });
                  }}
                >
                  <SelectTrigger data-testid="select-detail-order-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOrder(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Atualização em Lote</DialogTitle>
            <DialogDescription>
              Você está prestes a alterar o status de {selectedOrders.length} pedido(s) para "{ORDER_STATUSES.find(s => s.value === newBulkStatus)?.label}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleBulkStatusUpdate}
              disabled={bulkUpdateMutation.isPending}
              data-testid="button-confirm-bulk-update"
            >
              {bulkUpdateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOrderDialogOpen} onOpenChange={setManualOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Pedido Manual</DialogTitle>
            <DialogDescription>
              Crie um pedido para um membro ou cliente externo
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Select 
                    value={manualOrderMemberId} 
                    onValueChange={(value) => {
                      setManualOrderMemberId(value);
                      if (value) setManualOrderName("");
                    }}
                  >
                    <SelectTrigger data-testid="select-manual-member">
                      <SelectValue placeholder="Selecionar membro" />
                    </SelectTrigger>
                    <SelectContent>
                      {members?.map(member => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Ou digite o nome do cliente"
                    value={manualOrderName}
                    onChange={(e) => {
                      setManualOrderName(e.target.value);
                      if (e.target.value) setManualOrderMemberId("");
                    }}
                    disabled={!!manualOrderMemberId}
                    data-testid="input-manual-name"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens do Pedido</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManualOrderItems([...manualOrderItems, { itemId: 0, quantity: 1, size: "", gender: "" }])}
                  className="gap-1"
                  data-testid="button-add-item"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar
                </Button>
              </div>
              
              {manualOrderItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum item adicionado. Clique em "Adicionar" para incluir produtos.
                </p>
              )}

              <div className="space-y-3">
                {manualOrderItems.map((item, index) => {
                  const selectedProduct = products?.find(p => p.id === item.itemId);
                  const availableSizes = selectedProduct?.sizes ? selectedProduct.sizes.split(',').map(s => s.trim()) : [];
                  
                  return (
                    <div key={index} className="flex flex-wrap gap-2 items-end p-3 border rounded-md bg-muted/30">
                      <div className="flex-1 min-w-[200px] space-y-1">
                        <Label className="text-xs">Produto</Label>
                        <Select
                          value={item.itemId ? item.itemId.toString() : ""}
                          onValueChange={(value) => {
                            const newItems = [...manualOrderItems];
                            newItems[index] = { ...item, itemId: parseInt(value), size: "", gender: "" };
                            setManualOrderItems(newItems);
                          }}
                        >
                          <SelectTrigger data-testid={`select-item-${index}`}>
                            <SelectValue placeholder="Selecionar produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products?.map(product => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} - {formatCurrency(product.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-20 space-y-1">
                        <Label className="text-xs">Qtd</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...manualOrderItems];
                            newItems[index] = { ...item, quantity: parseInt(e.target.value) || 1 };
                            setManualOrderItems(newItems);
                          }}
                          data-testid={`input-quantity-${index}`}
                        />
                      </div>

                      {availableSizes.length > 0 && (
                        <div className="w-24 space-y-1">
                          <Label className="text-xs">Tamanho</Label>
                          <Select
                            value={item.size}
                            onValueChange={(value) => {
                              const newItems = [...manualOrderItems];
                              newItems[index] = { ...item, size: value };
                              setManualOrderItems(newItems);
                            }}
                          >
                            <SelectTrigger data-testid={`select-size-${index}`}>
                              <SelectValue placeholder="Tam" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSizes.map(size => (
                                <SelectItem key={size} value={size}>{size}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {selectedProduct?.hasGenderOption && (
                        <div className="w-28 space-y-1">
                          <Label className="text-xs">Modelo</Label>
                          <Select
                            value={item.gender}
                            onValueChange={(value) => {
                              const newItems = [...manualOrderItems];
                              newItems[index] = { ...item, gender: value };
                              setManualOrderItems(newItems);
                            }}
                          >
                            <SelectTrigger data-testid={`select-gender-${index}`}>
                              <SelectValue placeholder="Modelo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="masculino">Masculino</SelectItem>
                              <SelectItem value="feminino">Feminino</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newItems = manualOrderItems.filter((_, i) => i !== index);
                          setManualOrderItems(newItems);
                        }}
                        className="text-destructive"
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Parcelamento</Label>
              <Select value={manualOrderInstallments} onValueChange={setManualOrderInstallments}>
                <SelectTrigger data-testid="select-installments">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <SelectItem key={n} value={n.toString()}>
                      {n === 1 ? "A vista" : `${n}x`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {manualOrderItems.length > 0 && (
              <div className="p-3 bg-muted rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(
                      manualOrderItems.reduce((sum, item) => {
                        const product = products?.find(p => p.id === item.itemId);
                        return sum + (product?.price || 0) * item.quantity;
                      }, 0)
                    )}
                  </span>
                </div>
                {parseInt(manualOrderInstallments) > 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {manualOrderInstallments}x de {formatCurrency(
                      Math.floor(
                        manualOrderItems.reduce((sum, item) => {
                          const product = products?.find(p => p.id === item.itemId);
                          return sum + (product?.price || 0) * item.quantity;
                        }, 0) / parseInt(manualOrderInstallments)
                      )
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setManualOrderDialogOpen(false);
                setManualOrderMemberId("");
                setManualOrderName("");
                setManualOrderItems([]);
                setManualOrderInstallments("1");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (manualOrderItems.length === 0) {
                  toast({ title: "Adicione pelo menos um item", variant: "destructive" });
                  return;
                }
                if (!manualOrderMemberId && !manualOrderName) {
                  toast({ title: "Selecione um membro ou informe um nome", variant: "destructive" });
                  return;
                }
                createManualOrderMutation.mutate({
                  memberId: manualOrderMemberId ? parseInt(manualOrderMemberId) : undefined,
                  manualName: manualOrderName || undefined,
                  items: manualOrderItems.filter(i => i.itemId > 0),
                  installmentCount: parseInt(manualOrderInstallments),
                });
              }}
              disabled={createManualOrderMutation.isPending || manualOrderItems.length === 0}
              data-testid="button-submit-manual-order"
            >
              {createManualOrderMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
