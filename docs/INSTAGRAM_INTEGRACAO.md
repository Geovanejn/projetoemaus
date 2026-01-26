# Integracao Instagram - UMP Emaus

## Data: 06/12/2025

---

## 1. Visao Geral

Este documento descreve a integracao do Instagram com o site da UMP Emaus, permitindo:
- Exibir posts reais do @umpemaus no site
- Sincronizar automaticamente novos posts
- Destacar posts especificos no banner da home

---

## 2. Configuracao Necessaria

### 2.1 Variaveis de Ambiente (Secrets)

| Variavel | Descricao | Como Obter |
|----------|-----------|------------|
| `INSTAGRAM_ACCESS_TOKEN` | Token de acesso da API do Instagram | Via Meta Developer Portal |
| `INSTAGRAM_USER_ID` | ID numerico da conta @umpemaus | Via Meta Developer Portal |

### 2.2 Como Obter as Credenciais

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Crie um app do tipo "Business" ou "Consumer"
3. Adicione o produto "Instagram Basic Display API"
4. Configure a conta @umpemaus como Instagram Tester
5. Gere o Access Token (valido por 60 dias)
6. Copie o User ID da conta

**IMPORTANTE:** O token expira a cada 60 dias. O sistema possui uma funcao para renovar automaticamente, mas requer monitoramento.

---

## 3. Arquitetura

### 3.1 Fluxo de Dados

```
Instagram API --> syncInstagramPosts() --> Banco de Dados --> Frontend
```

### 3.2 Arquivos Envolvidos

| Arquivo | Funcao |
|---------|--------|
| `server/instagram.ts` | Comunicacao com API do Instagram |
| `server/storage.ts` | CRUD de posts no banco |
| `server/routes.ts` | Endpoints da API |
| `shared/schema.ts` | Schema da tabela instagramPosts |
| `client/src/pages/admin/admin-site.tsx` | Painel de gestao |
| `client/src/components/site/HeroBanner.tsx` | Exibicao no banner |

### 3.3 Schema do Banco

```typescript
instagramPosts: {
  id: serial (PK)
  caption: text (opcional)
  imageUrl: text (obrigatorio)
  permalink: text (opcional)
  postedAt: timestamp
  isActive: boolean (default: true)
  isFeaturedBanner: boolean (default: false) // Novo campo
  createdAt: timestamp
}
```

---

## 4. Endpoints da API

### 4.1 Publicos

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/site/instagram` | Lista posts para exibicao |
| GET | `/api/site/highlights` | Retorna highlights incluindo Instagram |

### 4.2 Admin (Requer Autenticacao)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/admin/instagram/status` | Status da configuracao |
| POST | `/api/admin/instagram/sync` | Forca sincronizacao |
| PATCH | `/api/admin/instagram/:id/feature` | Define como destaque do banner |

---

## 5. Painel de Marketing - Instagram

### 5.1 Funcionalidades

- **Visualizar Posts**: Lista todos os posts sincronizados
- **Sincronizar**: Botao para forcar nova sincronizacao
- **Destacar no Banner**: Define qual post aparece no carrossel principal
- **Status**: Mostra se a API esta configurada corretamente

### 5.2 Interface

O painel de marketing possui uma aba "Instagram" com:
1. Indicador de status da API
2. Grade de posts com preview
3. Botao para destacar post no banner
4. Data da ultima sincronizacao

---

## 6. Sincronizacao Automatica

### 6.1 Scheduler

O sistema pode ser configurado para sincronizar automaticamente:
- Frequencia sugerida: A cada 6 horas
- Implementado via node-cron

### 6.2 Renovacao de Token

O token do Instagram expira em 60 dias. O sistema tenta renovar automaticamente via endpoint:
```
GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=TOKEN
```

---

## 7. Troubleshooting

### 7.1 Erros Comuns

| Erro | Causa | Solucao |
|------|-------|---------|
| "API not configured" | Token ou UserID nao definidos | Configurar secrets |
| 400 Bad Request | Token invalido ou expirado | Renovar token |
| 403 Forbidden | Permissoes insuficientes | Verificar configuracao do app |
| Posts nao aparecem | Sincronizacao pendente | Clicar em "Sincronizar" |

### 7.2 Verificar Configuracao

```bash
# No console do servidor
[Instagram Scheduler] Configured - will run every 6 hours
```

Se aparecer:
```bash
[Instagram Scheduler] Not configured - INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID required
```

As credenciais nao estao configuradas.

---

## 8. Proximos Passos

- [ ] Configurar INSTAGRAM_ACCESS_TOKEN
- [ ] Configurar INSTAGRAM_USER_ID
- [ ] Testar sincronizacao inicial
- [ ] Verificar exibicao no site
- [ ] Configurar scheduler automatico

---

*Documento criado em: 06/12/2025*
*Versao: 1.0*
