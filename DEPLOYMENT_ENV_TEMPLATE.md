# Template de Variáveis de Ambiente - Produção Render + Neon

Copie este template e preencha com seus valores reais no dashboard do Render.

```
# ============================================
# DATABASE - Neon PostgreSQL
# ============================================
DATABASE_URL=postgresql://user:password@project.neon.tech/dbname?sslmode=require

# ============================================
# SECURITY & AUTHENTICATION
# ============================================
JWT_SECRET=gerar-com-node-crypto-randomBytes-32
SESSION_SECRET=gerar-com-node-crypto-randomBytes-32
ADMIN_EMAIL=seu-email@example.com
ADMIN_PASSWORD=senha-segura-aqui

# ============================================
# NOTIFICATIONS - Resend Email Service
# ============================================
RESEND_API_KEY=re_sua_chave_aqui

# ============================================
# WEB PUSH NOTIFICATIONS
# ============================================
VAPID_PUBLIC_KEY=gerado-pelo-web-push
VAPID_PRIVATE_KEY=gerado-pelo-web-push
VITE_VAPID_PUBLIC_KEY=mesmo-da-public-key

# ============================================
# GOOGLE APIs (Opcional)
# ============================================
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_CALENDAR_CREDENTIALS={"type":"service_account",...}

# ============================================
# SOCIAL MEDIA - Instagram (Opcional)
# ============================================
INSTAGRAM_ACCESS_TOKEN=seu-token-de-acesso
INSTAGRAM_USER_ID=seu-user-id

# ============================================
# AI INTEGRATIONS (Opcional)
# ============================================
OPENAI_API_KEY=sk-sua-chave-openai
GEMINI_API_KEY=sua-chave-gemini

# ============================================
# NODE ENVIRONMENT
# ============================================
NODE_ENV=production
```

## Como gerar os secrets seguros:

```bash
# JWT_SECRET e SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# VAPID keys para Push Notifications
npm install -g web-push
web-push generate-vapid-keys
```

## Como preencher no Render:

1. Vá para seu Web Service no Render
2. Clique em "Environment"
3. Adicione cada variável uma por uma OU importe um arquivo .env

⚠️ **NUNCA commite arquivos .env com valores reais no repositório!**
