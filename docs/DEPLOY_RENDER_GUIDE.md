# Guia de Deploy no Render

## Visao Geral

```
[Render - Web Service]  -->  [Neon - PostgreSQL]
   (hospeda o app)            (armazena os dados)
```

---

## Passo 1: Obter a Connection String do Neon

1. Acesse [Neon Console](https://console.neon.tech)
2. Selecione o projeto **umpemaus**
3. Clique em **Connect**
4. Copie a **Connection String** (comeca com `postgresql://`)

Exemplo:
```
postgresql://neondb_owner:abc123@ep-cool-name.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## Passo 2: Criar Web Service no Render

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em **New** > **Web Service**
3. Conecte seu repositorio GitHub (ou GitLab)
4. Selecione o repositorio do projeto

### Configuracoes do Servico:

| Campo | Valor |
|-------|-------|
| **Name** | `ump-emaus` |
| **Region** | Ohio (US East) - mais proximo do Neon |
| **Branch** | `main` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Instance Type** | Free |

---

## Passo 3: Configurar Variaveis de Ambiente

No Render, va em **Environment** e adicione:

### Obrigatorias:

| Variavel | Valor | Descricao |
|----------|-------|-----------|
| `DATABASE_URL` | (sua connection string do Neon) | Conexao com o banco |
| `JWT_SECRET` | (gere uma string longa e segura) | Autenticacao |
| `SESSION_SECRET` | (gere outra string longa) | Sessoes |
| `NODE_ENV` | `production` | Ambiente |

### Para gerar secrets seguros:

```bash
# No terminal, execute:
openssl rand -base64 32
```

Ou use: https://generate-secret.vercel.app/32

### Opcionais (para funcionalidades extras):

| Variavel | Valor | Descricao |
|----------|-------|-----------|
| `RESEND_API_KEY` | `re_xxxxxxxx` | Envio de emails |
| `GEMINI_API_KEY` | `AIza...` | IA para gerar conteudo (OBRIGATORIO) |

---

## Passo 4: Deploy

1. Clique em **Create Web Service**
2. Aguarde o build (primeira vez demora ~5 minutos)
3. Quando aparecer **Live**, esta pronto!

---

## Passo 5: Verificar

Acesse a URL fornecida pelo Render:
```
https://ump-emaus.onrender.com
```

---

## Troubleshooting

### Erro: "Database connection failed"
- Verifique se DATABASE_URL esta correta
- Confirme que termina com `?sslmode=require`

### Erro: "Build failed"
- Verifique os logs de build no Render
- Geralmente e problema de dependencias

### App lento na primeira requisicao
- Normal no plano gratuito (cold start)
- O Render "dorme" apos 15min de inatividade

---

## Custos

| Recurso | Plano | Custo |
|---------|-------|-------|
| Render Web Service | Free | $0 |
| Neon PostgreSQL | Free | $0 |
| **Total** | | **$0/mes** |

**Limitacoes do Free:**
- Render: dorme apos 15min de inatividade
- Neon: 0.5 GB de armazenamento

---

## Checklist de Deploy

- [ ] Connection string do Neon copiada
- [ ] Web Service criado no Render
- [ ] DATABASE_URL configurada
- [ ] JWT_SECRET configurada
- [ ] SESSION_SECRET configurada
- [ ] NODE_ENV = production
- [ ] Build passou com sucesso
- [ ] App acessivel pela URL do Render

---

*Documento criado em: 04/12/2025*
