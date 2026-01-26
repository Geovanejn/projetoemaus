import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { ShopHeader } from "@/components/shop/ShopHeader";
import useEmblaCarousel from "embla-carousel-react";
import type { ShopItem, ShopItemImage, ShopItemSize, ShopItemSizeChart } from "@shared/schema";

interface ShopItemWithDetails extends ShopItem {
  images: ShopItemImage[];
  sizes: ShopItemSize[];
  sizeCharts?: ShopItemSizeChart[];
  category?: { id: number; name: string };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

export default function LojaProdutoPage() {
  const [, params] = useRoute("/loja/produto/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const productId = params?.id ? parseInt(params.id) : null;
  
  const [selectedGender, setSelectedGender] = useState<string>("unissex");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "specs" | "sizes">("description");

  const { data: items, isLoading } = useQuery<ShopItemWithDetails[]>({
    queryKey: ["/api/shop/items"],
  });

  const product = items?.find(item => item.id === productId);
  const relatedProducts = items?.filter(item => item.id !== productId && item.isAvailable).slice(0, 4) || [];

  const addToCartMutation = useMutation({
    mutationFn: async (data: { itemId: number; quantity: number; size?: string; gender?: string }) => {
      return apiRequest("POST", "/api/shop/cart", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop/cart"] });
      toast({ title: "Adicionado ao carrinho", description: "O item foi adicionado com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível adicionar ao carrinho.", variant: "destructive" });
    },
  });

  const currentImages = product?.images?.filter((img: ShopItemImage) => {
    if (product.genderType === "unissex") return true;
    return img.gender === selectedGender || img.gender === "unissex";
  }) || [];

  const availableSizes = product?.sizes?.filter(s => {
    if (product.genderType === "unissex") return true;
    return s.gender === selectedGender;
  }) || [];

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, dragFree: false });

  useEffect(() => {
    if (emblaApi) {
      emblaApi.scrollTo(0);
    }
  }, [selectedGender, emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCarouselIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  const addToCart = () => {
    if (!product || !user) {
      toast({ title: "Faça login", description: "Entre na sua conta para adicionar ao carrinho.", variant: "destructive" });
      return;
    }
    if (product.hasSize && !selectedSize) {
      toast({ title: "Selecione um tamanho", description: "Escolha o tamanho antes de adicionar.", variant: "destructive" });
      return;
    }
    addToCartMutation.mutate({
      itemId: product.id,
      quantity,
      size: selectedSize || undefined,
      gender: selectedGender,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <ShopHeader />
        <div className="p-4">
          <Skeleton className="aspect-square w-full rounded-lg mb-4" />
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <ShopHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-xl font-medium text-gray-900 mb-2">Produto não encontrado</h2>
            <Link href="/loja">
              <Button variant="outline" data-testid="button-back-catalog">Voltar a loja</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <ShopHeader />

      {/* Product Image Gallery - Swipeable */}
      <div className="relative bg-white">
        {currentImages.length > 0 ? (
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {currentImages.map((img, idx) => (
                <div key={img.id} className="flex-[0_0_100%] min-w-0">
                  <div className="aspect-square">
                    <img
                      src={img.imageData}
                      alt={`${product.name} - ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading={idx === 0 ? "eager" : "lazy"}
                      decoding="async"
                      data-testid={`product-image-${idx}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="aspect-square flex items-center justify-center bg-gray-100">
            <ShoppingCart className="h-16 w-16 text-gray-300" />
          </div>
        )}

        {/* Dots indicator */}
        {currentImages.length > 1 && (
          <div className="flex justify-center gap-2 py-3">
            {currentImages.map((_, idx) => (
              <button
                key={idx}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === carouselIndex ? "bg-black" : "bg-gray-300"
                }`}
                onClick={() => emblaApi?.scrollTo(idx)}
                data-testid={`button-dot-${idx}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-4">
        {/* Badges */}
        <div className="flex gap-2">
          {!product.isAvailable && (
            <Badge className="bg-red-600 text-white text-xs px-3 py-1" data-testid="badge-sold-out">
              ESGOTADO
            </Badge>
          )}
          {product.isFeatured && (
            <Badge className="bg-black text-white text-xs px-3 py-1">
              DESTAQUE
            </Badge>
          )}
          {product.isPreOrder && (
            <Badge className="bg-yellow-400 text-black text-xs px-3 py-1">
              LANCAMENTO
            </Badge>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-black" data-testid="text-product-name">
          {product.name}
        </h1>

        {/* Availability */}
        {!product.isAvailable ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 font-bold text-lg" data-testid="text-unavailable">Produto Indisponível</p>
            <p className="text-red-500 text-sm mt-1">Este produto está temporariamente esgotado.</p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Disponibilidade: <span className="text-green-600 font-medium">Imediata</span>
          </p>
        )}

        {/* Price */}
        <div className="space-y-1">
          <p className="text-3xl font-bold text-black" data-testid="text-product-price">
            {formatCurrency(product.price)}
          </p>
        </div>

        {/* Size Selection */}
        {product.hasSize && availableSizes.length > 0 && product.isAvailable && (
          <div className="space-y-2 pt-4">
            <p className="text-sm font-medium text-black">Tamanho:</p>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((sizeItem) => (
                <button
                  key={sizeItem.id}
                  onClick={() => setSelectedSize(sizeItem.size)}
                  className={`px-4 py-2 border text-sm font-medium transition-all ${
                    selectedSize === sizeItem.size
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-gray-300 hover:border-black"
                  }`}
                  data-testid={`button-size-${sizeItem.size}`}
                >
                  {sizeItem.size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Gender Selection - Show for browsing even if product unavailable */}
        {product.genderType !== "unissex" && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-black">Modelo:</p>
            <div className="flex gap-2">
              {["masculino", "feminino"].map((gender) => (
                <button
                  key={gender}
                  onClick={() => {
                    setSelectedGender(gender);
                    setSelectedSize(null);
                  }}
                  className={`px-4 py-2 border text-sm font-medium transition-all ${
                    selectedGender === gender
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-gray-300 hover:border-black"
                  }`}
                  data-testid={`button-gender-${gender}`}
                >
                  {gender === "masculino" ? "Masculino" : "Feminino"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity + Add to Cart - Only show if product is available */}
        {product.isAvailable ? (
          <div className="flex items-center gap-3 pt-4">
            <div className="flex items-center border border-gray-300">
              <button
                className="p-3 text-gray-600 hover:text-black disabled:opacity-50"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                data-testid="button-quantity-decrease"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center font-medium text-black" data-testid="text-quantity">
                {quantity}
              </span>
              <button
                className="p-3 text-gray-600 hover:text-black disabled:opacity-50"
                onClick={() => setQuantity(q => Math.min(10, q + 1))}
                disabled={quantity >= 10}
                data-testid="button-quantity-increase"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button
              className="flex-1 h-12 text-base font-bold bg-yellow-400 text-black hover:bg-yellow-500"
              onClick={addToCart}
              disabled={addToCartMutation.isPending || (product.hasSize && !selectedSize)}
              data-testid="button-add-to-cart"
            >
              {addToCartMutation.isPending ? "ADICIONANDO..." : "COMPRAR"}
            </Button>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="pt-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("description")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === "description"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500"
              }`}
              data-testid="tab-description"
            >
              Descrição
            </button>
            <button
              onClick={() => setActiveTab("specs")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === "specs"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500"
              }`}
              data-testid="tab-specs"
            >
              Ficha Técnica
            </button>
            {product.hasSize && (
              <button
                onClick={() => setActiveTab("sizes")}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === "sizes"
                    ? "border-black text-black"
                    : "border-transparent text-gray-500"
                }`}
                data-testid="tab-sizes"
              >
                Medidas
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="py-4">
            {activeTab === "description" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-black">Descrição Geral</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {product.description || "Produto de alta qualidade da UMP Emaus. Confeccionado com materiais premium para garantir conforto e durabilidade."}
                </p>
              </div>
            )}

            {activeTab === "specs" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-black">Ficha Técnica</h3>
                <div className="divide-y divide-gray-100">
                  <div className="flex py-3">
                    <span className="w-1/3 text-sm text-gray-500">Código</span>
                    <span className="flex-1 text-sm text-black">{product.id}</span>
                  </div>
                  {product.category && (
                    <div className="flex py-3 bg-gray-50">
                      <span className="w-1/3 text-sm text-gray-500 pl-2">Categoria</span>
                      <span className="flex-1 text-sm text-black">{product.category.name}</span>
                    </div>
                  )}
                  <div className="flex py-3">
                    <span className="w-1/3 text-sm text-gray-500">Marca</span>
                    <span className="flex-1 text-sm text-black">UMP Emaus</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sizes" && product.hasSize && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-black">Tabela de Medidas (cm)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-2 px-3 text-left font-medium text-gray-600">Tamanho</th>
                        <th className="py-2 px-3 text-center font-medium text-gray-600">Largura</th>
                        <th className="py-2 px-3 text-center font-medium text-gray-600">Comprimento</th>
                        <th className="py-2 px-3 text-center font-medium text-gray-600">Manga</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {availableSizes.map((size) => {
                        const chart = product.sizeCharts?.find(c => c.size === size.size && c.gender === size.gender);
                        return (
                          <tr key={size.id}>
                            <td className="py-2 px-3 font-medium text-black">{size.size}</td>
                            <td className="py-2 px-3 text-center text-gray-600">{chart?.width || "-"}</td>
                            <td className="py-2 px-3 text-center text-gray-600">{chart?.length || "-"}</td>
                            <td className="py-2 px-3 text-center text-gray-600">{chart?.sleeve || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="pt-6 border-t border-gray-100">
            <h3 className="text-xl font-bold text-black mb-4">Produtos relacionados</h3>
            <div className="grid grid-cols-2 gap-4">
              {relatedProducts.map((item) => (
                <Link key={item.id} href={`/loja/produto/${item.id}`}>
                  <div className="bg-white rounded-lg overflow-hidden border border-gray-100">
                    <div className="aspect-square bg-gray-50">
                      {item.images?.[0]?.imageData ? (
                        <img
                          src={item.images[0].imageData}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-medium text-black line-clamp-2 mb-1">{item.name}</h4>
                      <p className="text-base font-bold text-black">{formatCurrency(item.price)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 px-4 mt-8">
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-500">UMP Emaus</p>
          <p className="text-xs text-gray-400">Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}
