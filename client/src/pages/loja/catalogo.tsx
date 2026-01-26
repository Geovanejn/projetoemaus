import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { Package } from "lucide-react";
import { motion } from "framer-motion";

interface ShopItemWithDetails {
  id: number;
  name: string;
  description: string | null;
  price: number;
  categoryId: number;
  genderType: string;
  hasSize: boolean;
  isAvailable: boolean;
  isPreOrder: boolean;
  isFeatured: boolean;
  featuredOrder: number | null;
  images: { id: number; gender: string; imageData: string; sortOrder: number }[];
  sizes: { id: number; gender: string; size: string; sortOrder: number }[];
}

interface ShopCategory {
  id: number;
  name: string;
  description: string | null;
}


function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function LojaPage() {
  const { isAuthenticated } = useAuth();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const categoryId = params.get("categoria");

  const { data: items, isLoading } = useQuery<ShopItemWithDetails[]>({
    queryKey: ["/api/shop/items"],
    enabled: isAuthenticated,
  });

  const { data: categories } = useQuery<ShopCategory[]>({
    queryKey: ["/api/shop/categories"],
    enabled: isAuthenticated,
  });

  const filteredItems = items?.filter((item) => {
    if (categoryId) return item.categoryId === parseInt(categoryId);
    return true;
  }) || [];

  const selectedCategory = categoryId ? categories?.find(c => c.id === parseInt(categoryId)) : null;

  return (
    <div className="min-h-screen bg-white">
      <ShopHeader />

      {/* Breadcrumb */}
      <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50">
        <Link href="/loja" className="hover:text-black">Início</Link>
        <span className="mx-1">&gt;</span>
        {selectedCategory ? (
          <>
            <Link href="/loja/catalogo" className="hover:text-black">Loja</Link>
            <span className="mx-1">&gt;</span>
            <span className="text-black">{selectedCategory.name}</span>
          </>
        ) : (
          <span className="text-black">Loja</span>
        )}
      </div>

      {/* Category Title */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black">
              {selectedCategory ? selectedCategory.name : "Produtos"}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Mostrando 1-{filteredItems.length} de {filteredItems.length} produtos
            </p>
          </div>
        </div>
      </div>

      {/* Products Grid - SHOP.CO Style */}
      <section className="px-4 pb-8">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg overflow-hidden">
                <Skeleton className="aspect-square w-full bg-gray-100" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-gray-100" />
                  <Skeleton className="h-3 w-1/2 bg-gray-100" />
                  <Skeleton className="h-5 w-1/3 bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto disponível</h3>
            <p className="text-gray-500">
              Aguarde novos produtos na loja.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link href={`/loja/produto/${item.id}`}>
                <div 
                  className={`bg-gray-50 rounded-lg overflow-hidden cursor-pointer relative ${!item.isAvailable ? 'opacity-75' : ''}`}
                  data-testid={`card-item-${item.id}`}
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0].imageData}
                        alt={item.name}
                        className={`w-full h-full object-cover ${!item.isAvailable ? 'grayscale' : ''}`}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    {!item.isAvailable ? (
                      <Badge 
                        className="absolute top-2 right-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold"
                      >
                        ESGOTADO
                      </Badge>
                    ) : item.isPreOrder && (
                      <Badge 
                        className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full"
                      >
                        Pré-venda
                      </Badge>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm text-black line-clamp-2 mb-1" data-testid={`text-item-name-${item.id}`}>
                      {item.name}
                    </h3>
                    <div className="mt-2">
                      <span className={`text-lg font-bold ${!item.isAvailable ? 'text-gray-400' : 'text-black'}`}>
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                  </div>
                </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
