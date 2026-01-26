import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Menu, Search, ShoppingBag, ChevronRight } from "lucide-react";
import storeLogo from "@assets/20260105_204033_0000_(1)_1767657107576.png";

interface ShopCategory {
  id: number;
  name: string;
  description: string | null;
}

interface ShopHeaderProps {
  onSearch?: (term: string) => void;
}

export function ShopHeader({ onSearch }: ShopHeaderProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: categories } = useQuery<ShopCategory[]>({
    queryKey: ["/api/shop/categories"],
    enabled: isAuthenticated,
  });

  const { data: cartItems } = useQuery<Array<{ id: number; quantity: number }>>({
    queryKey: ["/api/shop/cart"],
    enabled: isAuthenticated,
  });

  const cartCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const handleSearch = () => {
    const term = searchTerm.trim();
    if (term) {
      if (onSearch) {
        onSearch(term);
      } else {
        setLocation(`/loja/catalogo?busca=${encodeURIComponent(term)}`);
      }
      setSearchOpen(false);
      setSearchTerm("");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Menu Button */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-black"
                data-testid="button-menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-white p-0">
              <SheetHeader className="p-4 border-b flex flex-row items-center justify-between">
                <SheetTitle className="text-left font-bold">Menu</SheetTitle>
              </SheetHeader>
              <nav className="p-4 space-y-1">
                <Link href="/loja" onClick={() => setMenuOpen(false)}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer" data-testid="link-menu-home">
                    <span className="font-medium text-black">Inicio</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
                <Link href="/loja/catalogo" onClick={() => setMenuOpen(false)}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer" data-testid="link-menu-catalog">
                    <span className="font-medium text-black">Todos os Produtos</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
                
                {categories && categories.length > 0 && (
                  <>
                    <div className="pt-4 pb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categorias</span>
                    </div>
                    {categories.map((cat) => (
                      <Link 
                        key={cat.id} 
                        href={`/loja/catalogo?categoria=${cat.id}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        <div 
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                          data-testid={`link-category-${cat.id}`}
                        >
                          <span className="text-black">{cat.name}</span>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </Link>
                    ))}
                  </>
                )}
                
                <div className="pt-4 border-t mt-4">
                  <Link href="/loja/pedidos" onClick={() => setMenuOpen(false)}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer" data-testid="link-menu-orders">
                      <span className="text-black">Meus Pedidos</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/loja">
            <div className="flex items-center gap-2" data-testid="link-logo">
              <img 
                src={storeLogo} 
                alt="Emaús Store" 
                className="h-8 w-auto object-contain"
              />
            </div>
          </Link>

          {/* Right Icons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-black"
              onClick={() => setSearchOpen(true)}
              data-testid="button-search"
            >
              <Search className="h-5 w-5" />
            </Button>
            
            <Link href="/loja/carrinho">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-black"
                data-testid="button-cart"
              >
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-black text-xs font-bold rounded-full flex items-center justify-center"
                    data-testid="badge-cart-count"
                  >
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buscar Produtos</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              placeholder="O que voce procura?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
              autoFocus
              data-testid="input-search"
            />
            <Button 
              onClick={handleSearch} 
              className="bg-primary text-black hover:bg-primary/90" 
              data-testid="button-search-submit"
            >
              Buscar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
