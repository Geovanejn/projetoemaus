import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, Tag, Check, X, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { ShopHeader } from "@/components/shop/ShopHeader";
import type { ShopItem, ShopCartItem } from "@shared/schema";

interface PromoValidation {
  valid: boolean;
  message: string;
  discount?: number;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  appliedItems?: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

interface CartItemWithDetails extends ShopCartItem {
  item: ShopItem & { 
    images?: Array<{ id: number; imageData: string; gender: string }>;
    allowInstallments?: boolean;
    maxInstallments?: number | null;
  };
}

export default function LojaCarrinhoPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoValidation | null>(null);
  const [observation, setObservation] = useState("");
  const [selectedInstallments, setSelectedInstallments] = useState<number>(1);

  const { data: cartItems, isLoading } = useQuery<CartItemWithDetails[]>({
    queryKey: ["/api/shop/cart"],
    enabled: !!user,
  });

  const { data: pixStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/pix/status"],
    enabled: !!user,
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      return apiRequest("PATCH", `/api/shop/cart/${id}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop/cart"] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/shop/cart/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop/cart"] });
      setAppliedPromo(null);
      setPromoCode("");
      toast({ title: "Item removido", description: "O item foi removido do carrinho." });
    },
  });

  const validatePromoMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!cartItems) throw new Error("Carrinho vazio");
      const res = await apiRequest("POST", "/api/shop/validate-promo", { code });
      return res.json();
    },
    onSuccess: (data: { valid: boolean; code: string; discountAmount: number; discountType: string; discountValue: number }) => {
      if (data.valid) {
        setAppliedPromo({
          valid: true,
          message: `Cupom ${data.code} aplicado com sucesso!`,
          discount: data.discountAmount,
          discountType: data.discountType as "percentage" | "fixed",
          discountValue: data.discountValue,
        });
        toast({ title: "Cupom aplicado!", description: `Desconto de ${formatCurrency(data.discountAmount)} aplicado.` });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Cupom inválido", description: error.message || "Não foi possível validar o cupom.", variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: { items: Array<{ cartItemId: number; gender: string; size?: string }>; observation?: string; promoCode?: string; installmentCount?: number }) => {
      const res = await apiRequest("POST", "/api/shop/checkout", data);
      return res.json();
    },
    onSuccess: (orderData: { id: number; orderCode: string; totalAmount: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop/my-orders"] });
      
      toast({ 
        title: "Pedido realizado!", 
        description: pixStatus?.configured 
          ? "Acesse Meus Pedidos para pagar com PIX." 
          : "Seu pedido foi enviado com sucesso." 
      });
      setLocation("/loja/pedidos");
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message || "Não foi possível finalizar o pedido.", variant: "destructive" });
    },
  });

  const subtotal = cartItems?.reduce((sum, item) => sum + (item.item.price * item.quantity), 0) || 0;
  const discount = appliedPromo?.discount || 0;
  const total = Math.max(0, subtotal - discount);
  const cartCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const maxAllowedInstallments = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return 1;
    let max = 1;
    for (const cartItem of cartItems) {
      if (cartItem.item.allowInstallments && cartItem.item.maxInstallments) {
        if (cartItem.item.maxInstallments > max) {
          max = cartItem.item.maxInstallments;
        }
      }
    }
    return max;
  }, [cartItems]);

  const installmentBreakdown = useMemo(() => {
    if (selectedInstallments <= 1) return { base: total, first: total, remainder: 0 };
    const base = Math.floor(total / selectedInstallments);
    const remainder = total - (base * selectedInstallments);
    const first = base + remainder;
    return { base, first, remainder };
  }, [total, selectedInstallments]);

  const handleCheckout = () => {
    if (!cartItems || cartItems.length === 0) return;
    
    const items = cartItems.map(c => ({
      cartItemId: c.id,
      gender: c.gender || "unissex",
      size: c.size || undefined,
    }));
    
    checkoutMutation.mutate({ 
      items, 
      observation: observation || undefined,
      promoCode: appliedPromo?.valid ? promoCode : undefined,
      installmentCount: selectedInstallments > 1 ? selectedInstallments : undefined,
    });
  };

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    validatePromoMutation.mutate(promoCode.trim().toUpperCase());
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center p-8">
          <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Faça login para ver seu carrinho</h2>
          <Link href="/login">
            <Button className="bg-black text-white hover:bg-gray-800 rounded-full">
              Entrar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <ShopHeader />

      {/* Breadcrumb */}
      <nav className="px-4 py-2 text-xs text-gray-500">
        <Link href="/loja" className="hover:text-black">Início</Link>
        <span className="mx-1">&gt;</span>
        <span className="text-black">Carrinho</span>
      </nav>

      {/* Title */}
      <div className="px-4 py-4">
        <h1 className="text-2xl font-bold text-black uppercase tracking-tight" data-testid="text-cart-title">
          SEU CARRINHO
        </h1>
      </div>

      {isLoading ? (
        <div className="px-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 p-4 border border-gray-100 rounded-xl">
              <Skeleton className="w-20 h-20 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : !cartItems || cartItems.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Seu carrinho está vazio</h2>
          <p className="text-gray-500 mb-4">Adicione produtos para continuar</p>
          <Link href="/loja">
            <Button className="bg-black text-white hover:bg-gray-800 rounded-full">
              Continuar comprando
            </Button>
          </Link>
        </div>
      ) : (
        <div className="px-4 space-y-4 pb-6">
          {/* Cart Items */}
          {cartItems.map((cartItem) => {
            const image = cartItem.item.images?.find(img => img.gender === cartItem.gender || img.gender === "unissex");
            
            return (
              <motion.div
                key={cartItem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 p-4 border border-gray-100 rounded-xl"
                data-testid={`cart-item-${cartItem.id}`}
              >
                {/* Product Image */}
                <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                  {image ? (
                    <img src={image.imageData} alt={cartItem.item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-sm text-black line-clamp-1" data-testid={`text-item-name-${cartItem.id}`}>
                        {cartItem.item.name}
                      </h3>
                      <div className="text-xs text-gray-500 space-y-0.5 mt-1">
                        {cartItem.size && <p>Size: <span className="text-black">{cartItem.size}</span></p>}
                        {cartItem.gender && <p>Color: <span className="text-black">{cartItem.gender === "masculino" ? "Green" : cartItem.gender === "feminino" ? "Blue" : "Default"}</span></p>}
                      </div>
                    </div>
                    <button
                      onClick={() => removeItemMutation.mutate(cartItem.id)}
                      className="text-red-500 p-1"
                      data-testid={`button-remove-${cartItem.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="font-bold text-black" data-testid={`text-item-price-${cartItem.id}`}>
                      {formatCurrency(cartItem.item.price)}
                    </span>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
                      <button
                        onClick={() => updateQuantityMutation.mutate({ id: cartItem.id, quantity: Math.max(1, cartItem.quantity - 1) })}
                        disabled={cartItem.quantity <= 1}
                        className="text-gray-600 disabled:opacity-50"
                        data-testid={`button-decrease-${cartItem.id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium text-black">{cartItem.quantity}</span>
                      <button
                        onClick={() => updateQuantityMutation.mutate({ id: cartItem.id, quantity: Math.min(10, cartItem.quantity + 1) })}
                        disabled={cartItem.quantity >= 10}
                        className="text-gray-600 disabled:opacity-50"
                        data-testid={`button-increase-${cartItem.id}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Order Summary */}
          <div className="border border-gray-100 rounded-xl p-4 mt-6">
            <h2 className="text-lg font-bold text-black mb-4">Resumo do Pedido</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-black" data-testid="text-subtotal">{formatCurrency(subtotal)}</span>
              </div>
              {appliedPromo && appliedPromo.discount && appliedPromo.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Desconto ({promoCode})
                  </span>
                  <span data-testid="text-discount">-{formatCurrency(appliedPromo.discount)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="font-medium text-black">Total</span>
                <span className="font-bold text-lg text-black" data-testid="text-total">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Installment Selection */}
            {maxAllowedInstallments > 1 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Parcelamento PIX</span>
                </div>
                <Select
                  value={selectedInstallments.toString()}
                  onValueChange={(val) => setSelectedInstallments(parseInt(val, 10))}
                >
                  <SelectTrigger className="w-full bg-white" data-testid="select-installments">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      A vista - {formatCurrency(total)}
                    </SelectItem>
                    {Array.from({ length: maxAllowedInstallments - 1 }, (_, i) => i + 2).map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}x de {formatCurrency(Math.ceil(total / n))} (venc. dia 10)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedInstallments > 1 && (
                  <p className="text-xs text-blue-600 mt-2">
                    {installmentBreakdown.remainder > 0 
                      ? `1x ${formatCurrency(installmentBreakdown.first)} + ${selectedInstallments - 1}x ${formatCurrency(installmentBreakdown.base)}`
                      : `${selectedInstallments}x de ${formatCurrency(installmentBreakdown.base)}`
                    } - Vencimento dia 10
                  </p>
                )}
              </div>
            )}

            {/* Promo Code */}
            {appliedPromo?.valid ? (
              <div className="flex items-center justify-between mt-4 bg-green-50 border border-green-200 rounded-full px-4 py-2">
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <Check className="h-4 w-4" />
                  <span>Cupom <strong>{promoCode}</strong> aplicado</span>
                </div>
                <button onClick={handleRemovePromo} className="text-green-700 hover:text-green-900" data-testid="button-remove-promo">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mt-4">
                <div className="flex-1 relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Código promocional"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                    className="pl-10 rounded-full border-gray-200 bg-gray-50"
                    data-testid="input-promo-code"
                  />
                </div>
                <Button 
                  variant="outline" 
                  className="rounded-full px-6 border-black text-black" 
                  onClick={handleApplyPromo}
                  disabled={!promoCode.trim() || validatePromoMutation.isPending}
                  data-testid="button-apply-promo"
                >
                  {validatePromoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                </Button>
              </div>
            )}

            {/* Checkout Button */}
            <Button
              className="w-full mt-4 bg-black text-white hover:bg-gray-800 rounded-full h-12 text-sm font-medium flex items-center justify-center gap-2"
              onClick={handleCheckout}
              disabled={checkoutMutation.isPending}
              data-testid="button-checkout"
            >
              {checkoutMutation.isPending ? "Processando..." : "Finalizar Compra"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
