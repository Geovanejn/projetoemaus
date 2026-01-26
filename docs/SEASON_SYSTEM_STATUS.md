# Sistema de Temporadas - Status de Implementacao

Data de Atualizacao: 05/12/2025

## Visao Geral

O sistema de temporadas foi implementado para organizar as licoes de estudo bíblico em temporadas, baseadas em revistas/materiais de EBD. Cada temporada contém multiplas licoes que sao geradas via IA a partir de PDFs importados.

## Tabelas do Banco de Dados

### Implementadas e Funcionando

| Tabela | Descricao | Status |
|--------|-----------|--------|
| `seasons` | Temporadas de estudo | OK |
| `season_final_challenges` | Desafio final da temporada | OK |
| `user_season_progress` | Progresso do usuario por temporada | OK |
| `season_rankings` | Ranking por temporada | OK |
| `weekly_goal_progress` | Progresso das metas semanais | OK |
| `devotional_readings` | Confirmacao de leitura de devocionais | OK |
| `study_lessons.seasonId` | Campo de ligacao com temporada | OK |
| `study_profiles.weekly*Goal` | Campos de metas semanais | OK |
| `achievements.customIconUrl` | Icone personalizado | OK |
| `achievements.seasonId` | Conquista por temporada | OK |

## Rotas de API - Backend

### Temporadas (Public)

| Rota | Metodo | Descricao | Status |
|------|--------|-----------|--------|
| `/api/study/seasons` | GET | Listar temporadas publicadas | OK |
| `/api/study/seasons/:id` | GET | Detalhes da temporada | OK |
| `/api/study/seasons/:id/lessons` | GET | Licoes da temporada | OK |
| `/api/study/seasons/:id/progress` | GET | Progresso do usuario | OK |

### Administracao de Temporadas

| Rota | Metodo | Descricao | Status |
|------|--------|-----------|--------|
| `/api/study/admin/seasons` | GET | Listar todas as temporadas | OK |
| `/api/study/admin/seasons` | POST | Criar nova temporada | OK |
| `/api/study/admin/seasons/:id` | PUT | Atualizar temporada | OK |
| `/api/study/admin/seasons/:id` | DELETE | Remover temporada | OK |
| `/api/study/admin/seasons/:id/publish` | POST | Publicar temporada | OK |
| `/api/study/admin/seasons/:id/import-pdf` | POST | Importar PDF e gerar licoes com IA | OK |

### Desafio Final

| Rota | Metodo | Descricao | Status |
|------|--------|-----------|--------|
| `/api/study/seasons/:id/final-challenge` | GET | Obter desafio final | OK |
| `/api/study/seasons/:id/final-challenge/start` | POST | Iniciar desafio | OK |
| `/api/study/seasons/:id/final-challenge/submit` | POST | Enviar respostas | OK |
| `/api/study/admin/seasons/:id/final-challenge` | POST | Criar/atualizar desafio | OK |
| `/api/study/admin/seasons/:id/generate-final-challenge` | POST | Gerar com IA | OK |

### Metas Semanais

| Rota | Metodo | Descricao | Status |
|------|--------|-----------|--------|
| `/api/study/weekly-goals/progress` | GET | Progresso das metas | OK |
| `/api/study/weekly-goals/confirm-lesson` | POST | Confirmar licao | OK |
| `/api/study/weekly-goals/confirm-verse` | POST | Confirmar versiculo diario | OK |
| `/api/study/weekly-goals/confirm-mission` | POST | Confirmar missao | OK |
| `/api/study/devotional-status/:id` | GET | Status de leitura do devocional | OK |
| `/api/study/devotional-read/:id` | POST | Marcar devocional como lido | OK |

### Rankings

| Rota | Metodo | Descricao | Status |
|------|--------|-----------|--------|
| `/api/study/seasons/:id/rankings` | GET | Rankings da temporada | OK |

## Metodos de Storage - Backend

### Temporadas

| Metodo | Descricao | Status |
|--------|-----------|--------|
| `createSeason` | Criar temporada | OK |
| `updateSeason` | Atualizar temporada | OK |
| `deleteSeason` | Remover temporada | OK |
| `getSeasonById` | Buscar temporada por ID | OK |
| `getAllSeasons` | Listar todas as temporadas | OK |
| `getPublishedSeasons` | Listar temporadas publicadas | OK |
| `publishSeason` | Publicar temporada | OK |
| `getLessonsForSeason` | Listar licoes da temporada | OK |
| `createSeasonLesson` | Criar licao na temporada | OK |

### Desafio Final

| Metodo | Descricao | Status |
|--------|-----------|--------|
| `getSeasonFinalChallenge` | Buscar desafio final | OK |
| `createSeasonFinalChallenge` | Criar desafio final | OK |
| `updateSeasonFinalChallenge` | Atualizar desafio final | OK |

### Progresso do Usuario

| Metodo | Descricao | Status |
|--------|-----------|--------|
| `getUserSeasonProgress` | Obter progresso na temporada | OK |
| `updateUserSeasonProgress` | Atualizar progresso | OK |

### Metas Semanais

| Metodo | Descricao | Status |
|--------|-----------|--------|
| `getWeeklyGoalProgress` | Obter progresso da meta | OK |
| `updateWeeklyGoalProgress` | Atualizar progresso | OK |
| `getWeeklyGoalStatus` | Status completo das metas | OK |
| `incrementWeeklyLesson` | Incrementar licoes | OK |
| `incrementWeeklyVerse` | Incrementar versiculos | OK |
| `incrementWeeklyMission` | Incrementar missoes | OK |
| `incrementWeeklyDevotional` | Incrementar devocionais | OK |

### Leitura de Devocionais

| Metodo | Descricao | Status |
|--------|-----------|--------|
| `confirmDevotionalRead` | Confirmar leitura | OK |
| `hasReadDevotional` | Verificar se ja leu | OK |
| `getDevotionalReadings` | Listar leituras | OK |

## Problemas Identificados e Correcoes

### CORRIGIDO: Chamada duplicada de incrementWeeklyDevotional

**Problema**: A funcao `incrementWeeklyDevotional` estava sendo chamada DUAS vezes quando um devocional era marcado como lido:
1. Uma vez dentro de `confirmDevotionalRead` em storage.ts (linha 2406)
2. Uma vez na rota POST `/api/study/devotional-read/:id` (linha 3657)

**Solucao**: Remover a chamada duplicada na rota, mantendo apenas a chamada dentro de `confirmDevotionalRead` que ja faz o incremento corretamente.

### Frontend - Estado isMarkedAsRead

O frontend ja esta funcionando corretamente:
- A query busca o status em `/api/study/devotional-status/:id`
- O estado `isAlreadyRead` e hidratado a partir de `readStatus?.isRead`
- O botao "Marcar como lido" e desabilitado quando `isAlreadyRead` e true

## Frontend - O que Falta Implementar

1. **Tela de selecao de temporadas** - Interface para navegar entre temporadas
2. **Tela do desafio final com cronometro** - UI para o desafio final cronometrado
3. **Widget de metas semanais** - Componente visual das metas
4. **Compartilhamento de rankings** - Funcao de compartilhar ranking nas redes

## Arquitetura do Sistema

```
Usuario
   |
   v
Frontend (React + TypeScript)
   |
   +-- Pagina de Devocionais
   |     +-- Lista de devocionais
   |     +-- Detalhe com botao "Marcar como lido"
   |
   +-- Sistema de Estudo (DeoGlory)
   |     +-- Temporadas
   |     +-- Licoes
   |     +-- Desafio Final
   |
   v
Backend (Express + TypeScript)
   |
   +-- Rotas de API
   |     +-- /api/study/* (temporadas, licoes, metas)
   |     +-- /api/site/* (devocionais, eventos)
   |
   +-- Storage (DatabaseStorage)
   |     +-- Metodos CRUD
   |     +-- Logica de negocio
   |
   v
PostgreSQL (Neon)
   |
   +-- Tabelas de temporadas
   +-- Tabelas de progresso
   +-- Tabelas de metas semanais
```

## Variaveis de Ambiente Necessarias

- `DATABASE_URL` - Conexao PostgreSQL (Neon)
- `RESEND_API_KEY` - Servico de email
- `OPENAI_API_KEY` ou `GOOGLE_AI_API_KEY` - Geracao de conteudo por IA
