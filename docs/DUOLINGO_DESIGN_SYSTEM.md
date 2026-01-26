# Sistema de Design Duolingo - Emaús Vota

## 1. Visao Geral

Este documento define o sistema de design inspirado no Duolingo para o sistema de estudos da UMP Emaus. O objetivo e criar uma experiencia de aprendizado gamificada, divertida e motivadora, mantendo a identidade visual da UMP Emaus.

---

## 2. Paleta de Cores Principal

### Cores da UMP Emaus (Identidade)
| Nome | HSL | HEX | Uso |
|------|-----|-----|-----|
| **Primary Orange** | 38 100% 50% | #FFA500 | Cor principal, botoes primarios, destaques |
| **Primary Dark** | 38 100% 42% | #D68A00 | Sombras, hover states |
| **Primary Light** | 43 96% 56% | #FFB733 | Highlights, inner glow |

### Cores de Gamificacao (Estilo Duolingo)
| Nome | HSL | HEX | Uso |
|------|-----|-----|-----|
| **Success Green** | 95 76% 40% | #58CC02 | Licoes completas, progresso |
| **Success Dark** | 95 76% 32% | #46A302 | Sombras do verde |
| **XP Gold** | 45 100% 50% | #FFC800 | XP, recompensas, conquistas |
| **Streak Orange** | 25 100% 50% | #FF9600 | Streak, fogo, ofensivas |
| **Heart Red** | 0 100% 65% | #FF4B4B | Vidas, coracoes |
| **Progress Blue** | 200 90% 55% | #1CB0F6 | Progresso atual, em andamento |
| **Locked Gray** | 0 0% 90% | #E5E5E5 | Elementos bloqueados |

---

## 3. Componentes do Duolingo

### 3.1 Lesson Node (No de Licao)

O elemento mais iconico do Duolingo. Um circulo grande com sombra 3D que simula um botao pressionavel.

**Estados:**
1. **Bloqueado** - Cinza, icone de cadeado
2. **Disponivel** - Verde vibrante, pulso animado
3. **Em Progresso** - Azul, animacao de ondas
4. **Completo** - Verde com check, badge de XP

**Especificacoes:**
```
Tamanho: 72px x 72px
Border-radius: 50% (circulo)
Sombra 3D: 0 8px 0 [cor-escura]
Hover: translateY(-4px), sombra 4px
Active: translateY(4px), sombra 2px
Inner circle: inset 4px, cor mais clara
```

**Cores por Estado:**
- Disponivel: bg=#58CC02, shadow=#46A302, inner=#7BD937 (VERDE - igual a completo)
- Completo: bg=#58CC02, shadow=#46A302, inner=#7BD937 (VERDE com icone de check)
- Em Progresso: bg=#1CB0F6, shadow=#1899D6, inner=#49C0F8 (AZUL)
- Bloqueado: bg=#E5E5E5, shadow=#CECECE, inner=#F0F0F0 (CINZA)
- Bonus: bg=#FF9600 (laranja UMP), shadow=#E68600, inner=#FFB020 (LARANJA - reservado APENAS para licoes bonus)

**IMPORTANTE:** O laranja (#FFA500) e reservado para elementos de BRANDING UMP Emaus (headers, botoes primarios, destaques) e para licoes BONUS. Licoes disponiveis e completas SEMPRE usam verde (#58CC02) para manter consistencia com o padrao Duolingo.

### 3.2 Path Connector (Conector de Caminho)

Linha curva SVG que conecta os nos de licao formando um caminho serpentino.

**Especificacoes:**
```
Stroke-width: 8px
Animacao: pathLength 0 -> 1 em 0.5s
Cor completo: gradiente verde
Cor pendente: gradiente cinza
Highlight: linha branca 30% opacity por cima
```

### 3.3 Streak Badge (Badge de Ofensiva)

Icone de chama animado com contador de dias.

**Especificacoes:**
```
Icone: Chama SVG com gradiente laranja->vermelho
Contador: numero + "dias"
Animacao: pulso suave quando ativo
Inativo: chama cinza
```

### 3.4 Hearts Display (Display de Vidas)

Sistema de vidas com coracoes animados.

**Especificacoes:**
```
Coracoes: 5 maximo (padrao Duolingo)
Cheio: gradiente vermelho com brilho
Vazio: gradiente cinza
Animacao: scale 1.2 quando ganha/perde
Timer: mostra tempo ate proximo refill
```

### 3.5 XP Display

Indicador de pontos de experiencia.

**Especificacoes:**
```
Icone: Raio (Zap) em amarelo
Numero: dourado/amber
Fonte: bold
```

### 3.6 Level Badge (Badge de Nivel)

Indicador circular de nivel com barra de progresso.

**Especificacoes:**
```
Circulo externo: borda com gradiente
Numero central: nivel atual
Barra de progresso: circular, laranja UMP
```

### 3.7 Bottom Navigation

Barra de navegacao inferior estilo app mobile.

**Especificacoes:**
```
Altura: 64px + safe-area-bottom
Icones: 5 items maximo
Ativo: cor primaria, icone preenchido
Inativo: muted-foreground
```

**Items de Navegacao:**
1. Inicio (Home) - Mapa de licoes
2. Versiculos (Book) - Biblioteca de versiculos
3. Ranking (Trophy) - Leaderboard
4. Perfil (User) - Dados do usuario

---

## 4. Animacoes e Micro-interacoes

### 4.1 Framer Motion

Todas as animacoes usam Framer Motion para performance e suavidade.

**Animacoes Padrao:**
```typescript
// Entrada de elementos
initial={{ opacity: 0, scale: 0.8 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ duration: 0.3 }}

// Hover em botao
whileHover={{ scale: 1.05, y: -4 }}
whileTap={{ scale: 0.95, y: 4 }}

// Pulso para elementos disponiveis
animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
transition={{ duration: 2, repeat: Infinity }}
```

### 4.2 Celebracoes

**Ao completar licao:**
- Confetti burst
- Som de "level up"
- Modal de recompensa com XP
- Animacao do streak se aplicavel

**Ao subir de nivel:**
- Animacao especial
- Badge brilhante
- Mensagem de parabens

---

## 5. Tipografia

### Hierarquia de Texto
| Elemento | Tamanho | Peso | Uso |
|----------|---------|------|-----|
| Titulo de Semana | 2xl (24px) | Bold | Cabecalho do mapa |
| Titulo de Licao | sm (14px) | Semibold | Nome da licao |
| Contador XP | sm-lg | Bold | Numeros de XP |
| Label | xs (12px) | Medium | Textos auxiliares |
| Badge | xs (12px) | Bold | Badges e pills |

### Fonte Principal
```css
font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

---

## 6. Espacamento e Layout

### Grid do Mapa
```
Largura maxima: 280px
Gap entre nos: 16px (4)
Posicoes: left (-48px), center (0), right (+48px)
Padding container: 16px
```

### Header
```
Altura: ~56px
Padding: 12px
Avatar: 40px x 40px
Gap items: 8-12px
```

### Cards
```
Padding: 16px
Border-radius: var(--radius) = 8px
Background: card ou gradient primario leve
```

---

## 7. Dark Mode

O sistema suporta dark mode completo com variaveis CSS.

### Adaptacoes
- Backgrounds: invertidos (claro -> escuro)
- Texto: foreground adaptativo
- Sombras 3D: mantidas mas escurecidas
- Cores de gamificacao: mantidas (ja sao vibrantes)
- Elementos bloqueados: cinza mais escuro

### Variaveis Dark
```css
.dark {
  --background: 0 0% 9%;
  --foreground: 0 0% 98%;
  --card: 0 0% 11%;
  /* cores de gamificacao permanecem iguais */
}
```

---

## 8. Paginas do Sistema de Estudo

### 8.1 Study Home (/)
- Header com avatar, XP, streak, coracoes
- Card de meta diaria
- Mapa de licoes serpentino
- Bottom navigation

### 8.2 Lesson Page (/lesson/:id)
- Header com progresso e coracoes
- Conteudo da licao (versiculo, explicacao)
- Botoes de acao
- Feedback visual (correto/incorreto)

### 8.3 Verses (/verses)
- Lista de versiculos memorizados
- Filtros por categoria
- Busca
- Status de memorizacao

### 8.4 Ranking (/ranking)
- Leaderboard semanal
- Top 3 destacado
- Posicao do usuario
- XP acumulado

### 8.5 Profile (/profile)
- Avatar e nome
- Estatisticas completas
- Conquistas/badges
- Configuracoes

---

## 9. Icones

### Biblioteca Principal: Lucide React

**Icones por Tipo de Licao:**
| Tipo | Icone | Cor |
|------|-------|-----|
| Intro | BookOpen | Branco |
| Study | Star | Branco |
| Meditation | Heart | Branco |
| Challenge | Trophy | Branco |
| Review | Crown | Branco |
| Locked | Lock | Cinza |
| Completed | Check | Branco |
| Bonus | Sparkles | Amarelo |

**Icones de Navegacao:**
| Item | Icone |
|------|-------|
| Inicio | Home |
| Versiculos | Book |
| Ranking | Trophy |
| Perfil | User |
| Notificacoes | Bell |
| Configuracoes | Settings |

---

## 10. Proximos Passos de Implementacao

### Fase 1: Melhorias Visuais
1. [x] Componentes base criados
2. [ ] Aplicar cores UMP Emaus nos elementos disponiveis
3. [ ] Melhorar animacoes de transicao
4. [ ] Adicionar celebracoes ao completar licao

### Fase 2: Funcionalidades
1. [ ] Sistema de XP real (banco de dados)
2. [ ] Sistema de streak real
3. [ ] Sistema de coracoes/vidas
4. [ ] Leaderboard funcional

### Fase 3: Conteudo
1. [ ] Licoes reais (devocionais, versiculos)
2. [ ] Sistema de quiz/perguntas
3. [ ] Meditacoes guiadas

---

## 11. Referencias

- Duolingo UI Kit (Figma): https://figma.com/community/file/1377326303556981356
- Duolingo Blog - Home Screen Design: https://blog.duolingo.com/new-duolingo-home-screen-design/
- Mobbin Duolingo: https://mobbin.com/apps/duolingo
- UIland Duolingo Screens: https://uiland.design/screens/duolingo

---

*Documento criado em 02/12/2024*
*Versao: 1.0*
