# Melhorias do Sistema UMP Emaús

## Data: 06/12/2025

---

## 1. Sistema de Notificações

### Situação Atual
O sistema já possui:
- **Notificações por E-mail**: Envio via Resend para verificação, reset de senha, aniversários, eleições
- **Notificações In-App (Push)**: Configuradas com VAPID keys para notificações no navegador
- Componente `NotificationCenter.tsx` para exibir notificações in-app
- Hook `use-push-notifications.ts` para gerenciar permissões e subscrições

### Ação Necessária
- Revisar e garantir que a distinção entre notificações por e-mail e in-app está funcionando corretamente
- Verificar se cada tipo de notificação usa o canal apropriado

---

## 2. Remover Botão "Área do Membro" do Banner

### Localização
- **Arquivo**: `client/src/components/site/HeroBanner.tsx`

### Situação Atual
Os slides do banner possuem:
```typescript
secondaryLinkUrl: '/membro',
secondaryLinkText: 'Area do Membro',
```

### Ação Necessária
- Remover as propriedades `secondaryLinkUrl` e `secondaryLinkText` de todos os slides
- Remover a renderização do botão secundário no componente

---

## 3. Logo do Rodapé

### Localização
- **Arquivo**: `client/src/components/site/SiteFooter.tsx`

### Situação Atual
O rodapé usa um ícone genérico (Sparkles) como logo:
```tsx
<div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
  <Sparkles className="h-5 w-5 text-primary-foreground" />
</div>
```

### Ação Necessária
- Substituir o ícone pelo mesmo logo usado na exportação de devocional
- Verificar qual imagem é usada na exportação de devocional e aplicar no rodapé

---

## 4. Slogan do Rodapé

### Localização
- **Arquivo**: `client/src/components/site/SiteFooter.tsx`

### Situação Atual
```tsx
<p className="text-gray-400 text-sm leading-relaxed">
  Somos jovens unidos pela fé, pelo amor a Cristo e pelo desejo 
  de servir a Deus e ao próximo.
</p>
```

### Novo Slogan
> "Alegres na esperança, fortes na fé, dedicados no amor e unidos no trabalho."

### Ação Necessária
- Substituir o texto atual pelo novo slogan

---

## 5. Painel de Marketing - Editar Página "Quem Somos"

### Situação Atual
- Não existe funcionalidade para editar o conteúdo da página "Quem Somos" no painel de marketing

### Ação Necessária
- Criar interface no painel de marketing para editar todas as informações da página "Quem Somos"
- Implementar:
  - CRUD para o conteúdo da página
  - Campos editáveis: título, descrição, missão, visão, valores, história, etc.
  - Backend para persistir as alterações

---

## 6. Conexão Real com Instagram

### Localização
- **Arquivos**: 
  - `client/src/components/site/SiteFooter.tsx`
  - `client/src/components/site/HeroBanner.tsx`

### Situação Atual
- Links estáticos para `https://instagram.com/umpemaus`
- Caption no banner: `@umpemaus`

### Ação Necessária
- Garantir que todos os links do Instagram apontam para `@umpemaus`
- URL correta: `https://instagram.com/umpemaus`
- Verificar se a integração com Instagram API (se existente) está funcionando para puxar posts

---

## 7. Upload de Fotos (Conforme Arquivo Anexado)

### Situação Atual
O sistema de cadastro de membros já possui upload de imagem funcional.

### Ação Necessária

#### 7.1 Cadastro de Eventos (Painel Marketing/Espiritualidade)
- Adicionar campo de upload de foto ao invés de URL
- Formato de imagem diferente do cadastro de membro (dimensões específicas para eventos)

#### 7.2 Cadastro de Diretoria
- Ao selecionar um membro, puxar automaticamente a foto já cadastrada
- Permitir alterar a foto se necessário

#### 7.3 Devocionais
- Remover campo de URL de imagem
- Substituir por upload de imagem
- Seguir o mesmo padrão do sistema de cadastro de membro

---

## Ordem de Implementação Sugerida

1. [ ] Remover botão "Área do Membro" do Banner
2. [ ] Atualizar logo do rodapé
3. [ ] Atualizar slogan do rodapé
4. [ ] Verificar conexão Instagram
5. [ ] Revisar sistema de notificações
6. [ ] Criar painel para editar "Quem Somos"
7. [ ] Implementar upload de fotos para eventos
8. [ ] Implementar upload de fotos para devocionais
9. [ ] Implementar auto-preenchimento de foto na diretoria

---

## Arquivos Principais Envolvidos

| Arquivo | Modificações |
|---------|--------------|
| `client/src/components/site/HeroBanner.tsx` | Remover botão secundário |
| `client/src/components/site/SiteFooter.tsx` | Logo e slogan |
| `server/notifications.ts` | Revisar notificações |
| `server/email.ts` | Revisar notificações por e-mail |
| Painel Marketing (a identificar) | Edição "Quem Somos" |
| Formulários de eventos | Upload de imagem |
| Formulários de devocionais | Upload de imagem |
| Formulário de diretoria | Auto-preenchimento foto |

---

## Notas Técnicas

- O sistema já usa `multer` para upload de arquivos
- Integração com armazenamento de imagens já existe para membros
- Validar formatos e tamanhos de imagem conforme tipo (membro vs evento)
