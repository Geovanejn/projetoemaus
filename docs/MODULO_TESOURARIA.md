# Módulo de Tesouraria - Especificação Completa

## Diretrizes de Design

### Mobile First
- **OBRIGATÓRIO**: Todo o sistema deve ser totalmente adaptado para mobile
- Nunca usar scroll horizontal, apenas vertical
- Todas as páginas, modais, formulários e componentes devem ser responsivos
- Testar em viewports de 320px a 428px (dispositivos móveis comuns)
- Usar classes Tailwind responsivas: `sm:`, `md:`, `lg:` para adaptações

## Progresso de Implementação

> Marcar com [x] conforme cada item for implementado.

### Schema do Banco de Dados
- [x] Campo `isTreasurer` na tabela `users`
- [x] Campo `activeMemberSince` na tabela `users`
- [x] Tabela `treasury_settings`
- [x] Tabela `treasury_entries`
- [x] Tabela `treasury_loans`
- [x] Tabela `treasury_loan_installments`
- [x] Tabela `treasury_expense_categories`
- [x] Tabela `shop_categories`
- [x] Tabela `shop_items`
- [x] Tabela `shop_item_images`
- [x] Tabela `shop_item_sizes`
- [x] Tabela `shop_item_size_charts`
- [x] Tabela `shop_cart_items`
- [x] Tabela `shop_orders`
- [x] Tabela `shop_order_items`
- [x] Tabela `event_fees`
- [x] Tabela `event_confirmations`
- [x] Tabela `treasury_notifications_log`
- [x] Tabela `member_ump_payments`
- [x] Tabela `member_percapta_payments`

### Frontend - Painel do Tesoureiro
- [x] Página principal do dashboard
- [x] Componente de resumo financeiro
- [x] Gráfico mensal (entradas vs saídas em barras)
- [x] Gráficos adicionais (pizza por categoria)
- [x] Lista de transações com filtros
- [x] Alertas de inadimplência
- [x] Formulário de configurações (taxas, chave PIX)
- [x] Página de taxas dos membros
- [x] Página de empréstimos
- [x] Página de pedidos da loja
- [x] Página de relatórios
- [x] Formulário de entrada manual (com tipos e categorias)
- [x] Formulário de saída manual (integrado no mesmo formulário)
- [x] Gerenciamento de empréstimos (criar/editar)
- [x] Gerenciamento de parcelas
- [x] Envio de notificações manuais
- [x] Geração de relatórios (PDF/Excel)

### Frontend - Painel Financeiro do Membro
- [x] Página principal do painel financeiro (/study/financeiro)
- [x] Status de Taxa Percapta
- [x] Status de Taxa UMP (meses pagos/pendentes)
- [x] Histórico de pagamentos
- [x] Histórico de pedidos da loja
- [x] Histórico de eventos
- [x] Componente de pagamento PIX (QR Code) - PixPaymentModal.tsx
- [x] Botão pagar Taxa UMP via PIX
- [x] Botão pagar Taxa Percapta via PIX

### Frontend - Loja Virtual
- [x] Página de catálogo (listagem de itens)
- [x] Página de detalhes do item
- [x] Carrossel de imagens
- [x] Seleção de gênero/tamanho
- [x] Tabela de medidas
- [x] Carrinho de compras
- [x] Página de checkout
- [x] Página de meus pedidos (/study/meus-pedidos)
- [x] PIX automático após checkout
- [x] Gerar PIX para pedidos pendentes em Meus Pedidos

### Frontend - Marketing (Gestão da Loja)
- [x] CRUD de categorias
- [x] CRUD de itens
- [x] Upload de imagens
- [x] Gestão de tamanhos
- [x] Gestão de tabela de medidas
- [x] Lista de pedidos (PedidosAdmin.tsx)
- [x] Atualização de status em lote
- [x] Filtros de pedidos (status, busca, data)
- [x] Modal de detalhes do pedido

### Frontend - Eventos com Taxa
- [x] Modificar página de evento para taxa
- [x] Fluxo de confirmação com pagamento
- [x] Contador de confirmados (API implementada)
- [x] Pagamento para visitantes (API implementada)
- [x] Botão pagar taxa de evento via PIX (na página financeiro)

### Backend - APIs
- [x] Endpoints de configurações
- [x] Endpoints de entradas/saídas
- [x] Endpoints de empréstimos
- [x] Endpoints de PIX (criar, status, refresh)
- [x] Webhook do Mercado Pago
- [x] Endpoints de taxas do membro
- [x] Endpoints de eventos com taxa
- [x] Endpoints da loja (admin)
- [x] Endpoints da loja (membro)
- [x] Endpoint de dashboard mensal (GET /api/treasury/dashboard/monthly)
- [x] Endpoints de relatórios Excel (movimentações, pagamentos de membros)
- [x] Endpoints de notificações manuais (individual e em massa)
- [x] Endpoints de dashboard
- [x] Endpoints de taxas de eventos (CRUD + confirmações)

### Integração Mercado Pago
- [x] Configuração do SDK (mercadopago.ts)
- [x] Geração de QR Code PIX
- [x] Processamento de webhook
- [x] Atualização automática de status
- [x] Polling de status a cada 5 segundos
- [x] Expiração de 15 minutos para QR Codes

### Sistema de Notificações
- [x] Scheduler dia 5 (Taxa UMP/Percapta) - mensal às 08:00
- [x] Scheduler eventos (5, 3, 1 dia antes) - diário às 08:00
- [x] Scheduler carrinho abandonado - a cada hora (2h/12h/24h/48h)
- [x] Scheduler parcelas de empréstimo - diário às 08:00 (3 dias, 1 dia, no dia)
- [x] Scheduler virada de ano - 1º de janeiro às 00:05
- [x] Scheduler resumo mensal - dia 1 às 08:00 (inclui alerta de saldo)
- [x] Notificação de pedido pronto (ao mudar status para 'ready')
- [x] Notificação de saldo zerado/negativo (incluído no resumo mensal)
- Nota: Schedulers usam cache em memória (reminders podem repetir após restart)

---

## IMPORTANTE: Após Conclusão da Implementação

> Após a conclusão de TODO o módulo da tesouraria, gerar o SQL completo para adicionar as novas tabelas e colunas que foram criadas. Este SQL deve ser salvo em `docs/MIGRATION_TESOURARIA.sql` para aplicar em produção.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Perfis e Permissões](#2-perfis-e-permissões)
3. [Tipos de Entrada](#3-tipos-de-entrada)
4. [Tipos de Saída](#4-tipos-de-saída)
5. [Integração PIX - Mercado Pago](#5-integração-pix---mercado-pago)
6. [Taxas (Percapta e UMP)](#6-taxas-percapta-e-ump)
7. [Loja Virtual](#7-loja-virtual)
8. [Eventos com Taxa](#8-eventos-com-taxa)
9. [Dashboard do Tesoureiro](#9-dashboard-do-tesoureiro)
10. [Painel Financeiro do Membro](#10-painel-financeiro-do-membro)
11. [Notificações](#11-notificações)
12. [Relatórios](#12-relatórios)
13. [Configurações](#13-configurações)
14. [Regras de Negócio](#14-regras-de-negócio)
15. [Modelo de Dados](#15-modelo-de-dados)
16. [APIs e Endpoints](#16-apis-e-endpoints)
17. [Fluxos de Usuário](#17-fluxos-de-usuário)
18. [Perguntas e Respostas Completas](#18-perguntas-e-respostas-completas)

---

## 1. Visão Geral

O módulo de tesouraria é um sistema completo de gestão financeira para a UMP Emaús, integrado com:

- **Painel do Tesoureiro**: Dashboard financeiro completo
- **Painel do Membro**: Visualização e pagamento de taxas
- **Loja Virtual**: Venda de itens (camisetas, kits, livros)
- **Integração Mercado Pago**: Pagamento automático via PIX
- **Sistema de Notificações**: Cobranças e lembretes automáticos

### Características Principais

- Pagamento 100% automático via PIX (Mercado Pago)
- Taxa de 0,99% por transação (aceita)
- QR Code válido por 15 minutos
- Detecção automática de pagamento via webhook
- Fuso horário: São Paulo, Brasil (America/Sao_Paulo)
- Período fiscal: Janeiro a Dezembro

---

## 2. Perfis e Permissões

### 2.1 Tesoureiro

- **Definição**: Membro comum com flag `isTreasurer = true`
- **Quantidade**: Apenas 1 por ano
- **Acesso**: Painel completo da tesouraria
- **Responsabilidades**:
  - Definir valores de taxas
  - Cadastrar chave PIX
  - Registrar entradas/saídas manuais
  - Gerenciar empréstimos
  - Gerar relatórios
  - Enviar notificações manuais de cobrança

### 2.2 Admin

- **Acesso**: Completo ao painel da tesouraria
- **Responsabilidades específicas**:
  - Configurar Access Token do Mercado Pago
  - Definir quem é tesoureiro
- **Restrição**: Admin NÃO pode ser tesoureiro (flags exclusivas)

### 2.3 Secretário de Marketing

- **Acesso limitado**:
  - Criar/gerenciar itens da loja
  - Ver lista de pedidos (SEM valores financeiros)
  - Atualizar status de pedidos
  - Ver lista de confirmados em eventos
- **NÃO pode ver**: Valores financeiros, dashboard, relatórios

### 2.4 Membro Ativo

- **Acesso**:
  - Painel financeiro pessoal
  - Loja virtual
  - Pagamento de taxas (Percapta, UMP, Eventos)
- **Visualiza**: Apenas seus próprios dados financeiros

### 2.5 Membro Inativo

- **Acesso**:
  - Painel financeiro pessoal (histórico)
  - Loja virtual
  - Pagamento de taxa de eventos
- **NÃO paga**: Taxa Percapta, Taxa UMP

---

## 3. Tipos de Entrada

### 3.1 Taxa Percapta

| Campo | Valor |
|-------|-------|
| Frequência | Única por ano |
| Quem paga | Apenas membros ativos |
| Valor | Definido pelo tesoureiro |
| Retroativo | Integral (independente do mês de entrada) |

### 3.2 Taxa UMP Emaús

| Campo | Valor |
|-------|-------|
| Frequência | Mensal OU pagamento único anual |
| Quem paga | Apenas membros ativos |
| Valor mensal | Definido pelo tesoureiro |
| Período | Janeiro a Dezembro |

**Regras de pagamento:**

1. **Mensal**: Paga mês a mês, em ordem (não pode pular meses)
2. **Único**: Calcula meses restantes × valor mensal
3. **Múltiplos meses**: Pode pagar vários meses para frente (ex: jan + fev + mar)
4. **Regra do dia 10**:
   - Virou ativo dia 1-10 → Paga a partir DESTE mês
   - Virou ativo dia 11-31 → Paga a partir do MÊS SEGUINTE

### 3.3 Empréstimo Recebido

| Campo | Descrição |
|-------|-----------|
| Origem | Igreja, Membro, Federação, Outro |
| Valor total | Valor do empréstimo |
| Forma de pagamento | À vista ou Parcelado |
| Se parcelado | Qtd parcelas, valor parcela, datas de vencimento |

### 3.4 Diversos (Loja)

| Campo | Descrição |
|-------|-----------|
| Origem | Vendas da loja virtual |
| Itens | Camiseta, Kit UMP, Livros, Acessórios, etc. |
| Quem pode comprar | Membros ativos, inativos e visitantes |
| Visitantes | Opção "Outros" com nome livre |

---

## 4. Tipos de Saída

### 4.1 Taxa Percapta

- Repasse da taxa à federação
- Tesoureiro registra manualmente
- Anexa comprovante (opcional)

### 4.2 Empréstimo (Pagamento)

- Pagamento de empréstimo recebido
- Vincula ao empréstimo de origem
- Pode ser parcelado
- Notificações de vencimento de parcelas

### 4.3 Eventos

- Gastos com eventos
- Descrição livre
- Anexa comprovante (opcional)

### 4.4 Marketing

- Gastos com divulgação
- Descrição livre
- Anexa comprovante (opcional)

### 4.5 Categorias Customizadas

- Tesoureiro pode criar novas categorias de saída

---

## 5. Integração PIX - Mercado Pago

### 5.1 Configuração

| Campo | Valor |
|-------|-------|
| Provedor | Mercado Pago |
| Tipo de conta | Pessoa Física (CPF) |
| Taxa | 0,99% por transação |
| Quem configura | Admin (Access Token) |
| Chave PIX | Tesoureiro cadastra no painel |

### 5.2 Fluxo de Pagamento

```
1. Membro seleciona o que pagar
2. Sistema gera QR Code + código PIX copia-cola
3. QR Code válido por 15 minutos
4. Membro paga via app do banco
5. Webhook recebe confirmação automática
6. Sistema atualiza status para "Pago"
7. Membro recebe notificação de confirmação
```

### 5.3 PIX Expirado

- Se expirar sem pagar: membro clica para gerar novo PIX
- Pedido é mantido (não precisa refazer)

### 5.4 Troca de Tesoureiro

- Novo tesoureiro cadastra sua chave PIX
- Admin atualiza Access Token do Mercado Pago
- Histórico de transações permanece no sistema

### 5.5 Requisitos Técnicos

- Webhook: HTTPS obrigatório (Render já tem)
- Access Token: armazenado como secret
- Validação de assinatura do webhook

### 5.6 Como Obter o Access Token do Mercado Pago

1. **Criar conta no Mercado Pago**:
   - Acesse https://www.mercadopago.com.br
   - Crie uma conta ou faça login

2. **Acessar painel de desenvolvedores**:
   - Acesse https://www.mercadopago.com.br/developers/panel
   - Clique em "Suas integrações"

3. **Criar uma aplicação**:
   - Clique em "Criar aplicação"
   - Nome: "UMP Emaús - Sistema de Pagamentos"
   - Selecione: "Pagamentos online" > "CheckoutAPI"
   - Aceite os termos e crie

4. **Obter credenciais de PRODUÇÃO**:
   - Após criar, clique na aplicação
   - Vá em "Credenciais de produção"
   - Copie o **Access Token** (começa com `APP_USR-`)
   
   **IMPORTANTE**: Use as credenciais de PRODUÇÃO, não as de teste!

5. **Configurar Webhook**:
   - Na mesma página, vá em "Webhooks"
   - Clique em "Configurar notificações"
   - URL: `https://SEU-DOMINIO.onrender.com/api/pix/webhook`
   - Eventos: Marque "Pagamentos" (payments)
   - Salve

### 5.7 Configurar no Render

1. **Acessar o Render**:
   - Acesse https://dashboard.render.com
   - Selecione seu serviço (Web Service)

2. **Adicionar a variável de ambiente**:
   - Vá em "Environment" no menu lateral
   - Clique em "Add Environment Variable"
   - Key: `MERCADO_PAGO_ACCESS_TOKEN`
   - Value: Cole o Access Token copiado do Mercado Pago
   - Clique em "Save Changes"

3. **Reiniciar o serviço**:
   - O Render vai reiniciar automaticamente
   - Aguarde o deploy concluir

4. **Verificar configuração**:
   - Acesse o sistema e faça um pagamento de teste
   - O QR Code PIX deve aparecer

### 5.8 Endpoints PIX Implementados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/pix/status` | Verifica se PIX está configurado |
| POST | `/api/pix/generate/:entryId` | Gera QR Code para uma entrada |
| GET | `/api/pix/check/:entryId` | Verifica status do pagamento |
| POST | `/api/pix/webhook` | Recebe notificações do Mercado Pago |
| POST | `/api/pix/member-fee` | Gera PIX para taxa de membro |
| POST | `/api/pix/shop-order/:orderId` | Gera PIX para pedido da loja |
| POST | `/api/pix/event-fee/:eventId` | Gera PIX para taxa de evento |

### 5.9 Componentes Frontend

| Componente | Localização | Descrição |
|------------|-------------|-----------|
| PixPaymentModal | `client/src/components/PixPaymentModal.tsx` | Modal com QR Code, código copia-cola, countdown |
| Financeiro | `client/src/pages/study/financeiro.tsx` | Painel financeiro do membro com PIX |
| Loja | `client/src/pages/study/loja.tsx` | Checkout com PIX automático |
| Meus Pedidos | `client/src/pages/study/meus-pedidos.tsx` | Gerar PIX para pedidos pendentes |

### 5.10 Fluxo Técnico do PIX

```
[Usuário clica "Pagar"]
       |
       v
[Frontend chama POST /api/pix/generate/:entryId]
       |
       v
[Backend cria cobrança no Mercado Pago]
       |
       v
[Retorna QR Code + código copia-cola]
       |
       v
[Modal exibe QR Code com countdown de 15 min]
       |
       v
[Polling a cada 5s: GET /api/pix/check/:entryId]
       |
       v
[Se aprovado ou webhook recebido]
       |
       v
[Atualiza status para "completed" + notifica usuário]
```

---

## 6. Taxas (Percapta e UMP)

### 6.1 Configuração de Valores

- Tesoureiro define valores no painel
- Histórico de valores é guardado (ex: 2024 = R$10, 2025 = R$15)

### 6.2 Virada de Ano (1º de Janeiro)

- Sistema detecta automaticamente
- Zera status de Taxa Percapta (todos precisam pagar de novo)
- Zera meses de Taxa UMP (começa janeiro)
- Histórico completo é mantido
- Notificação enviada avisando sobre novo período

### 6.3 Membro Inativo

- NÃO deve Taxa Percapta
- NÃO deve Taxa UMP
- Meses anteriores (quando era ativo) não ficam pendentes
- Ao reativar: começa a contar do mês atual (regra do dia 10)

### 6.4 Membro Novo

- Meses anteriores ao cadastro não aparecem
- Taxa Percapta: paga integral do ano atual
- Taxa UMP: segue regra do dia 10

---

## 7. Loja Virtual

### 7.1 Estrutura de Itens

```
Item da Loja
├── Nome
├── Descrição (máx 500 caracteres)
├── Preço
├── Categoria (Vestuários, Acessórios, Livros, Kit UMP, ou customizada)
├── Status (Disponível / Indisponível)
├── Gênero (Masculino / Feminino / Unissex)
├── Tamanhos disponíveis (opcional, customizável por item)
├── Tabela de medidas (opcional, por gênero)
│   ├── Campos: largura, comprimento, manga, ombro (em cm)
│   └── Separada por gênero quando aplicável
└── Imagens
    ├── Masculino: até 5 imagens
    ├── Feminino: até 5 imagens
    └── Primeira imagem = imagem principal (listagem)
```

### 7.2 Categorias de Itens

- **Iniciais**: Vestuários, Acessórios, Livros, Kit UMP
- **Customizadas**: Marketing pode criar novas

### 7.3 Tamanhos

- Definidos livremente por item
- Exemplos: PP, P, M, G, GG, XG, XXG
- Ou numéricos: 1, 2, 3... (infantil)
- Ou calçados: 36, 38, 40, 42...

### 7.4 Estoque

- Apenas Disponível / Indisponível (sem quantidade)
- Marketing controla
- Item indisponível não aparece na loja

### 7.5 Pré-venda

- Item pode ser criado antes de ter estoque
- Permite abrir pedidos antes de produzir

### 7.6 Carrinho

| Funcionalidade | Comportamento |
|----------------|---------------|
| Múltiplos itens | SIM |
| Múltiplas unidades do mesmo item | SIM |
| Expiração | NÃO expira |
| Deletar itens | Individual ou todos |
| Observação | Membro pode adicionar |
| Cancelar antes de pagar | SIM |

### 7.7 Carrinho Abandonado

- Notificações após: 2h, 12h, 24h, 48h
- Total: 4 notificações repetidas

### 7.8 Pedidos

```
Pedido
├── Código único (#2025-0001)
├── Membro
├── Itens (com quantidade, tamanho, gênero)
├── Observação (opcional)
├── Valor total
├── Status do pagamento
├── Status do pedido
│   ├── Aguardando Pagamento
│   ├── Pago (automático pelo sistema)
│   ├── Produzindo (Marketing atualiza)
│   └── Pronto para Retirada (Marketing atualiza)
└── Data/hora
```

### 7.9 Entrega

- Retirada pessoalmente na igreja
- Sem frete, sem endereço

### 7.10 Quem Gerencia

| Ação | Responsável |
|------|-------------|
| Criar/editar itens | Marketing |
| Definir categorias | Marketing |
| Controlar estoque | Marketing |
| Ver pedidos | Marketing (sem valores) |
| Atualizar status | Marketing (Produzindo, Pronto) |
| Atualizar em lote | Marketing (SIM) |
| Ver valores | Tesoureiro/Admin |

---

## 8. Eventos com Taxa

### 8.1 Configuração do Evento (Marketing)

```
Evento
├── Dados básicos (nome, data, local, etc.)
├── Tem taxa? (SIM/NÃO)
│   ├── Valor da taxa
│   └── Prazo para pagamento
└── Publicar
```

### 8.2 Fluxo de Confirmação

```
Evento GRATUITO:
  Membro clica "Confirmar Presença" → Confirmado direto

Evento com TAXA:
  Membro clica "Confirmar Presença"
  → Redireciona para Tesouraria
  → Gera PIX
  → Paga
  → Confirmado automaticamente
```

### 8.3 Informações do Evento

- Página do evento mostra: "X confirmados"
- Conta membros + visitantes que pagaram

### 8.4 Visitantes

- Membro pode pagar taxa para visitantes
- Múltiplos visitantes: SIM
- Mesmo valor para membro e visitante
- Não precisa informar dados do visitante
- Contabiliza na quantidade de confirmados

### 8.5 Cancelamento

- NÃO existe reembolso
- Pagou = Confirmado

### 8.6 Lista de Confirmados

- Quem vê: Marketing
- Exportar: NÃO necessário
- Check-in no evento: NÃO necessário

---

## 9. Dashboard do Tesoureiro

### 9.1 Resumo Financeiro

- Total de entradas (mês/ano)
- Total de saídas (mês/ano)
- Saldo atual
- Variação em relação ao período anterior

### 9.2 Gráficos

- **Linha/Barra**: Entradas vs Saídas por mês
- **Pizza**: Tipos de entrada
- **Pizza**: Tipos de saída
- **Barras**: Membros adimplentes vs inadimplentes

### 9.3 Alertas

- Membros inadimplentes (Taxa Percapta, Taxa UMP)
- Parcelas de empréstimo vencendo
- Saldo zerado ou negativo

### 9.4 Lista de Transações

- Todas as entradas e saídas
- Filtros: tipo, membro, período, status
- Ordenação: data, valor, tipo

### 9.5 Configurações

- Definir valor Taxa Percapta
- Definir valor Taxa UMP mensal
- Cadastrar chave PIX
- Criar categorias de saída

### 9.6 Ações

- Registrar entrada/saída manual
- Registrar empréstimo
- Marcar parcela como paga
- Enviar notificação manual de cobrança
- Gerar relatórios

---

## 10. Painel Financeiro do Membro

### 10.1 Localização

- Menu: listagem de painéis
- Separado do perfil

### 10.2 Membro Ativo - Visualiza

- Status da Taxa Percapta (Pago/Pendente)
- Status da Taxa UMP por mês
- Quais meses pagou, quando, quanto
- Quais meses faltam pagar
- Histórico de pedidos da loja (com status)
- Histórico de taxas de eventos

### 10.3 Membro Ativo - Pode Pagar

- Taxa Percapta
- Taxa UMP (mensal ou único)
- Taxa de eventos
- Itens da loja

### 10.4 Membro Inativo - Visualiza

- Histórico completo (quando era ativo)
- Pedidos da loja
- Taxas de eventos

### 10.5 Membro Inativo - Pode Pagar

- Taxa de eventos
- Itens da loja
- NÃO pode pagar: Percapta, UMP

---

## 11. Notificações

### 11.1 Notificações Automáticas

| Tipo | Quando | Para quem | Horário |
|------|--------|-----------|---------|
| Taxa UMP | Dia 5 de cada mês | Ativos que não pagaram o mês | 08:00 |
| Taxa Percapta | Dia 5 de cada mês | Ativos que não pagaram no ano | 08:00 |
| Evento (5 dias) | 5 dias antes | Quem não pagou taxa | 08:00 |
| Evento (3 dias) | 3 dias antes | Quem não pagou taxa | 08:00 |
| Evento (1 dia) | 1 dia antes | Quem não pagou taxa | 08:00 |
| Carrinho abandonado | 2h, 12h, 24h, 48h | Quem tem itens no carrinho | - |
| Parcela empréstimo | 3 dias, 1 dia, no dia | Tesoureiro | 08:00 |
| Virada de ano | 1º de janeiro | Todos ativos | 08:00 |
| Pedido pronto | Quando status mudar | Membro do pedido | - |
| Resumo mensal | Dia 1 de cada mês | Tesoureiro | 08:00 |
| Saldo zerado/negativo | Quando acontecer | Tesoureiro | - |

### 11.2 Regra de Supressão

- NÃO notificar quem já pagou
- Verificar status antes de enviar

### 11.3 Notificações Manuais

- Tesoureiro pode enviar cobrança manual
- Tipos: Percapta, UMP, Evento, Diversos
- Seleciona destinatários ou grupo

### 11.4 Textos Dinâmicos

```
Pedido pronto:
"Seu(a) {item} está pronto(a) para retirada na igreja!"

Exemplos:
- "Sua Camiseta está pronta para retirada na igreja!"
- "Seu Kit UMP está pronto para retirada na igreja!"
- "Seu Livro está pronto para retirada na igreja!"
```

---

## 12. Relatórios

### 12.1 Formatos de Exportação

- PDF
- Excel

### 12.2 Tipos de Relatório

| Relatório | Descrição |
|-----------|-----------|
| Inadimplência | Membros que devem Percapta e/ou UMP com valores |
| Entradas | Por tipo, período, membro |
| Saídas | Por tipo, período, categoria |
| Vendas da Loja | Por item, membro, período, quantidade, valor |
| Eventos | Arrecadação por evento, confirmados |
| Empréstimos | Situação, parcelas, vencimentos |
| Membros | Histórico financeiro individual |

### 12.3 Filtros Disponíveis

- Período (data inicial/final)
- Membro
- Tipo de entrada/saída
- Evento
- Status (pago/pendente)
- Categoria de item (loja)
- Item específico (loja)
- Ano fiscal

---

## 13. Configurações

### 13.1 Configurações do Admin

| Campo | Descrição |
|-------|-----------|
| Access Token Mercado Pago | Token de produção da API |
| Definir tesoureiro | Flag no cadastro do membro |

### 13.2 Configurações do Tesoureiro

| Campo | Descrição |
|-------|-----------|
| Chave PIX | CPF, email, telefone ou aleatória |
| Valor Taxa Percapta | Valor anual |
| Valor Taxa UMP mensal | Valor por mês |
| Categorias de saída | Criar novas categorias |

### 13.3 Configurações do Marketing

| Campo | Descrição |
|-------|-----------|
| Categorias de itens | Criar novas categorias |
| Itens da loja | CRUD completo |
| Status de estoque | Disponível/Indisponível |
| Status de pedidos | Produzindo/Pronto |

---

## 14. Regras de Negócio

### 14.1 Regra do Dia 10 (Taxa UMP)

```javascript
function devepagarMesAtual(dataCadastroAtivo) {
  const dia = dataCadastroAtivo.getDate();
  return dia <= 10;
}

// Exemplo:
// Cadastrado dia 8 de março → paga março
// Cadastrado dia 15 de março → paga a partir de abril
```

### 14.2 Cálculo de Pagamento Único (Taxa UMP)

```javascript
function calcularPagamentoUnico(valorMensal, mesesPagos) {
  const mesesRestantes = 12 - mesesPagos;
  return valorMensal * mesesRestantes;
}

// Exemplo:
// Valor mensal: R$10, pagou 3 meses
// Restante: 10 × 9 = R$90
```

### 14.3 Ordem de Pagamento (Taxa UMP)

```javascript
// CORRETO: Pagar meses em ordem
// Janeiro → Fevereiro → Março

// PERMITIDO: Pagar múltiplos meses à frente
// Estou em janeiro, posso pagar jan + fev + mar

// PROIBIDO: Pular meses
// Estou em janeiro, NÃO posso pagar março pulando fevereiro
```

### 14.4 Virada de Ano

```javascript
// Executar em 1º de janeiro às 00:01

function viradaDeAno() {
  // 1. Arquivar histórico do ano anterior
  // 2. Zerar status de Taxa Percapta
  // 3. Zerar meses de Taxa UMP
  // 4. Notificar membros ativos
}
```

### 14.5 Membro Inativo

```javascript
// Quando membro vira INATIVO:
// - NÃO cobrar mais Percapta/UMP
// - NÃO enviar notificações de cobrança
// - Manter acesso à loja e eventos

// Quando membro volta a ser ATIVO:
// - Aplicar regra do dia 10 para Taxa UMP
// - Cobrar Taxa Percapta integral
```

---

## 15. Modelo de Dados

### 15.1 Alteração na Tabela users

```typescript
// Adicionar campo
isTreasurer: boolean("is_treasurer").notNull().default(false)
```

### 15.2 treasury_settings

```typescript
export const treasurySettings = pgTable("treasury_settings", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(), // Ano fiscal
  percaptaAmount: integer("percapta_amount").notNull(), // Valor em centavos
  umpMonthlyAmount: integer("ump_monthly_amount").notNull(), // Valor em centavos
  pixKey: text("pix_key"), // Chave PIX do tesoureiro
  mercadoPagoToken: text("mercado_pago_token"), // Access Token (encriptado)
  treasurerId: integer("treasurer_id").references(() => users.id), // Tesoureiro do ano
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### 15.3 treasury_entries

```typescript
export const treasuryEntries = pgTable("treasury_entries", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'income' | 'expense'
  category: text("category").notNull(), // 'percapta' | 'ump' | 'loan' | 'misc' | 'events' | 'marketing' | custom
  subcategory: text("subcategory"), // Para diversos: 'camiseta' | 'kit_ump' | etc
  description: text("description"), // Descrição livre
  amount: integer("amount").notNull(), // Valor em centavos
  userId: integer("user_id").references(() => users.id), // Membro (nullable para visitantes)
  externalPayerName: text("external_payer_name"), // Nome do visitante/outros
  paymentMethod: text("payment_method").notNull(), // 'pix' | 'cash' | 'manual'
  paymentStatus: text("payment_status").notNull(), // 'pending' | 'paid' | 'expired'
  pixTransactionId: text("pix_transaction_id"), // ID do Mercado Pago
  pixQrCode: text("pix_qr_code"), // Código PIX
  pixQrCodeBase64: text("pix_qr_code_base64"), // QR Code imagem
  pixExpiresAt: timestamp("pix_expires_at"), // Expiração do PIX
  referenceMonth: integer("reference_month"), // 1-12 para Taxa UMP
  referenceYear: integer("reference_year").notNull(),
  eventId: integer("event_id"), // Para taxa de evento
  orderId: integer("order_id"), // Para pedidos da loja
  receiptUrl: text("receipt_url"), // Comprovante anexado
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
});
```

### 15.4 treasury_loans

```typescript
export const treasuryLoans = pgTable("treasury_loans", {
  id: serial("id").primaryKey(),
  origin: text("origin").notNull(), // 'church' | 'member' | 'federation' | 'other'
  originName: text("origin_name"), // Nome se 'other'
  originMemberId: integer("origin_member_id").references(() => users.id), // Se origem for membro
  totalAmount: integer("total_amount").notNull(), // Valor total em centavos
  isInstallment: boolean("is_installment").notNull().default(false),
  installmentCount: integer("installment_count"), // Quantidade de parcelas
  installmentAmount: integer("installment_amount"), // Valor de cada parcela
  status: text("status").notNull(), // 'active' | 'paid' | 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 15.5 treasury_loan_installments

```typescript
export const treasuryLoanInstallments = pgTable("treasury_loan_installments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").references(() => treasuryLoans.id).notNull(),
  installmentNumber: integer("installment_number").notNull(),
  amount: integer("amount").notNull(), // Valor em centavos
  dueDate: date("due_date").notNull(),
  status: text("status").notNull(), // 'pending' | 'paid'
  paidAt: timestamp("paid_at"),
  entryId: integer("entry_id").references(() => treasuryEntries.id), // Entrada vinculada
});
```

### 15.6 treasury_expense_categories

```typescript
export const treasuryExpenseCategories = pgTable("treasury_expense_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 15.7 shop_categories

```typescript
export const shopCategories = pgTable("shop_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 15.8 shop_items

```typescript
export const shopItems = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"), // Máx 500 caracteres
  price: integer("price").notNull(), // Valor em centavos
  categoryId: integer("category_id").references(() => shopCategories.id).notNull(),
  genderType: text("gender_type").notNull(), // 'male' | 'female' | 'unisex'
  hasSize: boolean("has_size").notNull().default(true),
  isAvailable: boolean("is_available").notNull().default(true),
  isPreOrder: boolean("is_pre_order").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### 15.9 shop_item_images

```typescript
export const shopItemImages = pgTable("shop_item_images", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => shopItems.id).notNull(),
  gender: text("gender").notNull(), // 'male' | 'female'
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
```

### 15.10 shop_item_sizes

```typescript
export const shopItemSizes = pgTable("shop_item_sizes", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => shopItems.id).notNull(),
  gender: text("gender").notNull(), // 'male' | 'female' | 'unisex'
  size: text("size").notNull(), // 'P' | 'M' | 'G' | '36' | '38' | etc
  sortOrder: integer("sort_order").notNull().default(0),
});
```

### 15.11 shop_item_size_charts

```typescript
export const shopItemSizeCharts = pgTable("shop_item_size_charts", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => shopItems.id).notNull(),
  gender: text("gender").notNull(), // 'male' | 'female'
  size: text("size").notNull(),
  width: decimal("width", { precision: 5, scale: 1 }), // Largura em cm
  length: decimal("length", { precision: 5, scale: 1 }), // Comprimento em cm
  sleeve: decimal("sleeve", { precision: 5, scale: 1 }), // Manga em cm
  shoulder: decimal("shoulder", { precision: 5, scale: 1 }), // Ombro em cm
});
```

### 15.12 shop_cart_items

```typescript
export const shopCartItems = pgTable("shop_cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  itemId: integer("item_id").references(() => shopItems.id).notNull(),
  quantity: integer("quantity").notNull().default(1),
  gender: text("gender"), // 'male' | 'female'
  size: text("size"),
  addedAt: timestamp("added_at").defaultNow(),
});
```

### 15.13 shop_orders

```typescript
export const shopOrders = pgTable("shop_orders", {
  id: serial("id").primaryKey(),
  orderCode: text("order_code").notNull().unique(), // #2025-0001
  userId: integer("user_id").references(() => users.id).notNull(),
  totalAmount: integer("total_amount").notNull(), // Valor em centavos
  observation: text("observation"),
  paymentStatus: text("payment_status").notNull(), // 'pending' | 'paid' | 'expired' | 'cancelled'
  orderStatus: text("order_status").notNull(), // 'awaiting_payment' | 'paid' | 'producing' | 'ready'
  entryId: integer("entry_id").references(() => treasuryEntries.id), // Entrada na tesouraria
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
});
```

### 15.14 shop_order_items

```typescript
export const shopOrderItems = pgTable("shop_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => shopOrders.id).notNull(),
  itemId: integer("item_id").references(() => shopItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  gender: text("gender"),
  size: text("size"),
  unitPrice: integer("unit_price").notNull(), // Preço unitário no momento da compra
});
```

### 15.15 event_fees

```typescript
export const eventFees = pgTable("event_fees", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull().unique(),
  feeAmount: integer("fee_amount").notNull(), // Valor em centavos
  deadline: timestamp("deadline").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 15.16 event_confirmations

```typescript
export const eventConfirmations = pgTable("event_confirmations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  isVisitor: boolean("is_visitor").notNull().default(false),
  visitorCount: integer("visitor_count").default(0), // Qtd visitantes pagos
  entryId: integer("entry_id").references(() => treasuryEntries.id), // Entrada na tesouraria (se evento pago)
  confirmedAt: timestamp("confirmed_at").defaultNow(),
});
```

### 15.17 treasury_notifications_log

```typescript
export const treasuryNotificationsLog = pgTable("treasury_notifications_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(), // 'percapta' | 'ump' | 'event' | 'cart' | 'loan' | 'order_ready'
  referenceId: integer("reference_id"), // ID do evento/pedido/empréstimo
  sentAt: timestamp("sent_at").defaultNow(),
  isManual: boolean("is_manual").notNull().default(false),
});
```

### 15.18 member_ump_payments

```typescript
export const memberUmpPayments = pgTable("member_ump_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  amount: integer("amount").notNull(), // Valor em centavos
  entryId: integer("entry_id").references(() => treasuryEntries.id).notNull(),
  paidAt: timestamp("paid_at").notNull(),
});

// Índice único para evitar pagamento duplicado
// UNIQUE(userId, year, month)
```

### 15.19 member_percapta_payments

```typescript
export const memberPercaptaPayments = pgTable("member_percapta_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  year: integer("year").notNull(),
  amount: integer("amount").notNull(), // Valor em centavos
  entryId: integer("entry_id").references(() => treasuryEntries.id).notNull(),
  paidAt: timestamp("paid_at").notNull(),
});

// Índice único para evitar pagamento duplicado
// UNIQUE(userId, year)
```

---

## 16. APIs e Endpoints

### 16.1 Configurações (Admin/Tesoureiro)

```
GET    /api/treasury/settings
POST   /api/treasury/settings
PATCH  /api/treasury/settings
POST   /api/treasury/settings/pix-key
```

### 16.2 Entradas e Saídas

```
GET    /api/treasury/entries
POST   /api/treasury/entries
GET    /api/treasury/entries/:id
PATCH  /api/treasury/entries/:id
GET    /api/treasury/entries/summary
```

### 16.3 Empréstimos

```
GET    /api/treasury/loans
POST   /api/treasury/loans
GET    /api/treasury/loans/:id
PATCH  /api/treasury/loans/:id/installments/:installmentId
```

### 16.4 Pagamentos PIX

```
POST   /api/treasury/pix/create
GET    /api/treasury/pix/:id/status
POST   /api/treasury/pix/:id/refresh
POST   /api/treasury/webhook/mercadopago (webhook)
```

### 16.5 Taxas do Membro

```
GET    /api/treasury/member/status
GET    /api/treasury/member/percapta
POST   /api/treasury/member/percapta/pay
GET    /api/treasury/member/ump
POST   /api/treasury/member/ump/pay
GET    /api/treasury/member/history
```

### 16.6 Eventos

```
GET    /api/treasury/events/:eventId/fee
POST   /api/treasury/events/:eventId/pay
GET    /api/treasury/events/:eventId/confirmations
```

### 16.7 Loja - Admin (Marketing)

```
GET    /api/shop/categories
POST   /api/shop/categories
GET    /api/shop/items
POST   /api/shop/items
GET    /api/shop/items/:id
PATCH  /api/shop/items/:id
DELETE /api/shop/items/:id
POST   /api/shop/items/:id/images
DELETE /api/shop/items/:id/images/:imageId
GET    /api/shop/orders
GET    /api/shop/orders/:id
PATCH  /api/shop/orders/:id/status
PATCH  /api/shop/orders/batch-status
```

### 16.8 Loja - Membro

```
GET    /api/shop/catalog
GET    /api/shop/catalog/:id
GET    /api/shop/cart
POST   /api/shop/cart
PATCH  /api/shop/cart/:itemId
DELETE /api/shop/cart/:itemId
DELETE /api/shop/cart
POST   /api/shop/checkout
GET    /api/shop/my-orders
GET    /api/shop/my-orders/:id
DELETE /api/shop/my-orders/:id (cancelar antes de pagar)
```

### 16.9 Relatórios

```
GET    /api/treasury/reports/delinquency
GET    /api/treasury/reports/income
GET    /api/treasury/reports/expenses
GET    /api/treasury/reports/sales
GET    /api/treasury/reports/events
GET    /api/treasury/reports/member/:userId
POST   /api/treasury/reports/export
```

### 16.10 Notificações Manuais

```
POST   /api/treasury/notifications/send
GET    /api/treasury/notifications/log
```

### 16.11 Dashboard

```
GET    /api/treasury/dashboard/summary
GET    /api/treasury/dashboard/charts
GET    /api/treasury/dashboard/alerts
```

---

## 17. Fluxos de Usuário

### 17.1 Membro Paga Taxa UMP (Mensal)

```
1. Membro acessa Painel Financeiro
2. Vê status da Taxa UMP (quais meses pagou/faltam)
3. Clica "Pagar mês de Janeiro"
4. Sistema gera QR Code PIX (válido 15 min)
5. Membro paga no app do banco
6. Webhook confirma pagamento
7. Sistema atualiza status para "Pago"
8. Membro recebe push: "Pagamento confirmado!"
```

### 17.2 Membro Paga Taxa UMP (Único/Múltiplos Meses)

```
1. Membro acessa Painel Financeiro
2. Vê meses disponíveis para pagar
3. Seleciona múltiplos meses (ex: jan, fev, mar)
4. Sistema calcula: 3 × valor mensal
5. Gera QR Code PIX
6. Membro paga
7. Sistema marca os 3 meses como pagos
```

### 17.3 Membro Compra na Loja

```
1. Membro acessa Loja
2. Navega por categorias
3. Clica em item (ex: Camiseta UMP)
4. Vê carrossel de imagens
5. Seleciona: Masculino → Tamanho M
6. Vê tabela de medidas
7. Adiciona ao carrinho (quantidade: 2)
8. Continua comprando ou vai ao carrinho
9. No carrinho, adiciona observação
10. Clica "Finalizar Pedido"
11. Sistema gera pedido #2025-0001
12. Gera QR Code PIX
13. Membro paga
14. Status: "Pago"
15. Marketing atualiza: "Produzindo"
16. Membro recebe push: "Seu pedido está sendo produzido!"
17. Marketing atualiza: "Pronto para Retirada"
18. Membro recebe push: "Sua Camiseta está pronta para retirada na igreja!"
```

### 17.4 Membro Confirma Presença em Evento Pago

```
1. Membro vê evento na agenda
2. Evento tem taxa de R$30, prazo até 20/03
3. Clica "Confirmar Presença"
4. Redireciona para Painel Financeiro
5. Vê: "Taxa do evento: R$30"
6. Opção: "Incluir visitantes" → adiciona 2
7. Total: R$90 (3 pessoas)
8. Gera QR Code PIX
9. Membro paga
10. Evento mostra: "+3 confirmados"
```

### 17.5 Tesoureiro Registra Empréstimo Parcelado

```
1. Tesoureiro acessa Dashboard
2. Clica "Registrar Entrada"
3. Tipo: Empréstimo
4. Origem: Igreja
5. Valor total: R$1.200
6. Parcelado: Sim
7. Parcelas: 12
8. Valor parcela: R$100
9. Datas: 15 de cada mês
10. Salva
11. Dashboard mostra: "Empréstimo ativo: R$1.200"
12. Alerta: "Parcela vence em 3 dias"
13. Notificação push para tesoureiro
14. Tesoureiro paga parcela
15. Marca como paga no sistema
16. Anexa comprovante
17. Registra saída automática de R$100
```

### 17.6 Tesoureiro Recebe Dinheiro em Espécie

```
1. Membro paga Taxa UMP em dinheiro na igreja
2. Tesoureiro acessa Dashboard
3. Clica "Registrar Entrada Manual"
4. Tipo: Taxa UMP
5. Membro: João Silva
6. Mês: Fevereiro
7. Valor: R$10
8. Método: Espécie
9. Descrição: "Recebido na reunião"
10. Comprovante: (opcional)
11. Salva
12. Taxa UMP de João marcada como paga
```

### 17.7 Marketing Atualiza Pedidos em Lote

```
1. Marketing acessa lista de pedidos
2. Filtra: Status = "Pago"
3. Seleciona 10 pedidos
4. Clica "Atualizar Status"
5. Novo status: "Produzindo"
6. Confirma
7. 10 membros recebem push
```

---

## 18. Perguntas e Respostas Completas

### Sessão 1: Configuração Inicial

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | O tesoureiro pode ser também admin/marketing/espiritualidade? | Tesoureiro é membro comum com flag, mas Admin NÃO pode ser tesoureiro |
| 2 | Qual provedor PIX usar? | Mercado Pago |
| 3 | Aceita taxa de 0,99%? | Sim |
| 4 | Conta PF ou PJ? | Pessoa Física (CPF) |
| 5 | Quem configura o Access Token? | Admin |
| 6 | Ao trocar tesoureiro, troca token? | Sim, se mudar a conta |

### Sessão 2: Taxas

| # | Pergunta | Resposta |
|---|----------|----------|
| 7 | Membro novo paga retroativo Taxa UMP? | Não, segue regra do dia 10 |
| 8 | Pode pagar meses fora de ordem? | Não, apenas em ordem |
| 9 | Pode pagar múltiplos meses à frente? | Sim |
| 10 | Taxa Percapta retroativa? | Sim, paga integral do ano |
| 11 | Membro inativo fica devendo? | Não |
| 12 | Virou ativo dia 8: paga mês atual? | Sim (dia ≤ 10) |
| 13 | Virou ativo dia 15: paga mês atual? | Não, só mês seguinte (dia > 10) |
| 14 | Desconto se pagar ano todo? | Não |

### Sessão 3: Eventos

| # | Pergunta | Resposta |
|---|----------|----------|
| 15 | Taxa obrigatória para confirmar? | Sim |
| 16 | Evento gratuito? | Confirma direto |
| 17 | Cancelamento/reembolso? | Não existe |
| 18 | Múltiplos visitantes? | Sim |
| 19 | Valor diferente para visitante? | Não, mesmo valor |
| 20 | Informar dados do visitante? | Não |
| 21 | Quem vê lista de confirmados? | Marketing |
| 22 | Exportar lista? | Não necessário |
| 23 | Check-in no evento? | Não necessário |

### Sessão 4: Loja

| # | Pergunta | Resposta |
|---|----------|----------|
| 24 | Múltiplos itens no carrinho? | Sim |
| 25 | Múltiplas unidades do mesmo item? | Sim |
| 26 | Estoque controlado por quantidade? | Não, apenas disponível/indisponível |
| 27 | Entrega? | Retirada na igreja |
| 28 | Status do pedido? | Pago → Produzindo → Pronto |
| 29 | Quem atualiza status? | Pago: sistema / Resto: Marketing |
| 30 | Notificação de status? | Sim, push |
| 31 | Carrinho expira? | Não |
| 32 | Carrinho abandonado? | Notificar 2h, 12h, 24h, 48h |
| 33 | Pré-venda? | Sim |
| 34 | Data limite de compra? | Não |
| 35 | Preço promocional? | Não |
| 36 | Unissex? | Sim |
| 37 | Sem tamanho? | Sim (livro, caneca) |
| 38 | Código do pedido? | Sim (#2025-0001) |
| 39 | Observação no pedido? | Sim |
| 40 | Cancelar antes de pagar? | Sim |
| 41 | Marketing atualiza em lote? | Sim |
| 42 | Marketing vê valores? | Não |

### Sessão 5: Imagens e Tamanhos

| # | Pergunta | Resposta |
|---|----------|----------|
| 43 | Quantas imagens por gênero? | Até 5 |
| 44 | Imagem por tamanho? | Não, só por gênero |
| 45 | Tabela de tamanhos: imagem ou dados? | Dados estruturados |
| 46 | Tabela por item ou padrão? | Por item (opcional) |
| 47 | Campos da tabela? | largura, comprimento, manga, ombro |
| 48 | Unidade? | Centímetros (cm) |
| 49 | Tamanhos fixos? | Não, customizado por item |
| 50 | Categorias iniciais? | Vestuários, Acessórios, Livros, Kit UMP |
| 51 | Criar novas categorias? | Sim, Marketing pode |

### Sessão 6: Empréstimos

| # | Pergunta | Resposta |
|---|----------|----------|
| 52 | Registrar origem? | Sim (Igreja, Membro, Federação, Outro) |
| 53 | Registrar destino pagamento? | Sim, puxa origem |
| 54 | Parcelado? | Sim, opcional |
| 55 | Campos se parcelado? | Valor total, qtd parcelas, valor parcela, datas |
| 56 | Notificação de vencimento? | 3 dias, 1 dia, no dia |

### Sessão 7: Dashboard e Relatórios

| # | Pergunta | Resposta |
|---|----------|----------|
| 57 | Gráficos? | Entradas vs Saídas, Pizza, Barras |
| 58 | Alertas? | Sim (inadimplência, parcelas, saldo) |
| 59 | Formatos de exportação? | PDF e Excel |
| 60 | Filtros? | Período, membro, tipo, evento, status, item |
| 61 | Relatório de inadimplência? | Sim |
| 62 | Relatório de vendas? | Sim, com detalhes |

### Sessão 8: Entradas/Saídas Manuais

| # | Pergunta | Resposta |
|---|----------|----------|
| 63 | Entrada manual (espécie)? | Sim |
| 64 | Comprovante obrigatório? | Opcional |
| 65 | Descrição livre? | Sim |
| 66 | Criar categorias de saída? | Sim |
| 67 | Saída parcelada? | Sim (empréstimos) |
| 68 | Estorno? | Não |

### Sessão 9: Permissões

| # | Pergunta | Resposta |
|---|----------|----------|
| 69 | Admin vê tudo? | Sim |
| 70 | Admin pode ser tesoureiro? | Não |
| 71 | Membro vê outros membros? | Não, só seus dados |
| 72 | Novo tesoureiro vê histórico? | Sim |

### Sessão 10: Notificações

| # | Pergunta | Resposta |
|---|----------|----------|
| 73 | Horário das notificações? | 08:00 |
| 74 | Resumo mensal para tesoureiro? | Sim |
| 75 | Alerta de saldo? | Só se zerado ou negativo |
| 76 | Notificação virada de ano? | Sim |

### Sessão 11: PIX

| # | Pergunta | Resposta |
|---|----------|----------|
| 77 | Validade do QR Code? | 15 minutos |
| 78 | PIX expirado? | Gerar novo, pedido mantido |
| 79 | Chave PIX: quais dados? | Apenas a chave (CPF, email, etc.) |

### Sessão 12: Configurações

| # | Pergunta | Resposta |
|---|----------|----------|
| 80 | Período fiscal? | Janeiro a Dezembro |
| 81 | Fuso horário? | São Paulo (America/Sao_Paulo) |
| 82 | Histórico de valores? | Sim |
| 83 | Virada de ano automática? | Sim |
| 84 | Descrição de item: tamanho? | Máx 500 caracteres |

### Sessão 13: Navegação

| # | Pergunta | Resposta |
|---|----------|----------|
| 85 | Onde fica a Loja? | Listagem de painéis |
| 86 | Onde fica Painel Financeiro? | Listagem de painéis |
| 87 | Onde tesoureiro define taxas? | Painel da Tesouraria |

---

## Próximos Passos

1. **Frontend primeiro**: Implementar todas as telas e componentes
2. **Backend depois**: APIs, integrações, webhooks
3. **Ordem sugerida**:
   - Schema do banco de dados
   - Telas do Tesoureiro (Dashboard, Configurações)
   - Telas do Membro (Painel Financeiro)
   - Telas da Loja (Catálogo, Carrinho, Pedidos)
   - Telas do Marketing (Gestão de Itens, Pedidos)
   - Integração Mercado Pago
   - Sistema de Notificações
   - Relatórios

---

*Documento gerado em: Janeiro/2025*
*Versão: 1.0*
*Status: Aprovado para implementação*
