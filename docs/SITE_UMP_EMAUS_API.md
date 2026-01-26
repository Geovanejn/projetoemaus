# Site Institucional UMP Emaus - Documentacao da API

## Informacoes do Projeto
**Nome:** Site Institucional UMP Emaus
**Versao:** 1.0
**Data de Criacao:** 04/12/2025
**Base URL:** `/api`

---

## 1. Visao Geral

Esta documentacao descreve todos os endpoints da API necessarios para o site institucional da UMP Emaus.

### 1.1 Autenticacao
- Endpoints publicos: Nao requerem autenticacao
- Endpoints privados: Requerem JWT no header `Authorization: Bearer <token>`
- Endpoints por secretaria: Requerem autenticacao + permissao da secretaria

### 1.2 Respostas Padrao

**Sucesso:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Erro:**
```json
{
  "success": false,
  "message": "Descricao do erro",
  "code": "ERROR_CODE"
}
```

---

## 2. Endpoints Publicos

### 2.1 Devocionais

#### GET /api/devotionals
**Descricao:** Lista devocionais publicados

**Query Parameters:**
| Parametro | Tipo | Obrigatorio | Default | Descricao |
|-----------|------|-------------|---------|-----------|
| page | number | Nao | 1 | Pagina atual |
| limit | number | Nao | 10 | Itens por pagina |
| search | string | Nao | - | Busca por titulo |
| featured | boolean | Nao | - | Apenas destaques |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "devotionals": [
      {
        "id": 1,
        "title": "Titulo do Devocional",
        "summary": "Resumo...",
        "verseReference": "Joao 3:16",
        "authorName": "Nome do Autor",
        "publishedAt": "2025-12-04T10:00:00Z",
        "isFeatured": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

---

#### GET /api/devotionals/featured
**Descricao:** Retorna o devocional do dia (destaque)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Titulo do Devocional",
    "content": "Conteudo completo...",
    "verseText": "Porque Deus amou o mundo...",
    "verseReference": "Joao 3:16",
    "prayer": "Oracao sugerida...",
    "authorName": "Nome do Autor",
    "publishedAt": "2025-12-04T10:00:00Z"
  }
}
```

---

#### GET /api/devotionals/:id
**Descricao:** Retorna um devocional especifico

**Path Parameters:**
| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| id | number | ID do devocional |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Titulo do Devocional",
    "content": "Conteudo completo em Markdown...",
    "verseText": "Porque Deus amou o mundo...",
    "verseReference": "Joao 3:16",
    "prayer": "Oracao sugerida...",
    "summary": "Resumo...",
    "authorName": "Nome do Autor",
    "publishedAt": "2025-12-04T10:00:00Z"
  }
}
```

---

### 2.2 Eventos

#### GET /api/events
**Descricao:** Lista eventos publicados

**Query Parameters:**
| Parametro | Tipo | Obrigatorio | Default | Descricao |
|-----------|------|-------------|---------|-----------|
| page | number | Nao | 1 | Pagina atual |
| limit | number | Nao | 10 | Itens por pagina |
| category | string | Nao | - | Filtrar por categoria |
| upcoming | boolean | Nao | true | Apenas eventos futuros |
| featured | boolean | Nao | - | Apenas destaques |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": 1,
        "title": "Culto Jovem",
        "shortDescription": "Venha adorar conosco!",
        "location": "Igreja Sede",
        "startDate": "2025-12-15T19:30:00Z",
        "endDate": "2025-12-15T21:30:00Z",
        "category": "culto",
        "price": "Gratuito",
        "isFeatured": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 20,
      "totalPages": 2
    }
  }
}
```

---

#### GET /api/events/upcoming
**Descricao:** Retorna os proximos 5 eventos

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Culto Jovem",
      "location": "Igreja Sede",
      "startDate": "2025-12-15T19:30:00Z",
      "category": "culto"
    }
  ]
}
```

---

#### GET /api/events/:id
**Descricao:** Retorna um evento especifico

**Path Parameters:**
| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| id | number | ID do evento |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Retiro Anual UMP",
    "description": "Descricao completa do evento...",
    "shortDescription": "Venha participar!",
    "location": "Sitio Recanto",
    "locationUrl": "https://maps.google.com/...",
    "startDate": "2025-12-20T08:00:00Z",
    "endDate": "2025-12-20T22:00:00Z",
    "isAllDay": false,
    "price": "R$ 150,00",
    "registrationUrl": "https://forms.google.com/...",
    "imageUrl": "/uploads/events/retiro.jpg",
    "category": "retiro"
  }
}
```

---

### 2.3 Pedidos de Oracao

#### POST /api/prayer-requests
**Descricao:** Envia um novo pedido de oracao (publico)

**Request Body:**
```json
{
  "name": "Nome (opcional se anonimo)",
  "whatsapp": "(11) 99999-9999",
  "category": "saude",
  "request": "Texto do pedido de oracao...",
  "isAnonymous": false
}
```

**Validacoes:**
- `category`: Obrigatorio, um dos valores: saude, familia, trabalho, espiritual, relacionamento, outros
- `request`: Obrigatorio, minimo 10 caracteres, maximo 1000 caracteres
- `whatsapp`: Opcional, formato brasileiro
- `name`: Obrigatorio se `isAnonymous` for false

**Response (201):**
```json
{
  "success": true,
  "message": "Pedido de oracao enviado com sucesso!",
  "data": {
    "id": 1
  }
}
```

---

### 2.4 Banners

#### GET /api/banners
**Descricao:** Retorna banners ativos para o carrossel

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Bem-vindo a UMP Emaus",
      "subtitle": "Junte-se a nos!",
      "imageUrl": "/uploads/banners/hero1.jpg",
      "backgroundColor": null,
      "linkUrl": "/quem-somos",
      "linkText": "Saiba Mais"
    },
    {
      "id": 2,
      "title": "Retiro Anual",
      "subtitle": "20 de Dezembro",
      "imageUrl": "/uploads/banners/retiro.jpg",
      "linkUrl": "/agenda/1",
      "linkText": "Inscreva-se"
    }
  ]
}
```

---

### 2.5 Diretoria

#### GET /api/board
**Descricao:** Retorna a diretoria atual

**Response (200):**
```json
{
  "success": true,
  "data": {
    "term": "2024-2025",
    "members": [
      {
        "id": 1,
        "name": "Nome Completo",
        "position": "presidente",
        "positionLabel": "Presidente",
        "photoUrl": "/uploads/board/presidente.jpg",
        "instagram": "@nome",
        "bio": "Breve biografia..."
      },
      {
        "id": 2,
        "name": "Nome Completo",
        "position": "vice_presidente",
        "positionLabel": "Vice-Presidente",
        "photoUrl": "/uploads/board/vice.jpg"
      }
    ]
  }
}
```

---

### 2.6 Conteudo do Site

#### GET /api/content/:page
**Descricao:** Retorna conteudo de uma pagina

**Path Parameters:**
| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| page | string | Identificador da pagina (ex: quem-somos) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "historia": {
      "title": "Nossa Historia",
      "content": "A UMP Emaus foi fundada..."
    },
    "missao": {
      "title": "Missao",
      "content": "Glorificar a Deus..."
    },
    "visao": {
      "title": "Visao",
      "content": "Ser uma geracao..."
    },
    "valores": {
      "title": "Valores",
      "content": "Fe, Amor, Unidade..."
    }
  }
}
```

---

### 2.7 Instagram Feed

#### GET /api/instagram/feed
**Descricao:** Retorna ultimas postagens do Instagram (cache)

**Query Parameters:**
| Parametro | Tipo | Obrigatorio | Default | Descricao |
|-----------|------|-------------|---------|-----------|
| limit | number | Nao | 6 | Quantidade de posts |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123456789",
      "mediaType": "IMAGE",
      "mediaUrl": "https://...",
      "permalink": "https://instagram.com/p/...",
      "caption": "Legenda do post...",
      "timestamp": "2025-12-01T15:00:00Z"
    }
  ]
}
```

---

## 3. Endpoints Privados (Autenticacao Requerida)

### 3.1 Gestao de Membros (Admin Only)

#### PATCH /api/admin/members/:id
**Descricao:** Atualiza um membro (inclui campo secretaria)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "Nome Atualizado",
  "email": "email@example.com",
  "phone": "(11) 99999-9999",
  "birthDate": "1990-01-15",
  "secretaria": "espiritualidade",
  "isAdmin": false,
  "isMember": true
}
```

**Valores para `secretaria`:**
- `null` ou `"none"` - Nenhuma secretaria
- `"espiritualidade"` - Secretaria de Espiritualidade
- `"marketing"` - Secretaria de Marketing

**Response (200):**
```json
{
  "success": true,
  "message": "Membro atualizado com sucesso!"
}
```

---

## 4. Endpoints por Secretaria

### 4.1 Devocionais (Espiritualidade)

#### GET /api/admin/devotionals
**Descricao:** Lista todos os devocionais (incluindo rascunhos)
**Permissao:** Admin ou Espiritualidade

**Query Parameters:**
| Parametro | Tipo | Obrigatorio | Default | Descricao |
|-----------|------|-------------|---------|-----------|
| page | number | Nao | 1 | Pagina atual |
| limit | number | Nao | 20 | Itens por pagina |
| status | string | Nao | all | all, published, draft |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "devotionals": [
      {
        "id": 1,
        "title": "Titulo",
        "authorName": "Autor",
        "isPublished": true,
        "isFeatured": false,
        "publishedAt": "2025-12-04T10:00:00Z",
        "createdAt": "2025-12-03T14:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

#### POST /api/admin/devotionals
**Descricao:** Cria um novo devocional
**Permissao:** Admin ou Espiritualidade

**Request Body:**
```json
{
  "title": "Titulo do Devocional",
  "content": "Conteudo completo em Markdown...",
  "verseText": "Texto do versiculo...",
  "verseReference": "Joao 3:16",
  "prayer": "Oracao sugerida...",
  "summary": "Resumo para lista...",
  "isPublished": true,
  "isFeatured": false
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Devocional criado com sucesso!",
  "data": {
    "id": 1
  }
}
```

---

#### PUT /api/admin/devotionals/:id
**Descricao:** Atualiza um devocional
**Permissao:** Admin ou Espiritualidade

**Request Body:**
```json
{
  "title": "Titulo Atualizado",
  "content": "Conteudo atualizado...",
  "verseText": "Texto do versiculo...",
  "verseReference": "Joao 3:16",
  "prayer": "Oracao sugerida...",
  "summary": "Resumo atualizado...",
  "isPublished": true,
  "isFeatured": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Devocional atualizado com sucesso!"
}
```

---

#### DELETE /api/admin/devotionals/:id
**Descricao:** Exclui um devocional
**Permissao:** Admin ou Espiritualidade

**Response (200):**
```json
{
  "success": true,
  "message": "Devocional excluido com sucesso!"
}
```

---

#### PATCH /api/admin/devotionals/:id/feature
**Descricao:** Define devocional como destaque do dia
**Permissao:** Admin ou Espiritualidade

**Response (200):**
```json
{
  "success": true,
  "message": "Devocional definido como destaque!"
}
```

---

### 4.2 Eventos (Marketing)

#### GET /api/admin/events
**Descricao:** Lista todos os eventos
**Permissao:** Admin ou Marketing

**Response (200):**
```json
{
  "success": true,
  "data": {
    "events": [ ... ],
    "pagination": { ... }
  }
}
```

---

#### POST /api/admin/events
**Descricao:** Cria um novo evento
**Permissao:** Admin ou Marketing

**Request Body:**
```json
{
  "title": "Titulo do Evento",
  "description": "Descricao completa...",
  "shortDescription": "Descricao curta...",
  "location": "Local do evento",
  "locationUrl": "https://maps.google.com/...",
  "startDate": "2025-12-20T08:00:00Z",
  "endDate": "2025-12-20T22:00:00Z",
  "isAllDay": false,
  "price": "R$ 150,00",
  "registrationUrl": "https://forms.google.com/...",
  "category": "retiro",
  "isPublished": true,
  "isFeatured": false
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Evento criado com sucesso!",
  "data": {
    "id": 1
  }
}
```

---

#### PUT /api/admin/events/:id
**Descricao:** Atualiza um evento
**Permissao:** Admin ou Marketing

**Response (200):**
```json
{
  "success": true,
  "message": "Evento atualizado com sucesso!"
}
```

---

#### DELETE /api/admin/events/:id
**Descricao:** Exclui um evento
**Permissao:** Admin ou Marketing

**Response (200):**
```json
{
  "success": true,
  "message": "Evento excluido com sucesso!"
}
```

---

### 4.3 Pedidos de Oracao (Espiritualidade)

#### GET /api/admin/prayer-requests
**Descricao:** Lista todos os pedidos de oracao
**Permissao:** Admin ou Espiritualidade

**Query Parameters:**
| Parametro | Tipo | Obrigatorio | Default | Descricao |
|-----------|------|-------------|---------|-----------|
| status | string | Nao | all | pending, praying, answered, archived |
| category | string | Nao | all | Categoria do pedido |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": 1,
        "name": "Nome ou Anonimo",
        "whatsapp": "(11) 99999-9999",
        "category": "saude",
        "categoryLabel": "Saude",
        "request": "Texto do pedido...",
        "isAnonymous": false,
        "status": "pending",
        "statusLabel": "Pendente",
        "createdAt": "2025-12-04T10:00:00Z"
      }
    ],
    "stats": {
      "total": 50,
      "pending": 10,
      "praying": 15,
      "answered": 20,
      "archived": 5
    }
  }
}
```

---

#### PATCH /api/admin/prayer-requests/:id/status
**Descricao:** Atualiza status de um pedido
**Permissao:** Admin ou Espiritualidade

**Request Body:**
```json
{
  "status": "praying",
  "notes": "Estamos orando por esta situacao..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Status atualizado com sucesso!"
}
```

---

#### DELETE /api/admin/prayer-requests/:id
**Descricao:** Exclui um pedido de oracao
**Permissao:** Admin ou Espiritualidade

**Response (200):**
```json
{
  "success": true,
  "message": "Pedido excluido com sucesso!"
}
```

---

### 4.4 Banners (Marketing)

#### GET /api/admin/banners
**Descricao:** Lista todos os banners
**Permissao:** Admin ou Marketing

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Titulo do Banner",
      "subtitle": "Subtitulo",
      "imageUrl": "/uploads/banners/...",
      "linkUrl": "/agenda/1",
      "linkText": "Saiba Mais",
      "orderIndex": 0,
      "isActive": true,
      "startsAt": null,
      "endsAt": null
    }
  ]
}
```

---

#### POST /api/admin/banners
**Descricao:** Cria um novo banner
**Permissao:** Admin ou Marketing

**Request Body:**
```json
{
  "title": "Titulo do Banner",
  "subtitle": "Subtitulo opcional",
  "imageUrl": "/uploads/banners/novo.jpg",
  "backgroundColor": "#FFA500",
  "linkUrl": "/agenda/1",
  "linkText": "Saiba Mais",
  "orderIndex": 0,
  "isActive": true,
  "startsAt": "2025-12-01T00:00:00Z",
  "endsAt": "2025-12-31T23:59:59Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Banner criado com sucesso!",
  "data": {
    "id": 1
  }
}
```

---

#### PUT /api/admin/banners/:id
**Descricao:** Atualiza um banner
**Permissao:** Admin ou Marketing

**Response (200):**
```json
{
  "success": true,
  "message": "Banner atualizado com sucesso!"
}
```

---

#### DELETE /api/admin/banners/:id
**Descricao:** Exclui um banner
**Permissao:** Admin ou Marketing

**Response (200):**
```json
{
  "success": true,
  "message": "Banner excluido com sucesso!"
}
```

---

#### PATCH /api/admin/banners/reorder
**Descricao:** Reordena os banners
**Permissao:** Admin ou Marketing

**Request Body:**
```json
{
  "order": [3, 1, 2, 4]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Ordem atualizada com sucesso!"
}
```

---

### 4.5 Diretoria (Admin Only)

#### POST /api/admin/board
**Descricao:** Adiciona membro a diretoria
**Permissao:** Admin apenas

**Request Body:**
```json
{
  "userId": 1,
  "name": "Nome Completo",
  "position": "presidente",
  "photoUrl": "/uploads/board/foto.jpg",
  "instagram": "@nome",
  "whatsapp": "(11) 99999-9999",
  "bio": "Breve biografia...",
  "termStart": "2024",
  "termEnd": "2025",
  "orderIndex": 0
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Membro adicionado a diretoria!"
}
```

---

#### PUT /api/admin/board/:id
**Descricao:** Atualiza membro da diretoria
**Permissao:** Admin apenas

**Response (200):**
```json
{
  "success": true,
  "message": "Membro atualizado com sucesso!"
}
```

---

#### DELETE /api/admin/board/:id
**Descricao:** Remove membro da diretoria
**Permissao:** Admin apenas

**Response (200):**
```json
{
  "success": true,
  "message": "Membro removido da diretoria!"
}
```

---

### 4.6 Conteudo do Site (Admin/Marketing)

#### PUT /api/admin/content/:page/:section
**Descricao:** Atualiza conteudo de uma secao
**Permissao:** Admin ou Marketing (para paginas especificas)

**Request Body:**
```json
{
  "title": "Titulo da Secao",
  "content": "Conteudo em Markdown...",
  "imageUrl": "/uploads/content/imagem.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Conteudo atualizado com sucesso!"
}
```

---

## 5. Upload de Arquivos

#### POST /api/upload
**Descricao:** Faz upload de imagem
**Permissao:** Qualquer usuario autenticado

**Request:** `multipart/form-data`
| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| file | File | Sim | Arquivo de imagem (jpg, png, webp) |
| folder | string | Nao | Pasta destino (banners, events, board, devotionals) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "/uploads/banners/1701694800000-image.jpg"
  }
}
```

---

## 6. Codigos de Erro

| Codigo | HTTP Status | Descricao |
|--------|-------------|-----------|
| UNAUTHORIZED | 401 | Nao autenticado |
| FORBIDDEN | 403 | Sem permissao |
| NOT_FOUND | 404 | Recurso nao encontrado |
| VALIDATION_ERROR | 400 | Dados invalidos |
| INTERNAL_ERROR | 500 | Erro interno |

---

## 7. Rate Limiting

| Tipo de Endpoint | Limite |
|------------------|--------|
| Publicos | 100 req/min |
| Autenticados | 200 req/min |
| Upload | 10 req/min |

---

## 8. Middleware de Secretaria

```typescript
// Exemplo de uso nas rotas
router.post("/api/admin/devotionals",
  requireAuth,
  checkSecretaria(["espiritualidade"]),
  createDevotional
);

router.post("/api/admin/events",
  requireAuth,
  checkSecretaria(["marketing"]),
  createEvent
);

router.post("/api/admin/board",
  requireAuth,
  requireAdmin,
  createBoardMember
);
```

---

*Documento criado em: 04/12/2025*
*Versao: 1.0*
