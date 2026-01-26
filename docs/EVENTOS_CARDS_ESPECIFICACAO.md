# Especificação Técnica: Sistema de Eventos Especiais + Cards Colecionáveis

> **Versão:** 1.0  
> **Data:** 25/12/2024  
> **Status:** Planejamento

---

## 1. VISÃO GERAL DO SISTEMA

### 1.1 Objetivo
Criar um sistema de eventos temáticos temporários com lições geradas por IA e recompensas em cards colecionáveis, aumentando o engajamento e a gamificação da plataforma DeoGlory.

### 1.2 Funcionalidades Principais
1. **Eventos Especiais**: Campanhas temáticas com duração limitada
2. **Cards Colecionáveis**: Recompensas visuais por conclusão de eventos/revistas
3. **Sistema de Raridade**: 4 níveis baseados no desempenho
4. **Compartilhamento Social**: Exportar cards como imagem para redes sociais

---

## 2. EVENTOS ESPECIAIS

### 2.1 Conceito
Eventos são campanhas temáticas com período definido (geralmente 1 semana), contendo lições especiais geradas por IA sobre um tema específico.

### 2.2 Exemplos de Eventos
| Evento | Tema | Período Sugerido |
|--------|------|------------------|
| Semana da Reforma Protestante | Reforma, Lutero, Calvino, 5 Solas | Outubro (31/10) |
| Semana de Missões | Evangelismo, Grande Comissão | Novembro |
| Semana do Jovem Presbiteriano | Identidade reformada, chamado | Julho |
| Semana da Família | Casamento, filhos, lar cristão | Maio |
| Advento | Natal, nascimento de Cristo | Dezembro |

### 2.3 Estrutura de um Evento
- **Título**: Nome do evento (ex: "Semana da Reforma Protestante")
- **Descrição**: Texto explicativo sobre o evento
- **Tema**: Palavra-chave para geração de conteúdo por IA
- **Imagem de Capa**: Banner visual do evento
- **Data de Início**: Quando o evento começa
- **Data de Fim**: Quando o evento termina
- **Lições**: 5-7 lições diárias geradas por IA
- **Card de Recompensa**: Card colecionável associado ao evento

### 2.4 Ciclo de Vida do Evento
```
DRAFT (Rascunho)
    │
    ▼ [Admin publica]
SCHEDULED (Agendado)
    │
    ▼ [Data início chegou]
ACTIVE (Ativo)
    │
    ▼ [Data fim chegou]
COMPLETED (Concluído)
```

### 2.5 Lições do Evento
Cada lição contém:
- **Dia**: Número sequencial (1, 2, 3...)
- **Título**: Título da lição
- **Conteúdo**: Texto devocional/estudo (markdown)
- **Versículo Base**: Referência bíblica principal
- **Perguntas**: 5-10 questões de quiz (múltipla escolha, V/F, completar)

### 2.6 Geração de Conteúdo por IA
O admin informa:
- Título do evento
- Tema/palavra-chave
- Número de lições desejadas

A IA gera automaticamente:
- Conteúdo de cada lição
- Perguntas de quiz
- Versículos relacionados

---

## 3. CARDS COLECIONÁVEIS

### 3.1 Conceito
Cards são recompensas visuais que os membros ganham ao completar revistas ou eventos. Cada card tem uma raridade baseada no desempenho do membro.

### 3.2 Fontes de Cards
| Fonte | Quando Ganha | Critério de Raridade |
|-------|--------------|----------------------|
| Revista/Temporada | Ao completar todas as lições | Média de desempenho nas lições |
| Evento Especial | Ao completar todas as lições do evento | Desempenho no evento |

### 3.3 Sistema de Raridade

#### 3.3.1 Níveis
| Raridade | Cor | Requisito Mínimo | Características Visuais |
|----------|-----|------------------|------------------------|
| **Comum** | Cinza (#6B7280) | Completar | Borda simples, sem animação |
| **Raro** | Azul (#3B82F6) | 80%+ acertos | Borda brilhante, leve pulso |
| **Épico** | Roxo (#8B5CF6) | 95%+ acertos | Brilho intenso, reflexos animados |
| **Lendário** | Dourado (#F59E0B) | 100% perfeito | Holográfico, partículas, glow |

#### 3.3.2 Cálculo de Desempenho para Eventos
```
desempenho = (total_acertos / total_perguntas) * 100

Se desempenho >= 100% E sem_usar_dicas: LENDÁRIO
Se desempenho >= 95%: ÉPICO
Se desempenho >= 80%: RARO
Senão: COMUM
```

#### 3.3.3 Cálculo de Desempenho para Revistas
```
media_licoes = soma(desempenho_cada_licao) / total_licoes

Se media >= 100% E todas_perfeitas: LENDÁRIO
Se media >= 95%: ÉPICO
Se media >= 80%: RARO
Senão: COMUM
```

### 3.4 Estrutura do Card
- **Nome**: Nome do card (ex: "Martinho Lutero", "Missionário")
- **Descrição**: Texto descritivo
- **Imagem**: Arte do card (upload pelo admin)
- **Fonte**: "season" ou "event"
- **ID da Fonte**: ID da revista ou evento
- **Raridades Disponíveis**: Quais raridades podem ser conquistadas

### 3.5 Animações CSS por Raridade

#### Comum (Cinza)
```css
.card-common {
  background: linear-gradient(145deg, #4B5563, #6B7280);
  border: 2px solid #9CA3AF;
}
```

#### Raro (Azul)
```css
.card-rare {
  background: linear-gradient(145deg, #1E40AF, #3B82F6);
  border: 2px solid #60A5FA;
  animation: pulse-blue 2s infinite;
}

@keyframes pulse-blue {
  0%, 100% { box-shadow: 0 0 10px #3B82F6; }
  50% { box-shadow: 0 0 20px #3B82F6, 0 0 30px #60A5FA; }
}
```

#### Épico (Roxo)
```css
.card-epic {
  background: linear-gradient(145deg, #5B21B6, #8B5CF6);
  border: 2px solid #A78BFA;
  animation: shine-epic 3s infinite, glow-epic 2s infinite;
}

@keyframes shine-epic {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

@keyframes glow-epic {
  0%, 100% { box-shadow: 0 0 15px #8B5CF6, 0 0 30px #A78BFA; }
  50% { box-shadow: 0 0 25px #8B5CF6, 0 0 50px #A78BFA, 0 0 75px #C4B5FD; }
}
```

#### Lendário (Dourado)
```css
.card-legendary {
  background: linear-gradient(
    135deg,
    #F59E0B 0%,
    #FBBF24 25%,
    #F59E0B 50%,
    #D97706 75%,
    #F59E0B 100%
  );
  background-size: 200% 200%;
  border: 3px solid #FCD34D;
  animation: 
    holographic 4s ease infinite,
    glow-legendary 2s infinite,
    sparkle 1.5s infinite;
}

@keyframes holographic {
  0%, 100% { 
    background-position: 0% 50%;
    filter: hue-rotate(0deg);
  }
  50% { 
    background-position: 100% 50%;
    filter: hue-rotate(15deg);
  }
}

@keyframes glow-legendary {
  0%, 100% { 
    box-shadow: 
      0 0 20px #F59E0B,
      0 0 40px #FBBF24,
      0 0 60px #FCD34D;
  }
  50% { 
    box-shadow: 
      0 0 30px #F59E0B,
      0 0 60px #FBBF24,
      0 0 90px #FCD34D,
      0 0 120px #FEF3C7;
  }
}
```

---

## 4. SCHEMA DO BANCO DE DADOS

### 4.1 Tabela: studyEvents
```typescript
export const studyEvents = pgTable("study_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  theme: text("theme").notNull(),
  imageUrl: text("image_url"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("draft"),
  cardId: integer("card_id").references(() => collectibleCards.id),
  lessonsCount: integer("lessons_count").default(7),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### 4.2 Tabela: studyEventLessons
```typescript
export const studyEventLessons = pgTable("study_event_lessons", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => studyEvents.id),
  dayNumber: integer("day_number").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  verseReference: text("verse_reference"),
  verseText: text("verse_text"),
  questions: jsonb("questions").notNull().default([]),
  xpReward: integer("xp_reward").default(50),
  status: text("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 4.3 Tabela: userEventProgress
```typescript
export const userEventProgress = pgTable("user_event_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  eventId: integer("event_id").notNull().references(() => studyEvents.id),
  lessonId: integer("lesson_id").notNull().references(() => studyEventLessons.id),
  completed: boolean("completed").default(false),
  score: integer("score").default(0),
  totalQuestions: integer("total_questions").default(0),
  correctAnswers: integer("correct_answers").default(0),
  usedHints: boolean("used_hints").default(false),
  xpEarned: integer("xp_earned").default(0),
  completedAt: timestamp("completed_at"),
});
```

### 4.4 Tabela: collectibleCards
```typescript
export const collectibleCards = pgTable("collectible_cards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  sourceType: text("source_type").notNull(),
  sourceId: integer("source_id").notNull(),
  availableRarities: text("available_rarities").array().default(["common", "rare", "epic", "legendary"]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 4.5 Tabela: userCards
```typescript
export const userCards = pgTable("user_cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  cardId: integer("card_id").notNull().references(() => collectibleCards.id),
  rarity: text("rarity").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: integer("source_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});
```

### 4.6 Índices
```typescript
// Índices para performance
userEventProgressUserIdx on userEventProgress(userId)
userEventProgressEventIdx on userEventProgress(eventId)
userCardsUserIdx on userCards(userId)
collectibleCardsSourceIdx on collectibleCards(sourceType, sourceId)
```

---

## 5. ROTAS DA API

### 5.1 Rotas Públicas (Membros Autenticados)

#### Eventos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/study/events` | Lista eventos ativos e futuros |
| GET | `/api/study/events/:id` | Detalhes de um evento |
| GET | `/api/study/events/:id/lessons` | Lições do evento |
| GET | `/api/study/events/:id/lessons/:day` | Conteúdo de uma lição |
| POST | `/api/study/events/:id/lessons/:day/start` | Iniciar lição |
| POST | `/api/study/events/:id/lessons/:day/complete` | Completar lição com respostas |
| GET | `/api/study/events/:id/progress` | Meu progresso no evento |

#### Cards
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/study/my-cards` | Meus cards colecionados |
| GET | `/api/study/cards/:id` | Detalhes de um card |
| GET | `/api/study/cards/:id/share-image` | Gerar imagem PNG do card |

### 5.2 Rotas Admin

#### Eventos Admin
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/study/admin/events` | Listar todos os eventos |
| GET | `/api/study/admin/events/:id` | Detalhes do evento |
| POST | `/api/study/admin/events` | Criar evento |
| PATCH | `/api/study/admin/events/:id` | Atualizar evento |
| DELETE | `/api/study/admin/events/:id` | Excluir evento |
| POST | `/api/study/admin/events/:id/generate-lessons` | Gerar lições com IA |
| PATCH | `/api/study/admin/events/:id/publish` | Publicar evento |
| GET | `/api/study/admin/events/:id/participants` | Participantes do evento |

#### Cards Admin
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/study/admin/cards` | Listar todos os cards |
| POST | `/api/study/admin/cards` | Criar card |
| PATCH | `/api/study/admin/cards/:id` | Atualizar card |
| DELETE | `/api/study/admin/cards/:id` | Excluir card |
| POST | `/api/study/admin/cards/:id/upload-image` | Upload de imagem |

#### Estatísticas Admin
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/study/admin/events/stats` | Estatísticas gerais de eventos |
| GET | `/api/study/admin/cards/stats` | Estatísticas de cards distribuídos |

---

## 6. INTERFACE DO USUÁRIO (MEMBRO)

### 6.1 Nova Aba: "Eventos"
Localização: Menu lateral do DeoGlory, abaixo de "Revistas"

#### 6.1.1 Página de Lista de Eventos
```
┌─────────────────────────────────────────────────────────┐
│  EVENTOS ESPECIAIS                                       │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ [Banner Evento]  │  │ [Banner Evento]  │            │
│  │                  │  │                  │            │
│  │ Semana da        │  │ Semana de        │            │
│  │ Reforma          │  │ Missões          │            │
│  │                  │  │                  │            │
│  │ ⏰ 5 dias        │  │ 🔒 Em breve      │            │
│  │ restantes        │  │ Início: 15/Nov   │            │
│  │                  │  │                  │            │
│  │ [Participar]     │  │ [Ver detalhes]   │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                         │
│  EVENTOS CONCLUÍDOS                                     │
│  ┌──────────────────┐                                   │
│  │ Semana do Jovem  │  Card: ✓ Conquistado (Épico)     │
│  └──────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

#### 6.1.2 Página do Evento
```
┌─────────────────────────────────────────────────────────┐
│  ← Voltar                                               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              [BANNER DO EVENTO]                  │   │
│  │         SEMANA DA REFORMA PROTESTANTE            │   │
│  │              23 - 31 de Outubro                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Descrição do evento...                                 │
│                                                         │
│  ┌─ RECOMPENSA ─────────────────────────────────────┐  │
│  │  [Preview do Card]  Complete todas as lições     │  │
│  │  Martinho Lutero    para ganhar este card!       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  LIÇÕES                        Progresso: 3/7          │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░ 43%                               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✓ Dia 1: As 95 Teses              +50 XP        │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ ✓ Dia 2: Sola Scriptura           +50 XP        │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ ✓ Dia 3: Sola Fide                +50 XP        │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ ○ Dia 4: Sola Gratia              [Iniciar]     │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 🔒 Dia 5: Solus Christus          Bloqueado     │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 🔒 Dia 6: Soli Deo Gloria         Bloqueado     │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 🔒 Dia 7: O Legado da Reforma     Bloqueado     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### 6.1.3 Página da Lição do Evento
Mesma estrutura das lições normais:
- Conteúdo em texto/markdown
- Versículo destacado
- Quiz com perguntas
- Feedback de acertos/erros
- XP ganho ao final

### 6.2 Nova Aba: "Coleção" (ou "Meus Cards")
Localização: Menu lateral do DeoGlory

```
┌─────────────────────────────────────────────────────────┐
│  MINHA COLEÇÃO                                          │
│                                                         │
│  Cards: 12    Comum: 5  Raro: 4  Épico: 2  Lend.: 1   │
│                                                         │
│  ┌─ FILTROS ────────────────────────────────────────┐  │
│  │ [Todos] [Comum] [Raro] [Épico] [Lendário]        │  │
│  │ [Eventos] [Revistas]                              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐       │
│  │ ✨✨✨  │  │ 💜     │  │ 💙     │  │ ⬜     │       │
│  │ [IMG]  │  │ [IMG]  │  │ [IMG]  │  │ [IMG]  │       │
│  │ Lutero │  │ Calvino│  │ Knox   │  │ Wesley │       │
│  │ LEND.  │  │ ÉPICO  │  │ RARO   │  │ COMUM  │       │
│  └────────┘  └────────┘  └────────┘  └────────┘       │
│                                                         │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐       │
│  │ 💙     │  │ 💙     │  │ ⬜     │  │ ⬜     │       │
│  │ [IMG]  │  │ [IMG]  │  │ [IMG]  │  │ [IMG]  │       │
│  │ Missio │  │ Jovem  │  │ Adven. │  │ Famíl. │       │
│  │ RARO   │  │ RARO   │  │ COMUM  │  │ COMUM  │       │
│  └────────┘  └────────┘  └────────┘  └────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Modal de Visualização do Card
```
┌─────────────────────────────────────────────────────────┐
│                         ✕ Fechar                        │
│                                                         │
│            ┌─────────────────────────┐                 │
│            │  ✨ ══════════════ ✨   │                 │
│            │  ║                    ║   │                 │
│            │  ║   [IMAGEM CARD]    ║   │                 │
│            │  ║                    ║   │                 │
│            │  ║  MARTINHO LUTERO   ║   │                 │
│            │  ║                    ║   │                 │
│            │  ║   ★ LENDÁRIO ★     ║   │                 │
│            │  ✨ ══════════════ ✨   │                 │
│            └─────────────────────────┘                 │
│                                                         │
│  Reformador alemão que iniciou a                        │
│  Reforma Protestante em 1517.                           │
│                                                         │
│  Conquistado em: 31/10/2024                             │
│  Evento: Semana da Reforma Protestante                  │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ 📤 Compartilhar nas Redes Sociais              │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.4 Integração no Perfil do Usuário
Adicionar seção "Meus Cards" no perfil:
```
┌─ CARDS CONQUISTADOS ────────────────────────────────────┐
│  Lendários: 1  │  Épicos: 2  │  Raros: 4  │  Comuns: 5 │
│                                                         │
│  [Ver coleção completa →]                               │
│                                                         │
│  Destaques:                                             │
│  ┌────────┐  ┌────────┐  ┌────────┐                    │
│  │ ✨LEND │  │ 💜ÉPIC │  │ 💜ÉPIC │                    │
│  └────────┘  └────────┘  └────────┘                    │
└─────────────────────────────────────────────────────────┘
```

---

## 7. INTERFACE DO ADMINISTRADOR

### 7.1 Nova Página: Eventos (`/admin/study/eventos`)

#### 7.1.1 Lista de Eventos
```
┌─────────────────────────────────────────────────────────┐
│  GERENCIAR EVENTOS                    [+ Novo Evento]   │
│                                                         │
│  ┌─ FILTROS ────────────────────────────────────────┐  │
│  │ Status: [Todos ▼]  Período: [Este ano ▼]         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Evento              │ Período      │ Status │ Ações│ │
│  ├───────────────────────────────────────────────────┤ │
│  │ Semana da Reforma   │ 23-31 Out    │ ✓ Ativo│ ⚙ 🗑 │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ Semana de Missões   │ 10-17 Nov    │ ⏳ Agen│ ⚙ 🗑 │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ Semana do Jovem     │ 15-22 Jul    │ ✓ Conc │ ⚙    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 7.1.2 Criar/Editar Evento
```
┌─────────────────────────────────────────────────────────┐
│  CRIAR NOVO EVENTO                                      │
│                                                         │
│  Título *                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Semana da Reforma Protestante                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Descrição                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Nesta semana especial, vamos estudar sobre a    │   │
│  │ Reforma Protestante e seus princípios...        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Tema/Palavra-chave para IA *                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ reforma protestante, 5 solas, lutero, calvino   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Imagem de Capa                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Arrastar imagem ou clicar para upload]         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Data de Início *          Data de Fim *                │
│  ┌───────────────────┐    ┌───────────────────┐        │
│  │ 23/10/2025        │    │ 31/10/2025        │        │
│  └───────────────────┘    └───────────────────┘        │
│                                                         │
│  Número de Lições *                                     │
│  ┌───────────────────┐                                  │
│  │ 7                 │                                  │
│  └───────────────────┘                                  │
│                                                         │
│  Card de Recompensa                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Selecionar card existente ▼]                   │   │
│  │ ou [+ Criar novo card]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌────────────────┐  ┌────────────────────────────┐    │
│  │ Salvar Rascunho│  │ Gerar Lições com IA 🤖     │    │
│  └────────────────┘  └────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 7.1.3 Gerenciar Lições do Evento
```
┌─────────────────────────────────────────────────────────┐
│  LIÇÕES: Semana da Reforma Protestante                  │
│                                                         │
│  Status: Rascunho          [Gerar com IA] [Publicar]   │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Dia │ Título            │ Perguntas │ Status │ Ação│ │
│  ├───────────────────────────────────────────────────┤ │
│  │  1  │ As 95 Teses       │ 8         │ ✓ Pronto│ ✏  │ │
│  ├───────────────────────────────────────────────────┤ │
│  │  2  │ Sola Scriptura    │ 10        │ ✓ Pronto│ ✏  │ │
│  ├───────────────────────────────────────────────────┤ │
│  │  3  │ Sola Fide         │ 8         │ ✓ Pronto│ ✏  │ │
│  ├───────────────────────────────────────────────────┤ │
│  │  4  │ Sola Gratia       │ 7         │ ⏳ Gerar│ ✏  │ │
│  ├───────────────────────────────────────────────────┤ │
│  │  5  │ Solus Christus    │ -         │ ⏳ Gerar│ ✏  │ │
│  ├───────────────────────────────────────────────────┤ │
│  │  6  │ Soli Deo Gloria   │ -         │ ⏳ Gerar│ ✏  │ │
│  ├───────────────────────────────────────────────────┤ │
│  │  7  │ O Legado          │ -         │ ⏳ Gerar│ ✏  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Nova Página: Cards (`/admin/study/cards`)

```
┌─────────────────────────────────────────────────────────┐
│  GERENCIAR CARDS COLECIONÁVEIS            [+ Novo Card] │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Card              │ Fonte      │ Distribuídos│ Ação│ │
│  ├───────────────────────────────────────────────────┤ │
│  │ [img] M. Lutero   │ Evento: Ref│ 45 (3 lend.)│ ⚙ 🗑 │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ [img] Missionário │ Evento: Mis│ 32 (1 lend.)│ ⚙ 🗑 │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ [img] Rev. Q1     │ Revista: 1 │ 28 (5 lend.)│ ⚙ 🗑 │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.3 Atualizações no Dashboard

Adicionar seção de estatísticas:
```
┌─ EVENTOS E CARDS ───────────────────────────────────────┐
│                                                         │
│  Eventos           Cards Distribuídos                   │
│  ┌─────────────┐   ┌─────────────────────────────────┐ │
│  │ Ativos: 1   │   │ Total: 156                      │ │
│  │ Agendados: 2│   │ ●●● Comuns: 78 (50%)            │ │
│  │ Concluídos: │   │ ●●  Raros: 52 (33%)             │ │
│  │    5        │   │ ●   Épicos: 20 (13%)            │ │
│  └─────────────┘   │ ★   Lendários: 6 (4%)           │ │
│                     └─────────────────────────────────┘ │
│                                                         │
│  Evento Ativo Agora                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Semana da Reforma - 45 participantes            │   │
│  │ ▓▓▓▓▓▓▓▓░░░░ 67% concluíram                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.4 Atualizações em Relatórios

Nova aba ou seção: "Eventos e Cards"
- Gráfico de participação por evento
- Taxa de conclusão por evento
- Distribuição de raridades
- Usuários com mais cards lendários

---

## 8. GERAÇÃO DE CONTEÚDO POR IA

### 8.1 Prompt para Gerar Lições de Evento

```
Você é um pastor e professor de teologia reformada.
Gere uma lição para o evento "${eventTitle}" sobre o tema "${theme}".

Esta é a lição ${dayNumber} de ${totalLessons}.
Subtema sugerido: ${suggestedSubtopic}

Formato da resposta (JSON):
{
  "title": "Título da lição",
  "verseReference": "Referência bíblica (ex: Romanos 1:17)",
  "verseText": "Texto do versículo",
  "content": "Conteúdo da lição em markdown (500-800 palavras). 
              Inclua introdução, desenvolvimento e aplicação prática.",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Pergunta",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Explicação da resposta correta"
    },
    {
      "type": "true_false",
      "question": "Afirmação",
      "correctAnswer": true,
      "explanation": "Explicação"
    },
    {
      "type": "fill_blank",
      "question": "Complete: A fé vem pelo _____",
      "correctAnswer": "ouvir",
      "acceptedAnswers": ["ouvir", "ouvir a palavra"],
      "explanation": "Romanos 10:17"
    }
  ]
}

Regras:
- Gere 8-10 perguntas variadas
- Use linguagem acessível para jovens
- Fundamente tudo na Bíblia
- Inclua aplicações práticas
- Mantenha fidelidade à teologia reformada
```

### 8.2 Subtemas Sugeridos por Evento

#### Reforma Protestante (7 dias)
1. As 95 Teses e o início da Reforma
2. Sola Scriptura - Somente a Escritura
3. Sola Fide - Somente a Fé
4. Sola Gratia - Somente a Graça
5. Solus Christus - Somente Cristo
6. Soli Deo Gloria - Somente a Deus a Glória
7. O legado da Reforma para hoje

#### Semana de Missões (7 dias)
1. A Grande Comissão
2. O coração missionário de Deus
3. Paulo: o missionário modelo
4. Missões urbanas e transculturais
5. O papel de cada cristão em missões
6. Oração e sustento de missionários
7. Até os confins da terra

---

## 9. COMPARTILHAMENTO SOCIAL

### 9.1 Geração de Imagem do Card
Usar biblioteca `html2canvas` ou `canvas` para gerar PNG.

Dimensões: 1080x1350 (formato Instagram)

Layout da imagem:
```
┌─────────────────────────┐
│     LOGO UMP EMAÚS      │
│                         │
│   ┌─────────────────┐   │
│   │                 │   │
│   │   [CARD COM     │   │
│   │    ANIMAÇÃO     │   │
│   │    ESTÁTICA]    │   │
│   │                 │   │
│   │  MARTINHO LUTERO│   │
│   │   ★ LENDÁRIO ★  │   │
│   └─────────────────┘   │
│                         │
│   Conquistado por       │
│   @username             │
│                         │
│   #DeoGlory #UMPEmaus   │
└─────────────────────────┘
```

### 9.2 Opções de Compartilhamento
- Download da imagem (PNG)
- Compartilhar via Web Share API (mobile)
- Copiar link para perfil

---

## 10. FLUXO DE ATRIBUIÇÃO DE CARDS

### 10.1 Ao Completar Evento
```javascript
async function onEventCompleted(userId, eventId) {
  // 1. Calcular desempenho
  const progress = await getUserEventProgress(userId, eventId);
  const totalCorrect = progress.reduce((sum, p) => sum + p.correctAnswers, 0);
  const totalQuestions = progress.reduce((sum, p) => sum + p.totalQuestions, 0);
  const usedAnyHint = progress.some(p => p.usedHints);
  
  const performance = (totalCorrect / totalQuestions) * 100;
  
  // 2. Determinar raridade
  let rarity = 'common';
  if (performance >= 100 && !usedAnyHint) {
    rarity = 'legendary';
  } else if (performance >= 95) {
    rarity = 'epic';
  } else if (performance >= 80) {
    rarity = 'rare';
  }
  
  // 3. Buscar card do evento
  const card = await getCardBySource('event', eventId);
  
  // 4. Atribuir card ao usuário
  await assignCardToUser(userId, card.id, rarity, 'event', eventId);
  
  // 5. Notificar usuário
  await sendNotification(userId, {
    title: 'Novo Card Conquistado!',
    body: `Você ganhou o card "${card.name}" (${rarity})!`
  });
}
```

### 10.2 Ao Completar Revista/Temporada
Mesma lógica, mas calculando média de todas as lições da revista.

---

## 11. ORDEM DE IMPLEMENTAÇÃO

### Fase 1: Fundação (Prioridade Alta)
1. Criar schema das novas tabelas
2. Implementar métodos de storage
3. Criar rotas básicas de CRUD

### Fase 2: Admin - Eventos
4. Página de lista de eventos
5. Formulário criar/editar evento
6. Integração com IA para gerar lições
7. Gerenciamento de lições do evento

### Fase 3: Admin - Cards
8. Página de lista de cards
9. Formulário criar/editar card
10. Upload de imagens

### Fase 4: Membro - Eventos
11. Página de lista de eventos
12. Página de detalhes do evento
13. Página de lição do evento
14. Sistema de progresso

### Fase 5: Membro - Cards
15. Página "Minha Coleção"
16. Modal de visualização do card
17. Animações CSS por raridade
18. Integração no perfil

### Fase 6: Compartilhamento
19. Geração de imagem do card
20. Botões de compartilhamento

### Fase 7: Dashboard e Relatórios
21. Estatísticas de eventos no dashboard
22. Estatísticas de cards no dashboard
23. Relatórios detalhados

### Fase 8: Cards para Revistas
24. Vincular cards às revistas existentes
25. Atribuição automática ao completar revista

---

## 12. CONSIDERAÇÕES TÉCNICAS

### 12.1 Performance
- Usar cache para cards populares
- Lazy loading de imagens
- Paginação na coleção

### 12.2 Armazenamento de Imagens
- Upload para pasta `uploads/cards/`
- Redimensionar para tamanhos padronizados
- Considerar CDN para produção

### 12.3 Animações
- Usar CSS puro quando possível
- Canvas apenas para partículas complexas
- Respeitar `prefers-reduced-motion`

### 12.4 SEO Social
- Open Graph tags para cards compartilhados
- Meta imagem dinâmica por card

---

## 13. MÉTRICAS DE SUCESSO

- **Participação**: % de membros que participam de eventos
- **Conclusão**: % de membros que completam eventos
- **Engajamento**: Tempo médio nas lições de eventos
- **Coleção**: Média de cards por usuário
- **Compartilhamento**: Quantos cards são compartilhados

---

*Documento criado em 25/12/2024*
*Próximos passos: Aprovação do planejamento e início da Fase 1*
