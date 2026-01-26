# Guia de Deploy no Render com Neon PostgreSQL

## Pré-requisitos

1. **Conta Neon**: https://neon.tech
2. **Conta Render**: https://render.com
3. **Repository GitHub**: Para conectar ao Render

## Passo 1: Criar Base de Dados no Neon

1. Acesse https://console.neon.tech
2. Crie um novo projeto
3. Configure o banco de dados PostgreSQL
4. Copie a **connection string** (DATABASE_URL)

A connection string terá este formato:
```
postgresql://username:password@neon-endpoint.neon.tech/databasename?sslmode=require
```

## Passo 2: Preparar o Repository

1. Commit e push todas as mudanças:
```bash
git add .
git commit -m "Configure Render deployment with Neon"
git push
```

2. Certifique-se de que o arquivo `render.yaml` está no root do repositório

## Passo 3: Deploy no Render

1. Acesse https://dashboard.render.com
2. Clique em **New +** → **Web Service**
3. Conecte seu repositório GitHub
4. Configure conforme abaixo:

### Configurações do Web Service

- **Name**: deo-glory-app
- **Environment**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node dist/index.cjs`
- **Plan**: Free (ou upgrade conforme necessário)

### Variáveis de Ambiente

Adicione as seguintes variáveis no painel do Render:

| Variável | Valor | Notas |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | Copie do Neon | Cole exatamente como está |
| `ADMIN_EMAIL` | seu_email@example.com | Email do admin |
| `ADMIN_PASSWORD` | senha_segura | Senha forte do admin |
| `JWT_SECRET` | Gere uma string aleatória | Use: `openssl rand -base64 32` |
| `SESSION_SECRET` | Gere uma string aleatória | Use: `openssl rand -base64 32` |
| `RESEND_API_KEY` | Sua chave Resend | Opcional se não usar email |
| `OPENAI_API_KEY` | Sua chave OpenAI | Opcional para IA |
| `GOOGLE_GEMINI_API_KEY` | Sua chave Gemini | Opcional para IA |
| `GOOGLE_CALENDAR_CLIENT_ID` | Seu Client ID | Opcional para Google Calendar |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Seu Client Secret | Opcional para Google Calendar |
| `INSTAGRAM_ACCESS_TOKEN` | Seu token | Opcional para Instagram |
| `INSTAGRAM_USER_ID` | Seu ID | Opcional para Instagram |
| `VAPID_PUBLIC_KEY` | Sua chave pública | Opcional para notificações |
| `VAPID_PRIVATE_KEY` | Sua chave privada | Opcional para notificações |

## Passo 4: Monitorar o Deploy

1. Vá para **Events** no dashboard do Render
2. Acompanhe os logs de build e deploy
3. Quando pronto, clique em **Logs** para ver a saída do servidor

## Passo 5: Inicializar o Banco de Dados

Após o primeiro deploy bem-sucedido, as tabelas serão criadas automaticamente pelo servidor.

Se precisar fazer um reset manual:

1. Acesse o console do Neon
2. Execute o script de limpeza necessário (se aplicável)
3. Reinicie o servidor no Render

## Troubleshooting

### Erro: "DATABASE_URL must be set"
- Verifique se a variável `DATABASE_URL` está definida no Render
- Confirme que a connection string do Neon está correta

### Erro: "Connection refused"
- Verifique se o Neon está acessível
- Confirme que `?sslmode=require` está na connection string

### Erro: "Build failed"
- Verifique os logs de build no Render
- Confirme que todas as dependências estão no package.json
- Teste localmente com `npm run build`

### Erro: "Port already in use"
- O Render geralmente atribui a porta automaticamente
- Não tente hardcoded a porta - deixe o Render gerenciar

## URLs

Após deploy bem-sucedido:
- **Frontend**: https://seu-projeto-name.onrender.com
- **API**: https://seu-projeto-name.onrender.com/api

## Atualizações Futuras

Para fazer um novo deploy:
1. Faça commit e push das mudanças
2. O Render automaticamente detectará e fará o redeploy
3. Monitore em **Events** no dashboard

## Rollback

Para voltar a uma versão anterior:
1. No Render, selecione a versão anterior em **Deploys**
2. Clique em **Redeploy** ao lado da versão desejada

---

Para mais informações:
- Documentação Render: https://render.com/docs
- Documentação Neon: https://neon.tech/docs
