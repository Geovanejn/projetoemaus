import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Vote, 
  Heart, 
  Megaphone, 
  GraduationCap, 
  ArrowRight, 
  LogOut,
  Settings,
  Wallet,
  ShoppingBag,
  Store,
  Home
} from "lucide-react";

const StaggerContainer = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
      }
    }}
    className={className}
  >
    {children}
  </motion.div>
);

const StaggerItem = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}
  >
    {children}
  </motion.div>
);

const adminPanels = [
  // === ELECTIONS GROUP (Green) ===
  {
    id: "emaus-vota",
    title: "Eleições",
    subtitle: "Sistema de Votação",
    description: "Participe das eleições e acompanhe os resultados em tempo real.",
    icon: Vote,
    color: "from-green-500 to-emerald-600",
    buttonColor: "bg-green-600 hover:bg-green-700",
    href: "/vote",
    features: [
      "Votar em eleições ativas",
      "Ver resultados",
      "Acompanhar votações",
    ],
    forMember: true,
  },
  {
    id: "emaus-vota-admin",
    title: "Painel de Eleições",
    subtitle: "Gerenciamento de Votações",
    description: "Gerencie eleições, candidatos, membros e acompanhe votações em tempo real.",
    icon: Vote,
    color: "from-green-500 to-emerald-600",
    buttonColor: "bg-green-600 hover:bg-green-700",
    href: "/admin/emaus-vota",
    features: [
      "Criar e gerenciar eleições",
      "Cadastrar membros e candidatos",
      "Controlar lista de presença",
    ],
    forAdmin: true,
  },
  // === DEOGLORY GROUP (Blue) ===
  {
    id: "deoglory-study",
    title: "DeoGlory",
    subtitle: "Plataforma de Estudos",
    description: "Estude a Bíblia de forma gamificada, ganhe conquistas e suba no ranking.",
    icon: GraduationCap,
    color: "from-blue-500 to-indigo-600",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    href: "/study",
    features: [
      "Estudos bíblicos interativos",
      "Conquistas e recompensas",
      "Ranking entre membros",
    ],
    forMember: true,
  },
  {
    id: "deoglory-admin",
    title: "DeoGlory Admin",
    subtitle: "Gerenciamento de Estudos",
    description: "Gerencie temporadas, lições e conteúdo do sistema de estudos gamificado.",
    icon: GraduationCap,
    color: "from-blue-500 to-indigo-600",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    href: "/admin/study",
    features: [
      "Criar temporadas e lições",
      "Gerenciar conquistas",
      "Acompanhar progresso",
    ],
    forAdmin: true,
  },
  // === SHOP GROUP (Black/Orange - Urban Graffiti Style) ===
  {
    id: "loja",
    title: "Loja da UMP",
    subtitle: "Moda Jovem Cristã",
    description: "Camisetas, acessórios e produtos exclusivos da UMP Emaús.",
    icon: ShoppingBag,
    color: "shop-urban",
    buttonColor: "bg-orange-500 hover:bg-orange-600",
    href: "/loja",
    features: [
      "Catálogo exclusivo",
      "Pagamento via PIX",
      "Acompanhe seus pedidos",
    ],
    forMember: true,
    isShop: true,
  },
  {
    id: "loja-admin",
    title: "Gestão da Loja",
    subtitle: "Administração de Produtos",
    description: "Gerencie produtos, categorias e pedidos da loja virtual.",
    icon: Store,
    color: "shop-urban",
    buttonColor: "bg-orange-500 hover:bg-orange-600",
    href: "/admin/loja",
    features: [
      "Cadastrar e editar produtos",
      "Gerenciar categorias",
      "Acompanhar pedidos",
    ],
    forMarketing: true,
    isShop: true,
  },
  // === TREASURY GROUP (Amber/Orange) ===
  {
    id: "meu-financeiro",
    title: "Meu Financeiro",
    subtitle: "Status Financeiro",
    description: "Consulte suas taxas, pagamentos e acompanhe sua situação financeira com a UMP.",
    icon: Wallet,
    color: "from-amber-500 to-orange-600",
    buttonColor: "bg-amber-600 hover:bg-amber-700",
    href: "/financeiro",
    features: [
      "Ver taxas Percapta e UMP",
      "Acompanhar pagamentos",
      "Pagar via PIX",
    ],
    forMember: true,
  },
  {
    id: "tesouraria",
    title: "Tesouraria",
    subtitle: "Gestão Financeira",
    description: "Gerencie pagamentos, taxas, empréstimos e acompanhe as finanças da UMP.",
    icon: Wallet,
    color: "from-amber-500 to-orange-600",
    buttonColor: "bg-amber-600 hover:bg-amber-700",
    href: "/admin/tesouraria",
    features: [
      "Controle de entradas e saídas",
      "Gerenciar taxas e empréstimos",
      "Loja virtual e relatórios",
    ],
    forTreasurer: true,
  },
  // === MARKETING & SPIRITUALITY GROUP (Cyan/Purple) ===
  {
    id: "marketing",
    title: "Painel Marketing",
    subtitle: "Eventos e Comunicação",
    description: "Gerencie eventos, diretoria e a comunicação visual da UMP.",
    icon: Megaphone,
    color: "from-cyan-500 to-cyan-600",
    buttonColor: "bg-cyan-600 hover:bg-cyan-700",
    href: "/admin/marketing",
    features: [
      "Criar e gerenciar eventos",
      "Editar membros da diretoria",
      "Gerenciar página Quem Somos",
    ],
    forSecretaria: "marketing",
  },
  {
    id: "espiritualidade",
    title: "Painel Espiritualidade",
    subtitle: "Gerenciamento Devocional",
    description: "Gerencie devocionais, pedidos de oração e conteúdo espiritual da UMP.",
    icon: Heart,
    color: "from-rose-500 to-pink-600",
    buttonColor: "bg-rose-600 hover:bg-rose-700",
    href: "/admin/espiritualidade",
    features: [
      "Criar e editar devocionais",
      "Moderar pedidos de oração",
      "Gerenciar comentários",
    ],
    forSecretaria: "espiritualidade",
  },
];

export default function AdminDashboard() {
  const { user, logout, isAdmin, hasEspiritualidadePanel, hasMarketingPanel, hasTreasuryPanel } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const filteredPanels = adminPanels.filter((panel) => {
    if (panel.forMember) return true;
    if (panel.forAdmin && isAdmin) return true;
    if (panel.forSecretaria === "espiritualidade" && hasEspiritualidadePanel) return true;
    if (panel.forSecretaria === "marketing" && hasMarketingPanel) return true;
    if (panel.forTreasurer && hasTreasuryPanel) return true;
    if (panel.forMarketing && hasMarketingPanel) return true;
    return false;
  });

  const pageTitle = isAdmin ? "Painel Administrativo" : "Meus Painéis";
  const pageSubtitle = isAdmin ? "Escolha o sistema que deseja gerenciar" : "Acesse suas funcionalidades";

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-6">
              <Settings className="h-8 w-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-admin-title">
              {pageTitle}
            </h1>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              {pageSubtitle}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto mb-8 flex justify-center">
            <Link href="/">
              <Button variant="default" size="lg" className="gap-3 text-base font-semibold px-8" data-testid="button-go-home">
                <Home className="h-5 w-5" />
                Voltar para o Site
              </Button>
            </Link>
          </div>
          
          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {filteredPanels.map((panel) => (
              <StaggerItem key={panel.id}>
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  {panel.isShop ? (
                    <Card className="h-full overflow-hidden ring-2 ring-orange-400/50 shadow-lg">
                      <CardContent className="p-0">
                        <div 
                          className="relative pt-3 px-6 pb-6 overflow-hidden"
                          style={{
                            background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 50%, #1a1a1a 100%)',
                          }}
                        >
                          <div 
                            className="absolute inset-0 opacity-[0.15]"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23f97316' stroke-width='1'%3E%3Cpath d='M10 10 L20 5 L30 15 L25 20 Z' opacity='0.6'/%3E%3Cpath d='M70 20 L85 15 L80 30 L65 25 Z' opacity='0.4'/%3E%3Cpath d='M40 60 L55 55 L60 70 L45 75 Z' opacity='0.5'/%3E%3Cpath d='M15 80 L25 75 L30 85 L20 90 Z' opacity='0.3'/%3E%3Cpath d='M75 70 L90 65 L95 80 L80 85 Z' opacity='0.4'/%3E%3Ccircle cx='50' cy='30' r='3' fill='%23f97316' opacity='0.3'/%3E%3Ccircle cx='20' cy='50' r='2' fill='%23f97316' opacity='0.4'/%3E%3Ccircle cx='80' cy='45' r='2' fill='%23f97316' opacity='0.3'/%3E%3Cpath d='M5 40 Q15 35 25 40 T45 40' stroke='%23f97316' opacity='0.2'/%3E%3Cpath d='M55 85 Q70 80 85 85' stroke='%23f97316' opacity='0.3'/%3E%3C/g%3E%3C/svg%3E")`,
                            }}
                          />
                          <div 
                            className="absolute top-0 right-0 w-40 h-40 opacity-25"
                            style={{
                              background: 'radial-gradient(circle, #f97316 0%, transparent 60%)',
                            }}
                          />
                          <div 
                            className="absolute bottom-0 left-0 w-32 h-32 opacity-20"
                            style={{
                              background: 'radial-gradient(circle, #f97316 0%, transparent 60%)',
                            }}
                          />
                          <div className="relative z-10 flex flex-col items-center justify-center text-center h-full min-h-[80px]">
                            <img src="/emaustore-logo-dark.png" alt="Emaústore" className="h-6 w-auto drop-shadow-lg mb-2" />
                            <p className="text-orange-300 text-sm font-medium">
                              {panel.subtitle}
                            </p>
                          </div>
                          <div className="absolute bottom-2 right-2 flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            <span className="w-2 h-2 rounded-full bg-white/60"></span>
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                          </div>
                        </div>
                        
                        <div className="p-5 bg-gray-950 dark:bg-gray-950">
                          <p className="text-gray-400 text-sm mb-4">
                            {panel.description}
                          </p>
                          
                          <ul className="space-y-1.5 mb-5">
                            {panel.features.map((feature, index) => (
                              <li 
                                key={index}
                                className="flex items-center gap-2 text-xs text-gray-400"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                {feature}
                              </li>
                            ))}
                          </ul>

                          <Link href={panel.href}>
                            <Button 
                              className={`w-full gap-2 ${panel.buttonColor} text-white`}
                              data-testid={`button-access-${panel.id}`}
                            >
                              Acessar
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="h-full overflow-hidden">
                      <CardContent className="p-0">
                        <div className={`bg-gradient-to-br ${panel.color} p-6 text-white`}>
                          <div className="flex items-center justify-between mb-4">
                            <panel.icon className="h-10 w-10" />
                          </div>
                          <h2 className="text-xl font-bold mb-1" data-testid={`panel-title-${panel.id}`}>
                            {panel.title}
                          </h2>
                          <p className="opacity-90 text-sm">
                            {panel.subtitle}
                          </p>
                        </div>
                        
                        <div className="p-5">
                          <p className="text-muted-foreground text-sm mb-4">
                            {panel.description}
                          </p>
                          
                          <ul className="space-y-1.5 mb-5">
                            {panel.features.map((feature, index) => (
                              <li 
                                key={index}
                                className="flex items-center gap-2 text-xs text-muted-foreground"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                {feature}
                              </li>
                            ))}
                          </ul>

                          <Link href={panel.href}>
                            <Button 
                              className={`w-full gap-2 ${panel.buttonColor} text-white`}
                              data-testid={`button-access-${panel.id}`}
                            >
                              Acessar Painel
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-md mx-auto mt-12 text-center"
          >
            <p className="text-sm text-muted-foreground mb-4">
              Logado como <span className="font-medium text-foreground">{user?.fullName}</span>
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="gap-2"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
