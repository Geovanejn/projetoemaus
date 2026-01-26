import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { Package } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

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
  bannerImageData: string | null;
  images: { id: number; gender: string; imageData: string; sortOrder: number }[];
}

interface ShopCategory {
  id: number;
  name: string;
  imageData: string | null;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const marqueeTexts = [
  "UMP EMAÚS",
  "ALEGRES NA ESPERANÇA",
  "FORTES NA FÉ",
  "DEDICADOS NO AMOR",
  "UNIDOS NO TRABALHO",
];

function MarqueeSeparator() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const cycleDuration = 7320;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % marqueeTexts.length);
        setIsVisible(true);
      }, 50);
    }, cycleDuration);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  return (
    <div className="py-3 overflow-hidden bg-white" data-testid="marquee-separator">
      <style>{`
        @keyframes marqueeSlide {
          0% { transform: translate3d(300px, 0, 0); }
          8% { transform: translate3d(0, 0, 0); }
          92% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-300px, 0, 0); }
        }
        .marquee-text {
          will-change: transform;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translate3d(300px, 0, 0);
          animation: marqueeSlide 7320ms cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
        }
      `}</style>
      <div 
        className="flex items-center justify-center gap-4"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <span className="text-base text-primary font-bold">•</span>
        <div className="relative h-6 overflow-hidden min-w-[280px] flex items-center justify-center">
          {isVisible && (
            <span
              key={currentIndex}
              className="marquee-text text-base font-semibold text-black uppercase tracking-wider absolute whitespace-nowrap"
            >
              {marqueeTexts[currentIndex]}
            </span>
          )}
        </div>
        <span className="text-base text-primary font-bold">•</span>
      </div>
    </div>
  );
}

export default function LojaHomePage() {
  const { isAuthenticated } = useAuth();
  const [carouselIndex, setCarouselIndex] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, dragFree: false },
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: false })]
  );

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

  const { data: featuredItems, isLoading: loadingFeatured } = useQuery<ShopItemWithDetails[]>({
    queryKey: ["/api/shop/featured"],
  });

  const { data: categories } = useQuery<ShopCategory[]>({
    queryKey: ["/api/shop/categories"],
  });

  const { data: allItems, isLoading: loadingItems } = useQuery<ShopItemWithDetails[]>({
    queryKey: ["/api/shop/items"],
  });

  const bannerItems = featuredItems?.filter(item => item.bannerImageData || (item.images && item.images.length > 0)).slice(0, 10) || [];
  const newArrivals = allItems?.slice(0, 6) || [];

  const categoryBadges: { [key: string]: { label: string; bgColor: string; textColor: string } } = {
    "Acessórios": { label: "ACESSÓRIOS", bgColor: "bg-yellow-400", textColor: "text-black" },
    "Kit UMP": { label: "KIT UMP", bgColor: "bg-yellow-400", textColor: "text-black" },
    "Vestuários": { label: "VESTUÁRIOS", bgColor: "bg-yellow-400", textColor: "text-black" },
    "Os Mais Pedidos": { label: "OS MAIS PEDIDOS", bgColor: "bg-yellow-400", textColor: "text-black" },
  };

  return (
    <div className="min-h-screen bg-white">
      <ShopHeader />

      {/* Banner Carousel - Swipeable */}
      {loadingFeatured ? (
        <Skeleton className="w-full aspect-square bg-gray-100" />
      ) : bannerItems.length > 0 ? (
        <section className="relative bg-gray-100">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {bannerItems.map((item, index) => {
                const bannerImage = item.bannerImageData || item.images?.[0]?.imageData;
                return (
                  <div 
                    key={item.id} 
                    className="flex-[0_0_100%] min-w-0 relative aspect-square"
                  >
                    <Link href={`/loja/produto/${item.id}`}>
                      {bannerImage ? (
                        <img
                          src={bannerImage}
                          alt={item.name}
                          className="w-full h-full object-cover cursor-pointer"
                          loading={index === 0 ? "eager" : "lazy"}
                          decoding="async"
                          data-testid={`banner-image-${index}`}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center cursor-pointer">
                          <Package className="h-20 w-20 text-gray-400" />
                        </div>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Dots Indicator */}
          {bannerItems.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {bannerItems.map((_, idx) => (
                <button
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx === carouselIndex ? "bg-white" : "bg-white/50"
                  }`}
                  onClick={() => emblaApi?.scrollTo(idx)}
                  data-testid={`button-banner-dot-${idx}`}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="bg-gradient-to-br from-primary to-primary text-black py-12 px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">Emaus Shop</h2>
            <p className="text-black/70 mb-6">Encontre produtos exclusivos da UMP</p>
            <Link href="/loja/catalogo">
              <Button className="bg-black text-white hover:bg-gray-900 px-8">
                Ver Produtos
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Marquee Separator - Static texts with slide animation */}
      <MarqueeSeparator />

      {/* Categories - 2 per row, horizontal scroll for more */}
      {categories && categories.length > 0 && (
        <section className="px-3 pt-0 pb-4">
          <div 
            className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {categories.map((cat) => {
              const categoryImage = cat.imageData || (allItems?.find(item => item.categoryId === cat.id)?.images?.[0]?.imageData);
              const badge = { label: cat.name.toUpperCase(), bgColor: "bg-primary", textColor: "text-black" };
              
              return (
                <Link key={cat.id} href={`/loja/catalogo?categoria=${cat.id}`}>
                  <div 
                    className="relative aspect-square overflow-hidden bg-gray-100 cursor-pointer flex-shrink-0 snap-start rounded-lg"
                    style={{ width: 'calc((100vw - 1.5rem - 1rem) / 3)' }}
                    data-testid={`card-category-${cat.id}`}
                  >
                    {categoryImage ? (
                      <img
                        src={categoryImage}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-lg">
                        <Package className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    
                    <div className={`absolute top-2 left-1/2 -translate-x-1/2 ${badge.bgColor} ${badge.textColor} text-[10px] font-bold px-2 py-[3px] rounded-md shadow-sm`}>
                      {badge.label}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Lançamentos Section */}
      <section className="px-4 py-6">
        <h2 className="text-2xl font-bold text-black mb-4" style={{ fontFamily: 'Georgia, serif' }}>
          Lançamentos!
        </h2>

        {loadingItems ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden border border-gray-100">
                <Skeleton className="aspect-[3/4] w-full bg-gray-100" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-gray-100" />
                  <Skeleton className="h-5 w-1/2 bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : newArrivals.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto disponivel</h3>
            <p className="text-gray-500">Aguarde novos produtos na loja.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {newArrivals.map((item) => (
              <Link key={item.id} href={`/loja/produto/${item.id}`}>
                <div 
                  className={`bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm cursor-pointer relative ${!item.isAvailable ? 'opacity-75' : ''}`}
                  data-testid={`card-item-${item.id}`}
                >
                  <div className="aspect-[3/4] bg-gray-50 relative overflow-hidden">
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
                    {!item.isAvailable && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                        ESGOTADO
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-normal text-sm text-black line-clamp-2 mb-1" data-testid={`text-item-name-${item.id}`}>
                      {item.name}
                    </h3>
                    <p className={`text-base font-bold ${!item.isAvailable ? 'text-gray-400' : 'text-black'}`} data-testid={`text-item-price-${item.id}`}>
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {newArrivals.length > 0 && (
          <div className="mt-6 text-center">
            <Link href="/loja/catalogo">
              <Button variant="outline" className="border-black text-black hover:bg-black hover:text-white px-8">
                Ver Todos os Produtos
              </Button>
            </Link>
          </div>
        )}
      </section>

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
