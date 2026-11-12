# Estrutura dos Dados e Regras de Segurança

**Projeto:** Entre Páginas (Mobile)

O app guarda os dados em dois lugares: no aparelho (AsyncStorage, fonte principal de leitura) e na nuvem (Firestore, cópia sincronizada por conta). Se não houver internet, tudo continua funcionando e a sincronização acontece quando a conexão volta.

## 1. Armazenamento local (AsyncStorage)

Chaves por usuário (o `uid` do Firebase entra no nome, então duas contas no mesmo aparelho não misturam dados):

| Chave | Conteúdo |
| :--- | :--- |
| `@entre_paginas_books_v1_<uid>` | Lista de livros (estrutura abaixo) |
| `@entre_paginas_user_v1_<uid>` | Perfil e preferências de leitura |

## 2. Estrutura no Firestore

Um arquivo de exemplo, com livros fictícios nessa estrutura, está em [`exemplo-dados.json`](exemplo-dados.json). Nele, `chapters` aparece aninhado dentro de cada livro só para facilitar a leitura; no Firestore cada capítulo é um documento da subcoleção.

```
users/{uid}
  books/{bookId}
    chapters/{chapterId}
```

### Campos somente locais da importação (não vão para o Firestore)

| Campo | Onde | Para quê |
| :--- | :--- | :--- |
| `originalPdf` | livro | cópia do PDF importado (`originals/<id>.pdf` no iPhone, `idb:<id>` na web) |
| `textPending` | livro | número do Gutenberg enquanto o texto completo não chegou (mostra "Baixando o texto..." na estante) |
| `images` | capítulo | figuras `{ uri, offset, width, height }` e a posição no texto |
| `photoRatio` | capítulo | proporção da página digitalizada, para exibir sem cortar |

Na sincronização o app preserva esses valores locais; as regras e o modelo da nuvem não mudaram.

### Documento `users/{uid}/books/{bookId}`

```json
{
  "id": "book-1730000000000",
  "title": "Crônicas do Silêncio",
  "subtitle": "Por Fulana de Tal",
  "category": "Literatura",
  "tags": ["infância", "rio"],
  "coverColor": "#244C3A",
  "titleColor": "#FFFFFF",
  "paperColor": "#F4EAE0",
  "totalPages": 82,
  "status": "estante",
  "isOwn": true,
  "locked": false,
  "chapterCount": 3,
  "bookmarks": [
    { "id": "pin-1", "chapterId": "chap-1", "title": "Cena do rio", "color": "#C0392B", "page": 3, "createdAt": "2026-11-02T09:00:00.000Z" }
  ],
  "changeLog": [
    {
      "id": "change-1",
      "type": "edit",
      "chapterTitle": "Capítulo 1",
      "before": { "title": "Capítulo 1", "content": "texto antigo" },
      "after": { "title": "Capítulo 1", "content": "texto novo" },
      "date": "2026-11-04T12:00:00.000Z"
    }
  ],
  "createdAt": "2026-11-01T10:00:00.000Z",
  "updatedAt": "2026-11-04T12:00:00.000Z"
}
```

| Campo | Tipo | Observação |
| :--- | :--- | :--- |
| `tags` | lista de até 5 textos curtos, em minúsculas |
| `status` | `"estante"` ou `"bau"` | `"bau"` é o livro arquivado |
| `locked` | boolean | `true` quando o livro exige biometria para abrir (o campo sincroniza, mas a verificação é feita no aparelho) |
| `isOwn` | boolean | `false` para livros importados; só eles têm `changeLog` |
| `changeLog[].type` | `edit`, `add`, `delete` ou `move` | histórico antes/depois |

### Documento `users/{uid}/books/{bookId}/chapters/{chapterId}`

```json
{
  "id": "chap-1",
  "title": "Capítulo 1",
  "content": "Texto do capítulo...",
  "order": 0,
  "marks": [
    { "id": "m-1", "start": 10, "end": 24, "type": "highlight", "color": "#FFE680", "text": "trecho grifado" }
  ]
}
```

| Campo | Observação |
| :--- | :--- |
| `order` | posição do capítulo no livro (usado para reordenar) |
| `marks[].type` | `highlight`, `bold`, `italic` ou `underline` |
| Foto da página | **não** vai para a nuvem; fica só no aparelho (campo `photo` local) |

Os capítulos ficam em subcoleção para que um livro grande não ultrapasse o limite de 1 MB por documento do Firestore.

## 3. Regras de segurança do Firestore

Arquivo: [`firestore.rules`](../firestore.rules), publicado com `firebase deploy --only firestore`.

- **Isolamento por dono:** só quem está autenticado **com o Google** (`sign_in_provider == 'google.com'`) e tem o mesmo `uid` do caminho lê ou grava `users/{uid}/...`. Sem login, ou com outro método de login, nada é acessível.
- **Validação na escrita:**
  - livro: `title` texto com 1 a 200 caracteres e `status` igual a `estante` ou `bau`;
  - capítulo: `title` texto com até 200 caracteres e `content` texto com até 200.000 caracteres.
- **Negar por padrão:** qualquer outro caminho do banco é bloqueado.

### Teste das regras (via API REST, com duas contas temporárias)

| Operação | Resultado |
| :--- | :--- |
| Dono grava e lê o próprio livro | 200 |
| Outra conta lê um livro alheio | 403 |
| Outra conta grava no caminho de outro usuário | 403 |
| Dono grava livro com `status` inválido | 403 |
| Dono grava livro com título vazio | 403 |
| Dono grava em coleção não prevista | 403 |
| Requisição sem login válido | 401 (sem token, 403) |
| Conta criada por e-mail e senha (não Google) tenta gravar ou ler | 403 |

As contas de teste foram removidas ao final.

## 3.1 Registro de leitura (somente no aparelho)

O progresso e o painel usam um registro separado, guardado no AsyncStorage por usuário (`@entre_paginas_reading_v1_<uid>`), no mesmo modelo da última página lida. Ele **não vai para o Firestore**: o banco e as regras de segurança continuam iguais, e os dados dos livros não mudam.

```json
{
  "version": 1,
  "books": {
    "<bookId>": { "startedAt": "ISO ou null", "lastReadAt": "ISO", "finishedAt": "ISO ou null", "credited": 4, "seconds": 120 }
  },
  "days": { "2026-11-11": { "<bookId>": { "pages": 4, "seconds": 120 } } },
  "goal": { "year": 2026, "target": 12 }
}
```

- `credited` é a página mais avançada alcançada lendo. Só avanços de 1 ou 2 páginas e o registro manual de página somam ao dia; saltos pelo sumário e voltas a páginas já lidas não somam.
- `seconds` soma o tempo com o leitor aberto, limitado a 5 minutos entre uma ação e outra (tempo parado não conta).
- Livros lidos antes desta versão entram como "lendo" no ponto onde pararam, sem data de início.
- Excluir um livro remove o registro dele, inclusive do histórico diário. Apagar todos os dados limpa o registro.

## 3.2 Dados pessoais, catálogo e recomendações (somente no aparelho)

Guardados no AsyncStorage por usuário e **fora do Firestore**: as regras de segurança não mudam e uma conta não lê os dados de outra, pois toda chave leva o `uid`.

- `@entre_paginas_personal_v1_<uid>`: avaliações, perfil declarado, retornos das recomendações, conversa com a curadora e preferências de privacidade.
- `@entre_paginas_catalog_history_v1_<uid>`: últimas 60 buscas (termo, filtros e situação de cada fonte, sem dados pessoais).
- Campo opcional `catalog` em cada livro vindo de **Descobrir**: `workId`, `source`, `sourceId`, `url`, `access` (nível e se lê no app), `language`, `year`, `genres`, `subjects`, `isbns`, `addedFrom`.
- O registro de leitura ganhou `abandonedAt` por livro (status *Abandonado*). Ler de novo páginas novas retoma a leitura.

```json
{
  "version": 1,
  "ratings": {
    "w:dom-casmurro:assis": {
      "workId": "w:dom-casmurro:assis", "bookId": "book-1", "title": "Dom Casmurro", "authors": ["Machado de Assis"],
      "genres": ["classico"], "language": "pt", "year": 1899, "pages": 256,
      "stars": 4,
      "aspects": { "characters": true, "plot": false, "surprise": "surpreendente" },
      "liked": "", "disliked": "", "review": "",
      "createdAt": "ISO", "updatedAt": "ISO"
    }
  },
  "declared": {
    "genres": ["fantasia"], "traits": [], "favoriteAuthors": [], "favoriteBooks": [], "wantAuthors": [],
    "languages": ["pt"], "eras": [], "topics": [], "avoidTopics": [], "length": "medio", "period": "ambos", "notes": ""
  },
  "progress": { "step": 2, "skipped": [], "updatedAt": "ISO" },
  "recs": { "<workId>": { "count": 2, "lastShown": "ISO" } },
  "recFeedback": { "<workId>": { "action": "not_interested", "at": "ISO", "work": { "id": "...", "title": "...", "authors": [], "genres": [] } } },
  "chat": [{ "role": "user", "text": "..." }],
  "settings": { "useRatings": true, "useHistory": true, "useReviews": true }
}
```

- **Identidade da obra** (`workId`): `w:<título normalizado>:<sobrenome do autor ou anon>`. É a mesma para o livro da estante e para o resultado do catálogo, e é a chave das notas.
- **Versionamento:** `normalizePersonal` roda a cada leitura, descarta campos inválidos e preenche os ausentes; não existe migração destrutiva, e nenhum dado anterior foi apagado.
- **Exportar e apagar:** o perfil literário exporta o JSON acima e apaga por parte (recomendações e conversas, perfil declarado, avaliações). *Excluir dados* da conta remove tudo.

## 4. Como a sincronização funciona

1. Ao entrar, o app lê os livros da nuvem e mescla com os locais. Para o mesmo livro vence a versão com `updatedAt` mais recente. Livros que só existem num dos lados são mantidos.
2. A cada alteração, o app grava localmente e agenda o envio dos livros alterados (com pequeno atraso para juntar edições seguidas).
3. Se o envio falhar (sem internet, por exemplo), os dados continuam no aparelho e o app tenta de novo a cada 20 segundos.
4. Excluir um livro definitivamente também o remove da nuvem.

**Limitação assumida:** não há resolução de conflito por campo. Se o mesmo livro for editado em dois aparelhos ao mesmo tempo, a versão mais recente substitui a outra.
