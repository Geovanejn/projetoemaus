# Site Institucional UMP Emaus - Lista de Tarefas

## Informacoes do Projeto
**Nome:** Site Institucional UMP Emaus
**Versao:** 1.0
**Data de Criacao:** 04/12/2025
**Status:** PENDENTE

---

## Fase 1: Banco de Dados

### 1.1 Alteracoes no Schema
- [ ] Adicionar campo `secretaria` na tabela `users`
- [ ] Criar tabela `devotionals`
- [ ] Criar tabela `events`
- [ ] Criar tabela `prayer_requests`
- [ ] Criar tabela `banners`
- [ ] Criar tabela `board_members`
- [ ] Criar tabela `site_content`
- [ ] Criar tabela `instagram_posts`
- [ ] Criar insert/select schemas com drizzle-zod
- [ ] Executar db:push

### 1.2 Storage Layer
- [ ] Adicionar metodos CRUD para devotionals
- [ ] Adicionar metodos CRUD para events
- [ ] Adicionar metodos CRUD para prayer_requests
- [ ] Adicionar metodos CRUD para banners
- [ ] Adicionar metodos CRUD para board_members
- [ ] Adicionar metodos CRUD para site_content
- [ ] Adicionar metodos CRUD para instagram_posts
- [ ] Atualizar metodo de users para incluir secretaria

---

## Fase 2: Backend (API)

### 2.1 Middleware
- [ ] Criar middleware checkSecretaria()
- [ ] Atualizar middleware requireAuth para incluir secretaria

### 2.2 Rotas Publicas
- [ ] GET /api/devotionals (lista publica)
- [ ] GET /api/devotionals/featured (destaque do dia)
- [ ] GET /api/devotionals/:id (devocional individual)
- [ ] GET /api/events (lista de eventos)
- [ ] GET /api/events/upcoming (proximos eventos)
- [ ] GET /api/events/:id (evento individual)
- [ ] POST /api/prayer-requests (enviar pedido)
- [ ] GET /api/banners (banners ativos)
- [ ] GET /api/board (diretoria atual)
- [ ] GET /api/content/:page (conteudo da pagina)
- [ ] GET /api/instagram/feed (feed do Instagram)

### 2.3 Rotas Admin - Membros
- [ ] PATCH /api/admin/members/:id (atualizar com secretaria)

### 2.4 Rotas Admin - Devocionais (Espiritualidade)
- [ ] GET /api/admin/devotionals
- [ ] POST /api/admin/devotionals
- [ ] PUT /api/admin/devotionals/:id
- [ ] DELETE /api/admin/devotionals/:id
- [ ] PATCH /api/admin/devotionals/:id/feature

### 2.5 Rotas Admin - Eventos (Marketing)
- [ ] GET /api/admin/events
- [ ] POST /api/admin/events
- [ ] PUT /api/admin/events/:id
- [ ] DELETE /api/admin/events/:id

### 2.6 Rotas Admin - Pedidos de Oracao (Espiritualidade)
- [ ] GET /api/admin/prayer-requests
- [ ] PATCH /api/admin/prayer-requests/:id/status
- [ ] DELETE /api/admin/prayer-requests/:id

### 2.7 Rotas Admin - Banners (Marketing)
- [ ] GET /api/admin/banners
- [ ] POST /api/admin/banners
- [ ] PUT /api/admin/banners/:id
- [ ] DELETE /api/admin/banners/:id
- [ ] PATCH /api/admin/banners/reorder

### 2.8 Rotas Admin - Diretoria (Admin)
- [ ] GET /api/admin/board
- [ ] POST /api/admin/board
- [ ] PUT /api/admin/board/:id
- [ ] DELETE /api/admin/board/:id

### 2.9 Rotas Admin - Conteudo (Admin/Marketing)
- [ ] GET /api/admin/content
- [ ] PUT /api/admin/content/:page/:section

---

## Fase 3: Frontend - Componentes Base

### 3.1 Layout
- [ ] Criar componente Header (mobile e desktop)
- [ ] Criar componente Footer
- [ ] Criar componente MobileDrawer (menu lateral)
- [ ] Criar componente BottomNav (navegacao inferior opcional)
- [ ] Criar componente PageLayout (wrapper de pagina)

### 3.2 UI Componentes
- [ ] Criar componente HeroBanner (carrossel animado)
- [ ] Criar componente BannerSlide
- [ ] Criar componente EventCard
- [ ] Criar componente DevotionalCard
- [ ] Criar componente BoardMemberCard
- [ ] Criar componente SectionHeader
- [ ] Criar componente InstagramFeed
- [ ] Criar componente QuickAccessCard

### 3.3 Formularios
- [ ] Criar componente PrayerRequestForm
- [ ] Criar componente DevotionalForm (admin)
- [ ] Criar componente EventForm (admin)
- [ ] Criar componente BannerForm (admin)
- [ ] Criar componente BoardMemberForm (admin)

---

## Fase 4: Frontend - Paginas Publicas

### 4.1 Home Page
- [ ] Criar pagina Home (/)
- [ ] Implementar HeroBanner com slides
- [ ] Implementar secao Devocional do Dia
- [ ] Implementar secao Proximos Eventos
- [ ] Implementar secao Instagram Feed
- [ ] Implementar secao Acesso Rapido
- [ ] Adicionar animacoes Framer Motion

### 4.2 Devocionais
- [ ] Criar pagina lista de devocionais (/devocionais)
- [ ] Criar pagina devocional individual (/devocionais/:id)
- [ ] Implementar busca e filtros
- [ ] Implementar compartilhamento

### 4.3 Agenda/Eventos
- [ ] Criar pagina lista de eventos (/agenda)
- [ ] Criar pagina evento individual (/agenda/:id)
- [ ] Implementar visualizacao calendario
- [ ] Implementar filtros por categoria

### 4.4 Quem Somos
- [ ] Criar pagina quem somos (/quem-somos)
- [ ] Implementar secao Historia
- [ ] Implementar secao Missao/Visao/Valores
- [ ] Implementar secao Localizacao (mapa)

### 4.5 Diretoria
- [ ] Criar pagina diretoria (/diretoria)
- [ ] Implementar grid de membros
- [ ] Implementar animacoes de entrada

### 4.6 Pedido de Oracao
- [ ] Criar pagina formulario (/oracao)
- [ ] Implementar formulario com validacao
- [ ] Implementar feedback de sucesso

### 4.7 Area do Membro
- [ ] Criar pagina escolha de sistema (/membro)
- [ ] Implementar cards de selecao
- [ ] Integrar com login existente

---

## Fase 5: Frontend - Paineis Admin

### 5.1 Painel Geral
- [ ] Atualizar sidebar do admin com novas opcoes
- [ ] Implementar verificacao de secretaria no menu
- [ ] Criar dashboard com estatisticas

### 5.2 Painel Devocionais (Espiritualidade)
- [ ] Criar pagina listagem devocionais
- [ ] Criar pagina criar/editar devocional
- [ ] Implementar editor de texto rico
- [ ] Implementar definir destaque

### 5.3 Painel Eventos (Marketing)
- [ ] Criar pagina listagem eventos
- [ ] Criar pagina criar/editar evento
- [ ] Implementar upload de imagem
- [ ] Implementar seletor de data/hora

### 5.4 Painel Pedidos de Oracao (Espiritualidade)
- [ ] Criar pagina listagem pedidos
- [ ] Implementar filtros por status/categoria
- [ ] Implementar atualizar status
- [ ] Implementar estatisticas

### 5.5 Painel Banners (Marketing)
- [ ] Criar pagina listagem banners
- [ ] Criar pagina criar/editar banner
- [ ] Implementar reordenacao drag-and-drop
- [ ] Implementar preview

### 5.6 Painel Diretoria (Admin)
- [ ] Criar pagina listagem diretoria
- [ ] Criar pagina criar/editar membro
- [ ] Implementar upload de foto

### 5.7 Painel Membros (Admin)
- [ ] Atualizar formulario com campo secretaria
- [ ] Implementar filtro por secretaria

---

## Fase 6: Integracoes

### 6.1 Instagram
- [ ] Configurar Instagram Basic Display API
- [ ] Implementar cache de posts
- [ ] Implementar atualizacao automatica

### 6.2 WhatsApp
- [ ] Implementar link de compartilhamento
- [ ] Implementar link para contato

---

## Fase 7: Finalizacao

### 7.1 Testes
- [ ] Testar todas as paginas publicas
- [ ] Testar paineis admin por secretaria
- [ ] Testar responsividade mobile
- [ ] Testar dark mode

### 7.2 Performance
- [ ] Implementar lazy loading de imagens
- [ ] Implementar skeleton loading
- [ ] Otimizar animacoes

### 7.3 SEO
- [ ] Adicionar meta tags
- [ ] Adicionar Open Graph
- [ ] Adicionar sitemap

---

## Estimativa de Tempo

| Fase | Tempo Estimado |
|------|----------------|
| Fase 1: Banco de Dados | 2-3 horas |
| Fase 2: Backend API | 4-5 horas |
| Fase 3: Componentes Base | 3-4 horas |
| Fase 4: Paginas Publicas | 5-6 horas |
| Fase 5: Paineis Admin | 4-5 horas |
| Fase 6: Integracoes | 2-3 horas |
| Fase 7: Finalizacao | 2-3 horas |
| **Total** | **22-29 horas** |

---

## Prioridades

### Alta Prioridade
1. Home Page com banner animado
2. Pagina de devocionais
3. Pagina de eventos/agenda
4. Painel admin para devocionais
5. Painel admin para eventos

### Media Prioridade
1. Pedidos de oracao
2. Quem Somos
3. Diretoria
4. Campo secretaria nos membros

### Baixa Prioridade
1. Integracao Instagram
2. Historico de diretorias
3. Calendario visual

---

*Documento criado em: 04/12/2025*
*Versao: 1.0*
