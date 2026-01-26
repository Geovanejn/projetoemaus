# Diagnóstico: Problema DATABASE_URL no Render

## ❌ Erro Encontrado

```
Error: getaddrinfo ENOTFOUND base
```

Isto significa que o PostgreSQL está tentando conectar a um hostname chamado `base`, que é inválido.

---

## 🔍 Causa Raiz

**A DATABASE_URL em Render está chegando INCOMPLETA ou MALFORMADA.**

Possibilidades:
1. ❌ Não está configurada no Render
2. ❌ Está truncada (limite de caracteres?)
3. ❌ Tem caracteres especiais não escapados
4. ❌ Está sendo sobrescrita por outra variável

---

## ✅ Solução Definitiva (3 passos)

### Passo 1: Acessar Render Dashboard
1. Vá em https://dashboard.render.com
2. Selecione seu Web Service "emaus"
3. Vá em **Environment**

### Passo 2: Configurar DATABASE_URL CORRETAMENTE

**Se a variável já existe:**
- Clique em "Edit"
- **Apague** o conteúdo completamente
- Cole a URL **EXATA** do Neon (copie direto do Neon console):
```
postgresql://neondb_owner:npg_9zmiSjAlyZD7@ep-calm-pine-a48r3ksy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Se não existe:**
- Clique em **+ Add Environment Variable**
- Key: `DATABASE_URL`
- Value: Cole a URL acima
- Clique **Save**

### Passo 3: Redeploy Completo

1. Vá em **Deployments**
2. Clique em **Trigger deploy**
3. Aguarde 2-3 minutos
4. Verifique os **Logs**
5. Procure por `Initializing PostgreSQL` sem erros

---

## 🛠️ Testes Locais Já Feitos

✅ **Build local**: OK
✅ **Database schema**: 55 tabelas sincronizadas
✅ **Connection string parsing**: OK (quando DATABASE_URL está correto)

---

## 📋 Verificação do Neon

Confirme que sua URL do Neon é:

| Campo | Valor |
|-------|-------|
| **Branch** | production |
| **Role** | neondb_owner |
| **Database** | neondb |
| **Host** | ep-calm-pine-a48r3ksy-pooler.us-east-1.aws.neon.tech |
| **Pool** | Ativado ✅ |
| **Connection** | `sslmode=require` ✅ |

---

## ⚠️ Checklist Final Antes de Redeploy

- [ ] DATABASE_URL está em Render > Environment
- [ ] URL começa com `postgresql://`
- [ ] URL contém `:` (senha)
- [ ] URL contém `@` (separador host)
- [ ] URL contém `.neon.tech`
- [ ] URL termina com `require`
- [ ] Nenhuma quebra de linha na URL
- [ ] Nenhum espaço antes ou depois da URL

---

## 🆘 Se o erro persistir

1. Verifique se o hostname está correto: `ep-calm-pine-a48r3ksy-pooler.us-east-1.aws.neon.tech`
2. Teste a URL localmente: `DATABASE_URL="postgresql://..." npm start`
3. Se funciona localmente mas não em Render: problema é Render > Environment
4. Se não funciona localmente: problema é a URL do Neon

---

**Status**: Pronto para redeploy após configurar DATABASE_URL em Render
