# Sistema de Estudo Estilo Duolingo - Documentação Completa

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Decisões Confirmadas](#2-decisões-confirmadas)
3. [Fluxo de Desenvolvimento](#3-fluxo-de-desenvolvimento)
4. [Stack Tecnológico](#4-stack-tecnológico)
5. [Arquitetura do Sistema](#5-arquitetura-do-sistema)
6. [Modelo de Dados (Database Schema)](#6-modelo-de-dados-database-schema)
7. [Sistema de Gamificação](#7-sistema-de-gamificação)
8. [Integração com IA](#8-integração-com-ia)
9. [Fluxo do Usuário e UX](#9-fluxo-do-usuário-e-ux)
10. [Painel Administrativo](#10-painel-administrativo)
11. [Roadmap de Implementação](#11-roadmap-de-implementação)
12. [Histórico de Alterações](#12-histórico-de-alterações)

---

## 1. Visão Geral

### 1.1 Objetivo do Sistema
Criar uma plataforma de estudo/meditação gamificada que replica a experiência do Duolingo, permitindo que administradores façam upload de PDFs semanais que são processados por IA para gerar automaticamente:
- Lições estruturadas
- Perguntas e exercícios
- Desafios
- Metas semanais

### 1.2 Características Principais
- **Mobile-first**: Interface otimizada para dispositivos móveis (PWA)
- **Feedback imediato**: Respostas instantâneas como no Duolingo (verde/vermelho, animações, sons)
- **Gamificação completa**: XP, streaks, níveis, conquistas, rankings, vidas
- **IA integrada**: Processamento automático de PDFs e geração de conteúdo
- **Estudos semanais**: Conteúdo renovado semanalmente pelo administrador

### 1.3 Público-Alvo
- Membros da comunidade UMP Emaús que desejam estudar e meditar semanalmente
- Administradores que gerenciam o conteúdo semanal

---

## 2. Decisões Confirmadas

> **Data da Decisão**: Dezembro 2024
> **Status**: APROVADO

### 2.1 Plataforma
| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| **Tipo de App** | PWA (Progressive Web App) | Custo zero, reutiliza site existente, atualizações instantâneas |
| **Versão** | Completa (não MVP simplificado) | Implementar todas as funcionalidades desde o início |
| **Prazo** | 1 semana | Timeline agressiva, foco em entregas diárias |

### 2.2 Sistema de Vidas (Corações)
| Configuração | Valor | Descrição |
|--------------|-------|-----------|
| **Máximo de vidas** | 5 | Usuário começa com 5 vidas |
| **Perda por erro** | 1 vida | Cada resposta errada = -1 vida |
| **Recuperação por tempo** | 1 vida a cada 6 horas | Recuperação passiva automática |
| **Recuperação imediata** | Leitura de versículos | Ler versículo e marcar como concluído = +1 vida |

### 2.3 Recursos de IA
| Recurso | Status | Detalhes |
|---------|--------|----------|
| **Gemini API Key** | Configurada | Armazenada em Replit Secrets |
| **Modelo** | Gemini 2.0 Flash | Para extração de PDF e geração de conteúdo |
| **OpenAI** | REMOVIDO | Projeto usa EXCLUSIVAMENTE Gemini |

---

## 3. Fluxo de Desenvolvimento

### 3.1 Regras Obrigatórias de Desenvolvimento

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE CADA TAREFA                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. EXECUTAR TAREFA                                         │
│     └── Implementar código/design conforme especificação    │
│                                                             │
│  2. CHAMAR ARQUITETO                                        │
│     └── Submeter para revisão técnica                       │
│     └── Incluir git diff completo                           │
│                                                             │
│  3. VALIDAR FEEDBACK                                        │
│     └── Corrigir issues severos imediatamente               │
│     └── Issues menores: documentar para próxima iteração    │
│                                                             │
│  4. CONCLUIR TAREFA                                         │
│     └── Marcar como completed na task list                  │
│                                                             │
│  5. ATUALIZAR DOCUMENTAÇÃO                                  │
│     └── Adicionar detalhes minuciosos do que foi feito      │
│     └── Registrar no Histórico de Alterações                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Checklist de Conclusão de Tarefa

Antes de marcar qualquer tarefa como concluída, verificar:

- [ ] Código implementado e testado
- [ ] Arquiteto revisou as mudanças
- [ ] Issues severos corrigidos
- [ ] Documentação atualizada com detalhes
- [ ] Histórico de alterações atualizado
- [ ] Screenshots/evidências anexadas (quando aplicável)

### 3.3 Padrão de Documentação por Tarefa

Cada tarefa concluída deve ter registro no formato:

```markdown
### [DATA] - Nome da Tarefa

**Arquivos modificados:**
- `caminho/arquivo.tsx` - Descrição da mudança

**Funcionalidades implementadas:**
- Feature 1: Descrição detalhada
- Feature 2: Descrição detalhada

**Decisões técnicas:**
- Decisão 1: Por que foi feito assim

**Issues conhecidos:**
- Issue 1: Descrição e plano de resolução

**Screenshots:**
- [Link ou referência]
```

---

## 4. Stack Tecnológico

### 4.1 Stack Confirmada (PWA)

```
Frontend (PWA)
├── React 18 + Vite (já existente)
├── TailwindCSS + Shadcn UI (já configurado)
├── Framer Motion (animações fluidas - INSTALAR)
├── TanStack Query (cache e estado - já existente)
├── Zustand (estado global - INSTALAR)
├── Socket.IO Client (tempo real - INSTALAR)
└── Workbox (PWA/offline - CONFIGURAR)

Backend
├── Node.js + Express (já existente)
├── Drizzle ORM + PostgreSQL (já configurado)
├── Socket.IO (eventos em tempo real - INSTALAR)
└── OpenAI API (processamento de PDFs - CONFIGURADO)

IA e Processamento
├── OpenAI GPT-4 (extração e geração de conteúdo)
├── pdf-parse (leitura de PDFs - INSTALAR)
└── Validação humana antes de publicar
```

### 4.2 Pacotes a Instalar

```bash
# Frontend
npm install framer-motion zustand socket.io-client

# Backend  
npm install socket.io pdf-parse openai

# Dev
npm install @types/socket.io @types/pdf-parse
```

---

## 5. Arquitetura do Sistema

### 5.1 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (PWA)                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  App Mobile  │  │ Lesson Player│  │  Admin Panel │  │  Gamification│     │
│  │   (Mapa)     │  │  (Exercícios)│  │  (Upload PDF)│  │  (XP/Streak) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
              HTTP/REST       WebSocket        File Upload
                    │               │               │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Express)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  API Routes  │  │  Socket.IO   │  │  AI Service  │  │  PDF Parser  │     │
│  │  (REST)      │  │  (Real-time) │  │  (OpenAI)    │  │  (pdf-parse) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                              │                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        STORAGE LAYER (Drizzle ORM)                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                             ┌──────────┐
                             │PostgreSQL│
                             │ (Neon)   │
                             └──────────┘
```

### 5.2 Estrutura de Pastas do Sistema de Estudos

```
client/src/
├── pages/
│   ├── study/                    # Páginas do sistema de estudo
│   │   ├── index.tsx             # Mapa de lições
│   │   ├── lesson.tsx            # Player de lição
│   │   ├── meditation.tsx        # Sessão de meditação
│   │   ├── challenge.tsx         # Desafios
│   │   └── profile.tsx           # Perfil e conquistas
│   └── admin/
│       ├── study-weeks.tsx       # Gerenciar semanas
│       └── lesson-editor.tsx     # Editar lições
├── components/
│   └── study/                    # Componentes do sistema
│       ├── LessonMap.tsx         # Mapa estilo Duolingo
│       ├── LessonPlayer.tsx      # Player de exercícios
│       ├── ExerciseCard.tsx      # Cards de exercício
│       ├── FeedbackOverlay.tsx   # Feedback correto/incorreto
│       ├── HeartsDisplay.tsx     # Exibição de vidas
│       ├── XPCounter.tsx         # Contador de XP
│       ├── StreakBadge.tsx       # Badge de streak
│       ├── ProgressBar.tsx       # Barra de progresso
│       └── VerseReader.tsx       # Leitor de versículos (recuperar vida)
└── hooks/
    └── study/
        ├── useGameState.ts       # Estado de gamificação
        ├── useLessonProgress.ts  # Progresso de lições
        └── useHearts.ts          # Sistema de vidas
```

---

## 6. Modelo de Dados (Database Schema)

### 6.1 Tabelas do Sistema de Estudos

```typescript
// ==================== PERFIL DE GAMIFICAÇÃO ====================

// Perfil de gamificação do usuário
study_profiles {
  id: serial PRIMARY KEY
  user_id: integer REFERENCES users(id) UNIQUE
  total_xp: integer DEFAULT 0
  current_level: integer DEFAULT 1
  current_streak: integer DEFAULT 0
  longest_streak: integer DEFAULT 0
  hearts: integer DEFAULT 5              // Máximo 5 vidas
  hearts_max: integer DEFAULT 5
  hearts_refill_at: timestamp            // Próxima vida em 6h
  last_activity_date: date
  daily_goal_minutes: integer DEFAULT 10
  timezone: varchar DEFAULT 'America/Sao_Paulo'
  created_at: timestamp
  updated_at: timestamp
}

// ==================== CONTEÚDO ====================

// Semanas de estudo (cada upload de PDF)
study_weeks {
  id: serial PRIMARY KEY
  week_number: integer
  year: integer
  title: varchar
  description: text
  pdf_url: varchar
  status: enum('processing', 'draft', 'published', 'archived')
  published_at: timestamp
  created_by: integer REFERENCES users(id)
  ai_metadata: jsonb
  created_at: timestamp
  updated_at: timestamp
}

// Lições dentro de cada semana
study_lessons {
  id: serial PRIMARY KEY
  study_week_id: integer REFERENCES study_weeks(id)
  order_index: integer
  title: varchar
  type: enum('intro', 'study', 'meditation', 'challenge', 'review')
  description: text
  xp_reward: integer DEFAULT 10
  estimated_minutes: integer DEFAULT 5
  icon: varchar
  is_bonus: boolean DEFAULT false
  created_at: timestamp
  updated_at: timestamp
}

// Unidades/Exercícios dentro de cada lição
study_units {
  id: serial PRIMARY KEY
  lesson_id: integer REFERENCES study_lessons(id)
  order_index: integer
  type: enum('text', 'multiple_choice', 'true_false', 'fill_blank', 'meditation', 'reflection', 'verse')
  content: jsonb
  xp_value: integer DEFAULT 2
  created_at: timestamp
}

// Versículos para recuperar vidas
bible_verses {
  id: serial PRIMARY KEY
  reference: varchar           // "João 3:16"
  text: text                   // Texto do versículo
  reflection: text             // Reflexão sobre o versículo
  category: varchar            // "fé", "amor", "esperança"
  created_at: timestamp
}

// ==================== PROGRESSO ====================

// Progresso do usuário em cada lição
user_lesson_progress {
  id: serial PRIMARY KEY
  user_id: integer REFERENCES users(id)
  lesson_id: integer REFERENCES study_lessons(id)
  status: enum('locked', 'available', 'in_progress', 'completed')
  started_at: timestamp
  completed_at: timestamp
  xp_earned: integer DEFAULT 0
  mistakes_count: integer DEFAULT 0
  perfect_score: boolean DEFAULT false
  time_spent_seconds: integer DEFAULT 0
  UNIQUE(user_id, lesson_id)
}

// Progresso do usuário em cada unidade
user_unit_progress {
  id: serial PRIMARY KEY
  user_id: integer REFERENCES users(id)
  unit_id: integer REFERENCES study_units(id)
  is_completed: boolean DEFAULT false
  answer_given: jsonb
  is_correct: boolean
  attempts: integer DEFAULT 0
  completed_at: timestamp
  UNIQUE(user_id, unit_id)
}

// Registro de leitura de versículos (para recuperar vidas)
verse_readings {
  id: serial PRIMARY KEY
  user_id: integer REFERENCES users(id)
  verse_id: integer REFERENCES bible_verses(id)
  read_at: timestamp
  hearts_recovered: integer DEFAULT 1
}

// ==================== GAMIFICAÇÃO ====================

// Transações de XP
xp_transactions {
  id: serial PRIMARY KEY
  user_id: integer REFERENCES users(id)
  amount: integer
  source: enum('lesson', 'challenge', 'streak_bonus', 'achievement', 'perfect_lesson')
  source_id: integer
  description: varchar
  created_at: timestamp
}

// Registro diário de atividade (para streak)
daily_activity {
  id: serial PRIMARY KEY
  user_id: integer REFERENCES users(id)
  activity_date: date
  minutes_studied: integer DEFAULT 0
  lessons_completed: integer DEFAULT 0
  xp_earned: integer DEFAULT 0
  streak_maintained: boolean DEFAULT false
  UNIQUE(user_id, activity_date)
}

// Conquistas disponíveis
achievements {
  id: serial PRIMARY KEY
  code: varchar UNIQUE
  name: varchar
  description: text
  icon: varchar
  xp_reward: integer DEFAULT 0
  category: enum('streak', 'xp', 'lessons', 'special')
  requirement: jsonb
  is_secret: boolean DEFAULT false
}

// Conquistas do usuário
user_achievements {
  id: serial PRIMARY KEY
  user_id: integer REFERENCES users(id)
  achievement_id: integer REFERENCES achievements(id)
  unlocked_at: timestamp
  UNIQUE(user_id, achievement_id)
}

// Rankings
leaderboard_entries {
  id: serial PRIMARY KEY
  user_id: integer REFERENCES users(id)
  period_type: enum('weekly', 'monthly', 'all_time')
  period_key: varchar
  xp_earned: integer DEFAULT 0
  rank_position: integer
  updated_at: timestamp
  UNIQUE(user_id, period_type, period_key)
}
```

### 6.2 Estrutura do JSONB para Exercícios

```typescript
// type='text' (Texto informativo)
{
  title: "O que é fé?",
  body: "A fé é a certeza daquilo que esperamos...",
  highlight: "Hebreus 11:1"
}

// type='multiple_choice' (Múltipla escolha)
{
  question: "Qual versículo fala sobre a fé?",
  options: ["Gênesis 1:1", "Hebreus 11:1", "João 3:16", "Salmos 23:1"],
  correct_index: 1,
  explanation_correct: "Exatamente! Hebreus 11:1 define a fé...",
  explanation_incorrect: "A resposta correta é Hebreus 11:1...",
  hint: "Pense no livro que fala sobre heróis da fé"
}

// type='true_false' (Verdadeiro ou Falso)
{
  statement: "A fé é a certeza daquilo que duvidamos.",
  is_true: false,
  explanation: "Na verdade, a fé é a certeza daquilo que ESPERAMOS..."
}

// type='fill_blank' (Preencher lacuna)
{
  sentence: "A fé é a certeza daquilo que _____",
  blank_position: 6,
  correct_answer: "esperamos",
  alternatives: ["duvidamos", "vemos", "tocamos"],
  explanation: "Hebreus 11:1 nos ensina que..."
}

// type='meditation' (Meditação guiada)
{
  title: "Momento de Reflexão",
  duration_seconds: 180,
  instructions: "Feche os olhos e respire profundamente...",
  background_music: "peaceful",
  prompts: [
    { time: 0, text: "Relaxe seus ombros..." },
    { time: 30, text: "Pense no versículo de hoje..." },
    { time: 120, text: "O que Deus está falando com você?" }
  ]
}

// type='reflection' (Reflexão escrita)
{
  prompt: "O que esse versículo significa para você hoje?",
  min_words: 10,
  placeholder: "Escreva sua reflexão..."
}

// type='verse' (Versículo para ler)
{
  reference: "João 3:16",
  text: "Porque Deus amou o mundo de tal maneira...",
  action: "read_and_confirm",
  reward_hearts: 1
}
```

---

## 7. Sistema de Gamificação

### 7.1 Sistema de XP

| Ação | XP | Notas |
|------|-----|-------|
| Completar unidade de texto | 2 XP | Leitura |
| Resposta correta (1a tentativa) | 5 XP | Máximo |
| Resposta correta (2a tentativa) | 2 XP | Reduzido |
| Completar meditação | 10 XP | Por sessão |
| Completar lição | 15 XP | Bônus |
| Lição perfeita (sem erros) | +10 XP | Bônus extra |
| Streak 7 dias | 20 XP | Uma vez |
| Streak 30 dias | 100 XP | Uma vez |
| Meta diária cumprida | 5 XP | Por dia |

### 7.2 Sistema de Níveis

```javascript
function xpRequiredForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level - 1, 1.5));
}

// Nível 1:  0 XP
// Nível 2:  100 XP
// Nível 3:  283 XP
// Nível 5:  800 XP
// Nível 10: 2,700 XP
// Nível 20: 8,500 XP
```

### 7.3 Sistema de Vidas (CONFIRMADO)

```javascript
const HEARTS_CONFIG = {
  // Configuração confirmada pelo cliente
  maxHearts: 5,
  startingHearts: 5,
  heartsLostPerMistake: 1,
  
  // Recuperação por tempo
  timeRecovery: {
    enabled: true,
    hoursPerHeart: 6,  // 1 vida a cada 6 horas
  },
  
  // Recuperação imediata (leitura de versículos)
  verseRecovery: {
    enabled: true,
    heartsPerVerse: 1,
    requireConfirmation: true,  // Usuário marca como "li e entendi"
  },
  
  // Sem vidas = não pode fazer novas lições
  // Pode fazer: revisões antigas, ler versículos
};
```

### 7.4 Sistema de Streak

```javascript
const STREAK_CONFIG = {
  resetHour: 0,  // Meia-noite
  gracePeriodHours: 4,  // 4h de graça após meia-noite
  minimumActivityMinutes: 5,  // 5 min para manter streak
  
  bonuses: [
    { days: 7, xp: 20, badge: "flame_week" },
    { days: 14, xp: 30, badge: "flame_fortnight" },
    { days: 30, xp: 100, badge: "flame_month" },
    { days: 100, xp: 500, badge: "flame_century" },
  ]
};
```

### 7.5 Conquistas

```javascript
const ACHIEVEMENTS = [
  // Streak
  { code: 'streak_3', name: 'Iniciante Dedicado', xp: 10 },
  { code: 'streak_7', name: 'Semana Perfeita', xp: 25 },
  { code: 'streak_30', name: 'Mês de Fé', xp: 100 },
  
  // Lições
  { code: 'first_lesson', name: 'Primeiro Passo', xp: 5 },
  { code: 'perfect_lesson', name: 'Perfeito!', xp: 15 },
  { code: 'week_complete', name: 'Semana Completa', xp: 50 },
  
  // Especiais
  { code: 'early_bird', name: 'Madrugador', xp: 10 },
  { code: 'meditation_master', name: 'Mestre da Meditação', xp: 50 },
  { code: 'verse_reader_10', name: 'Leitor de Versículos', xp: 25 },
];
```

---

## 8. Integração com IA

### 8.1 Pipeline de Processamento

```
Admin Upload PDF
       │
       ▼
┌──────────────┐
│  pdf-parse   │ ──► Extrair texto do PDF
└──────────────┘
       │
       ▼
┌──────────────┐
│  OpenAI API  │ ──► Analisar e estruturar conteúdo
└──────────────┘
       │
       ▼
┌──────────────┐
│  OpenAI API  │ ──► Gerar lições e exercícios
└──────────────┘
       │
       ▼
┌──────────────┐
│  Salvar DB   │ ──► Status: 'draft'
└──────────────┘
       │
       ▼
┌──────────────┐
│ Admin Revisa │ ──► Editar se necessário
└──────────────┘
       │
       ▼
┌──────────────┐
│  Publicar    │ ──► Status: 'published'
└──────────────┘
```

### 8.2 Prompts de IA

Ver seção detalhada no documento original.

---

## 9. Fluxo do Usuário e UX

### 9.1 Telas Principais

1. **Mapa de Lições** - Estilo Duolingo com caminho de nós
2. **Player de Lição** - Cards de exercício com feedback
3. **Tela de Meditação** - Timer e instruções guiadas
4. **Perfil** - XP, nível, streak, conquistas
5. **Rankings** - Leaderboard semanal/mensal
6. **Recuperar Vidas** - Lista de versículos para ler

### 9.2 Feedback Visual

| Ação | Feedback |
|------|----------|
| Resposta correta | Fundo verde, confetti, "+5 XP" animado |
| Resposta incorreta | Fundo vermelho, shake, "-1 vida" |
| Lição completa | Explosão de confetti, fanfarra |
| Novo nível | Animação especial, badge |
| Streak mantido | Fogo animado |

---

## 10. Painel Administrativo

### 10.1 Funcionalidades

1. **Upload de PDF** - Drag & drop, status de processamento
2. **Editor de Lições** - Editar conteúdo gerado pela IA
3. **Gerenciar Versículos** - CRUD de versículos bíblicos
4. **Publicar Semana** - Aprovar e publicar conteúdo
5. **Estatísticas** - Visualizar engajamento

---

## 11. Roadmap de Implementação

### Fase 1: Design Visual (ATUAL)
- [ ] Criar componentes visuais
- [ ] Validar UX com cliente
- [ ] Definir paleta de cores e ícones

### Fase 2: Core do Sistema
- [ ] Schema do banco de dados
- [ ] APIs de lições e progresso
- [ ] Sistema de vidas

### Fase 3: Gamificação
- [ ] XP e níveis
- [ ] Streak
- [ ] Conquistas
- [ ] Rankings

### Fase 4: Integração IA
- [ ] Upload de PDF
- [ ] Processamento com OpenAI
- [ ] Painel de revisão

### Fase 5: Polish
- [ ] Animações
- [ ] Sons (opcional)
- [ ] PWA offline
- [ ] Testes

---

## 12. Histórico de Alterações

### [03/12/2024] - Correcao do Layout da Tela de Licoes

**Problema identificado:**
- A tela mostrava "Seu Caminho" com "Licao 1, Licao 2, Licao 3..." como itens separados
- Estrutura incorreta nao refletia o fluxo de aprendizagem em 3 estagios

**Solucao implementada:**
- Novo layout hierarquico por licao
- Cada licao exibe seu titulo completo (ex: "Licao 1 - O que e Fe?")
- Abaixo de cada licao, os 3 estagios aparecem como cards separados:
  1. **Estude** - Conteudo de leitura (texto, versiculos) - NAO perde vidas
  2. **Medite** - Reflexao e oracao - NAO perde vidas
  3. **Responda** - Exercicios e perguntas - PODE perder vidas

**Arquivos afetados:**
- `docs/STUDY_SYSTEM_DESIGN.md` - Documentacao atualizada
- `client/src/components/study/LearningPath.tsx` - Componente principal
- `client/src/pages/study/index.tsx` - Pagina do estudo

**Regras de desbloqueio:**
- Estude: Desbloqueia quando licao anterior esta completa
- Medite: Desbloqueia quando Estude esta completo
- Responda: Desbloqueia quando Medite esta completo

---

### [03/12/2024] - Criacao de Dados de Estudo - Semana 49

**Dados criados:**
- 1 Semana de estudo: "Fe em Acao - Vivendo a Fe no Dia a Dia"
- 5 Licoes completas com conteudo biblico
- 50 unidades distribuidas nos 3 estagios (18 Estude, 10 Medite, 22 Responda)
- 15 versiculos biblicos para recuperacao de vidas
- 21 conquistas para gamificacao

**Schema atualizado:**
- Coluna `stage` adicionada a tabela `study_units`
- Coluna `heart_recovery_batch` adicionada a tabela `verse_readings`

---

### [02/12/2024] - Documentação Inicial

**Decisões registradas:**
- Plataforma: PWA (não app nativo)
- Sistema de vidas: 5 máximo, recuperar por tempo (6h) ou leitura de versículos
- Versão: Completa (não MVP simplificado)
- Prazo: 1 semana
- IA: OpenAI API Key configurada

**Fluxo de desenvolvimento definido:**
- Cada tarefa segue: Executar → Arquiteto → Validar → Concluir → Documentar

**Próximos passos:**
- Criar design visual para validação

---

*Documento atualizado em: 03/12/2024*
*Versão: 2.1*
*Status: Em Desenvolvimento*
