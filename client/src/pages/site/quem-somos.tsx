import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Church,
  Target,
  Eye,
  Heart,
  MapPin,
  Clock,
  Phone,
  Mail,
  BookOpen
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { StaggerContainer, StaggerItem } from "@/components/AnimatedPage";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationCard } from "@/components/ui/location-link";

interface SiteContentSection {
  title: string;
  content: string;
  imageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

type SiteContentMap = Record<string, SiteContentSection>;

const defaultValues = [
  {
    icon: BookOpen,
    title: "Palavra de Deus",
    description: "Cremos que a Bíblia é a Palavra de Deus, infalível e suficiente para nossa fé e prática.",
  },
  {
    icon: Heart,
    title: "Amor",
    description: "Amamos a Deus sobre todas as coisas e ao próximo como a nós mesmos.",
  },
  {
    icon: Church,
    title: "Comunhão",
    description: "Valorizamos a comunhão fraterna e o fortalecimento mútuo entre os jovens.",
  },
  {
    icon: Target,
    title: "Serviço",
    description: "Servimos a Deus e à igreja com nossos dons e talentos, para a glória de Cristo.",
  },
];

const defaultTimeline = [
  {
    year: "1990",
    title: "Fundação",
    description: "A UMP Emaús foi fundada por um grupo de jovens presbiterianos comprometidos com a fé.",
  },
  {
    year: "2000",
    title: "Crescimento",
    description: "Período de grande crescimento, com mais de 50 jovens participando ativamente.",
  },
  {
    year: "2010",
    title: "Renovação",
    description: "Nova diretoria e renovação dos ministérios, com foco em estudos bíblicos.",
  },
  {
    year: "2020",
    title: "Digitalização",
    description: "Adaptação ao mundo digital durante a pandemia, com cultos e estudos online.",
  },
  {
    year: "2024",
    title: "Presente",
    description: "Consolidação dos ministérios e lançamento de novos projetos de evangelismo.",
  },
];

const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  Heart,
  Church,
  Target,
};

export default function QuemSomosPage() {
  const { data: siteContent, isLoading } = useQuery<SiteContentMap>({
    queryKey: ["/api/site-content/quem-somos"],
  });

  const getContent = (section: string): SiteContentSection | undefined => {
    return siteContent?.[section];
  };

  const historia = getContent("historia");
  const missao = getContent("missao");
  const visao = getContent("visao");
  const valoresContent = getContent("valores");
  const timelineContent = getContent("timeline");
  const endereco = getContent("endereco");
  const horarios = getContent("horarios");
  const telefone = getContent("telefone");
  const email = getContent("email");

  const parseJsonContent = (content: string | undefined, fallback: unknown[]) => {
    if (!content) return fallback;
    try {
      return JSON.parse(content);
    } catch {
      return fallback;
    }
  };

  const values = valoresContent?.content 
    ? parseJsonContent(valoresContent.content, defaultValues).map((v: { icon?: string; title: string; description: string }) => ({
        ...v,
        icon: iconMap[v.icon || "Heart"] || Heart,
      }))
    : defaultValues;

  const timeline = timelineContent?.content 
    ? parseJsonContent(timelineContent.content, defaultTimeline)
    : defaultTimeline;

  return (
    <SiteLayout>
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-primary/80 text-white py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-6">
              <Church className="h-8 w-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Quem Somos</h1>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              Conheça a história, missão e valores da UMP Emaús
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-6">Nossa História</h2>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <p className="text-lg text-muted-foreground leading-relaxed" data-testid="text-historia">
                  {historia?.content || `A União de Mocidade Presbiteriana Emaús nasceu do desejo de jovens 
                  presbiterianos de crescer na fé, servir a Deus e fazer a diferença 
                  na comunidade. Ao longo dos anos, temos formado líderes, promovido 
                  estudos bíblicos e mantido viva a chama do evangelho entre a juventude.`}
                </p>
              )}
            </motion.div>

            <div className="relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-border hidden md:block" />
              
              <div className="space-y-8">
                {timeline.map((item: { year: string; title: string; description: string }, index: number) => (
                  <motion.div
                    key={item.year}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-4 md:gap-8 ${
                      index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                    }`}
                  >
                    <div className={`flex-1 ${index % 2 === 0 ? "md:text-right" : ""}`}>
                      <Card className="inline-block">
                        <CardContent className="p-5">
                          <span className="text-primary font-bold text-lg">
                            {item.year}
                          </span>
                          <h3 className="font-semibold text-lg mt-1">
                            {item.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mt-2">
                            {item.description}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="hidden md:flex w-4 h-4 rounded-full bg-primary border-4 border-background z-10" />
                    <div className="flex-1 hidden md:block" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Missão</h3>
                  {isLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed" data-testid="text-mission">
                      {missao?.content || `Formar jovens comprometidos com Cristo, capacitando-os para 
                      o serviço na igreja e na sociedade, através do estudo da 
                      Palavra, da oração e da comunhão fraternal.`}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Visão</h3>
                  {isLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed" data-testid="text-vision">
                      {visao?.content || `Ser referência na formação de jovens cristãos que impactem 
                      positivamente suas famílias, comunidades e a sociedade, 
                      vivendo os princípios do Reino de Deus.`}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Nossos Valores</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Princípios que norteiam nossas ações e decisões
            </p>
          </motion.div>

          <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {values.map((value: { icon: LucideIcon; title: string; description: string }) => (
              <StaggerItem key={value.title}>
                <Card className="h-full text-center hover-elevate">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <value.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      {value.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Onde Estamos</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Venha nos visitar! Estamos localizados em local de fácil acesso
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {isLoading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : (
                      <LocationCard
                        name={(() => {
                          if (!endereco?.metadata) return "Igreja Presbiteriana Emaús";
                          const meta = typeof endereco.metadata === 'string' 
                            ? (() => { try { return JSON.parse(endereco.metadata as string); } catch { return {}; } })()
                            : endereco.metadata;
                          return (meta as Record<string, unknown>)?.locationName as string || "Igreja Presbiteriana Emaús";
                        })()}
                        url={(() => {
                          if (!endereco?.metadata) return "https://maps.app.goo.gl/FiqeyqfXabQB6aPr7?g_st=ac";
                          const meta = typeof endereco.metadata === 'string' 
                            ? (() => { try { return JSON.parse(endereco.metadata as string); } catch { return {}; } })()
                            : endereco.metadata;
                          return (meta as Record<string, unknown>)?.locationUrl as string || "https://maps.app.goo.gl/FiqeyqfXabQB6aPr7?g_st=ac";
                        })()}
                        address={endereco?.content || `Rua Abigail Maia, 205 - Jardim Soraia\nSão Paulo - SP`}
                      />
                    )}

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Horários</h4>
                        {isLoading ? (
                          <Skeleton className="h-10 w-48" />
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-line" data-testid="text-horarios">
                            {horarios?.content || `Culto Jovem: Domingo às 19:30\nEstudo Bíblico: Quarta às 19:30`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Contato</h4>
                        {isLoading ? (
                          <Skeleton className="h-5 w-32" />
                        ) : (
                          <p className="text-sm text-muted-foreground" data-testid="text-telefone">
                            {telefone?.content || "(11) 99999-9999"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">E-mail</h4>
                        {isLoading ? (
                          <Skeleton className="h-5 w-40" />
                        ) : (
                          <p className="text-sm text-muted-foreground" data-testid="text-email">
                            {email?.content || "contato@umpemaus.org.br"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
