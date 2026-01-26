import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationToggle } from "@/components/NotificationToggle";
import { Menu, X, ChevronRight, Sparkles, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useAuth } from "@/lib/auth";
import { useThemeContext } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

import logoDark from "@assets/2-1_1766464654126.png";
import logoLight from "@assets/EMAÚS_v3_sem_fundo_1766464756876.png";

const menuItems = [
  { label: "Início", href: "/" },
  { label: "Devocionais", href: "/devocionais" },
  { label: "Agenda", href: "/agenda" },
  { label: "Quem Somos", href: "/quem-somos" },
  { label: "Diretoria", href: "/diretoria" },
  { label: "Oração", href: "/oracao" },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const { resolvedTheme } = useThemeContext();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex items-center">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-center relative overflow-hidden"
                style={{ height: '48px' }}
              >
                <img 
                  src={logoDark}
                  alt="Logo UMP Emaús" 
                  style={{ height: '180px', width: 'auto', marginTop: '0px' }}
                  className={cn(
                    "object-cover absolute left-0 transition-opacity duration-300",
                    resolvedTheme === "dark" ? "opacity-100" : "opacity-0"
                  )}
                />
                <img 
                  src={logoLight}
                  alt="Logo UMP Emaús" 
                  style={{ height: '180px', width: 'auto', marginTop: '0px' }}
                  className={cn(
                    "object-cover transition-opacity duration-300",
                    resolvedTheme === "dark" ? "opacity-0" : "opacity-100"
                  )}
                />
              </motion.div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {menuItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-muted-foreground",
                      location === item.href && "bg-accent text-foreground"
                    )}
                    data-testid={`nav-${item.href.replace("/", "") || "home"}`}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {isAuthenticated && <NotificationCenter />}
              <ThemeToggle />
              
              <Link href="/membro" className="hidden sm:block">
                <Button variant="default" size="sm" data-testid="button-member-area">
                  Área do Membro
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMenuOpen(true)}
                data-testid="button-mobile-menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMenuOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-[280px] bg-background border-l shadow-xl lg:hidden"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b">
                  <span className="font-bold text-lg">Menu</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMenuOpen(false)}
                    data-testid="button-close-menu"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-1">
                    {menuItems.map((item, index) => (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link href={item.href} onClick={() => setIsMenuOpen(false)}>
                          <div
                            className={cn(
                              "flex items-center justify-between px-4 py-3 rounded-lg transition-colors",
                              location === item.href
                                ? "bg-primary text-primary-foreground"
                                : "hover-elevate"
                            )}
                            data-testid={`mobile-nav-${item.href.replace("/", "") || "home"}`}
                          >
                            <span className="font-medium">{item.label}</span>
                            <ChevronRight className="h-4 w-4 opacity-50" />
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t flex flex-col gap-4">
                    <Link href="/membro" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full" data-testid="mobile-button-member-area">
                        Área do Membro
                      </Button>
                    </Link>
                    <NotificationToggle />
                  </div>
                </nav>

                <div className="p-4 border-t">
                  <div className="flex items-center justify-center gap-4">
                    <a
                      href="https://instagram.com/umpemaus"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="link-instagram"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </a>
                    <a
                      href="https://facebook.com/umpemaus"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="link-facebook"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                    <a
                      href="https://youtube.com/umpemaus"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="link-youtube"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
