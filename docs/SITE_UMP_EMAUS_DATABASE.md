# Site Institucional UMP Emaus - Esquema do Banco de Dados

## Informacoes do Projeto
**Nome:** Site Institucional UMP Emaus
**Versao:** 1.0
**Data de Criacao:** 04/12/2025

---

## 1. Visao Geral

Este documento descreve as tabelas necessarias para o site institucional da UMP Emaus, incluindo devocionais, eventos, pedidos de oracao, banners e diretoria.

---

## 2. Alteracoes na Tabela Existente

### 2.1 Tabela `users` (Adicionar campo)

**Campo a adicionar:**

| Campo | Tipo | Nullable | Default | Descricao |
|-------|------|----------|---------|-----------|
| secretaria | text | Sim | null | Secretaria do membro |

**Valores possiveis para `secretaria`:**
- `null` ou `'none'` - Nenhuma secretaria
- `'espiritualidade'` - Secretaria de Espiritualidade
- `'marketing'` - Secretaria de Marketing
- `'acao_social'` - Secretaria de Acao Social (futuro)
- `'comunicacao'` - Secretaria de Comunicacao (futuro)
- `'eventos'` - Secretaria de Eventos (futuro)

**SQL para adicionar:**
```sql
ALTER TABLE users ADD COLUMN secretaria TEXT DEFAULT NULL;
```

**Drizzle Schema:**
```typescript
// Adicionar ao users existente
secretaria: text("secretaria"),
```

---

## 3. Novas Tabelas

### 3.1 Tabela `devotionals` (Devocionais)

**Descricao:** Armazena os devocionais publicados pela Secretaria de Espiritualidade.

| Campo | Tipo | PK | Nullable | Default | Descricao |
|-------|------|-----|----------|---------|-----------|
| id | serial | Sim | Nao | auto | ID unico |
| title | text | | Nao | | Titulo do devocional |
| content | text | | Nao | | Conteudo completo (Markdown/HTML) |
| verse_text | text | | Sim | null | Texto do versiculo principal |
| verse_reference | text | | Sim | null | Referencia (ex: "Joao 3:16") |
| prayer | text | | Sim | null | Oracao sugerida |
| summary | text | | Sim | null | Resumo (para lista) |
| author_id | integer | | Nao | | ID do autor (FK users) |
| author_name | text | | Nao | | Nome do autor (desnormalizado) |
| is_published | boolean | | Nao | false | Se esta publicado |
| is_featured | boolean | | Nao | false | Se e o devocional do dia |
| published_at | timestamp | | Sim | null | Data de publicacao |
| created_at | timestamp | | Nao | now() | Data de criacao |
| updated_at | timestamp | | Nao | now() | Data de atualizacao |

**Indices:**
- `idx_devotionals_published` ON (is_published, published_at DESC)
- `idx_devotionals_featured` ON (is_featured, is_published)
- `idx_devotionals_author` ON (author_id)

**Drizzle Schema:**
```typescript
export const devotionals = pgTable("devotionals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  verseText: text("verse_text"),
  verseReference: text("verse_reference"),
  prayer: text("prayer"),
  summary: text("summary"),
  authorId: integer("author_id").notNull().references(() => users.id),
  authorName: text("author_name").notNull(),
  isPublished: boolean("is_published").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

---

### 3.2 Tabela `events` (Eventos/Agenda)

**Descricao:** Armazena os eventos da UMP gerenciados pela Secretaria de Marketing.

| Campo | Tipo | PK | Nullable | Default | Descricao |
|-------|------|-----|----------|---------|-----------|
| id | serial | Sim | Nao | auto | ID unico |
| title | text | | Nao | | Titulo do evento |
| description | text | | Sim | null | Descricao detalhada |
| short_description | text | | Sim | null | Descricao curta (para cards) |
| location | text | | Sim | null | Local do evento |
| location_url | text | | Sim | null | Link do Google Maps |
| start_date | timestamp | | Nao | | Data/hora de inicio |
| end_date | timestamp | | Sim | null | Data/hora de termino |
| is_all_day | boolean | | Nao | false | Se e evento de dia inteiro |
| price | text | | Sim | null | Preco (texto: "Gratuito", "R$ 50") |
| registration_url | text | | Sim | null | Link para inscricao |
| image_url | text | | Sim | null | Imagem do evento |
| category | text | | Nao | 'geral' | Categoria do evento |
| is_published | boolean | | Nao | false | Se esta publicado |
| is_featured | boolean | | Nao | false | Se aparece no banner |
| created_by | integer | | Nao | | ID do criador (FK users) |
| created_at | timestamp | | Nao | now() | Data de criacao |
| updated_at | timestamp | | Nao | now() | Data de atualizacao |

**Categorias de eventos:**
- `'geral'` - Eventos gerais
- `'culto'` - Cultos e celebracoes
- `'retiro'` - Retiros e acampamentos
- `'estudo'` - Estudos e capacitacao
- `'social'` - Acoes sociais
- `'confraternizacao'` - Confraternizacoes

**Indices:**
- `idx_events_date` ON (start_date, is_published)
- `idx_events_featured` ON (is_featured, start_date)
- `idx_events_category` ON (category, start_date)

**Drizzle Schema:**
```typescript
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  shortDescription: text("short_description"),
  location: text("location"),
  locationUrl: text("location_url"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isAllDay: boolean("is_all_day").notNull().default(false),
  price: text("price"),
  registrationUrl: text("registration_url"),
  imageUrl: text("image_url"),
  category: text("category").notNull().default("geral"),
  isPublished: boolean("is_published").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

---

### 3.3 Tabela `prayer_requests` (Pedidos de Oracao)

**Descricao:** Armazena os pedidos de oracao enviados pelo formulario publico.

| Campo | Tipo | PK | Nullable | Default | Descricao |
|-------|------|-----|----------|---------|-----------|
| id | serial | Sim | Nao | auto | ID unico |
| name | text | | Sim | null | Nome de quem enviou |
| whatsapp | text | | Sim | null | WhatsApp para contato |
| category | text | | Nao | 'outros' | Categoria do pedido |
| request | text | | Nao | | Texto do pedido |
| is_anonymous | boolean | | Nao | false | Se e anonimo |
| status | text | | Nao | 'pending' | Status do pedido |
| notes | text | | Sim | null | Notas internas (equipe) |
| prayed_by | integer | | Sim | null | ID de quem orou (FK users) |
| prayed_at | timestamp | | Sim | null | Data que foi orado |
| created_at | timestamp | | Nao | now() | Data de envio |
| updated_at | timestamp | | Nao | now() | Data de atualizacao |

**Categorias:**
- `'saude'` - Saude
- `'familia'` - Familia
- `'trabalho'` - Trabalho
- `'espiritual'` - Espiritual
- `'relacionamento'` - Relacionamento
- `'outros'` - Outros

**Status:**
- `'pending'` - Novo/Pendente
- `'praying'` - Em oracao
- `'answered'` - Respondido
- `'archived'` - Arquivado

**Indices:**
- `idx_prayer_requests_status` ON (status, created_at DESC)
- `idx_prayer_requests_category` ON (category, status)

**Drizzle Schema:**
```typescript
export const prayerRequests = pgTable("prayer_requests", {
  id: serial("id").primaryKey(),
  name: text("name"),
  whatsapp: text("whatsapp"),
  category: text("category").notNull().default("outros"),
  request: text("request").notNull(),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  prayedBy: integer("prayed_by").references(() => users.id),
  prayedAt: timestamp("prayed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

---

### 3.4 Tabela `banners` (Banners do Carrossel)

**Descricao:** Banners para o carrossel da home page.

| Campo | Tipo | PK | Nullable | Default | Descricao |
|-------|------|-----|----------|---------|-----------|
| id | serial | Sim | Nao | auto | ID unico |
| title | text | | Nao | | Titulo do banner |
| subtitle | text | | Sim | null | Subtitulo |
| image_url | text | | Sim | null | URL da imagem |
| background_color | text | | Sim | null | Cor de fundo (se sem imagem) |
| link_url | text | | Sim | null | Link ao clicar |
| link_text | text | | Sim | null | Texto do botao |
| order_index | integer | | Nao | 0 | Ordem de exibicao |
| is_active | boolean | | Nao | true | Se esta ativo |
| starts_at | timestamp | | Sim | null | Data de inicio (agendado) |
| ends_at | timestamp | | Sim | null | Data de fim (agendado) |
| created_by | integer | | Nao | | ID do criador (FK users) |
| created_at | timestamp | | Nao | now() | Data de criacao |
| updated_at | timestamp | | Nao | now() | Data de atualizacao |

**Indices:**
- `idx_banners_active` ON (is_active, order_index)
- `idx_banners_schedule` ON (starts_at, ends_at)

**Drizzle Schema:**
```typescript
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  imageUrl: text("image_url"),
  backgroundColor: text("background_color"),
  linkUrl: text("link_url"),
  linkText: text("link_text"),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

---

### 3.5 Tabela `board_members` (Membros da Diretoria)

**Descricao:** Membros da diretoria atual e historico.

| Campo | Tipo | PK | Nullable | Default | Descricao |
|-------|------|-----|----------|---------|-----------|
| id | serial | Sim | Nao | auto | ID unico |
| user_id | integer | | Sim | null | ID do usuario (FK users) |
| name | text | | Nao | | Nome completo |
| position | text | | Nao | | Cargo na diretoria |
| photo_url | text | | Sim | null | URL da foto |
| instagram | text | | Sim | null | @ do Instagram |
| whatsapp | text | | Sim | null | WhatsApp |
| bio | text | | Sim | null | Breve biografia |
| term_start | text | | Nao | | Inicio do mandato (ex: "2024") |
| term_end | text | | Nao | | Fim do mandato (ex: "2025") |
| order_index | integer | | Nao | 0 | Ordem de exibicao |
| is_current | boolean | | Nao | true | Se e diretoria atual |
| created_at | timestamp | | Nao | now() | Data de criacao |
| updated_at | timestamp | | Nao | now() | Data de atualizacao |

**Cargos possiveis:**
- `'presidente'` - Presidente
- `'vice_presidente'` - Vice-Presidente
- `'primeiro_secretario'` - 1o Secretario
- `'segundo_secretario'` - 2o Secretario
- `'tesoureiro'` - Tesoureiro
- `'conselheiro'` - Conselheiro

**Indices:**
- `idx_board_current` ON (is_current, order_index)
- `idx_board_term` ON (term_start, term_end)

**Drizzle Schema:**
```typescript
export const boardMembers = pgTable("board_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  position: text("position").notNull(),
  photoUrl: text("photo_url"),
  instagram: text("instagram"),
  whatsapp: text("whatsapp"),
  bio: text("bio"),
  termStart: text("term_start").notNull(),
  termEnd: text("term_end").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  isCurrent: boolean("is_current").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

---

### 3.6 Tabela `site_content` (Conteudo Estatico)

**Descricao:** Conteudo editavel das paginas estaticas (Quem Somos, etc).

| Campo | Tipo | PK | Nullable | Default | Descricao |
|-------|------|-----|----------|---------|-----------|
| id | serial | Sim | Nao | auto | ID unico |
| page | text | | Nao | | Identificador da pagina |
| section | text | | Nao | | Identificador da secao |
| title | text | | Sim | null | Titulo da secao |
| content | text | | Sim | null | Conteudo (Markdown/HTML) |
| image_url | text | | Sim | null | Imagem associada |
| metadata | jsonb | | Sim | null | Dados adicionais (JSON) |
| updated_by | integer | | Sim | null | ID de quem atualizou |
| updated_at | timestamp | | Nao | now() | Data de atualizacao |

**Paginas/Secoes:**
- `quem-somos/historia` - Historia da UMP
- `quem-somos/missao` - Missao
- `quem-somos/visao` - Visao
- `quem-somos/valores` - Valores
- `quem-somos/localizacao` - Localizacao
- `contato/informacoes` - Informacoes de contato
- `footer/redes-sociais` - Links das redes sociais

**Indices:**
- `idx_site_content_page` ON (page, section) UNIQUE

**Drizzle Schema:**
```typescript
export const siteContent = pgTable("site_content", {
  id: serial("id").primaryKey(),
  page: text("page").notNull(),
  section: text("section").notNull(),
  title: text("title"),
  content: text("content"),
  imageUrl: text("image_url"),
  metadata: jsonb("metadata"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniquePageSection: unique().on(table.page, table.section),
}));
```

---

### 3.7 Tabela `instagram_posts` (Cache do Instagram)

**Descricao:** Cache das postagens do Instagram para exibicao na home.

| Campo | Tipo | PK | Nullable | Default | Descricao |
|-------|------|-----|----------|---------|-----------|
| id | serial | Sim | Nao | auto | ID unico |
| instagram_id | text | | Nao | | ID do post no Instagram |
| media_type | text | | Nao | | Tipo (IMAGE, VIDEO, CAROUSEL) |
| media_url | text | | Nao | | URL da midia |
| thumbnail_url | text | | Sim | null | Thumbnail (para videos) |
| permalink | text | | Nao | | Link para o post |
| caption | text | | Sim | null | Legenda do post |
| timestamp | timestamp | | Nao | | Data do post |
| cached_at | timestamp | | Nao | now() | Data do cache |

**Indices:**
- `idx_instagram_posts_id` ON (instagram_id) UNIQUE
- `idx_instagram_posts_date` ON (timestamp DESC)

**Drizzle Schema:**
```typescript
export const instagramPosts = pgTable("instagram_posts", {
  id: serial("id").primaryKey(),
  instagramId: text("instagram_id").notNull().unique(),
  mediaType: text("media_type").notNull(),
  mediaUrl: text("media_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  permalink: text("permalink").notNull(),
  caption: text("caption"),
  timestamp: timestamp("timestamp").notNull(),
  cachedAt: timestamp("cached_at").notNull().defaultNow(),
});
```

---

## 4. Diagrama ER (Entidade-Relacionamento)

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ id (PK)         │
│ name            │
│ email           │
│ secretaria      │◄──────────────┐
│ isAdmin         │               │
│ isMember        │               │
└────────┬────────┘               │
         │                        │
         │ 1:N                    │
         ▼                        │
┌─────────────────┐               │
│  devotionals    │               │
├─────────────────┤               │
│ id (PK)         │               │
│ title           │               │
│ content         │               │
│ author_id (FK)  │───────────────┘
│ is_published    │
│ is_featured     │
└─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│     events      │      │ prayer_requests │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ title           │      │ name            │
│ description     │      │ whatsapp        │
│ start_date      │      │ category        │
│ location        │      │ request         │
│ is_published    │      │ is_anonymous    │
│ created_by (FK) │      │ status          │
└─────────────────┘      │ prayed_by (FK)  │
                         └─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│    banners      │      │  board_members  │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ title           │      │ user_id (FK)    │
│ subtitle        │      │ name            │
│ image_url       │      │ position        │
│ link_url        │      │ photo_url       │
│ is_active       │      │ term_start      │
│ order_index     │      │ term_end        │
│ created_by (FK) │      │ is_current      │
└─────────────────┘      └─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│  site_content   │      │ instagram_posts │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ page            │      │ instagram_id    │
│ section         │      │ media_type      │
│ title           │      │ media_url       │
│ content         │      │ permalink       │
│ updated_by (FK) │      │ caption         │
└─────────────────┘      └─────────────────┘
```

---

## 5. Permissoes por Secretaria

### 5.1 Matriz de Permissoes

| Tabela | Admin | Espiritualidade | Marketing | Membro |
|--------|-------|-----------------|-----------|--------|
| users (secretaria) | CRUD | - | - | - |
| devotionals | CRUD | CRUD | R | R |
| events | CRUD | R | CRUD | R |
| prayer_requests | CRUD | CRUD | R | - |
| banners | CRUD | R | CRUD | R |
| board_members | CRUD | R | R | R |
| site_content | CRUD | R | CRUD* | R |
| instagram_posts | CRUD | R | CRUD | R |

**Legenda:**
- CRUD = Create, Read, Update, Delete
- R = Apenas leitura (visualizacao publica)
- `-` = Sem acesso
- `*` = Acesso parcial (apenas secoes especificas)

### 5.2 Logica de Verificacao

```typescript
// Middleware para verificar secretaria
function checkSecretaria(allowed: string[]) {
  return (req, res, next) => {
    const user = req.user;
    
    // Admin tem acesso total
    if (user.isAdmin) {
      return next();
    }
    
    // Verifica se a secretaria do usuario esta na lista permitida
    if (user.secretaria && allowed.includes(user.secretaria)) {
      return next();
    }
    
    return res.status(403).json({ 
      message: "Acesso nao autorizado para sua secretaria" 
    });
  };
}

// Uso nas rotas
app.post("/api/devotionals", 
  requireAuth, 
  checkSecretaria(["espiritualidade"]), 
  createDevotional
);

app.post("/api/events", 
  requireAuth, 
  checkSecretaria(["marketing"]), 
  createEvent
);
```

---

## 6. Tipos TypeScript

```typescript
// Tipos para secretarias
export type Secretaria = 
  | "none" 
  | "espiritualidade" 
  | "marketing" 
  | "acao_social" 
  | "comunicacao" 
  | "eventos";

// Tipos para categorias de oracao
export type PrayerCategory = 
  | "saude" 
  | "familia" 
  | "trabalho" 
  | "espiritual" 
  | "relacionamento" 
  | "outros";

// Tipos para status de oracao
export type PrayerStatus = 
  | "pending" 
  | "praying" 
  | "answered" 
  | "archived";

// Tipos para categorias de eventos
export type EventCategory = 
  | "geral" 
  | "culto" 
  | "retiro" 
  | "estudo" 
  | "social" 
  | "confraternizacao";

// Tipos para cargos da diretoria
export type BoardPosition = 
  | "presidente" 
  | "vice_presidente" 
  | "primeiro_secretario" 
  | "segundo_secretario" 
  | "tesoureiro" 
  | "conselheiro";
```

---

## 7. Migrations

### 7.1 Ordem de Execucao

1. Alterar tabela `users` (adicionar campo `secretaria`)
2. Criar tabela `devotionals`
3. Criar tabela `events`
4. Criar tabela `prayer_requests`
5. Criar tabela `banners`
6. Criar tabela `board_members`
7. Criar tabela `site_content`
8. Criar tabela `instagram_posts`
9. Criar indices

### 7.2 Comando para Push

```bash
npm run db:push
```

---

## 8. Seeds (Dados Iniciais)

### 8.1 Conteudo do Site

```typescript
// Dados iniciais para site_content
const initialContent = [
  {
    page: "quem-somos",
    section: "historia",
    title: "Nossa Historia",
    content: "A Uniao de Mocidade Presbiteriana de Emaus foi fundada..."
  },
  {
    page: "quem-somos",
    section: "missao",
    title: "Missao",
    content: "Glorificar a Deus atraves do discipulado..."
  },
  {
    page: "quem-somos",
    section: "visao",
    title: "Visao",
    content: "Ser uma geracao que impacta o mundo..."
  },
  {
    page: "quem-somos",
    section: "valores",
    title: "Valores",
    content: "Fe, Amor, Unidade, Servico, Santidade"
  },
  {
    page: "footer",
    section: "redes-sociais",
    title: null,
    content: null,
    metadata: {
      instagram: "https://instagram.com/umpemaus",
      facebook: "https://facebook.com/umpemaus",
      youtube: "https://youtube.com/umpemaus"
    }
  }
];
```

---

## 9. Status de Implementacao

### 9.1 Schema Drizzle (shared/schema.ts)

| Tabela | Status | Observacoes |
|--------|--------|-------------|
| `users.secretaria` | Implementado | Campo adicionado |
| `devotionals` | Implementado | Campos `is_featured` e `prayer` adicionados |
| `site_events` | Implementado | Campos expandidos (category, price, registration_url, etc.) |
| `prayer_requests` | Implementado | Nova tabela criada |
| `banners` | Implementado | Nova tabela criada |
| `board_members` | Implementado | Nova tabela criada |
| `site_content` | Implementado | Nova tabela criada |
| `instagram_posts` | Existente | Ja existia, sem alteracoes |

### 9.2 PostgreSQL (server/db.ts)

| Tabela | Status | Observacoes |
|--------|--------|-------------|
| Todas as novas tabelas | Implementado | Criadas via Drizzle ORM |
| Schema PostgreSQL | Implementado | Usando @neondatabase/serverless |

### 9.3 Storage Interface (server/storage.ts)

| Metodo | Status | Observacoes |
|--------|--------|-------------|
| User methods (secretaria) | Implementado | Campo mapeado corretamente |
| Prayer Requests CRUD | Pendente | Adicionar metodos |
| Banners CRUD | Pendente | Adicionar metodos |
| Board Members CRUD | Pendente | Adicionar metodos |
| Site Content CRUD | Pendente | Adicionar metodos |

### 9.4 API Routes (server/routes.ts)

| Rota | Status | Observacoes |
|------|--------|-------------|
| Public routes | Pendente | GET para dados publicos |
| Admin routes | Pendente | CRUD com checkSecretaria |

### 9.5 Frontend Pages

| Pagina | Status | Observacoes |
|--------|--------|-------------|
| Home | Existente | Precisa integrar novos dados |
| Devocionais | Pendente | Lista e detalhes |
| Agenda | Pendente | Calendario de eventos |
| Pedido de Oracao | Pendente | Formulario publico |
| Quem Somos | Pendente | Conteudo editavel |
| Diretoria | Pendente | Lista de membros |
| Admin panels | Pendente | CRUD para cada modulo |

---

## 10. Deploy e Producao

### 10.1 Ambiente Unificado (Dev e Producao)
- **Banco:** PostgreSQL via @neondatabase/serverless
- **ORM:** Drizzle ORM com pg-core
- **Conexao:** Via `DATABASE_URL`
- **Migrations:** `npm run db:push`

**Nota (Dezembro 2024):** Sistema migrado de SQLite para PostgreSQL.

### 10.2 Ambiente de Producao (Render)
- **Banco:** PostgreSQL gerenciado pelo Render
- **Backups:** Automaticos diarios
- **Custo:** ~$7/mes (plano Starter)

### 10.3 Documentacao Adicional
- Ver `docs/DEPLOY_RENDER_POSTGRESQL.md` para instrucoes completas de deploy

---

*Documento criado em: 04/12/2025*
*Ultima atualizacao: 04/12/2025*
*Versao: 1.1*
