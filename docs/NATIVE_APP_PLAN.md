# Plano de Transformação: Navegação Estilo App Nativo

## Visão Geral

Este documento detalha o plano para transformar a navegação do site UMP Emaús em uma experiência similar a um aplicativo nativo, usando como referência o módulo DeoGlory que já possui essa característica.

---

## Parte 1: O que faz o DeoGlory parecer um App Nativo

### 1.1 Padrões de Design Utilizados

| Elemento | Implementação no DeoGlory |
|----------|---------------------------|
| **Navegação Inferior Fixa** | Componente `BottomNav` com abas fixas no rodapé |
| **Transições Animadas** | Componente `PageTransition` com Framer Motion |
| **Headers com Gradiente** | Cabeçalhos imersivos com gradientes temáticos |
| **Cards com Glassmorphism** | Efeito de vidro fosco nos cards |
| **Scroll Interno** | Conteúdo scroll dentro de containers, não a página toda |
| **Feedback Visual** | Animações de loading, skeleton states |
| **Tela Cheia** | Sem chrome do navegador visível |

### 1.2 Arquivos de Referência do DeoGlory

```
client/src/pages/study/
├── index.tsx              # Layout principal com BottomNav
├── events.tsx             # Listagem de eventos com cards
├── event-detail.tsx       # Detalhes com transições
└── components/
    ├── BottomNav.tsx      # Navegação inferior
    └── PageTransition.tsx # Animações de página
```

---

## Parte 2: Plano de Implementação para o Site Principal

### 2.1 Estrutura Proposta

```
client/src/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx         # NOVO: Shell responsivo principal
│   │   ├── BottomTabBar.tsx     # NOVO: Navegação inferior para mobile
│   │   ├── MobileHeader.tsx     # NOVO: Header compacto mobile
│   │   └── SiteLayout.tsx       # EXISTENTE: Manter para desktop
│   └── ui/
│       └── page-transition.tsx  # NOVO: Transições compartilhadas
├── hooks/
│   └── use-mobile.tsx           # EXISTENTE: Detecção de viewport
└── pages/
    └── (todas as páginas)       # Atualizar para usar AppShell
```

### 2.2 Componente AppShell (Novo)

```tsx
// Comportamento responsivo:
// - Mobile (< 768px): BottomTabBar + MobileHeader
// - Desktop (>= 768px): SiteHeader + SiteFooter tradicionais

interface AppShellProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showTabBar?: boolean;
  activeTab?: 'home' | 'agenda' | 'devotionals' | 'community' | 'profile';
}
```

### 2.3 Navegação por Abas (Mobile)

| Aba | Ícone | Rota | Descrição |
|-----|-------|------|-----------|
| **Início** | `Home` | `/` | Página inicial |
| **Agenda** | `Calendar` | `/agenda` | Eventos e calendário |
| **Devocionais** | `BookOpen` | `/devocionais` | Devocionais diários |
| **Comunidade** | `Users` | `/diretorio` | Diretório de membros |
| **Perfil** | `User` | `/membro` | Área do membro |

### 2.4 Fases de Implementação

#### Fase 1: Infraestrutura (1-2 dias)
- [ ] Criar componente `AppShell.tsx`
- [ ] Criar componente `BottomTabBar.tsx`
- [ ] Criar componente `MobileHeader.tsx`
- [ ] Criar hook `useAppNavigation` para estado de navegação
- [ ] Configurar transições de página com Framer Motion

#### Fase 2: Migração de Páginas (2-3 dias)
- [ ] Atualizar `App.tsx` para usar AppShell
- [ ] Migrar página Home
- [ ] Migrar página Agenda
- [ ] Migrar página Devocionais
- [ ] Migrar páginas de Membro

#### Fase 3: Polish e UX (1-2 dias)
- [ ] Adicionar transições suaves entre abas
- [ ] Implementar gestos de swipe (opcional)
- [ ] Otimizar performance de transições
- [ ] Testar em diferentes dispositivos

---

## Parte 3: Especificações Técnicas

### 3.1 BottomTabBar Component

```tsx
// Características:
// - Altura fixa: 64px
// - Posição: fixed bottom
// - Z-index: 50 (acima de tudo)
// - Safe area para notch/home indicator
// - Indicador de aba ativa animado
// - Haptic feedback (se disponível)

const tabs = [
  { id: 'home', icon: Home, label: 'Início', path: '/' },
  { id: 'agenda', icon: Calendar, label: 'Agenda', path: '/agenda' },
  { id: 'devotionals', icon: BookOpen, label: 'Devocional', path: '/devocionais' },
  { id: 'community', icon: Users, label: 'Comunidade', path: '/diretorio' },
  { id: 'profile', icon: User, label: 'Perfil', path: '/membro' },
];
```

### 3.2 Transições de Página

```tsx
// Usando Framer Motion
const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

// Duração: 200-300ms
// Easing: ease-out
```

### 3.3 Considerações de Layout

```css
/* Mobile App Shell */
.app-shell-mobile {
  display: flex;
  flex-direction: column;
  height: 100dvh; /* Dynamic viewport height */
  overflow: hidden;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## Parte 4: Criação do APK para Android

### 4.1 Pré-requisitos (PWA)

Antes de gerar o APK, o site precisa ser uma PWA válida:

1. **Web Manifest** (`manifest.webmanifest`)
   ```json
   {
     "name": "UMP Emaús",
     "short_name": "UMP Emaús",
     "description": "Sistema da União de Mocidade Presbiteriana",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#ffffff",
     "theme_color": "#3b82f6",
     "icons": [
       { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
     ]
   }
   ```

2. **Service Worker** (para offline)
3. **HTTPS** (obrigatório)
4. **Ícones** nos tamanhos corretos (192x192, 512x512)

### 4.2 Métodos para Gerar APK

#### Opção A: PWABuilder (Mais Simples) ⭐ Recomendado

**URL:** https://www.pwabuilder.com/

**Passos:**
1. Acesse pwabuilder.com
2. Insira a URL do site publicado
3. Revise os detalhes do manifest
4. Clique em "Build" > "Android"
5. Faça download do APK/AAB

**Vantagens:**
- Interface visual, sem código
- Gera APK e AAB (para Play Store)
- Gratuito

---

#### Opção B: Bubblewrap CLI (Google Oficial)

**Instalação:**
```bash
npm install -g @bubblewrap/cli
```

**Uso:**
```bash
# 1. Criar pasta do projeto
mkdir ump-emaus-android && cd ump-emaus-android

# 2. Inicializar com o manifest
bubblewrap init --manifest=https://seusite.com/manifest.webmanifest

# 3. Seguir prompts interativos:
#    - Nome do app
#    - Package ID: com.umpemaus.app
#    - Ícones, cores, etc.

# 4. Gerar APK
bubblewrap build

# 5. Arquivos gerados:
#    - app-release-signed.apk (instalação direta)
#    - app-release-bundle.aab (Google Play Store)
```

**Requisitos:**
- Node.js 14+
- JDK 8 ou 11
- Android SDK (bubblewrap pode instalar automaticamente)

---

#### Opção C: Capacitor (Mais Completo)

**Quando usar:** Se precisar de recursos nativos avançados (câmera, GPS nativo, notificações push nativas, etc.)

**Instalação:**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init "UMP Emaús" com.umpemaus.app
npx cap add android
```

**Build:**
```bash
npm run build           # Build do frontend
npx cap sync android    # Sincroniza assets
npx cap open android    # Abre no Android Studio
```

**Requisitos:**
- Android Studio instalado
- Android SDK
- JDK 11+

---

### 4.3 Comparação dos Métodos

| Característica | PWABuilder | Bubblewrap | Capacitor |
|----------------|------------|------------|-----------|
| **Dificuldade** | Fácil | Médio | Avançado |
| **Setup** | 5 min | 30 min | 2+ horas |
| **Recursos Nativos** | Limitado (Web APIs) | Limitado (Web APIs) | Completo |
| **Tamanho APK** | ~3-5 MB | ~3-5 MB | ~15-30 MB |
| **Atualizações** | Automáticas via web | Automáticas via web | Requer nova build |
| **Play Store** | Sim | Sim | Sim |
| **Custo** | Gratuito | Gratuito | Gratuito |

### 4.4 Digital Asset Links (Tela Cheia)

Para remover a barra de navegação do Chrome no app:

1. Gere o arquivo `assetlinks.json` (o Bubblewrap gera automaticamente)
2. Hospede em: `https://seusite.com/.well-known/assetlinks.json`

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.umpemaus.app",
    "sha256_cert_fingerprints": ["AB:CD:EF:..."]
  }
}]
```

### 4.5 Publicação na Play Store

1. Crie conta no Google Play Console ($25 taxa única)
2. Crie novo app
3. Faça upload do arquivo `.aab` (não APK)
4. Preencha listagem (descrição, screenshots, categorias)
5. Configure classificação etária
6. Envie para revisão

---

## Parte 5: Checklist de Implementação

### PWA Checklist

- [ ] Criar `manifest.webmanifest`
- [ ] Registrar Service Worker
- [ ] Criar ícones (192x192, 512x512, maskable)
- [ ] Configurar meta tags no HTML
- [ ] Testar com Lighthouse (pontuação PWA)
- [ ] Verificar HTTPS

### App-Like Navigation Checklist

- [ ] Implementar BottomTabBar
- [ ] Criar AppShell responsivo
- [ ] Adicionar transições de página
- [ ] Configurar safe areas para notch
- [ ] Testar gestos de navegação
- [ ] Otimizar para performance

### APK Generation Checklist

- [ ] PWA validada (Lighthouse score 90+)
- [ ] Escolher método (PWABuilder/Bubblewrap/Capacitor)
- [ ] Gerar APK/AAB
- [ ] Testar em dispositivo real
- [ ] Configurar Digital Asset Links
- [ ] Preparar assets para Play Store

---

## Referências

- [PWABuilder](https://www.pwabuilder.com/)
- [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap)
- [Capacitor](https://capacitorjs.com/)
- [Google TWA Guide](https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

---

*Documento criado em: 27/12/2024*
*Última atualização: 27/12/2024*
