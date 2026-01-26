# FIX: Deploy no Render - Erro "Cannot find module"

## ❌ Problema

```
Error: Cannot find module '/opt/render/project/src/dist/index.cjs'
```

## ✅ Solução

O arquivo gerado pelo build é **`dist/index.js`** (formato ESM), não `.cjs`.

### Passo 1: Ir para Render Dashboard
1. Acesse seu Web Service
2. Vá em "Settings"
3. Procure por "Build & Deploy"

### Passo 2: Mudar o Start Command

**DE:**
```bash
node ./dist/index.cjs
```

**PARA:**
```bash
node ./dist/index.js
```

### Passo 3: Salvar & Redeploy
- Clique "Save"
- Vá para "Deployments"
- Clique em "Deploy latest commit" ou faça um `git push`

---

## 📋 Checklist Render Correto

```
✅ Root Directory: . (ponto - raiz do projeto)
✅ Build Command: npm run build
✅ Start Command: node ./dist/index.js
✅ Environment Variables: Todas definidas
```

## 🔍 Porque isso aconteceu?

- **build script** (line 8 em package.json):
  ```bash
  esbuild server/index.ts --platform=node --packages=external 
    --bundle --format=esm --outdir=dist
  ```
  Gera: **`dist/index.js`** (ESM - ECMAScript Module)

- **start script** (line 9 em package.json):
  ```bash
  node dist/index.js
  ```

Render estava configurado com o comando antigo `.cjs` que não existe.

## ✨ Teste Local

Para verificar que tudo funciona antes de fazer deploy:

```bash
npm run build    # Gera dist/index.js
npm start        # Roda node dist/index.js
```

Deve iniciar sem erros na porta 5000.

---

**Problema**: Start Command antigo
**Solução**: Atualizar para `node ./dist/index.js`
**Status**: ✅ Pronto para redeploy
