# Roadmap Completo - Site UMP Emaus + Emaus Vota + DeoGlory

## Informacoes do Documento
**Data de Criacao:** 04/12/2025
**Versao:** 1.0
**Status:** DOCUMENTO DE REFERENCIA

---

## 1. RESUMO DO SISTEMA ATUAL

### 1.1 O Que Esta 100% Funcionando

#### Sistema de Eleicoes (Emaus Vota)
- [x] Autenticacao por email com codigo de 6 digitos
- [x] Login com senha (apos primeiro acesso)
- [x] Sistema de 3 escrutinios para votacao
- [x] Maioria absoluta (1o e 2o escrutinio)
- [x] Maioria simples (3o escrutinio)
- [x] Resolucao de empate pelo presidente
- [x] Controle de presenca por cargo
- [x] Resultados em tempo real
- [x] Geracao de PDF para auditoria
- [x] Exportacao de imagens dos resultados
- [x] Sistema de aniversarios automatico
- [x] Historico de eleicoes

#### Sistema de Estudos (DeoGlory)
- [x] Mapa de licoes estilo Duolingo
- [x] 3 estagios por licao (Estude, Medite, Responda)
- [x] Sistema de XP (pontos de experiencia)
- [x] Sistema de niveis
- [x] Sistema de coracoes (5 vidas maximo)
- [x] Recuperacao de vidas por tempo (6h)
- [x] Recuperacao de vidas por leitura de versiculos
- [x] Sistema de streak (dias consecutivos)
- [x] Feedback visual (correto/incorreto)
- [x] Animacoes com Framer Motion
- [x] Bottom navigation (4 abas)
- [x] Ranking semanal/mensal/geral
- [x] Missoes diarias (4-5 por dia)
- [x] 35+ conquistas pre-definidas
- [x] PWA configurado
- [x] Sons de feedback

#### Tipos de Exercicios Implementados
- [x] `text` - Conteudo informativo
- [x] `multiple_choice` - Multipla escolha
- [x] `true_false` - Verdadeiro ou Falso
- [x] `fill_blank` - Preencher lacuna
- [x] `verse` - Versiculo para leitura
- [x] `meditation` - Meditacao guiada
- [x] `reflection` - Reflexao escrita

#### Integracao com IA
- [x] OpenAI API configurada
- [x] Google Gemini API configurada
- [x] Extracao de conteudo de PDFs
- [x] Geracao de exercicios
- [x] Geracao de reflexoes
- [x] Resumo de conteudo
- [x] Conteudo diario (versiculo, fato, personagem)

---

## 2. SITE INSTITUCIONAL - O QUE FALTA FAZER

### 2.1 Banco de Dados (Prioridade: ALTA)

#### Alteracoes em Tabelas Existentes
- [ ] Adicionar campo `secretaria` na tabela `users`
  - Valores: `null`, `espiritualidade`, `marketing`, `acao_social`, `comunicacao`, `eventos`

#### Novas Tabelas a Criar
- [ ] Tabela `devotionals` - Devocionais publicados
- [ ] Tabela `devotional_comments` - **NOVO** Comentarios nos devocionais
- [ ] Tabela `events` - Eventos/Agenda
- [ ] Tabela `event_registrations` - **NOVO** Inscricoes em eventos
- [ ] Tabela `event_attendance` - **NOVO** Confirmacao de presenca
- [ ] Tabela `prayer_requests` - Pedidos de oracao
- [ ] Tabela `banners` - Banners do carrossel
- [ ] Tabela `board_members` - Membros da diretoria
- [ ] Tabela `site_content` - Conteudo estatico
- [ ] Tabela `instagram_posts` - Cache do Instagram

---

### 2.2 Esquema Detalhado das Novas Tabelas

#### Tabela `devotional_comments` (NOVA)
```typescript
export const devotionalComments = pgTable("devotional_comments", {
  id: serial("id").primaryKey(),
  devotionalId: integer("devotional_id").notNull().references(() => devotionals.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id), // null = comentario publico
  authorName: text("author_name").notNull(), // Nome do autor (obrigatorio)
  content: text("content").notNull(), // Texto do comentario
  isPublic: boolean("is_public").notNull().default(true), // Comentario publico ou de membro
  isApproved: boolean("is_approved").notNull().default(false), // Precisa aprovacao?
  parentId: integer("parent_id").references(() => devotionalComments.id), // Para respostas
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

#### Tabela `event_registrations` (NOVA)
```typescript
export const eventRegistrations = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id), // null = inscricao externa
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  additionalInfo: jsonb("additional_info"), // Campos extras definidos pelo evento
  status: text("status").notNull().default("pending"), // pending, confirmed, cancelled, attended
  paymentStatus: text("payment_status").default("not_required"), // not_required, pending, paid, refunded
  paymentAmount: text("payment_amount"),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  cancelledAt: timestamp("cancelled_at"),
});
```

#### Tabela `event_attendance` (NOVA)
```typescript
export const eventAttendance = pgTable("event_attendance", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  confirmedAt: timestamp("confirmed_at").notNull().defaultNow(),
  checkedInAt: timestamp("checked_in_at"), // Quando fez check-in no evento
  source: text("source").notNull().default("website"), // website, admin, qrcode
});
```

#### Alteracoes na Tabela `events`
```typescript
// Adicionar campos:
requiresRegistration: boolean("requires_registration").notNull().default(false),
registrationDeadline: timestamp("registration_deadline"),
maxAttendees: integer("max_attendees"),
registrationFields: jsonb("registration_fields"), // Campos personalizados do formulario
allowPresenceConfirmation: boolean("allow_presence_confirmation").notNull().default(true),
```

---

### 2.3 Backend (API) - Endpoints a Criar

#### Middleware
- [ ] Criar middleware `checkSecretaria()`
- [ ] Atualizar middleware `requireAuth` para incluir secretaria

#### Rotas Publicas - Devocionais
- [ ] GET /api/devotionals (lista publica)
- [ ] GET /api/devotionals/featured (destaque do dia)
- [ ] GET /api/devotionals/:id (devocional individual)
- [ ] GET /api/devotionals/:id/comments (listar comentarios)
- [ ] POST /api/devotionals/:id/comments (adicionar comentario publico)

#### Rotas Publicas - Eventos
- [ ] GET /api/events (lista de eventos)
- [ ] GET /api/events/upcoming (proximos eventos)
- [ ] GET /api/events/:id (evento individual)
- [ ] POST /api/events/:id/confirm-presence (confirmar presenca)
- [ ] POST /api/events/:id/register (inscricao em evento)
- [ ] GET /api/events/:id/registration-status (verificar inscricao)

#### Rotas Publicas - Outros
- [ ] POST /api/prayer-requests (enviar pedido)
- [ ] GET /api/banners (banners ativos)
- [ ] GET /api/board (diretoria atual)
- [ ] GET /api/content/:page (conteudo da pagina)
- [ ] GET /api/instagram/feed (feed do Instagram)

#### Rotas Autenticadas - Comentarios
- [ ] POST /api/devotionals/:id/comments (comentario de membro logado)
- [ ] PUT /api/devotionals/comments/:commentId (editar comentario)
- [ ] DELETE /api/devotionals/comments/:commentId (excluir comentario)
- [ ] POST /api/devotionals/comments/:commentId/like (curtir comentario)

#### Rotas Admin - Devocionais (Espiritualidade)
- [ ] GET /api/admin/devotionals
- [ ] POST /api/admin/devotionals
- [ ] PUT /api/admin/devotionals/:id
- [ ] DELETE /api/admin/devotionals/:id
- [ ] PATCH /api/admin/devotionals/:id/feature
- [ ] GET /api/admin/devotionals/:id/comments
- [ ] PATCH /api/admin/devotionals/comments/:id/approve
- [ ] DELETE /api/admin/devotionals/comments/:id

#### Rotas Admin - Eventos (Marketing) - **EXPANDIDO**
- [ ] GET /api/admin/events
- [ ] POST /api/admin/events
- [ ] PUT /api/admin/events/:id
- [ ] DELETE /api/admin/events/:id
- [ ] GET /api/admin/events/:id/registrations (listar inscricoes)
- [ ] PATCH /api/admin/events/:id/registrations/:regId (atualizar inscricao)
- [ ] DELETE /api/admin/events/:id/registrations/:regId (cancelar inscricao)
- [ ] POST /api/admin/events/:id/registrations/export (exportar lista)
- [ ] GET /api/admin/events/:id/attendance (listar presencas confirmadas)
- [ ] POST /api/admin/events/:id/attendance/checkin (fazer check-in manual)
- [ ] GET /api/admin/events/:id/stats (estatisticas do evento)

#### Rotas Admin - Pedidos de Oracao (Espiritualidade)
- [ ] GET /api/admin/prayer-requests
- [ ] PATCH /api/admin/prayer-requests/:id/status
- [ ] DELETE /api/admin/prayer-requests/:id

#### Rotas Admin - Banners (Marketing)
- [ ] GET /api/admin/banners
- [ ] POST /api/admin/banners
- [ ] PUT /api/admin/banners/:id
- [ ] DELETE /api/admin/banners/:id
- [ ] PATCH /api/admin/banners/reorder

#### Rotas Admin - Diretoria (Admin)
- [ ] GET /api/admin/board
- [ ] POST /api/admin/board
- [ ] PUT /api/admin/board/:id
- [ ] DELETE /api/admin/board/:id

#### Rotas Admin - Conteudo (Admin/Marketing)
- [ ] GET /api/admin/content
- [ ] PUT /api/admin/content/:page/:section

---

### 2.4 Frontend - Componentes Base

#### Layout
- [ ] Criar componente Header (mobile e desktop)
- [ ] Criar componente Footer
- [ ] Criar componente MobileDrawer (menu lateral)
- [ ] Criar componente PageLayout (wrapper de pagina)

#### UI Componentes
- [ ] Criar componente HeroBanner (carrossel animado)
- [ ] Criar componente BannerSlide
- [ ] Criar componente EventCard
- [ ] Criar componente DevotionalCard
- [ ] Criar componente BoardMemberCard
- [ ] Criar componente SectionHeader
- [ ] Criar componente InstagramFeed
- [ ] Criar componente QuickAccessCard
- [ ] Criar componente CommentSection (comentarios)
- [ ] Criar componente CommentCard
- [ ] Criar componente CommentForm
- [ ] Criar componente EventRegistrationForm
- [ ] Criar componente PresenceConfirmationButton
- [ ] Criar componente RegistrationButton

#### Formularios
- [ ] Criar componente PrayerRequestForm
- [ ] Criar componente DevotionalForm (admin)
- [ ] Criar componente EventForm (admin)
- [ ] Criar componente BannerForm (admin)
- [ ] Criar componente BoardMemberForm (admin)

---

### 2.5 Frontend - Paginas Publicas

#### Home Page
- [ ] Criar pagina Home (/)
- [ ] Implementar HeroBanner com slides
- [ ] Implementar secao Devocional do Dia
- [ ] Implementar secao Proximos Eventos
- [ ] Implementar secao Instagram Feed
- [ ] Implementar secao Acesso Rapido (links para Emaus Vota e DeoGlory)
- [ ] Adicionar animacoes Framer Motion

#### Devocionais
- [ ] Criar pagina lista de devocionais (/devocionais)
- [ ] Criar pagina devocional individual (/devocionais/:id)
- [ ] Implementar busca e filtros
- [ ] Implementar compartilhamento
- [ ] **NOVO** Implementar secao de comentarios
- [ ] **NOVO** Formulario de comentario publico (nome + texto)
- [ ] **NOVO** Formulario de comentario para logados (apenas texto)
- [ ] **NOVO** Exibir badge "Membro" para comentarios de usuarios logados
- [ ] **NOVO** Opcao de responder comentarios
- [ ] **NOVO** Botao de curtir comentario

#### Agenda/Eventos
- [ ] Criar pagina lista de eventos (/agenda)
- [ ] Criar pagina evento individual (/agenda/:id)
- [ ] Implementar visualizacao calendario
- [ ] Implementar filtros por categoria
- [ ] **NOVO** Botao "Confirmar Presenca" para eventos que permitem
- [ ] **NOVO** Botao "Fazer Inscricao" para eventos que requerem
- [ ] **NOVO** Formulario de inscricao dinamico (campos definidos pelo marketing)
- [ ] **NOVO** Exibir contador de vagas restantes
- [ ] **NOVO** Exibir data limite de inscricao

#### Quem Somos
- [ ] Criar pagina quem somos (/quem-somos)
- [ ] Implementar secao Historia
- [ ] Implementar secao Missao/Visao/Valores
- [ ] Implementar secao Localizacao (mapa)

#### Diretoria
- [ ] Criar pagina diretoria (/diretoria)
- [ ] Implementar grid de membros
- [ ] Implementar animacoes de entrada

#### Pedido de Oracao
- [ ] Criar pagina formulario (/oracao)
- [ ] Implementar formulario com validacao
- [ ] Implementar feedback de sucesso

#### Area do Membro
- [ ] Criar pagina escolha de sistema (/membro)
- [ ] Implementar cards de selecao
- [ ] **IMPORTANTE** Link direto para Emaus Vota (/vote)
- [ ] **IMPORTANTE** Link direto para DeoGlory (/study)
- [ ] Integrar com login existente

---

### 2.6 Frontend - Paineis Admin

#### Painel Geral
- [ ] Atualizar sidebar do admin com novas opcoes
- [ ] Implementar verificacao de secretaria no menu
- [ ] Criar dashboard com estatisticas

#### Painel Devocionais (Espiritualidade)
- [ ] Criar pagina listagem devocionais
- [ ] Criar pagina criar/editar devocional
- [ ] Implementar editor de texto rico
- [ ] Implementar definir destaque
- [ ] **NOVO** Aba de gerenciamento de comentarios
- [ ] **NOVO** Aprovar/Rejeitar comentarios pendentes
- [ ] **NOVO** Excluir comentarios inapropriados

#### Painel Eventos (Marketing) - **EXPANDIDO**
- [ ] Criar pagina listagem eventos
- [ ] Criar pagina criar/editar evento
- [ ] Implementar upload de imagem
- [ ] Implementar seletor de data/hora
- [ ] **NOVO** Toggle "Requer Inscricao"
- [ ] **NOVO** Configurador de campos do formulario de inscricao
- [ ] **NOVO** Definir limite de vagas
- [ ] **NOVO** Definir data limite de inscricao
- [ ] **NOVO** Toggle "Permitir Confirmacao de Presenca"
- [ ] **NOVO** Aba de visualizacao de inscricoes
- [ ] **NOVO** Tabela com filtros (status, pagamento)
- [ ] **NOVO** Acao de aprovar/cancelar inscricoes
- [ ] **NOVO** Exportar lista de inscritos (PDF/Excel)
- [ ] **NOVO** Aba de confirmacoes de presenca
- [ ] **NOVO** Check-in manual no dia do evento
- [ ] **NOVO** Estatisticas do evento (inscritos, confirmados, presentes)

#### Painel Pedidos de Oracao (Espiritualidade)
- [ ] Criar pagina listagem pedidos
- [ ] Implementar filtros por status/categoria
- [ ] Implementar atualizar status
- [ ] Implementar estatisticas

#### Painel Banners (Marketing)
- [ ] Criar pagina listagem banners
- [ ] Criar pagina criar/editar banner
- [ ] Implementar reordenacao drag-and-drop
- [ ] Implementar preview

#### Painel Diretoria (Admin)
- [ ] Criar pagina listagem diretoria
- [ ] Criar pagina criar/editar membro
- [ ] Implementar upload de foto

#### Painel Membros (Admin)
- [ ] Atualizar formulario com campo secretaria
- [ ] Implementar filtro por secretaria

---

## 3. INTEGRACAO COM EMAUS VOTA E DEOGLORY

### 3.1 Pontos de Integracao

#### Na Home Page
- [ ] Card de acesso rapido para Emaus Vota
- [ ] Card de acesso rapido para DeoGlory
- [ ] Exibir streak atual do usuario (se logado)
- [ ] Exibir proxima eleicao ativa (se houver)

#### Na Area do Membro
- [ ] Exibir estatisticas resumidas do DeoGlory (XP, nivel, streak)
- [ ] Exibir status de votacao na eleicao atual
- [ ] Cards visuais para acessar cada sistema
- [ ] Manter sessao unificada (mesmo JWT)

#### No Header
- [ ] Exibir notificacoes unificadas (estudos, eleicoes, eventos)
- [ ] Exibir avatar do usuario
- [ ] Menu dropdown com opcoes de cada sistema

### 3.2 Navegacao Unificada

```
/ (Home - Site Institucional)
├── /quem-somos
├── /diretoria
├── /devocionais
│   └── /devocionais/:id
├── /agenda
│   └── /agenda/:id
├── /oracao
├── /membro (Area do Membro - Hub Central)
│   ├── Acesso a Emaus Vota
│   └── Acesso a DeoGlory
├── /vote/* (Emaus Vota - Sistema Existente)
├── /study/* (DeoGlory - Sistema Existente)
├── /login (Login Unificado)
└── /admin/* (Paineis Admin)
```

---

## 4. FUNCIONALIDADES DETALHADAS

### 4.1 Sistema de Comentarios nos Devocionais

#### Regras de Negocio
1. **Comentarios Publicos**
   - Qualquer pessoa pode comentar
   - Requer: Nome + Texto do comentario
   - Comentarios ficam pendentes ate aprovacao (opcional)
   - Limite de caracteres: 500

2. **Comentarios de Membros Logados**
   - Apenas texto (nome vem do perfil)
   - Badge "Membro UMP" exibido
   - Podem ser aprovados automaticamente
   - Podem editar/excluir proprios comentarios

3. **Moderacao (Secretaria Espiritualidade)**
   - Aprovar/Rejeitar comentarios pendentes
   - Excluir comentarios inapropriados
   - Ver todos os comentarios (aprovados e pendentes)

#### UI/UX dos Comentarios
```
┌─────────────────────────────────────────────────────────────────┐
│  💬 Comentarios (12)                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Avatar] Maria Silva  [Badge: Membro UMP]     2h atras  │   │
│  │                                                         │   │
│  │ Que devocional maravilhoso! Me fez refletir muito       │   │
│  │ sobre a graca de Deus em minha vida.                    │   │
│  │                                                         │   │
│  │ [❤️ 5]  [Responder]                                     │   │
│  │                                                         │   │
│  │   └── [Avatar] Joao Pedro            1h atras          │   │
│  │       Concordo plenamente, Maria!                       │   │
│  │       [❤️ 2]  [Responder]                               │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Avatar] Visitante                            5h atras  │   │
│  │                                                         │   │
│  │ Texto do comentario publico aqui...                     │   │
│  │                                                         │   │
│  │ [❤️ 3]  [Responder]                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────                     │
│                                                                 │
│  Deixe seu comentario:                                          │
│                                                                 │
│  [Se nao logado:]                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Seu nome: [________________]                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Escreva seu comentario...                               │   │
│  │                                                         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Enviar Comentario]                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.2 Sistema de Presenca e Inscricao em Eventos

#### Tipos de Eventos

1. **Evento Simples (Sem Inscricao)**
   - Apenas exibe informacoes
   - Botao "Confirmar Presenca" (opcional)
   - Exemplo: Culto Jovem, Reuniao

2. **Evento com Inscricao Obrigatoria**
   - Requer preenchimento de formulario
   - Pode ter limite de vagas
   - Pode ter data limite de inscricao
   - Exemplo: Retiro, Congresso, Workshop

3. **Evento Pago**
   - Inscricao + Pagamento
   - Status de pagamento rastreado
   - Exemplo: Acampamento com taxa

#### Fluxo de Inscricao

```
Usuario acessa pagina do evento
        │
        ▼
┌───────────────────────┐
│ Evento requer         │
│ inscricao?            │
└───────────────────────┘
    │           │
   Nao         Sim
    │           │
    ▼           ▼
[Botao:      ┌─────────────────────┐
 Confirmar   │ Vagas disponiveis?  │
 Presenca]   └─────────────────────┘
                │           │
               Sim         Nao
                │           │
                ▼           ▼
         [Botao:      [Mensagem:
          Fazer        Inscricoes
          Inscricao]   Encerradas]
                │
                ▼
        ┌─────────────────────┐
        │ Formulario de       │
        │ Inscricao           │
        │ (campos dinamicos)  │
        └─────────────────────┘
                │
                ▼
        ┌─────────────────────┐
        │ Confirmacao por     │
        │ email (opcional)    │
        └─────────────────────┘
                │
                ▼
        [Tela de Sucesso]
```

#### UI do Card de Evento

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Imagem do Evento]                                      │   │
│  │                                                         │   │
│  │  ┌─────┐                                                │   │
│  │  │ DEZ │  Retiro Anual UMP 2025                        │   │
│  │  │ 20  │                                                │   │
│  │  └─────┘  📍 Sitio Recanto da Paz                      │   │
│  │           ⏰ 08:00 - 22:00                              │   │
│  │           💰 R$ 150,00                                  │   │
│  │                                                         │   │
│  │  ─────────────────────────────────────────             │   │
│  │                                                         │   │
│  │  📝 Inscricoes ate 15/12                               │   │
│  │  👥 45/50 vagas preenchidas                            │   │
│  │                                                         │   │
│  │  [Fazer Inscricao]  [Mais Detalhes]                    │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Painel do Marketing - Gerenciamento de Inscricoes

```
┌─────────────────────────────────────────────────────────────────┐
│  Retiro Anual UMP 2025                                          │
│                                                                 │
│  [Inscricoes]  [Presencas]  [Estatisticas]                     │
│  ──────────────────────────────────────────                     │
│                                                                 │
│  Filtrar: [Todos ▼]  Buscar: [_______________] [🔍]            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ # │ Nome        │ Email           │ Status    │ Pago   │   │
│  ├───┼─────────────┼─────────────────┼───────────┼────────┤   │
│  │ 1 │ Maria Silva │ maria@email.com │ Confirmado│ Sim    │   │
│  │ 2 │ Joao Pedro  │ joao@email.com  │ Pendente  │ Nao    │   │
│  │ 3 │ Ana Costa   │ ana@email.com   │ Confirmado│ Sim    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Exportar PDF]  [Exportar Excel]  [Enviar Lembrete]           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. ESTIMATIVA DE TEMPO

### Fase 1: Banco de Dados
| Tarefa | Tempo Estimado |
|--------|----------------|
| Alterar tabela users | 30 min |
| Criar tabelas base (7 tabelas) | 2h |
| Criar tabelas novas (3 tabelas) | 1h |
| Criar insert/select schemas | 1h |
| Executar db:push | 15 min |
| **Total Fase 1** | **4-5 horas** |

### Fase 2: Backend API
| Tarefa | Tempo Estimado |
|--------|----------------|
| Middleware checkSecretaria | 30 min |
| Rotas publicas (15 endpoints) | 3h |
| Rotas autenticadas - comentarios | 1h |
| Rotas admin - devocionais | 2h |
| Rotas admin - eventos (expandido) | 3h |
| Rotas admin - outros | 2h |
| **Total Fase 2** | **11-12 horas** |

### Fase 3: Componentes Base
| Tarefa | Tempo Estimado |
|--------|----------------|
| Layout (Header, Footer, Drawer) | 2h |
| UI Componentes (15 componentes) | 4h |
| Formularios (5 formularios) | 2h |
| **Total Fase 3** | **8-9 horas** |

### Fase 4: Paginas Publicas
| Tarefa | Tempo Estimado |
|--------|----------------|
| Home Page completa | 3h |
| Devocionais + comentarios | 3h |
| Eventos + inscricao/presenca | 4h |
| Quem Somos + Diretoria | 2h |
| Oracao + Area do Membro | 2h |
| **Total Fase 4** | **14-15 horas** |

### Fase 5: Paineis Admin
| Tarefa | Tempo Estimado |
|--------|----------------|
| Painel Devocionais (com comentarios) | 3h |
| Painel Eventos (expandido) | 5h |
| Painel Oracao | 2h |
| Painel Banners | 2h |
| Painel Diretoria | 2h |
| Painel Membros (update) | 1h |
| **Total Fase 5** | **15-16 horas** |

### Fase 6: Integracoes
| Tarefa | Tempo Estimado |
|--------|----------------|
| Instagram API | 3h |
| Integracao Emaus Vota + DeoGlory | 2h |
| WhatsApp links | 30 min |
| **Total Fase 6** | **5-6 horas** |

### Fase 7: Finalizacao
| Tarefa | Tempo Estimado |
|--------|----------------|
| Testes completos | 3h |
| Performance (lazy loading, skeleton) | 2h |
| SEO (meta tags, Open Graph) | 1h |
| **Total Fase 7** | **6-7 horas** |

---

## 6. RESUMO GERAL

### Tempo Total Estimado
| Fase | Horas |
|------|-------|
| Fase 1: Banco de Dados | 4-5h |
| Fase 2: Backend API | 11-12h |
| Fase 3: Componentes Base | 8-9h |
| Fase 4: Paginas Publicas | 14-15h |
| Fase 5: Paineis Admin | 15-16h |
| Fase 6: Integracoes | 5-6h |
| Fase 7: Finalizacao | 6-7h |
| **TOTAL** | **63-70 horas** |

### Prioridades

#### Alta Prioridade (MVP)
1. Home Page com banner animado
2. Pagina de devocionais (com comentarios basicos)
3. Pagina de eventos/agenda (com presenca/inscricao)
4. Painel admin para devocionais
5. Painel admin para eventos (com gerenciamento de inscricoes)
6. Integracao Area do Membro com Emaus Vota e DeoGlory

#### Media Prioridade
1. Sistema completo de comentarios (respostas, curtidas)
2. Pedidos de oracao
3. Quem Somos
4. Diretoria
5. Campo secretaria nos membros
6. Exportacao de listas de inscricao

#### Baixa Prioridade
1. Integracao Instagram
2. Historico de diretorias
3. Calendario visual
4. Notificacoes push para eventos

---

## 7. PROXIMOS PASSOS RECOMENDADOS

### Sequencia de Implementacao

1. **Semana 1: Fundacao**
   - Banco de dados completo
   - API base (devocionais, eventos)
   - Componentes de layout

2. **Semana 2: Paginas Publicas**
   - Home Page
   - Devocionais
   - Eventos com inscricao/presenca

3. **Semana 3: Paineis Admin**
   - Painel Devocionais
   - Painel Eventos
   - Gerenciamento de inscricoes

4. **Semana 4: Integracao e Finalizacao**
   - Sistema de comentarios completo
   - Integracao com Emaus Vota e DeoGlory
   - Testes e ajustes finais

---

*Documento criado em: 04/12/2025*
*Versao: 1.0*
*Autor: Replit Agent*
