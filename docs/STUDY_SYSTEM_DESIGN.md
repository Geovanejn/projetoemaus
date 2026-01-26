# Sistema de Estudos - Documento de Design

## Visao Geral

O Sistema de Estudos e um modulo gamificado que replica o design visual do Duolingo, mantendo a identidade visual da UMP Emaus. O sistema permite que administradores enviem revistas de estudo em PDF, e a IA extrai automaticamente as licoes para liberacao semanal.

---

## 1. Especificacoes de Interface (UI/UX)

### 1.1 Layout do Caminho de Aprendizagem

O caminho de aprendizagem exibe as licoes agrupadas por titulo, cada uma com seus tres estagios (Estude, Medite, Responda):

```
┌─────────────────────────────────────────────────────┐
│                    HEADER AMARELO                    │
│  Avatar + Nome + Ofensiva (dias) + XP               │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│                    META DIARIA                       │
│  [████████████░░░░░░] 3/5                           │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│                                                      │
│  ╔═══════════════════════════════════════════════╗  │
│  ║  LICAO 1 - O que e Fe?                        ║  │
│  ╚═══════════════════════════════════════════════╝  │
│                                                      │
│   ┌──────┐                                          │
│   │ 📖  │   ┌───────────────────────────────────┐  │
│   │      │   │  Estude                  ✓        │  │
│   └──────┘   │  Aprenda sobre o tema             │  │
│      │       └───────────────────────────────────┘  │
│      │                                              │
│   ┌──────┐                                          │
│   │ 🙏  │   ┌───────────────────────────────────┐  │
│   │      │   │  Medite            [ATUAL]        │  │
│   └──────┘   │  Reflexao e oracao                │  │
│      │       └───────────────────────────────────┘  │
│      │                                              │
│   ┌──────┐                                          │
│   │ ❓  │   ┌───────────────────────────────────┐  │
│   │      │   │  Responda                         │  │
│   └──────┘   │  Teste seus conhecimentos         │  │
│              └───────────────────────────────────┘  │
│                                                      │
│  ╔═══════════════════════════════════════════════╗  │
│  ║  LICAO 2 - A Fe que Move Montanhas            ║  │
│  ╚═══════════════════════════════════════════════╝  │
│                                                      │
│   ┌──────┐                                          │
│   │ 🔒  │   ┌───────────────────────────────────┐  │
│   │      │   │  Estude              (bloqueado)  │  │
│   └──────┘   │  Aprenda sobre o tema             │  │
│      │       └───────────────────────────────────┘  │
│      │                                              │
│   ┌──────┐                                          │
│   │ 🔒  │   ┌───────────────────────────────────┐  │
│   │      │   │  Medite              (bloqueado)  │  │
│   └──────┘   │  Reflexao e oracao                │  │
│      │       └───────────────────────────────────┘  │
│      │                                              │
│   ┌──────┐                                          │
│   │ 🔒  │   ┌───────────────────────────────────┐  │
│   │      │   │  Responda            (bloqueado)  │  │
│   └──────┘   │  Teste seus conhecimentos         │  │
│              └───────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 1.1.1 Estrutura Hierarquica das Licoes

**IMPORTANTE**: A tela de caminho de aprendizagem NAO deve mostrar "Seu Caminho" com "Licao 1, Licao 2, Licao 3..." como itens separados.

**ESTRUTURA CORRETA:**

Para cada licao (ex: "Licao 1 - O que e Fe?"):
1. Header da licao com titulo completo
2. Card "Estude" - Conteudo de leitura (texto, versiculos)
3. Card "Medite" - Reflexao e oracao (meditacao, reflexao)
4. Card "Responda" - Exercicios e perguntas (multipla escolha, V/F, preencher lacunas)

**REGRAS DE DESBLOQUEIO:**
- Estude: Desbloqueia automaticamente quando licao anterior esta completa
- Medite: Desbloqueia quando Estude esta completo
- Responda: Desbloqueia quando Medite esta completo

**SISTEMA DE VIDAS (IMPORTANTE):**
- Estude: Usuario NAO perde vidas (apenas leitura)
- Medite: Usuario NAO perde vidas (apenas reflexao)
- Responda: Usuario PODE perder vidas em respostas erradas

### 1.2 Especificacoes dos Componentes

#### Trilho de Icones (Icon Rail)
- **Largura fixa**: 72px
- **Posicao**: A ESQUERDA dos cards, FORA do retangulo
- **Icones**: Centralizados horizontalmente no trilho
- **Tamanho do icone**: 48x48px com fundo colorido arredondado

#### Linha Guia Vertical
- **Posicao**: Centralizada com os icones
- **Largura**: 2px
- **Cor**: `border-muted` (cinza claro)
- **Z-Index**: ATRAS dos icones (z-index: 0)
- **Implementacao**: Pseudo-elemento `::before` com `position: absolute`

#### Cards de Licao (UnitCard)
- **Posicao**: A direita do trilho de icones
- **Margem esquerda**: Espaco para o trilho de icones
- **Estados visuais**:
  - **Completado**: Icone verde com checkmark, borda sutil
  - **Atual**: Borda verde (#58CC02), badge "ATUAL" laranja
  - **Bloqueado**: Icone cinza com cadeado, opacidade reduzida

#### Card de Pratica (PracticeCard)
- **Posicao**: Alinhado com os cards de licao
- **Cor de fundo**: Azul (#1CB0F6)
- **Icone**: Halteres (Dumbbell)

### 1.3 Sistema de Cores

| Elemento | Cor | Codigo |
|----------|-----|--------|
| Header de Estudo | Amarelo | #FFC800 |
| Branding/Laranja | Primario | #FFA500 |
| Licao Completa | Verde | #58CC02 |
| Botoes Ativos | Azul | #1CB0F6 |
| Ofensiva/Streak | Laranja | #FF9600 |
| Coracoes | Vermelho | #FF4B4B |
| Bloqueado | Cinza | #E5E5E5 |

### 1.4 Navegacao Inferior (BottomNav)

Quatro abas fixas:
1. **Inicio** (Home icon) - Pagina principal do estudo
2. **Explorar** (Compass icon) - Explorar versiculos e conteudos
3. **Ranking** (Trophy icon) - Classificacao entre membros
4. **Perfil** (User icon) - Perfil com ofensiva e estatisticas

---

## 2. Modelo de Dados

### 2.1 Tabelas do Banco de Dados

#### Magazine (Revista)
```typescript
magazines: pgTable("magazines", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  series: varchar("series", { length: 255 }),  // Ex: "Nossa Fe"
  subtitle: varchar("subtitle", { length: 500 }),  // Ex: "Nao jogue sua vida fora"
  pdfUrl: text("pdf_url"),
  coverImageUrl: text("cover_image_url"),
  status: varchar("status", { length: 50 }).default("draft"),  // draft, processing, active, archived
  totalLessons: integer("total_lessons").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
})
```

#### Lesson (Licao)
```typescript
lessons: pgTable("lessons", {
  id: serial("id").primaryKey(),
  magazineId: integer("magazine_id").references(() => magazines.id).notNull(),
  lessonNumber: integer("lesson_number").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 255 }),
  summary: text("summary"),
  releaseDate: date("release_date"),  // Data de liberacao (domingo)
  isReleased: boolean("is_released").default(false),
  durationMinutes: integer("duration_minutes").default(15),
  xpReward: integer("xp_reward").default(10),
  createdAt: timestamp("created_at").defaultNow(),
})
```

#### LessonSection (Secao da Licao)
```typescript
lessonSections: pgTable("lesson_sections", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").references(() => lessons.id).notNull(),
  sectionOrder: integer("section_order").notNull(),
  heading: varchar("heading", { length: 255 }),
  contentMarkdown: text("content_markdown"),
  contentType: varchar("content_type", { length: 50 }).default("text"),  // text, verse, question, reflection
})
```

#### ExtractionJob (Trabalho de Extracao)
```typescript
extractionJobs: pgTable("extraction_jobs", {
  id: serial("id").primaryKey(),
  magazineId: integer("magazine_id").references(() => magazines.id).notNull(),
  status: varchar("status", { length: 50 }).default("pending"),  // pending, processing, completed, failed
  errorLog: text("error_log"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  modelVersion: varchar("model_version", { length: 100 }),
})
```

#### UserLessonProgress (Progresso do Usuario)
```typescript
userLessonProgress: pgTable("user_lesson_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  lessonId: integer("lesson_id").references(() => lessons.id).notNull(),
  status: varchar("status", { length: 50 }).default("not_started"),  // not_started, in_progress, completed
  completedSections: integer("completed_sections").default(0),
  totalSections: integer("total_sections").default(0),
  xpEarned: integer("xp_earned").default(0),
  completedAt: timestamp("completed_at"),
  startedAt: timestamp("started_at"),
})
```

---

## 3. Arquitetura do Sistema

### 3.1 Fluxo de Upload e Extracao de PDF

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   ADMIN     │────▶│   UPLOAD    │────▶│  STORAGE    │
│   PAINEL    │     │   ENDPOINT  │     │  (ARQUIVO)  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  CRIAR JOB  │
                    │  EXTRACAO   │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  WORKER     │
                    │  BACKGROUND │
                    └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │ PDF PARSE │ │ SEGMENTAR │ │ LLM (IA)  │
       │ (Texto)   │ │ CONTEUDO  │ │ EXTRAIR   │
       └───────────┘ └───────────┘ └───────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  SALVAR     │
                    │  LICOES     │
                    └─────────────┘
```

### 3.2 Pipeline de Extracao por IA

1. **Conversao PDF para Texto**
   - Usar `pdf-parse` ou `PDF.js` para extrair texto
   - Manter estrutura de paginas e formatacao

2. **Segmentacao por Headings**
   - Identificar titulos de licoes (numerados)
   - Separar secoes dentro de cada licao

3. **Extracao via LLM (GPT-4)**
   - Prompt estruturado para extrair:
     - Titulo da revista
     - Lista de licoes com numeros e titulos
     - Conteudo de cada licao
     - Versiculos citados
     - Questoes de reflexao

4. **Persistencia**
   - Salvar em transacao no banco
   - Marcar licoes como "rascunho" para revisao

### 3.3 Agendamento de Liberacao Semanal

```typescript
// Executar diariamente via scheduler
async function unlockScheduledLessons() {
  const today = new Date();
  await db.update(lessons)
    .set({ isReleased: true })
    .where(
      and(
        lte(lessons.releaseDate, today),
        eq(lessons.isReleased, false)
      )
    );
}
```

- Padrao: Proximos 13 domingos a partir da data de upload
- Admin pode ajustar datas manualmente
- Notificacao opcional para usuarios

---

## 4. Fluxo de Trabalho do Administrador

### 4.1 Upload de Revista

1. Acessar painel admin → Estudos → Nova Revista
2. Fazer upload do arquivo PDF
3. Sistema cria job de extracao automaticamente
4. Aguardar processamento (polling de status)

### 4.2 Revisao e Edicao

1. Apos extracao, revisar licoes extraidas
2. Editar titulos, conteudos, corrigir erros
3. Definir datas de liberacao (padrao: domingos)
4. Adicionar recursos extras (imagens, videos)

### 4.3 Publicacao

1. Revisar todas as licoes
2. Confirmar datas de liberacao
3. Clicar em "Publicar Revista"
4. Licoes serao liberadas automaticamente nas datas

### 4.4 Indicadores de Status

| Status | Descricao | Cor |
|--------|-----------|-----|
| Rascunho | Aguardando revisao | Cinza |
| Agendado | Data de liberacao definida | Amarelo |
| Liberado | Disponivel para usuarios | Verde |
| Arquivado | Concluido/Desativado | Vermelho |

---

## 5. Integracao com IA

### 5.1 Requisitos

- **Google Gemini API** - UNICA API de IA utilizada no projeto
- Secret: `GEMINI_API_KEY` (obrigatoria)

### 5.2 Prompt de Extracao

```
Voce e um assistente especializado em extrair conteudo de revistas de estudo biblico.

Dado o texto extraido de um PDF, identifique e estruture:

1. TITULO DA REVISTA: O titulo principal da publicacao
2. SUBTITULO: Tema ou serie da revista
3. LICOES: Lista numerada de todas as licoes com:
   - Numero da licao
   - Titulo da licao
   - Resumo breve (1-2 frases)

Formato de saida: JSON estruturado
```

---

## 6. Componentes Frontend

### 6.1 Estrutura de Arquivos

```
client/src/
├── components/
│   └── study/
│       ├── UnitCard.tsx        # Card de licao com icone EXTERNO
│       ├── PracticeCard.tsx    # Card de pratica
│       ├── LearningPath.tsx    # Container do caminho com linha guia
│       ├── IconRail.tsx        # Trilho de icones a esquerda
│       ├── BottomNav.tsx       # Navegacao inferior (4 tabs)
│       ├── UserProfileHeader.tsx  # Header amarelo
│       └── DailyGoal.tsx       # Barra de meta diaria
├── pages/
│   └── study/
│       ├── index.tsx           # Pagina principal
│       ├── lesson/[id].tsx     # Pagina da licao
│       ├── profile.tsx         # Perfil com ofensiva
│       └── admin/
│           ├── magazines.tsx   # Gerenciar revistas
│           └── lessons.tsx     # Gerenciar licoes
```

### 6.2 Layout do LearningPath

```tsx
<div className="relative">
  {/* Linha guia vertical - ATRAS dos icones */}
  <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-border z-0" />
  
  {/* Container de licoes */}
  <div className="space-y-3">
    {lessons.map((lesson) => (
      <div key={lesson.id} className="flex items-start gap-4">
        {/* Icone - FORA do card */}
        <div className="relative z-10 flex-shrink-0">
          <LessonIcon status={lesson.status} />
        </div>
        
        {/* Card - A direita do icone */}
        <div className="flex-1">
          <UnitCard lesson={lesson} />
        </div>
      </div>
    ))}
  </div>
</div>
```

---

## 7. Exemplo de Revista

### Revista: "Nossa Fe - Nao jogue sua vida fora"

**Licoes (13 total):**
1. Uma paixao unica pela qual viver
2. Nao desperdice sua vida
3. Gloria somente na cruz
4. Glorificando a Cristo por meio de dor e morte (1)
5. Glorificando a Cristo por meio de dor e morte (2)
6. Melhor perder a vida do que desperdica-la (1)
7. Melhor perder a vida do que desperdica-la (2)
8. Nosso alvo: tornar outros alegres em Deus
9. Viver para provar que Cristo e mais precioso que a vida (1)
10. Viver para provar que Cristo e mais precioso que a vida (2)
11. Nao desperdice sua vida das 8h as 17h
12. A majestade de Deus em missoes e misericordia (1)
13. A majestade de Deus em missoes e misericordia (2)

**Cronograma de Liberacao (exemplo):**
- Licao 1: 08/12/2024 (Domingo)
- Licao 2: 15/12/2024 (Domingo)
- Licao 3: 22/12/2024 (Domingo)
- ... e assim por diante

---

## 8. Proximos Passos

1. [ ] Corrigir layout do UnitCard (icone FORA do card)
2. [ ] Implementar linha guia vertical com z-index correto
3. [ ] Criar modelo de dados no schema.ts
4. [ ] Implementar rotas de upload de PDF
5. [ ] Integrar com OpenAI para extracao
6. [ ] Criar painel admin para gerenciar revistas
7. [ ] Implementar agendamento semanal de liberacao
8. [ ] Testar fluxo completo

---

*Documento atualizado em: Dezembro 2024*
*Versao: 1.0*
