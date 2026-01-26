import { Switch, Route, Redirect, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { UnifiedNotificationPrompt } from "@/components/unified-notification-prompt";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

import VerifyPage from "@/pages/verify";
import SiteHomePage from "@/pages/site/home";

const DevocionaisPage = lazy(() => import("@/pages/site/devocionais"));
const DevocionalDetailPage = lazy(() => import("@/pages/site/devocional-detail"));
const AgendaPage = lazy(() => import("@/pages/site/agenda"));
const QuemSomosPage = lazy(() => import("@/pages/site/quem-somos"));
const DiretoriaPage = lazy(() => import("@/pages/site/diretoria"));
const OracaoPage = lazy(() => import("@/pages/site/oracao"));
const MembroPage = lazy(() => import("@/pages/site/membro"));
const PoliticaPrivacidadePage = lazy(() => import("@/pages/site/politica-privacidade"));
const VersiculoDoDiaPage = lazy(() => import("@/pages/site/versiculo-do-dia"));
const AniversarioPage = lazy(() => import("@/pages/site/AniversarioPage"));

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminEmausVota = lazy(() => import("@/pages/admin"));
const AdminSitePage = lazy(() => import("@/pages/admin/admin-site"));
const EspiritualidadeDashboard = lazy(() => import("@/pages/admin/EspiritualidadeDashboard"));
const EspiritualidadeDevocionais = lazy(() => import("@/pages/admin/EspiritualidadeDevocionais"));
const EspiritualidadeDevocionalEditor = lazy(() => import("@/pages/admin/EspiritualidadeDevocionalEditor"));
const EspiritualidadeOracoes = lazy(() => import("@/pages/admin/EspiritualidadeOracoes"));
const EspiritualidadeComentarios = lazy(() => import("@/pages/admin/EspiritualidadeComentarios"));
const MarketingDashboard = lazy(() => import("@/pages/admin/MarketingDashboard"));
const MarketingEventos = lazy(() => import("@/pages/admin/MarketingEventos"));
const MarketingEventoEditor = lazy(() => import("@/pages/admin/MarketingEventoEditor"));
const MarketingDiretoria = lazy(() => import("@/pages/admin/MarketingDiretoria"));
const MarketingDiretoriaEditor = lazy(() => import("@/pages/admin/MarketingDiretoriaEditor"));
const MarketingQuemSomos = lazy(() => import("@/pages/admin/MarketingQuemSomos"));
const MarketingAniversarios = lazy(() => import("@/pages/admin/MarketingAniversarios"));
const VotePage = lazy(() => import("@/pages/vote"));
const ResultsPage = lazy(() => import("@/pages/results"));
const StudyHomePage = lazy(() => import("@/pages/study/index"));
const LessonPage = lazy(() => import("@/pages/study/lesson"));
const VersesPage = lazy(() => import("@/pages/study/verses"));
const ExplorePage = lazy(() => import("@/pages/study/explore"));
const ProfilePage = lazy(() => import("@/pages/study/profile"));
const RankingPage = lazy(() => import("@/pages/study/ranking"));
const MissionsPage = lazy(() => import("@/pages/study/missions"));
const MissionActivityPage = lazy(() => import("@/pages/study/mission-activity"));
const AchievementsPage = lazy(() => import("@/pages/study/achievements"));
const SeasonsPage = lazy(() => import("@/pages/study/seasons"));
const SeasonDetailPage = lazy(() => import("@/pages/study/season-detail"));
const FinalChallengePage = lazy(() => import("@/pages/study/final-challenge"));
const SeasonRankingPage = lazy(() => import("@/pages/study/season-ranking"));
const StudyPreviewPage = lazy(() => import("@/pages/study/preview"));
const StudyAdminPage = lazy(() => import("@/pages/study/admin/index"));
const PracticePage = lazy(() => import("@/pages/study/practice"));
const MemberProfilePage = lazy(() => import("@/pages/study/member-profile"));
const EventsPage = lazy(() => import("@/pages/study/events"));
const EventDetailPage = lazy(() => import("@/pages/study/event-detail"));
const EventLessonPage = lazy(() => import("@/pages/study/event-lesson"));
const CardsCollectionPage = lazy(() => import("@/pages/study/cards"));
const DemoCardsPage = lazy(() => import("@/pages/demo/cards"));
const FinanceiroPage = lazy(() => import("@/pages/study/financeiro"));
const LojaHomePage = lazy(() => import("@/pages/loja/home"));
const LojaCatalogoPage = lazy(() => import("@/pages/loja/catalogo"));
const LojaProdutoPage = lazy(() => import("@/pages/loja/produto"));
const LojaCarrinhoPage = lazy(() => import("@/pages/loja/carrinho"));
const MeusPedidosPage = lazy(() => import("@/pages/loja/pedidos"));
const DeoGloryDashboard = lazy(() => import("@/pages/study/admin/DeoGloryDashboard"));
const DeoGloryLicoes = lazy(() => import("@/pages/study/admin/DeoGloryLicoes"));
const DeoGloryEstudos = lazy(() => import("@/pages/study/admin/DeoGloryEstudos"));
const DeoGloryUsuarios = lazy(() => import("@/pages/study/admin/DeoGloryUsuarios"));
const DeoGloryRevistas = lazy(() => import("@/pages/study/admin/DeoGloryRevistas"));
const DeoGloryRelatorios = lazy(() => import("@/pages/study/admin/DeoGloryRelatorios"));
const DeoGloryConfiguracoes = lazy(() => import("@/pages/study/admin/DeoGloryConfiguracoes"));
const DeoGloryRevistaDetail = lazy(() => import("@/pages/study/admin/DeoGloryRevistaDetail"));
const DeoGloryLicaoDetail = lazy(() => import("@/pages/study/admin/DeoGloryLicaoDetail"));
const AdminStudyEventos = lazy(() => import("@/pages/admin/study/eventos"));
const AdminStudyEventoEditor = lazy(() => import("@/pages/admin/study/evento-editor"));
const TesourariaDashboard = lazy(() => import("@/pages/admin/tesouraria/TesourariaDashboard"));
const TesourariaConfiguracoes = lazy(() => import("@/pages/admin/tesouraria/TesourariaConfiguracoes"));
const TesourariaMovimentacoes = lazy(() => import("@/pages/admin/tesouraria/TesourariaMovimentacoes"));
const TesourariaTaxas = lazy(() => import("@/pages/admin/tesouraria/TesourariaTaxas"));
const TesourariaEmprestimos = lazy(() => import("@/pages/admin/tesouraria/TesourariaEmprestimos"));
const LojaAdmin = lazy(() => import("@/pages/admin/marketing/LojaAdmin"));
const PedidosAdmin = lazy(() => import("@/pages/admin/marketing/PedidosAdmin"));
const TesourariaRelatorios = lazy(() => import("@/pages/admin/tesouraria/TesourariaRelatorios"));

function PageLoader() {
  return (
    <motion.div 
      className="min-h-screen bg-background flex flex-col items-center justify-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="h-8 w-8 text-primary" />
      </motion.div>
      <motion.p 
        className="text-muted-foreground text-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Carregando...
      </motion.p>
    </motion.div>
  );
}

function Router() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/verificar/:hash" component={VerifyPage} />
            <Route path="/results" component={ResultsPage} />
            <Route path="/study-preview" component={StudyPreviewPage} />
            <Route path="/study-preview/explore" component={ExplorePage} />
            <Route path="/study-preview/ranking" component={RankingPage} />
            <Route path="/study-preview/profile" component={ProfilePage} />
            <Route path="/study-preview/verses" component={VersesPage} />
            <Route path="/study-preview/lesson/:id" component={LessonPage} />
            <Route path="/study-preview/achievements" component={AchievementsPage} />
            {/* Site Institucional - Public Routes */}
            <Route path="/" component={SiteHomePage} />
            <Route path="/devocionais" component={DevocionaisPage} />
            <Route path="/devocionais/:id" component={DevocionalDetailPage} />
            <Route path="/agenda" component={AgendaPage} />
            <Route path="/agenda/:id" component={AgendaPage} />
            <Route path="/quem-somos" component={QuemSomosPage} />
            <Route path="/diretoria" component={DiretoriaPage} />
            <Route path="/oracao" component={OracaoPage} />
            <Route path="/membro" component={MembroPage} />
            <Route path="/politica-privacidade" component={PoliticaPrivacidadePage} />
            <Route path="/versiculo-do-dia" component={VersiculoDoDiaPage} />
            <Route path="/versiculo-do-dia/:date" component={VersiculoDoDiaPage} />
            <Route path="/aniversario/:id" component={AniversarioPage} />
            <Route path="/demo/cards" component={DemoCardsPage} />
            <Route path="/login">
              <Redirect to="/membro" />
            </Route>
            <Route>
              <Redirect to="/" />
            </Route>
          </Switch>
        </Suspense>
      </>
    );
  }

  if (isAdmin) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/verificar/:hash" component={VerifyPage} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/emaus-vota" component={AdminEmausVota} />
          <Route path="/admin/study" component={DeoGloryDashboard} />
          <Route path="/admin/study/licoes" component={DeoGloryLicoes} />
          <Route path="/admin/study/estudos" component={DeoGloryEstudos} />
          <Route path="/admin/study/usuarios" component={DeoGloryUsuarios} />
          <Route path="/admin/study/revistas" component={DeoGloryRevistas} />
          <Route path="/admin/study/relatorios" component={DeoGloryRelatorios} />
          <Route path="/admin/study/configuracoes" component={DeoGloryConfiguracoes} />
          <Route path="/admin/study/revista/:id" component={DeoGloryRevistaDetail} />
          <Route path="/admin/study/licao/:id" component={DeoGloryLicaoDetail} />
          <Route path="/admin/study/eventos" component={AdminStudyEventos} />
          <Route path="/admin/study/eventos/:id" component={AdminStudyEventoEditor} />
          <Route path="/admin/study/old" component={StudyAdminPage} />
          <Route path="/admin/site" component={AdminSitePage} />
          <Route path="/admin/espiritualidade" component={EspiritualidadeDashboard} />
          <Route path="/admin/espiritualidade/devocionais" component={EspiritualidadeDevocionais} />
          <Route path="/admin/espiritualidade/devocionais/:id" component={EspiritualidadeDevocionalEditor} />
          <Route path="/admin/espiritualidade/oracoes" component={EspiritualidadeOracoes} />
          <Route path="/admin/espiritualidade/comentarios" component={EspiritualidadeComentarios} />
          <Route path="/admin/marketing" component={MarketingDashboard} />
          <Route path="/admin/marketing/eventos" component={MarketingEventos} />
          <Route path="/admin/marketing/eventos/:id" component={MarketingEventoEditor} />
          <Route path="/admin/marketing/diretoria" component={MarketingDiretoria} />
          <Route path="/admin/marketing/diretoria/:id" component={MarketingDiretoriaEditor} />
          <Route path="/admin/marketing/quem-somos" component={MarketingQuemSomos} />
          <Route path="/admin/marketing/aniversarios" component={MarketingAniversarios} />
          <Route path="/admin/marketing/loja" component={LojaAdmin} />
          <Route path="/admin/marketing/pedidos" component={PedidosAdmin} />
          <Route path="/admin/tesouraria" component={TesourariaDashboard} />
          <Route path="/admin/tesouraria/configuracoes" component={TesourariaConfiguracoes} />
          <Route path="/admin/tesouraria/movimentacoes" component={TesourariaMovimentacoes} />
          <Route path="/admin/tesouraria/taxas" component={TesourariaTaxas} />
          <Route path="/admin/tesouraria/emprestimos" component={TesourariaEmprestimos} />
          <Route path="/admin/loja" component={LojaAdmin} />
          <Route path="/admin/tesouraria/relatorios" component={TesourariaRelatorios} />
          <Route path="/vote" component={VotePage} />
          <Route path="/results" component={ResultsPage} />
          <Route path="/study" component={StudyHomePage} />
          <Route path="/study/lesson/:id" component={LessonPage} />
          <Route path="/study/explore" component={ExplorePage} />
          <Route path="/study/verses" component={VersesPage} />
          <Route path="/study/profile" component={ProfilePage} />
          <Route path="/study/ranking" component={RankingPage} />
          <Route path="/study/member/:userId" component={MemberProfilePage} />
          <Route path="/study/missions" component={MissionsPage} />
          <Route path="/study/missions/:missionId" component={MissionActivityPage} />
          <Route path="/study/achievements" component={AchievementsPage} />
          <Route path="/study/estudos" component={SeasonsPage} />
          <Route path="/study/season/:id" component={SeasonDetailPage} />
          <Route path="/study/season/:id/challenge" component={FinalChallengePage} />
          <Route path="/study/season/:id/ranking" component={SeasonRankingPage} />
          <Route path="/study/practice/:weekId" component={PracticePage} />
          <Route path="/study/practice" component={PracticePage} />
          <Route path="/study/events" component={EventsPage} />
          <Route path="/study/eventos" component={EventsPage} />
          <Route path="/study/events/:eventId/lessons/:dayNumber" component={EventLessonPage} />
          <Route path="/study/eventos/:eventId/lessons/:dayNumber" component={EventLessonPage} />
          <Route path="/study/events/:id" component={EventDetailPage} />
          <Route path="/study/eventos/:id" component={EventDetailPage} />
          <Route path="/study/cards" component={CardsCollectionPage} />
          <Route path="/study/financeiro" component={FinanceiroPage} />
          <Route path="/study/loja" component={LojaHomePage} />
          <Route path="/study/meus-pedidos" component={MeusPedidosPage} />
          <Route path="/study/loja/pedidos" component={MeusPedidosPage} />
          {/* Painel Financeiro - Separate Panel */}
          <Route path="/financeiro" component={FinanceiroPage} />
          <Route path="/membro/financeiro" component={FinanceiroPage} />
          <Route path="/loja" component={LojaHomePage} />
          <Route path="/loja/catalogo" component={LojaCatalogoPage} />
          <Route path="/loja/produto/:id" component={LojaProdutoPage} />
          <Route path="/loja/carrinho" component={LojaCarrinhoPage} />
          <Route path="/loja/pedidos" component={MeusPedidosPage} />
          <Route path="/meus-pedidos" component={MeusPedidosPage} />
          {/* Site Institucional - Public Routes */}
          <Route path="/" component={SiteHomePage} />
          <Route path="/devocionais" component={DevocionaisPage} />
          <Route path="/devocionais/:id" component={DevocionalDetailPage} />
          <Route path="/agenda" component={AgendaPage} />
          <Route path="/agenda/:id" component={AgendaPage} />
          <Route path="/quem-somos" component={QuemSomosPage} />
          <Route path="/diretoria" component={DiretoriaPage} />
          <Route path="/oracao" component={OracaoPage} />
          <Route path="/membro" component={MembroPage} />
          <Route path="/politica-privacidade" component={PoliticaPrivacidadePage} />
          <Route path="/versiculo-do-dia" component={VersiculoDoDiaPage} />
          <Route path="/versiculo-do-dia/:date" component={VersiculoDoDiaPage} />
          <Route path="/demo/cards" component={DemoCardsPage} />
          <Route path="/login">
            <Redirect to="/membro" />
          </Route>
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </Suspense>
    );
  }

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/verificar/:hash" component={VerifyPage} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/vote" component={VotePage} />
        <Route path="/results" component={ResultsPage} />
        <Route path="/study" component={StudyHomePage} />
        <Route path="/study/lesson/:id" component={LessonPage} />
        <Route path="/study/explore" component={ExplorePage} />
        <Route path="/study/verses" component={VersesPage} />
        <Route path="/study/profile" component={ProfilePage} />
        <Route path="/study/ranking" component={RankingPage} />
        <Route path="/study/member/:userId" component={MemberProfilePage} />
        <Route path="/study/missions" component={MissionsPage} />
        <Route path="/study/missions/:missionId" component={MissionActivityPage} />
        <Route path="/study/achievements" component={AchievementsPage} />
        <Route path="/study/estudos" component={SeasonsPage} />
        <Route path="/study/season/:id" component={SeasonDetailPage} />
        <Route path="/study/season/:id/challenge" component={FinalChallengePage} />
        <Route path="/study/season/:id/ranking" component={SeasonRankingPage} />
        <Route path="/study/practice/:weekId" component={PracticePage} />
        <Route path="/study/practice" component={PracticePage} />
        <Route path="/study/events" component={EventsPage} />
        <Route path="/study/eventos" component={EventsPage} />
        <Route path="/study/events/:eventId/lessons/:dayNumber" component={EventLessonPage} />
        <Route path="/study/eventos/:eventId/lessons/:dayNumber" component={EventLessonPage} />
        <Route path="/study/events/:id" component={EventDetailPage} />
        <Route path="/study/eventos/:id" component={EventDetailPage} />
        <Route path="/study/cards" component={CardsCollectionPage} />
        <Route path="/study/financeiro" component={FinanceiroPage} />
        <Route path="/study/loja" component={LojaHomePage} />
        <Route path="/study/meus-pedidos" component={MeusPedidosPage} />
        <Route path="/study/loja/pedidos" component={MeusPedidosPage} />
        {/* Painel Financeiro - Separate Panel */}
        <Route path="/financeiro" component={FinanceiroPage} />
        <Route path="/membro/financeiro" component={FinanceiroPage} />
        <Route path="/loja" component={LojaHomePage} />
        <Route path="/loja/catalogo" component={LojaCatalogoPage} />
        <Route path="/loja/produto/:id" component={LojaProdutoPage} />
        <Route path="/loja/carrinho" component={LojaCarrinhoPage} />
        <Route path="/loja/pedidos" component={MeusPedidosPage} />
        <Route path="/meus-pedidos" component={MeusPedidosPage} />
        {/* Secretaria Panels - Access controlled by backend */}
        <Route path="/admin/espiritualidade" component={EspiritualidadeDashboard} />
        <Route path="/admin/espiritualidade/devocionais" component={EspiritualidadeDevocionais} />
        <Route path="/admin/espiritualidade/devocionais/:id" component={EspiritualidadeDevocionalEditor} />
        <Route path="/admin/espiritualidade/oracoes" component={EspiritualidadeOracoes} />
        <Route path="/admin/espiritualidade/comentarios" component={EspiritualidadeComentarios} />
        <Route path="/admin/marketing" component={MarketingDashboard} />
        <Route path="/admin/marketing/eventos" component={MarketingEventos} />
        <Route path="/admin/marketing/eventos/:id" component={MarketingEventoEditor} />
        <Route path="/admin/marketing/diretoria" component={MarketingDiretoria} />
        <Route path="/admin/marketing/diretoria/:id" component={MarketingDiretoriaEditor} />
        <Route path="/admin/marketing/quem-somos" component={MarketingQuemSomos} />
        <Route path="/admin/marketing/aniversarios" component={MarketingAniversarios} />
        <Route path="/admin/marketing/loja" component={LojaAdmin} />
        <Route path="/admin/marketing/pedidos" component={PedidosAdmin} />
        {/* Tesouraria Panel - Access for treasurers */}
        <Route path="/admin/tesouraria" component={TesourariaDashboard} />
        <Route path="/admin/tesouraria/configuracoes" component={TesourariaConfiguracoes} />
        <Route path="/admin/tesouraria/movimentacoes" component={TesourariaMovimentacoes} />
        <Route path="/admin/tesouraria/taxas" component={TesourariaTaxas} />
        <Route path="/admin/tesouraria/emprestimos" component={TesourariaEmprestimos} />
        <Route path="/admin/loja" component={LojaAdmin} />
        <Route path="/admin/tesouraria/relatorios" component={TesourariaRelatorios} />
        {/* Site Institucional - Public Routes */}
        <Route path="/" component={SiteHomePage} />
        <Route path="/devocionais" component={DevocionaisPage} />
        <Route path="/devocionais/:id" component={DevocionalDetailPage} />
        <Route path="/agenda" component={AgendaPage} />
        <Route path="/agenda/:id" component={AgendaPage} />
        <Route path="/quem-somos" component={QuemSomosPage} />
        <Route path="/diretoria" component={DiretoriaPage} />
        <Route path="/oracao" component={OracaoPage} />
        <Route path="/membro" component={MembroPage} />
        <Route path="/politica-privacidade" component={PoliticaPrivacidadePage} />
        <Route path="/versiculo-do-dia" component={VersiculoDoDiaPage} />
        <Route path="/versiculo-do-dia/:date" component={VersiculoDoDiaPage} />
        <Route path="/demo/cards" component={DemoCardsPage} />
        <Route path="/login">
          <Redirect to="/membro" />
        </Route>
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </Suspense>
  </>
);
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <AuthProvider>
          <TooltipProvider>
            <ScrollToTop />
            <Toaster />
            <UnifiedNotificationPrompt />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
