# Deploy UMP Emaus no Render com PostgreSQL

## Visao Geral

Este documento detalha como fazer deploy do sistema UMP Emaus no Render usando PostgreSQL como banco de dados.

## Arquitetura de Banco de Dados

### Ambiente Unificado (Desenvolvimento e Producao)
- **PostgreSQL** via Neon Serverless (`@neondatabase/serverless`)
- Conexao via variavel de ambiente `DATABASE_URL`
- Schema definido em `shared/schema.ts` usando `drizzle-orm/pg-core`
- Migrations via `npm run db:push`

**Nota (Dezembro 2024):** O sistema foi migrado de SQLite para PostgreSQL. Todas as referencias a SQLite foram removidas.

## Tabelas do Sistema

O sistema possui as seguintes tabelas organizadas por modulo:

### Modulo: Autenticacao e Usuarios
| Tabela | Descricao |
|--------|-----------|
| `users` | Usuarios do sistema (membros, admins, secretarias) |
| `verification_codes` | Codigos de verificacao por email |

**Campos importantes na tabela `users`:**
- `id` - ID unico (serial)
- `full_name` - Nome completo
- `email` - Email unico
- `password` - Senha hash (bcrypt)
- `is_admin` - Se e administrador
- `is_member` - Se e membro da UMP
- `active_member` - Se esta ativo
- `secretaria` - Secretaria do membro (espiritualidade, marketing, etc.)

### Modulo: Emaus Vota (Sistema de Eleicoes)
| Tabela | Descricao |
|--------|-----------|
| `positions` | Cargos disponiveis (Presidente, Vice, etc.) |
| `elections` | Eleicoes criadas |
| `election_positions` | Posicoes dentro de cada eleicao |
| `election_attendance` | Presenca dos membros nas eleicoes |
| `candidates` | Candidatos por eleicao/cargo |
| `votes` | Votos registrados |
| `election_winners` | Vencedores de cada cargo |
| `pdf_verifications` | Verificacao de atas em PDF |

### Modulo: DeoGlory (Sistema de Estudos Gamificado)
| Tabela | Descricao |
|--------|-----------|
| `study_profiles` | Perfil de gamificacao do usuario |
| `study_weeks` | Semanas de estudo |
| `study_lessons` | Licoes dentro de cada semana |
| `study_units` | Unidades/exercicios de cada licao |
| `bible_verses` | Versiculos biblicos para leitura |
| `user_lesson_progress` | Progresso do usuario nas licoes |
| `user_unit_progress` | Progresso do usuario nos exercicios |
| `user_verse_readings` | Leituras de versiculos |
| `xp_transactions` | Transacoes de XP |
| `daily_activity` | Atividade diaria |
| `achievements` | Conquistas disponiveis |
| `user_achievements` | Conquistas desbloqueadas |
| `leaderboard_entries` | Ranking dos usuarios |
| `daily_missions` | Missoes diarias disponiveis |
| `user_daily_missions` | Missoes atribuidas aos usuarios |
| `daily_mission_content` | Conteudo diario (versiculo, fato, etc.) |
| `notifications` | Notificacoes in-app |
| `push_subscriptions` | Subscricoes de push notification |

### Modulo: Site Institucional
| Tabela | Descricao |
|--------|-----------|
| `devotionals` | Devocionais publicados |
| `site_events` | Eventos e agenda da UMP |
| `instagram_posts` | Posts do Instagram integrados |
| `prayer_requests` | Pedidos de oracao |
| `banners` | Banners do carrossel da home |
| `board_members` | Membros da diretoria |
| `site_content` | Conteudo editavel do site (quem somos, etc.) |

## Configuracao no Render

### Passo 1: Criar Banco PostgreSQL

1. Acesse o [Render Dashboard](https://dashboard.render.com)
2. Clique em **New** > **PostgreSQL**
3. Configure:
   - **Name**: `ump-emaus-db`
   - **Database**: `ump_emaus`
   - **User**: deixe o padrao ou escolha
   - **Region**: escolha a mais proxima (ex: Ohio para Brasil)
   - **Plan**: Starter ($7/mes) ou Free (para testes)
4. Clique em **Create Database**
5. Copie a **Internal Database URL** ou **External Database URL**

### Passo 2: Criar Web Service

1. No Render, clique em **New** > **Web Service**
2. Conecte seu repositorio GitHub/GitLab
3. Configure:
   - **Name**: `ump-emaus`
   - **Region**: mesma do banco de dados
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`

### Passo 3: Configurar Variaveis de Ambiente

No Web Service, va em **Environment** e adicione:

```
DATABASE_URL=postgresql://user:password@host:5432/ump_emaus
JWT_SECRET=sua_chave_jwt_secreta_muito_longa_e_segura
RESEND_API_KEY=re_xxxxxxxxxxxx
NODE_ENV=production
```

**Variaveis opcionais:**
```
OPENAI_API_KEY=sk-xxxx (para geracao de conteudo com IA)
GOOGLE_API_KEY=AIza... (alternativa ao OpenAI)
VAPID_PUBLIC_KEY=xxxx (para push notifications)
VAPID_PRIVATE_KEY=xxxx (para push notifications)
```

### Passo 4: Aplicar Migrations

Apos o primeiro deploy, execute no terminal do Render:

```bash
npm run db:push
```

Ou configure um **Pre-deploy Command**:
```
npm run db:push
```

## Desenvolvimento Local

Para desenvolvimento local, configure a variavel `DATABASE_URL` apontando para um banco PostgreSQL (Neon, local, etc.):

```bash
DATABASE_URL=postgresql://user:password@host:5432/database_name
```

O sistema usa `@neondatabase/serverless` que funciona com qualquer banco PostgreSQL.

## Backup e Recuperacao

### Backups Automaticos (Render)
- O Render faz backup diario automatico
- Retencao: 7 dias (plano Starter)
- Recuperacao via Dashboard do Render

### Backup Manual
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Restaurar Backup
```bash
psql $DATABASE_URL < backup_20241204.sql
```

## Monitoramento

### Logs do Render
- Acesse **Logs** no dashboard do Web Service
- Filtre por `error` para ver problemas

### Health Check
Configure no Render:
- **Health Check Path**: `/api/health`
- **Health Check Interval**: 30 segundos

## Custos Estimados (Render)

| Recurso | Plano | Custo Mensal |
|---------|-------|--------------|
| PostgreSQL | Starter | $7 |
| Web Service | Starter | $7 |
| **Total** | | **$14/mes** |

*Nota: Existem planos gratuitos com limitacoes (hibernacao apos 15min de inatividade)*

## Checklist de Deploy

- [ ] Banco PostgreSQL criado no Render
- [ ] Web Service configurado
- [ ] DATABASE_URL configurada
- [ ] JWT_SECRET configurada
- [ ] RESEND_API_KEY configurada (para emails)
- [ ] Migrations aplicadas (`npm run db:push`)
- [ ] Health check funcionando
- [ ] SSL habilitado (automatico no Render)
- [ ] Dominio customizado configurado (opcional)

## Troubleshooting

### Erro: "DATABASE_URL not found"
- Verifique se a variavel de ambiente esta configurada corretamente
- Reinicie o servico apos adicionar variaveis

### Erro: "Connection refused"
- Use a Internal Database URL se o banco esta no mesmo Render
- Verifique se o banco esta rodando

### Erro: "Relation does not exist"
- Execute `npm run db:push` para criar as tabelas

### Performance lenta
- Considere upgrade do plano do banco
- Verifique indices nas queries mais usadas
- Use connection pooling se necessario

## Contato e Suporte

- **Render Docs**: https://render.com/docs
- **Drizzle ORM**: https://orm.drizzle.team
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Neon**: https://neon.tech/docs
