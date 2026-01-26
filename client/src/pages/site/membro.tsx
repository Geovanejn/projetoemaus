import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  User,
  Vote,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Mail,
  Lock,
  KeyRound,
  LogOut,
  Heart,
  Megaphone,
  Settings,
  Wallet,
  ShoppingBag
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import logoAnimated from "@assets/logo-animated.webp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StaggerContainer, StaggerItem } from "@/components/AnimatedPage";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { requestCodeSchema, verifyCodeSchema, type RequestCodeData, type VerifyCodeData, type AuthResponse } from "@shared/schema";

const setPasswordSchema = z.object({
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const passwordLoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Digite sua senha"),
});

type SetPasswordData = z.infer<typeof setPasswordSchema>;
type PasswordLoginData = z.infer<typeof passwordLoginSchema>;

const systems = [
  {
    id: "emaus-vota",
    title: "Eleições",
    subtitle: "Sistema de Votação",
    description: "Participe das eleições da UMP Emaús de forma segura e transparente. Vote nos candidatos, acompanhe resultados em tempo real.",
    icon: Vote,
    color: "from-green-500 to-emerald-600",
    buttonColor: "bg-green-600 hover:bg-green-700",
    href: "/vote",
    features: [
      "Votação segura e anônima",
      "Resultados em tempo real",
      "Verificação por código único",
      "Histórico de eleições",
    ],
  },
  {
    id: "deoglory",
    title: "DeoGlory",
    subtitle: "Sistema de Estudos Bíblicos Gamificados",
    description: "Aprenda a Palavra de Deus de forma divertida! Complete lições, ganhe XP, desbloqueie conquistas e suba no ranking.",
    icon: GraduationCap,
    color: "from-blue-500 to-indigo-600",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    href: "/study",
    features: [
      "Lições interativas",
      "Sistema de XP e níveis",
      "Conquistas desbloqueáveis",
      "Ranking entre membros",
    ],
  },
  {
    id: "financeiro",
    title: "Meu Financeiro",
    subtitle: "Taxas e Contribuições",
    description: "Acompanhe suas taxas, faça pagamentos via PIX e mantenha-se em dia com suas contribuições.",
    icon: Wallet,
    color: "from-emerald-500 to-teal-600",
    buttonColor: "bg-emerald-600 hover:bg-emerald-700",
    href: "/financeiro",
    features: [
      "Acompanhamento de taxas",
      "Pagamento via PIX",
      "Histórico de pagamentos",
      "Status em tempo real",
    ],
  },
  {
    id: "loja",
    title: "Loja UMP",
    subtitle: "Produtos e Acessórios",
    description: "Adquira camisetas, kits, livros e outros produtos da UMP Emaús. Pague via PIX.",
    icon: ShoppingBag,
    color: "from-purple-500 to-violet-600",
    buttonColor: "bg-purple-600 hover:bg-purple-700",
    href: "/loja",
    features: [
      "Camisetas e uniformes",
      "Kits e materiais",
      "Pagamento via PIX",
      "Acompanhe seus pedidos",
    ],
  },
];

function LoginForm() {
  const [step, setStep] = useState<"email" | "code" | "password">("password");
  const [email, setEmail] = useState("");
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false);
  const [pendingUser, setPendingUser] = useState<AuthResponse | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Effect to handle redirect after authentication state is confirmed
  useEffect(() => {
    if (shouldRedirect && isAuthenticated) {
      setLocation("/admin");
    }
  }, [shouldRedirect, isAuthenticated, setLocation]);

  const emailForm = useForm<RequestCodeData>({
    resolver: zodResolver(requestCodeSchema),
    defaultValues: { email: "" },
  });

  const codeForm = useForm<VerifyCodeData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { email: "", code: "" },
  });

  const passwordForm = useForm<PasswordLoginData>({
    resolver: zodResolver(passwordLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const setPasswordForm = useForm<SetPasswordData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onRequestCode = async (data: RequestCodeData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, isPasswordReset }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao solicitar código");
      }

      const result = await response.json();

      if (result.hasPassword && !isPasswordReset) {
        setStep("password");
        passwordForm.setValue("email", data.email);
        emailForm.reset();
        toast({
          title: "Você já possui senha cadastrada",
          description: "Use a opção 'Esqueceu a senha?' se não lembrar da sua senha.",
        });
        return;
      }

      setEmail(data.email);
      setStep("code");
      codeForm.setValue("email", data.email);

      toast({
        title: "Código enviado!",
        description: isPasswordReset 
          ? "Código de recuperação enviado! Verifique seu email." 
          : "Verifique seu email e digite o código de 6 dígitos",
      });
    } catch (error) {
      toast({
        title: "Erro ao solicitar código",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyCode = async (data: VerifyCodeData) => {
    setIsLoading(true);
    try {
      const anonymousSubscriptionId = localStorage.getItem('anonymous_push_subscription_id');
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (anonymousSubscriptionId) {
        headers['x-anonymous-subscription-id'] = anonymousSubscriptionId;
      }

      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao verificar código");
      }

      const result: AuthResponse & { requiresPasswordReset?: boolean } = await response.json();

      if (!result.user.hasPassword || result.requiresPasswordReset) {
        setPendingUser(result);
        setShowSetPasswordDialog(true);
        setPasswordForm.reset();
        if (result.requiresPasswordReset) {
          toast({
            title: "Código verificado!",
            description: "Agora defina sua nova senha",
          });
        }
        return;
      }

      login(result.user, result.token);
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${result.user.fullName}`,
      });
      
      setShouldRedirect(true);
    } catch (error) {
      toast({
        title: "Erro ao verificar código",
        description: error instanceof Error ? error.message : "Código inválido ou expirado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordLogin = async (data: PasswordLoginData) => {
    setIsLoading(true);
    try {
      const anonymousSubscriptionId = localStorage.getItem('anonymous_push_subscription_id');
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (anonymousSubscriptionId) {
        headers['x-anonymous-subscription-id'] = anonymousSubscriptionId;
      }

      const response = await fetch("/api/auth/login-password", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao fazer login");
      }

      const result: AuthResponse = await response.json();
      login(result.user, result.token);
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${result.user.fullName}`,
      });
      
      setShouldRedirect(true);
    } catch (error) {
      toast({
        title: "Erro ao fazer login",
        description: error instanceof Error ? error.message : "Email ou senha incorretos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSetPassword = async (data: SetPasswordData) => {
    if (!pendingUser) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${pendingUser.token}`,
        },
        body: JSON.stringify({ 
          password: data.password,
          confirmPassword: data.confirmPassword 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao definir senha");
      }

      const updatedUser = { ...pendingUser.user, hasPassword: true };
      login(updatedUser, pendingUser.token);

      toast({
        title: "Senha definida com sucesso!",
        description: "Agora você pode fazer login com email e senha",
      });

      setShowSetPasswordDialog(false);
      setPendingUser(null);
      
      setShouldRedirect(true);
    } catch (error) {
      toast({
        title: "Erro ao definir senha",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-center mb-4">
        <img 
          src={logoAnimated}
          alt="UMP Emaús Logo"
          className="w-28 h-auto object-contain"
          loading="eager"
          decoding="async"
          data-testid="logo-animated"
        />
      </div>
      <Card className="border-border shadow-md max-w-md mx-auto">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
            {step === "email" ? (
              <>
                <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                {isPasswordReset ? 'Recuperar Senha' : 'Entrar'}
              </>
            ) : step === "password" ? (
              <>
                <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                Entrar com Senha
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
                {isPasswordReset ? 'Recuperar Senha' : 'Verificar Código'}
              </>
            )}
          </CardTitle>
          <CardDescription className="text-sm">
            {step === "email" 
              ? (isPasswordReset 
                  ? "Digite seu email para receber o código de recuperação de senha"
                  : "Digite seu email para receber o código de verificação")
              : step === "password"
              ? "Digite seu email e senha para acessar"
              : (isPasswordReset 
                  ? `Código de recuperação enviado para ${email}`
                  : `Código enviado para ${email}`)}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {step === "email" ? (
            <form onSubmit={emailForm.handleSubmit(onRequestCode)} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  data-testid="input-email"
                  {...emailForm.register("email")}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-request-code"
              >
                {isLoading ? "Enviando..." : "Enviar Código"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setStep("password")}
                data-testid="button-switch-password"
              >
                <Lock className="w-4 h-4 mr-2" />
                Já tenho senha
              </Button>
            </form>
          ) : step === "password" ? (
            <form onSubmit={passwordForm.handleSubmit(onPasswordLogin)} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="password-email">Email</Label>
                <Input
                  id="password-email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  data-testid="input-password-email"
                  {...passwordForm.register("email")}
                />
                {passwordForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setIsPasswordReset(true);
                      passwordForm.reset();
                      toast({
                        title: "Recuperar senha",
                        description: "Digite seu email para receber um código de verificação e redefinir sua senha",
                      });
                    }}
                    className="text-xs text-primary hover:underline"
                    data-testid="button-forgot-password"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  autoComplete="current-password"
                  data-testid="input-password"
                  {...passwordForm.register("password")}
                />
                {passwordForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-login-password"
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStep("email");
                    setIsPasswordReset(false);
                    passwordForm.reset();
                  }}
                  disabled={isLoading}
                  data-testid="button-first-access"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Primeiro Acesso
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={codeForm.handleSubmit(onVerifyCode)} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="code">Código de Verificação</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-xl sm:text-2xl tracking-widest"
                  data-testid="input-code"
                  {...codeForm.register("code")}
                />
                {codeForm.formState.errors.code && (
                  <p className="text-sm text-destructive">
                    {codeForm.formState.errors.code.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  {isPasswordReset 
                    ? "Digite o código de recuperação de 6 dígitos enviado para seu email"
                    : "Digite o código de 6 dígitos enviado para seu email"}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-verify-code"
                >
                  {isLoading ? "Verificando..." : "Verificar e Entrar"}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStep("email");
                    codeForm.reset();
                  }}
                  disabled={isLoading}
                  data-testid="button-back"
                >
                  Voltar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Código válido por 15 minutos
        </p>
      </div>

      <Dialog open={showSetPasswordDialog} onOpenChange={(open) => {
        if (!open) {
          setShowSetPasswordDialog(false);
          setPendingUser(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isPasswordReset ? 'Redefinir sua Senha' : 'Defina sua Senha'}</DialogTitle>
            <DialogDescription>
              {isPasswordReset 
                ? 'Crie uma nova senha para sua conta. Sua senha anterior será substituída.'
                : 'Este é seu primeiro acesso. Crie uma senha para facilitar logins futuros.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={setPasswordForm.handleSubmit(onSetPassword)} className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••"
                data-testid="input-new-password"
                {...setPasswordForm.register("password")}
              />
              {setPasswordForm.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {setPasswordForm.formState.errors.password.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Mínimo de 6 caracteres
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••"
                data-testid="input-confirm-password"
                {...setPasswordForm.register("confirmPassword")}
              />
              {setPasswordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {setPasswordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-submit-password"
            >
              {isLoading ? "Salvando..." : "Definir Senha"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

const secretariaPanels = [
  {
    id: "espiritualidade",
    title: "Painel Espiritualidade",
    subtitle: "Gerenciamento Devocional",
    description: "Gerencie devocionais, pedidos de oracao e conteudo espiritual da UMP.",
    icon: Heart,
    color: "from-purple-500 to-purple-600",
    buttonColor: "bg-purple-600 hover:bg-purple-700",
    href: "/admin/espiritualidade",
    secretaria: "espiritualidade",
    features: [
      "Criar e editar devocionais",
      "Moderar pedidos de oracao",
      "Gerenciar conteudo espiritual",
    ],
  },
  {
    id: "marketing",
    title: "Painel Marketing",
    subtitle: "Eventos e Comunicacao",
    description: "Gerencie eventos, diretoria e a comunicacao visual da UMP.",
    icon: Megaphone,
    color: "from-cyan-500 to-cyan-600",
    buttonColor: "bg-cyan-600 hover:bg-cyan-700",
    href: "/admin/marketing",
    secretaria: "marketing",
    features: [
      "Criar e gerenciar eventos",
      "Editar membros da diretoria",
      "Exportar calendario",
    ],
  },
];

function SystemsSelection() {
  const { user, logout } = useAuth();

  const userSecretariaPanels = secretariaPanels.filter(
    panel => user?.isAdmin || user?.secretaria === panel.secretaria
  );

  return (
    <>
      <StaggerContainer className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {systems.map((system) => (
          <StaggerItem key={system.id}>
            <motion.div
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <Card className="h-full overflow-hidden">
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${system.color} p-8 text-white`}>
                    <div className="flex items-center justify-between mb-4">
                      <system.icon className="h-12 w-12" />
                      <Sparkles className="h-6 w-6 opacity-50" />
                    </div>
                    <h2 className="text-2xl font-bold mb-1" data-testid={`system-title-${system.id}`}>
                      {system.title}
                    </h2>
                    <p className="opacity-90 text-sm">
                      {system.subtitle}
                    </p>
                  </div>
                  
                  <div className="p-6">
                    <p className="text-muted-foreground mb-6">
                      {system.description}
                    </p>
                    
                    <ul className="space-y-2 mb-6">
                      {system.features.map((feature, index) => (
                        <li 
                          key={index}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link href={system.href}>
                      <Button 
                        className={`w-full gap-2 ${system.buttonColor} text-white`}
                        data-testid={`button-access-${system.id}`}
                      >
                        Acessar Sistema
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {userSecretariaPanels.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 max-w-5xl mx-auto"
        >
          <div className="flex items-center gap-2 mb-6">
            <Settings className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Paineis de Gestao</h3>
          </div>
          <StaggerContainer className="grid md:grid-cols-2 gap-6">
            {userSecretariaPanels.map((panel) => (
              <StaggerItem key={panel.id}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <Card className="h-full overflow-hidden">
                    <CardContent className="p-0">
                      <div className={`bg-gradient-to-br ${panel.color} p-6 text-white`}>
                        <div className="flex items-center gap-3">
                          <panel.icon className="h-8 w-8" />
                          <div>
                            <h2 className="text-xl font-bold" data-testid={`panel-title-${panel.id}`}>
                              {panel.title}
                            </h2>
                            <p className="opacity-90 text-sm">
                              {panel.subtitle}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5">
                        <p className="text-muted-foreground text-sm mb-4">
                          {panel.description}
                        </p>
                        
                        <ul className="space-y-1 mb-4">
                          {panel.features.map((feature, index) => (
                            <li 
                              key={index}
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                              <div className="w-1 h-1 rounded-full bg-primary" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <Link href={panel.href}>
                          <Button 
                            className={`w-full gap-2 ${panel.buttonColor} text-white`}
                            size="sm"
                            data-testid={`button-access-${panel.id}`}
                          >
                            Acessar Painel
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </motion.div>
      )}

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
          onClick={logout}
          className="gap-2"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </Button>
      </motion.div>
    </>
  );
}

export default function MembroPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect all authenticated users to admin panel
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/admin");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isAuthenticated && !isLoading) {
    return null;
  }

  return (
    <SiteLayout hideFooter={!isAuthenticated}>
      <section className="py-6 bg-background">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : isAuthenticated ? (
            <SystemsSelection />
          ) : (
            <LoginForm />
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
