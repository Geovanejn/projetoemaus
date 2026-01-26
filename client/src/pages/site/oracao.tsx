import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { 
  Heart,
  Send,
  CheckCircle,
  Shield,
  Lock,
  Users,
  Loader2,
  HandHeart,
  Sparkles
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories = [
  { value: "saude", label: "Saúde" },
  { value: "familia", label: "Família" },
  { value: "trabalho", label: "Trabalho/Estudos" },
  { value: "financeiro", label: "Financeiro" },
  { value: "espiritual", label: "Vida Espiritual" },
  { value: "relacionamento", label: "Relacionamentos" },
  { value: "outros", label: "Outros" },
];

const prayerFormSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório e deve ter pelo menos 2 caracteres"),
  whatsapp: z.string().optional(),
  category: z.string().min(1, "Selecione uma categoria"),
  request: z.string().min(10, "O pedido deve ter pelo menos 10 caracteres").max(1000, "O pedido deve ter no máximo 1000 caracteres"),
  allowPublic: z.boolean().default(false),
});

type PrayerFormValues = z.infer<typeof prayerFormSchema>;

interface ApprovedPrayer {
  id: number;
  name: string;
  request: string;
  category: string;
  inPrayerCount: number;
  createdAt: string;
}

async function fetchApprovedPrayers(): Promise<ApprovedPrayer[]> {
  const response = await fetch('/api/site/prayer-requests/approved');
  if (!response.ok) {
    throw new Error('Erro ao buscar pedidos aprovados');
  }
  return response.json();
}

// Generate unique visitor ID for anonymous users
function getOrCreateSessionId(): string {
  const key = 'prayer_session_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export default function OracaoPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [prayingIds, setPrayingIds] = useState<Set<number>>(new Set());
  const [localCounts, setLocalCounts] = useState<Record<number, number>>({});
  const { toast } = useToast();
  
  // Get or create unique session ID
  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  const form = useForm<PrayerFormValues>({
    resolver: zodResolver(prayerFormSchema),
    defaultValues: {
      name: "",
      whatsapp: "",
      category: "",
      request: "",
      allowPublic: false,
    },
  });

  const { data: approvedPrayers, isLoading: loadingPrayers } = useQuery<ApprovedPrayer[]>({
    queryKey: ['/api/site/prayer-requests/approved'],
    queryFn: fetchApprovedPrayers,
    staleTime: 30 * 1000,
  });

  // Fetch praying status for all approved prayers when data loads
  useEffect(() => {
    if (approvedPrayers && approvedPrayers.length > 0 && sessionId) {
      const ids = approvedPrayers.map(p => p.id).join(',');
      fetch(`/api/site/prayer-requests/praying-status?sessionId=${encodeURIComponent(sessionId)}&ids=${ids}`)
        .then(res => res.json())
        .then(data => {
          if (data.prayingIds) {
            setPrayingIds(new Set(data.prayingIds));
          }
        })
        .catch(err => console.error('Error fetching praying status:', err));
    }
  }, [approvedPrayers, sessionId]);

  const submitMutation = useMutation({
    mutationFn: async (data: PrayerFormValues) => {
      return apiRequest("POST", "/api/site/prayer-requests", {
        name: data.name,
        whatsapp: data.whatsapp,
        category: data.category,
        request: data.request,
        isPrivate: !data.allowPublic,
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar seu pedido. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const prayMutation = useMutation({
    mutationFn: async (prayerId: number) => {
      const response = await fetch(`/api/site/prayer-requests/${prayerId}/pray`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!response.ok) {
        throw new Error('Erro ao registrar oração');
      }
      return response.json();
    },
    onSuccess: (data, prayerId) => {
      // Update local state immediately for better UX
      setPrayingIds(prev => {
        const newSet = new Set(prev);
        if (data.isPraying) {
          newSet.add(prayerId);
        } else {
          newSet.delete(prayerId);
        }
        return newSet;
      });
      
      // Update local count for immediate feedback
      setLocalCounts(prev => ({
        ...prev,
        [prayerId]: data.inPrayerCount,
      }));
      
      toast({
        title: data.isPraying ? "Obrigado!" : "Desmarcado",
        description: data.isPraying 
          ? "Sua oração foi registrada." 
          : "Você desmarcou sua oração.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível registrar sua oração.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PrayerFormValues) => {
    submitMutation.mutate(data);
  };

  const handleNewRequest = () => {
    form.reset();
    setIsSubmitted(false);
  };

  const getCategoryLabel = (value: string) => {
    return categories.find(c => c.value === value)?.label || value;
  };

  return (
    <SiteLayout>
      <section className="bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-700 text-white py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-6">
              <Heart className="h-8 w-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Pedido de Oração
            </h1>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              Compartilhe suas necessidades. Iremos orar uns pelos outros.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <div className="max-w-xl">
                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">
                      Pedido Recebido!
                    </h2>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                      Seu pedido de oração foi enviado com sucesso. Após aprovação,
                      ele aparecerá no Mural da Oração.
                    </p>
                    <blockquote className="border-l-4 border-primary pl-4 py-2 text-left max-w-md mx-auto mb-8 bg-primary/5 rounded-r-lg">
                      <p className="italic text-foreground/90">
                        "Orai uns pelos outros, para serdes curados. A súplica de um justo pode muito na sua atuação."
                      </p>
                      <cite className="text-sm text-muted-foreground mt-1 block">
                        - Tiago 5:16
                      </cite>
                    </blockquote>
                    <Button onClick={handleNewRequest} data-testid="button-new-prayer">
                      Enviar Novo Pedido
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Send className="h-5 w-5 text-primary" />
                          Envie seu Pedido
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nome *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Seu nome" 
                                      {...field}
                                      data-testid="input-name"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="whatsapp"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>WhatsApp (opcional)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="(11) 99999-9999" 
                                      {...field}
                                      data-testid="input-whatsapp"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Se desejar receber atualizações sobre as orações
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Categoria *</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-category">
                                        <SelectValue placeholder="Selecione a categoria" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {categories.map((category) => (
                                        <SelectItem 
                                          key={category.value} 
                                          value={category.value}
                                        >
                                          {category.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="request"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Seu Pedido *</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Compartilhe seu pedido de oração..."
                                      className="min-h-[150px] resize-none"
                                      {...field}
                                      data-testid="textarea-request"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    {field.value.length}/1000 caracteres
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="allowPublic"
                              render={({ field }) => (
                                <FormItem className="flex items-center gap-3 space-y-0 p-4 rounded-lg bg-muted/50">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="checkbox-allow-public"
                                    />
                                  </FormControl>
                                  <div className="flex-1">
                                    <FormLabel className="text-base cursor-pointer">
                                      Permitir exibição no Mural
                                    </FormLabel>
                                    <FormDescription>
                                      Se marcado, após aprovação seu pedido poderá aparecer no Mural da Oração
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />

                            <Button 
                              type="submit" 
                              className="w-full gap-2"
                              disabled={submitMutation.isPending}
                              data-testid="button-submit-prayer"
                            >
                              {submitMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Enviando...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4" />
                                  Enviar Pedido
                                </>
                              )}
                            </Button>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>

                    <div className="mt-8 grid sm:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                        <Shield className="h-5 w-5 text-primary shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          Seus dados estão seguros
                        </p>
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                        <Lock className="h-5 w-5 text-primary shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          Privacidade garantida
                        </p>
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                        <Users className="h-5 w-5 text-primary shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          Equipe dedicada
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Mural da Oração</h2>
                </div>
                <p className="text-muted-foreground mb-6">
                  Ore conosco pelos irmãos que compartilharam seus pedidos.
                </p>

                {loadingPrayers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : approvedPrayers && approvedPrayers.length > 0 ? (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {approvedPrayers.map((prayer) => (
                      <motion.div
                        key={prayer.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <Card className="hover-elevate">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Heart className="h-4 w-4 text-primary" />
                                </div>
                                <span className="font-medium" data-testid={`prayer-name-${prayer.id}`}>
                                  {prayer.name}
                                </span>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {getCategoryLabel(prayer.category)}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-3" data-testid={`prayer-request-${prayer.id}`}>
                              {prayer.request}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <HandHeart className="h-3 w-3" />
                                {(localCounts[prayer.id] ?? prayer.inPrayerCount)} pessoa{(localCounts[prayer.id] ?? prayer.inPrayerCount) !== 1 ? 's' : ''} orando
                              </span>
                              <Button
                                size="sm"
                                variant={prayingIds.has(prayer.id) ? "default" : "outline"}
                                className={`gap-1 transition-all duration-300 ${prayingIds.has(prayer.id) ? "bg-primary text-primary-foreground" : ""}`}
                                onClick={() => prayMutation.mutate(prayer.id)}
                                disabled={prayMutation.isPending}
                                data-testid={`button-pray-${prayer.id}`}
                              >
                                <HandHeart className={`h-3 w-3 ${prayingIds.has(prayer.id) ? "fill-current" : ""}`} />
                                {prayingIds.has(prayer.id) ? "Orando" : "Estou Orando"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Heart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Nenhum pedido de oração no mural ainda.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Seja o primeiro a compartilhar!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
