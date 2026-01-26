import { useState } from "react";
import { DeoGloryAdminLayout } from "@/components/deoglory/DeoGloryAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Smartphone,
  Sparkles,
  Users,
  Mail,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabType = "geral" | "notificacoes" | "seguranca" | "preferencias";

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ElementType;
}

const tabs: TabItem[] = [
  { id: "geral", label: "Geral", icon: Settings },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "seguranca", label: "Segurança", icon: Shield },
  { id: "preferencias", label: "Preferências", icon: Palette },
];

export default function DeoGloryConfiguracoes() {
  const [activeTab, setActiveTab] = useState<TabType>("geral");
  const [appName, setAppName] = useState("Estudo Bíblico");
  const [language, setLanguage] = useState("pt-br");
  const [timezone, setTimezone] = useState("gmt-3");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [aiModel, setAiModel] = useState("gpt-4-turbo");
  const [creativity, setCreativity] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([2000]);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [newUserNotifications, setNewUserNotifications] = useState(true);
  const [autoRegister, setAutoRegister] = useState(true);
  const [welcomeEmail, setWelcomeEmail] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false);
  const [dailyStudyLimit, setDailyStudyLimit] = useState("10");

  return (
    <DeoGloryAdminLayout
      title="Configurações"
      subtitle="Gerencie preferências e notificações do sistema"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all",
                activeTab === tab.id
                  ? "border-violet-500 bg-white dark:bg-gray-800 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300"
              )}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon
                className={cn(
                  "h-6 w-6 mb-2",
                  activeTab === tab.id
                    ? "text-violet-600"
                    : "text-gray-400"
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  activeTab === tab.id
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <Smartphone className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Configurações do Aplicativo</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ajustes gerais do sistema</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Nome do Aplicativo</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Personalize o nome exibido</p>
                  </div>
                  <Input
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="w-48 bg-gray-50 dark:bg-gray-700"
                    data-testid="input-app-name"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Idioma do Sistema</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Selecione o idioma padrão</p>
                  </div>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-48 bg-gray-50 dark:bg-gray-700" data-testid="select-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-br">Português (BR)</SelectItem>
                      <SelectItem value="en-us">English (US)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Fuso Horário</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ajuste para sua região</p>
                  </div>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="w-48 bg-gray-50 dark:bg-gray-700" data-testid="select-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmt-3">GMT-3 (Brasilia)</SelectItem>
                      <SelectItem value="gmt-4">GMT-4 (Manaus)</SelectItem>
                      <SelectItem value="gmt-5">GMT-5 (Acre)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Modo Manutencao</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Desativa acesso temporariamente</p>
                  </div>
                  <Switch
                    checked={maintenanceMode}
                    onCheckedChange={setMaintenanceMode}
                    data-testid="switch-maintenance"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Configurações de IA</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ajustes para geração de conteúdo</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Modelo de IA</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Escolha o modelo para geração</p>
                  </div>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger className="w-48 bg-gray-50 dark:bg-gray-700" data-testid="select-ai-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Criatividade</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nível de variação nas respostas</p>
                    </div>
                    <span className="text-violet-600 font-medium">{creativity[0]}</span>
                  </div>
                  <Slider
                    value={creativity}
                    onValueChange={setCreativity}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                    data-testid="slider-creativity"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Tamanho Máximo</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Tokens por resposta</p>
                    </div>
                    <span className="text-violet-600 font-medium">{maxTokens[0]}</span>
                  </div>
                  <Slider
                    value={maxTokens}
                    onValueChange={setMaxTokens}
                    max={4000}
                    min={500}
                    step={100}
                    className="w-full"
                    data-testid="slider-max-tokens"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Geração Automática</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gerar lições automaticamente</p>
                  </div>
                  <Switch
                    checked={autoGenerate}
                    onCheckedChange={setAutoGenerate}
                    data-testid="switch-auto-generate"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Preferências de Usuário</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Configurações padrão para novos usuários</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Registro Automático</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Permitir novos usuários</p>
                  </div>
                  <Switch
                    checked={autoRegister}
                    onCheckedChange={setAutoRegister}
                    data-testid="switch-auto-register"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Email de Boas-vindas</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enviar ao criar conta</p>
                  </div>
                  <Switch
                    checked={welcomeEmail}
                    onCheckedChange={setWelcomeEmail}
                    data-testid="switch-welcome-email"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Perfil Público</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Visibilidade padrão</p>
                  </div>
                  <Switch
                    checked={publicProfile}
                    onCheckedChange={setPublicProfile}
                    data-testid="switch-public-profile"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Limite de Estudos Diários</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Máximo por usuário</p>
                  </div>
                  <Input
                    type="number"
                    value={dailyStudyLimit}
                    onChange={(e) => setDailyStudyLimit(e.target.value)}
                    className="w-20 bg-gray-50 dark:bg-gray-700 text-center"
                    data-testid="input-daily-limit"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3 pb-4">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Notificações</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie alertas</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Email</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notificações por email</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                    data-testid="switch-email-notifications"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Push</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notificações push</p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                    data-testid="switch-push-notifications"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">SMS</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Mensagens de texto</p>
                  </div>
                  <Switch
                    checked={smsNotifications}
                    onCheckedChange={setSmsNotifications}
                    data-testid="switch-sms-notifications"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">In-App</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notificações no app</p>
                  </div>
                  <Switch
                    checked={inAppNotifications}
                    onCheckedChange={setInAppNotifications}
                    data-testid="switch-inapp-notifications"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Tipos de Notificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Novos Usuários</span>
                  </div>
                  <Switch
                    checked={newUserNotifications}
                    onCheckedChange={setNewUserNotifications}
                    data-testid="switch-new-user-notifications"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DeoGloryAdminLayout>
  );
}
