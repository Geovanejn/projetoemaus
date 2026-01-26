import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  BookOpen,
  Lightbulb,
  Users,
  FileText,
  GraduationCap,
  Settings,
  Search,
  Bell,
  LogOut,
  ChevronLeft,
  Menu,
  ArrowLeft,
  Home,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin/study" },
  { id: "licoes", label: "Gerenciar Lições", icon: BookOpen, href: "/admin/study/licoes" },
  { id: "estudos", label: "Gerar Estudos", icon: Lightbulb, href: "/admin/study/estudos" },
  { id: "eventos", label: "Eventos Especiais", icon: Sparkles, href: "/admin/study/eventos" },
  { id: "usuarios", label: "Usuários", icon: Users, href: "/admin/study/usuarios" },
  { id: "revistas", label: "Revistas", icon: FileText, href: "/admin/study/revistas" },
  { id: "relatorios", label: "Relatórios", icon: GraduationCap, href: "/admin/study/relatorios" },
  { id: "configuracoes", label: "Configurações", icon: Settings, href: "/admin/study/configuracoes" },
];

interface DeoGloryAdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function DeoGloryAdminLayout({ children, title, subtitle }: DeoGloryAdminLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentNavItem = navItems.find(item => location === item.href || location.startsWith(item.href + "/"));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-violet-600 via-violet-700 to-violet-800 text-white transition-all duration-300",
          isSidebarCollapsed ? "w-20" : "w-64",
          "hidden lg:flex"
        )}
      >
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg truncate">Estudo Bíblico</h1>
              <p className="text-xs text-white/70 truncate">Painel Admin</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 shrink-0"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            data-testid="button-toggle-sidebar"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", isSidebarCollapsed && "rotate-180")} />
          </Button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.id === "dashboard" 
              ? location === item.href 
              : location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.id} href={item.href}>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-white text-violet-700"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                  data-testid={`nav-${item.id}`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              </Link>
            );
          })}
          
          <div className="pt-3 mt-3 border-t border-white/10 space-y-1">
            <Link href="/admin">
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all"
                data-testid="nav-back-panels"
              >
                <ArrowLeft className="h-5 w-5 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Voltar aos Paineis</span>}
              </button>
            </Link>
            <Link href="/">
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all"
                data-testid="nav-logout-home"
              >
                <Home className="h-5 w-5 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Sair e Ir para Inicio</span>}
              </button>
            </Link>
          </div>
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className={cn("flex items-center gap-3", isSidebarCollapsed ? "justify-center" : "")}>
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={user?.photoUrl || undefined} />
              <AvatarFallback className="bg-white/20 text-white">
                {user?.fullName?.charAt(0) || "A"}
              </AvatarFallback>
            </Avatar>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName || "Admin"}</p>
                <p className="text-xs text-white/60 truncate">Administrador</p>
              </div>
            )}
            {!isSidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white/60 hover:bg-white/10 hover:text-white shrink-0"
                onClick={() => logout()}
                data-testid="button-logout-sidebar"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      <div className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300 overflow-x-hidden", isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64")}>
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-4 px-4 lg:px-6 h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar..."
                  className="pl-9 w-64 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                  data-testid="input-search"
                />
              </div>
              <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </Button>
            </div>
          </div>
        </header>

        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
            <div
              className="w-64 h-full bg-gradient-to-b from-violet-600 via-violet-700 to-violet-800 text-white p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Estudo Bíblico</h1>
                  <p className="text-xs text-white/70">Painel Admin</p>
                </div>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = item.id === "dashboard" 
                    ? location === item.href 
                    : location === item.href || location.startsWith(item.href + "/");
                  return (
                    <Link key={item.id} href={item.href}>
                      <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                          isActive
                            ? "bg-white text-violet-700"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>

        <div className="fixed bottom-4 right-4">
          <Button
            className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg rounded-full px-4"
            data-testid="button-help"
          >
            <span className="mr-2">?</span>
            Ajuda
          </Button>
        </div>
      </div>
    </div>
  );
}
