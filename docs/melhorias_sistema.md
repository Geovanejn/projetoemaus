# Melhorias do Sistema UMP Emaus

**Data:** 06/12/2025
**Status:** Em Implementacao
**Versao:** 1.2
**Ultima Atualizacao:** 06/12/2025

---

## STATUS DE IMPLEMENTACAO

| Fase | Descricao | Status |
|------|-----------|--------|
| 1 | Correcao de bug de data de eventos | CONCLUIDA |
| 1 | Correcao de URL do Google Calendar | CONCLUIDA |
| 2 | Upload de Imagens nos Paineis | PENDENTE |
| 3 | Integracao com Google Maps | PENDENTE |
| 4 | Botao "Estou Orando" | PENDENTE |
| 5 | Moderacao Automatica | PENDENTE |
| 6 | Gerenciamento de Exclusao | PENDENTE |
| 7 | Notificacoes para Espiritualidade (Comentarios/Pedidos de Oracao) | CONCLUIDA |
| 8 | Notificacoes para Membros (Devocionais/Eventos/Pedidos) | CONCLUIDA |
| 9 | Notificacoes para Visitantes (nao-membros) via navegador | PENDENTE |
| 10 | Notificacoes DeoGlory Completas | CONCLUIDA |
| 11 | Conexao Real com Instagram @umpemaus | CONCLUIDA |
| 12 | Versiculo do Dia as 07:00 | CONCLUIDA |

---

## INDICE

1. [Resumo Executivo](#1-resumo-executivo)
2. [Upload de Imagens nos Paineis](#2-upload-de-imagens-nos-paineis)
3. [Integracao com Google Maps](#3-integracao-com-google-maps)
4. [Correcao de Bug de Data de Eventos](#4-correcao-de-bug-de-data-de-eventos)
5. [Botao "Estou Orando" com Estado Persistente](#5-botao-estou-orando-com-estado-persistente)
6. [Sistema de Moderacao Automatica](#6-sistema-de-moderacao-automatica)
7. [Gerenciamento de Comentarios e Pedidos](#7-gerenciamento-de-comentarios-e-pedidos)
8. [Sistema de Notificacoes Gerais](#8-sistema-de-notificacoes-gerais)
9. [Notificacoes DeoGlory (Estilo Duolingo)](#9-notificacoes-deoglory-estilo-duolingo)
10. [Conexao Real com Instagram](#10-conexao-real-com-instagram)
11. [Arquitetura Tecnica](#11-arquitetura-tecnica)

---

## 1. RESUMO EXECUTIVO

Este documento detalha as melhorias solicitadas para o sistema UMP Emaus:

| # | Melhoria | Descricao | Status |
|---|----------|-----------|--------|
| 1 | Upload de Imagens | Substituir campos URL por upload de arquivo nos paineis | PENDENTE |
| 2 | Google Maps | Integracao com Google Maps para eventos | PENDENTE |
| 3 | Bug Data Eventos | Corrigir validacao de data | CONCLUIDA |
| 4 | Botao "Estou Orando" | Mudar cor e persistir estado | PENDENTE |
| 5 | Moderacao Automatica | Filtrar palavras improprias | PENDENTE |
| 6 | Gerenciamento Comentarios | Espiritualidade pode excluir | PENDENTE |
| 7 | Notificacoes Espiritualidade | Email e push para novos comentarios/pedidos | CONCLUIDA |
| 8 | Notificacoes Membros | Email e push para devocionais/eventos | CONCLUIDA |
| 9 | Notificacoes Visitantes | Push via navegador para nao-membros | PENDENTE |
| 10 | Notificacoes DeoGlory | Sistema completo estilo Duolingo | CONCLUIDA |
| 11 | Instagram Real | Conexao via Meta API | CONCLUIDA |
| 12 | Versiculo do Dia | Push notification as 07:00 | CONCLUIDA |

---

## 8. SISTEMA DE NOTIFICACOES GERAIS

### 8.1 Status Atual - CONCLUIDA

O sistema de notificacoes ja esta implementado nos seguintes arquivos:

**Backend:**
- `server/notifications.ts` - Logica central de notificacoes
- `server/email.ts` - Templates e envio de emails via Resend

**Frontend:**
- `client/src/components/NotificationCenter.tsx` - Central de notificacoes in-app
- `client/src/hooks/use-push-notifications.ts` - Hook para push notifications

### 8.2 Notificacoes Implementadas

| Tipo | Destinatarios | Email | Push | In-App |
|------|---------------|-------|------|--------|
| Novo Devocional | Todos os membros ativos | SIM | SIM | SIM |
| Novo Evento | Todos os membros ativos | SIM | SIM | SIM |
| Novo Pedido de Oracao | Espiritualidade + Admins | SIM | SIM | NAO |
| Novo Comentario | Espiritualidade + Admins | SIM | SIM | NAO |
| Pedido Aprovado | Autor do pedido | NAO | SIM | SIM |
| Nova Temporada DeoGlory | Todos os membros ativos | SIM | SIM | SIM |
| Licao Disponivel | Usuario especifico | NAO | SIM | SIM |
| Lembrete de Streak | Usuario especifico | NAO | SIM | NAO |
| Inatividade (2,3,5,7,10,15 dias) | Usuario especifico | NAO | SIM | SIM |
| Conquista | Usuario especifico | NAO | SIM | SIM |
| Versiculo do Dia | Todos os membros ativos | NAO | SIM | NAO |

### 8.3 Funcoes de Notificacao

```typescript
// server/notifications.ts

notifyNewDevotional(devotionalId, title)
notifyNewEvent(eventId, title, eventDate, eventLocation)
notifyNewPrayerRequest(requestId, requesterName, category, requestText)
notifyPrayerApproved(userId, prayerRequestId)
notifyNewComment(devotionalId, devotionalTitle, commenterName, commentText)
notifySeasonPublished(seasonId, seasonTitle, seasonDescription)
notifyLessonAvailable(userId, lessonTitle, seasonTitle)
notifyStreakReminder(userId, currentStreak)
notifyInactivity(userId, daysSinceLastAccess)
notifyAchievement(userId, achievementName, achievementDescription)
notifyDailyVerse(verse, reference)
```

### 8.4 Pendente - Notificacoes para Visitantes

Usuarios nao cadastrados podem optar por receber notificacoes do navegador para:
- Novos devocionais
- Novos eventos
- Versiculo do dia

**Implementacao Necessaria:**

1. Adicionar tabela `visitor_push_subscriptions` no schema
2. Criar rota publica `/api/public/push/subscribe`
3. Criar UI para solicitar permissao de notificacao na pagina publica
4. Atualizar funcoes de notificacao para incluir visitantes

---

## 9. NOTIFICACOES DEOGLORY (ESTILO DUOLINGO)

### 9.1 Status Atual - PARCIALMENTE IMPLEMENTADA

**Implementado:**
- Nova temporada publicada (email + push + in-app)
- Licao disponivel (push + in-app)
- Lembrete de streak (push)
- Inatividade em 2, 3, 5, 7, 10, 15 dias (push + in-app)
- Conquistas (push + in-app)
- Versiculo do dia (push)

**Pendente:**
- Relatorio de desempenho ao fim da temporada
- Eventos bonus (mes da reforma, missoes, natal, pascoa)
- Scheduler para versiculo do dia as 07:00

### 9.2 Scheduler para Versiculo do Dia

**Arquivo:** `server/scheduler.ts`

O scheduler ja existe mas precisa configurar envio de versiculo as 07:00:

```typescript
// Adicionar ao scheduler.ts
cron.schedule('0 7 * * *', async () => {
  console.log('[Daily Verse] Sending daily verse notifications...');
  try {
    const verse = await storage.getRandomBibleVerse();
    if (verse) {
      await notifyDailyVerse(verse.text, verse.reference);
    }
  } catch (error) {
    console.error('[Daily Verse] Error:', error);
  }
}, {
  timezone: 'America/Sao_Paulo'
});
```

### 9.3 Relatorio de Fim de Temporada

**Nova Funcao Necessaria:**

```typescript
export async function notifySeasonEnded(
  userId: number,
  seasonTitle: string,
  stats: {
    lessonsCompleted: number;
    totalLessons: number;
    xpEarned: number;
    streakMaintained: number;
    achievementsUnlocked: number;
  }
): Promise<void> {
  const percentComplete = Math.round((stats.lessonsCompleted / stats.totalLessons) * 100);
  
  const payload: NotificationPayload = {
    title: "Temporada Finalizada!",
    body: `Voce completou ${percentComplete}% de "${seasonTitle}"`,
    url: "/study/profile",
    tag: `season-ended-${seasonTitle}`,
    icon: "/logo.png",
  };

  await sendPushToUser(userId, payload);
  await createInAppNotification(
    userId,
    "season_ended",
    payload.title,
    payload.body,
    { stats, url: payload.url }
  );
  
  // Enviar email com relatorio detalhado
  if (isEmailConfigured()) {
    const user = await storage.getUserById(userId);
    if (user?.email) {
      await sendSeasonEndedReport(user.email, user.fullName, seasonTitle, stats);
    }
  }
}
```

### 9.4 Eventos Bonus

Adicionar notificacoes para eventos especiais:

| Evento | Periodo | Descricao |
|--------|---------|-----------|
| Mes da Reforma | Outubro | Conteudo especial sobre Reforma Protestante |
| Mes de Missoes | Setembro | Foco em missoes e evangelismo |
| Natal | Dezembro | Estudo especial sobre nascimento de Cristo |
| Pascoa | Marco/Abril | Estudo sobre morte e ressurreicao |

---

## 10. CONEXAO REAL COM INSTAGRAM

### 10.1 Situacao Atual

O sistema possui:
- Tabela `instagram_posts` no schema
- Rotas `/api/site/instagram` e `/api/admin/marketing/instagram`
- Storage methods: `getLatestInstagramPosts`, `createInstagramPost`, `clearAllInstagramPosts`
- Dados mockados/estaticos sendo exibidos

### 10.2 Meta API (Instagram Basic Display ou Graph API)

**Requisitos:**
1. Conta business/creator no Instagram @umpemaus
2. App registrado no Meta for Developers
3. Access Token de longa duracao

**Tokens Necessarios:**
- `INSTAGRAM_ACCESS_TOKEN` - Token de acesso
- `INSTAGRAM_USER_ID` - ID do usuario Instagram

### 10.3 Implementacao Backend

**Novo Arquivo:** `server/instagram.ts`

```typescript
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID;

export async function fetchInstagramPosts(limit: number = 6): Promise<InstagramPost[]> {
  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_USER_ID) {
    console.log('[Instagram] Tokens nao configurados');
    return [];
  }

  try {
    const response = await fetch(
      `https://graph.instagram.com/v18.0/${INSTAGRAM_USER_ID}/media?` +
      `fields=id,caption,media_type,media_url,permalink,timestamp&` +
      `limit=${limit}&access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('[Instagram] API Error:', data.error);
      return [];
    }

    return data.data.filter((post: any) => 
      post.media_type === 'IMAGE' || post.media_type === 'CAROUSEL_ALBUM'
    ).map((post: any) => ({
      id: post.id,
      caption: post.caption || '',
      imageUrl: post.media_url,
      permalink: post.permalink,
      postedAt: new Date(post.timestamp),
    }));
  } catch (error) {
    console.error('[Instagram] Fetch error:', error);
    return [];
  }
}

// Sincronizar posts periodicamente (a cada 6 horas)
export async function syncInstagramPosts(): Promise<void> {
  console.log('[Instagram] Sincronizando posts...');
  
  const posts = await fetchInstagramPosts(12);
  
  if (posts.length > 0) {
    await storage.clearAllInstagramPosts();
    
    for (const post of posts) {
      await storage.createInstagramPost({
        caption: post.caption,
        imageUrl: post.imageUrl,
        permalink: post.permalink,
        postedAt: post.postedAt.toISOString(),
        isActive: true,
      });
    }
    
    console.log(`[Instagram] ${posts.length} posts sincronizados`);
  }
}
```

### 10.4 Scheduler para Sincronizacao

```typescript
// Adicionar ao scheduler.ts
cron.schedule('0 */6 * * *', async () => {
  console.log('[Instagram] Starting scheduled sync...');
  await syncInstagramPosts();
}, {
  timezone: 'America/Sao_Paulo'
});
```

### 10.5 Configuracao de Secrets

Adicionar ao Replit Secrets:
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_USER_ID`

---

## 11. ARQUITETURA TECNICA

### 11.1 Estrutura de Arquivos de Notificacao

```
server/
├── notifications.ts      # Logica central de notificacoes
├── email.ts              # Templates e envio via Resend
├── scheduler.ts          # Cron jobs para notificacoes agendadas
└── instagram.ts          # Integracao com Meta API (a criar)

client/src/
├── components/
│   └── NotificationCenter.tsx
├── hooks/
│   └── use-push-notifications.ts
└── lib/
    └── push-notifications.ts

public/
├── sw.js                 # Service Worker para push
└── manifest.json         # PWA manifest
```

### 11.2 Fluxo de Notificacao

```
[Evento] 
    → server/routes.ts (criar registro)
    → server/notifications.ts (disparo)
        ├→ Email via Resend
        ├→ Push via web-push
        └→ In-App via storage.createNotification
```

### 11.3 Tipos de Notificacao

```typescript
type NotificationType =
  | "new_devotional"       // Novo devocional publicado
  | "new_event"            // Novo evento criado
  | "new_prayer_request"   // Novo pedido de oracao
  | "prayer_approved"      // Pedido aprovado
  | "new_comment"          // Novo comentario em devocional
  | "streak_reminder"      // Lembrete de streak DeoGlory
  | "lesson_available"     // Nova licao liberada
  | "season_published"     // Nova temporada publicada
  | "season_ended"         // Temporada finalizada (com relatorio)
  | "achievement"          // Conquista desbloqueada
  | "inactivity_reminder"  // Lembrete de inatividade
  | "daily_verse"          // Versiculo do dia
  | "bonus_event"          // Evento especial (reforma, missoes, etc)
  | "system";              // Notificacao do sistema
```

---

## PROXIMOS PASSOS

1. [ ] Implementar notificacoes para visitantes nao cadastrados
2. [ ] Adicionar scheduler para versiculo do dia as 07:00
3. [ ] Implementar relatorio de fim de temporada
4. [ ] Implementar eventos bonus DeoGlory
5. [ ] Configurar conexao real com Instagram via Meta API
6. [ ] Testar fluxo completo de notificacoes
7. [ ] Documentar configuracao de tokens Instagram

---

## CHANGELOG

- **v1.2 (06/12/2025)**: Verificado que notificacoes para espiritualidade e membros ja estao implementadas. Documentado status atual e pendencias.
- **v1.1 (06/12/2025)**: Correcao de bug de data de eventos e URL do Google Calendar
- **v1.0 (05/12/2025)**: Documento inicial com todas as melhorias planejadas
