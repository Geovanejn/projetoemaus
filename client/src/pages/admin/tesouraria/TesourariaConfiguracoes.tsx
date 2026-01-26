import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Settings, Save, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { TreasurySettings } from "@shared/schema";
import { useEffect, useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

const settingsFormSchema = z.object({
  percaptaAmount: z.number().min(0, "Valor deve ser positivo"),
  umpMonthlyAmount: z.number().min(0, "Valor deve ser positivo"),
  pixKey: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

function formatCurrencyInput(value: number): string {
  return (value / 100).toFixed(2).replace(".", ",");
}

function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
  return Math.round(parseFloat(cleaned || "0") * 100);
}

export default function TesourariaConfiguracoes() {
  const { hasTreasuryPanel } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const { data: settings, isLoading } = useQuery<TreasurySettings>({
    queryKey: ["/api/treasury/settings", currentYear],
    enabled: hasTreasuryPanel,
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      percaptaAmount: 0,
      umpMonthlyAmount: 0,
      pixKey: "",
    },
  });

  const [percaptaDisplay, setPercaptaDisplay] = useState("");
  const [umpDisplay, setUmpDisplay] = useState("");

  useEffect(() => {
    if (settings) {
      form.reset({
        percaptaAmount: settings.percaptaAmount ?? 0,
        umpMonthlyAmount: settings.umpMonthlyAmount ?? 0,
        pixKey: settings.pixKey ?? "",
      });
      setPercaptaDisplay(formatCurrencyInput(settings.percaptaAmount ?? 0));
      setUmpDisplay(formatCurrencyInput(settings.umpMonthlyAmount ?? 0));
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      return apiRequest("POST", "/api/treasury/settings", {
        year: currentYear,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treasury/settings", currentYear] });
      toast({
        title: "Configurações salvas",
        description: "As configurações foram atualizadas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  if (!hasTreasuryPanel) {
    setLocation("/admin");
    return null;
  }

  const onSubmit = (data: SettingsFormValues) => {
    updateMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-br from-amber-600 via-orange-600 to-orange-700 text-white py-8">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link href="/admin/tesouraria">
              <Button 
                variant="ghost" 
                className="mb-4 text-white/80 gap-2"
                data-testid="button-back-treasury"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-settings-title">
                  Configurações
                </h1>
                <p className="text-white/80">
                  Valores anuais e integração PIX - {currentYear}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-8 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Valores das Taxas</CardTitle>
                    <CardDescription>
                      Configure os valores anuais das taxas para {currentYear}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="percaptaAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxa Percapta (anual)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                R$
                              </span>
                              <Input
                                type="text"
                                className="pl-10"
                                placeholder="0,00"
                                data-testid="input-percapta-amount"
                                value={percaptaDisplay}
                                onChange={(e) => {
                                  setPercaptaDisplay(e.target.value);
                                  const value = parseCurrencyInput(e.target.value);
                                  field.onChange(value);
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Valor anual da taxa Percapta por membro
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="umpMonthlyAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxa UMP Emaús (mensal)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                R$
                              </span>
                              <Input
                                type="text"
                                className="pl-10"
                                placeholder="0,00"
                                data-testid="input-ump-monthly-amount"
                                value={umpDisplay}
                                onChange={(e) => {
                                  setUmpDisplay(e.target.value);
                                  const value = parseCurrencyInput(e.target.value);
                                  field.onChange(value);
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Valor mensal da taxa UMP por membro
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Integração PIX</CardTitle>
                    <CardDescription>
                      Configure a chave PIX para recebimento de pagamentos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="pixKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chave PIX (Mercado Pago)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="CPF, e-mail, telefone ou chave aleatória"
                              data-testid="input-pix-key"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormDescription>
                            A chave PIX cadastrada na conta do Mercado Pago
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="gap-2"
                    data-testid="button-save-settings"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar Configurações
                  </Button>
                </div>
              </form>
            </Form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
