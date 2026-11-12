# PRD — Entre Páginas

| | |
| :--- | :--- |
| **Produto** | Entre Páginas, estante virtual de livros digitais |
| **Plataforma** | Mobile, em React Native com Expo (JavaScript), executável no Expo Go |
| **Back-end** | Firebase (Authentication com Google, Firestore, AI Logic com Gemini) |
| **Versão deste documento** | Etapa 3, novembro de 2026 |
| **Documentos ligados** | [ExplicaçãoArquiteturaTelas.md](ExplicaçãoArquiteturaTelas.md), [EstruturaDados.md](EstruturaDados.md), [Tutorial.md](Tutorial.md), [diarioIA.md](diarioIA.md) |

## 1. Visão geral

O Entre Páginas é um aplicativo em que cada pessoa monta e mantém a própria estante de livros digitais. É possível escrever um livro do zero, importar PDF, EPUB, texto ou JSON, fotografar páginas físicas e baixar obras de domínio público com o texto completo. Os livros são personalizados (capa, folha e tipo de letra), lidos em páginas, anotados com grifos, marcadores e comentários, e guardados no "baú" quando saem da estante, sem serem apagados. Tudo é salvo primeiro no aparelho e sincronizado com a nuvem.

O projeto nasceu como porte para mobile de uma estante virtual já existente e foi ampliado ao longo do semestre. A seção 17 registra o que mudou em relação ao planejado na Etapa 1.

## 2. Problema

Muita gente lê e escreve trechos de forma espalhada: fotos de páginas de livros físicos, anotações soltas, PDFs e rascunhos no celular. Faltam um lugar único para guardar tudo isso como "livros" pessoais e uma leitura confortável, com marcações que sobrevivam entre sessões e aparelhos.

## 3. Público e personas

**Público-alvo:** estudantes e leitores que querem organizar resumos, anotações e pequenos textos próprios em forma de livro, e ler obras de domínio público no celular sem depender de várias ferramentas.

| Persona | Necessidade | Como o app atende |
| :--- | :--- | :--- |
| **Estudante universitária** | Reunir resumos, PDFs de aula e fotos de páginas de livros, com busca e grifos | Importação de arquivos, câmera com transcrição por IA, grifos, marcadores e busca na estante |
| **Leitor de clássicos** | Encontrar obras em português ou em outros idiomas e ler com boa formatação | Busca no Gutenberg e Google Books, catálogo de A a Z por letra e idioma, texto completo com negrito e itálico |
| **Escritor amador** | Escrever capítulos e organizar a obra | Criação e edição de capítulos, reordenação, personalização de capa e folha |

## 4. Solução e fluxo principal

1. A pessoa entra com a conta Google.
2. Na estante, vê seus livros em grade e pode buscar por título, categoria ou etiqueta.
3. Em Novo Livro, cria uma obra (capa, folha, primeiro capítulo), importa um arquivo ou escolhe uma obra do catálogo.
4. No leitor, lê página a página, grifa, marca páginas, comenta, edita capítulos e consulta a companheira de leitura por IA.
5. Livros que saem da estante vão para o baú, de onde podem ser restaurados ou excluídos de vez.
6. Os dados ficam no aparelho e são sincronizados com a nuvem; a sessão persiste entre aberturas.

## 5. Proposta de valor

- Organização por livro e capítulo, em vez de uma lista plana de notas.
- Texto completo de obras de domínio público, em vários idiomas, com a formatação original.
- Importação de PDF, EPUB, texto e JSON, e captura de páginas físicas pela câmera.
- Leitura paginada com grifos, marcadores e posição de leitura salva por livro.
- Companheira de leitura por IA (Modo sem spoilers, Explique este trecho e Mapa de personagens) e transcrição de fotos.
- Baú para arquivar sem perder; proteção opcional por biometria.
- Funciona sem rede, com sincronização quando houver conexão.

## 6. Objetivos

### 6.1 Objetivo geral

Entregar um aplicativo mobile funcional em Expo, testado em celular real, que cubra o ciclo completo de criar, importar, ler, anotar, arquivar e sincronizar livros digitais.

### 6.2 Objetivos específicos e como serão verificados

| Objetivo | Verificação |
| :--- | :--- |
| Autenticar somente com Google e manter a sessão | Fechar e reabrir o app sem novo login; telas internas inacessíveis sem login |
| Permitir criar, ler, editar e excluir livros e capítulos | Fluxo completo pela interface (seção 14) |
| Importar conteúdo de arquivos, da câmera e de catálogos públicos | Um livro de cada origem na estante, com texto legível |
| Integrar IA de forma útil e tolerante a falhas | Companheira de leitura funciona; com a IA indisponível o app avisa e segue |
| Sincronizar com a nuvem sem misturar contas | Duas contas diferentes enxergam apenas os próprios livros |
| Tratar carregamento, lista vazia e erro | Estados visíveis nas listagens de Estante, Baú e catálogo |

## 7. Requisitos funcionais

**Convenção:** `RF-<ÁREA>-<NN>`. Áreas: AUT (autenticação), LIV (livros), BAU (baú), CAP (capítulos), LEI (leitura e anotações), IMP (importação e catálogo), IA, NUV (nuvem e dados), SEG (segurança), CFG (perfil e configurações), ERR (falhas e estados). **Prioridade:** E = essencial, I = importante, D = desejável. Todos os itens abaixo estão implementados.

### 7.1 Autenticação (AUT)

| ID | Requisito | Prioridade |
| :--- | :--- | :--- |
| RF-AUT-01 | O sistema deve permitir entrar somente com uma conta Google, via Firebase Authentication, sem e-mail e senha. | E |
| RF-AUT-02 | O sistema deve manter a sessão ativa entre fechamentos e reaberturas do aplicativo. | E |
| RF-AUT-03 | As telas internas só devem existir para usuário autenticado; sem login, só a tela de entrada é acessível. | E |
| RF-AUT-04 | O sistema deve permitir sair da conta, com confirmação. | E |

### 7.2 Livros (LIV)

| ID | Requisito | Prioridade |
| :--- | :--- | :--- |
| RF-LIV-01 | O sistema deve permitir criar um livro com título obrigatório, subtítulo e categoria. | E |
| RF-LIV-02 | O sistema deve permitir personalizar a capa: cor da capa, cor do título e foto (galeria ou câmera), com pré-visualização ao vivo. | E |
| RF-LIV-03 | O sistema deve permitir escolher a cor da folha e o tipo de letra da leitura (serifada, sem serifa, máquina de escrever ou a fonte original do EPUB). | I |
| RF-LIV-04 | O sistema deve permitir editar título, subtítulo, categoria, etiquetas e aparência de um livro existente. | E |
| RF-LIV-05 | O sistema deve oferecer três categorias padrão e permitir criar e excluir categorias. | I |
| RF-LIV-06 | O sistema deve listar os livros ativos em grade, com busca em tempo real por título, subtítulo, categoria e etiquetas, ignorando acentos e maiúsculas, e com ordenação. | E |
| RF-LIV-07 | O sistema deve permitir selecionar vários livros e excluí-los em lote, com confirmação. | D |
| RF-LIV-08 | O sistema deve permitir exportar um livro em TXT ou JSON, pelo compartilhamento do aparelho ou por download no navegador. | I |

### 7.3 Baú (BAU)

| ID | Requisito | Prioridade |
| :--- | :--- | :--- |
| RF-BAU-01 | O sistema deve permitir mover um livro da estante para o baú sem apagá-lo. | E |
| RF-BAU-02 | O sistema deve listar os livros do baú, com busca. | E |
| RF-BAU-03 | O sistema deve permitir restaurar um livro ou todos os livros do baú para a estante. | E |
| RF-BAU-04 | O sistema deve permitir excluir definitivamente um livro do baú ou esvaziar o baú, sempre com confirmação. | E |

### 7.4 Capítulos (CAP)

| ID | Requisito | Prioridade |
| :--- | :--- | :--- |
| RF-CAP-01 | O sistema deve permitir adicionar capítulos a um livro, escrevendo o texto. | E |
| RF-CAP-02 | O sistema deve permitir editar título e texto de um capítulo. | E |
| RF-CAP-03 | O sistema deve permitir excluir um capítulo, com confirmação. | E |
| RF-CAP-04 | O sistema deve permitir reordenar os capítulos pelo sumário. | I |
| RF-CAP-05 | O sistema deve permitir fotografar uma página, anexar a foto ao capítulo e transcrever seu texto com IA. | I |

### 7.5 Leitura e anotações (LEI)

| ID | Requisito | Prioridade |
| :--- | :--- | :--- |
| RF-LEI-01 | O sistema deve apresentar o livro em páginas de leitura, navegáveis por arrastar, por Anterior e Próxima. | E |
| RF-LEI-02 | O sistema deve oferecer um sumário com salto direto para capítulos e a lista de marcadores. | E |
| RF-LEI-03 | O sistema deve permitir ajustar o tamanho da letra e alternar o tema claro e escuro do leitor. | I |
| RF-LEI-04 | O sistema deve oferecer um modo de leitura sem menus. | D |
| RF-LEI-05 | O sistema deve guardar a última página lida de cada livro e voltar a ela ao reabrir. | I |
| RF-LEI-06 | O sistema deve permitir grifar trechos em 5 cores e aplicar negrito, itálico e sublinhado. | I |
| RF-LEI-07 | O sistema deve permitir marcar páginas com título e cor do pin. | I |
| RF-LEI-09 | O sistema deve permitir marcar um trecho selecionado com pino (nome e cor), listar grifos e pinos no sumário e permitir removê-los. | I |
| RF-LEI-08 | O sistema deve permitir comentários presos à página, em especial nas obras de terceiros. | D |
| RF-LEI-09 | O sistema deve registrar em um histórico as alterações feitas em livros que não são de autoria do usuário, com a versão anterior e a nova. | D |

### 7.6 Importação e catálogo (IMP)

| ID | Requisito | Prioridade |
| :--- | :--- | :--- |
| RF-IMP-01 | O sistema deve importar PDF com texto, EPUB, TXT, Markdown e JSON, convertendo o conteúdo em capítulos. | E |
| RF-IMP-02 | O sistema deve avisar quando um PDF não tem texto extraível e criar um livro para transcrição manual. | I |
| RF-IMP-03 | O sistema deve usar a fonte embutida do EPUB e, em PDF, a família equivalente à identificada. | D |
| RF-IMP-04 | O sistema deve buscar livros no Project Gutenberg (domínio público) e no Google Books, mesclando e ordenando por relevância, inclusive para termos curtos. | E |
| RF-IMP-05 | O sistema deve oferecer um catálogo de A a Z, filtrado por letra e idioma, carregando 30 livros por vez. | I |
| RF-IMP-06 | O sistema deve baixar o texto completo da obra escolhida em segundo plano, com barra de progresso, retomando downloads interrompidos. | I |
| RF-IMP-07 | O sistema deve preservar negrito e itálico do original quando a obra vier em HTML. | I |
| RF-IMP-08 | O sistema deve avisar quando a obra escolhida já estiver na estante. | D |
| RF-IMP-09 | O sistema deve dividir capítulos muito longos em partes para que nenhum texto seja cortado ao sincronizar. | I |
| RF-IMP-10 | O sistema deve extrair todas as imagens de PDF e EPUB, sem descartar nenhuma, e posicioná-las no texto adaptado junto do parágrafo que as seguia no arquivo, mantendo a proporção. | I |
| RF-IMP-11 | O sistema deve guardar uma cópia do PDF importado e abri-lo exatamente como o arquivo (iOS e web), com botão para alternar ao texto adaptado. | I |
| RF-IMP-12 | O sistema deve escolher a capa do livro importado, com apoio da IA quando disponível, e converter imagens CMYK para exibição. | D |
| RF-IMP-13 | O sistema deve preservar a estrutura do PDF no texto adaptado: títulos como capítulos, letra capitular, estrofes de versos e folha de rosto. | I |
| RF-IMP-14 | Se o texto completo de uma obra não puder ser baixado, o livro deve continuar na estante com a indicação "Baixando o texto...", e o app deve tentar de novo sem pedir nada à pessoa. | E |

### 7.7 Inteligência artificial (IA)

| ID | Requisito | Prioridade |
| :--- | :--- | :--- |
| RF-IA-01 | O sistema deve oferecer o Modo sem spoilers: a IA só recebe o texto até a folha atual do leitor, o limite acompanha a posição (inclusive ao voltar), o modo fica visível, não pode ser desligado e respostas sem citação confirmada no texto lido são bloqueadas. | E |
| RF-IA-02 | O sistema deve transcrever para texto a foto de uma página de livro. | I |
| RF-IA-04 | O sistema deve explicar um trecho selecionado, com o contexto lido, a referência de capítulo e folha e perguntas de acompanhamento, sem alterar o texto. | I |
| RF-IA-05 | O sistema deve montar o mapa de personagens com descrição, relações e acontecimentos, limitado ao texto lido, validando nomes e citações e marcando relações não confirmadas. | I |
| RF-IA-03 | Se a IA estiver indisponível, demorar ou responder fora do esperado, o sistema deve avisar a pessoa e continuar funcionando, sem alterar o livro. | E |

### 7.8 Nuvem e dados (NUV)

| ID | Requisito | Prioridade |
| :--- | :--- | :--- |
| RF-NUV-01 | O sistema deve salvar primeiro no aparelho e sincronizar livros, capítulos, grifos, marcadores e comentários com o Firestore. | E |
| RF-NUV-02 | O sistema deve permitir uso sem rede e sincronizar quando a conexão voltar. | I |
| RF-NUV-03 | O sistema deve permitir apagar todos os dados do aparelho e da nuvem, com confirmação. | I |

### 7.9 Segurança (SEG)

| ID | Requisito | Prioridade |
| :--- | :--- | :--- |
| RF-SEG-01 | O sistema deve permitir proteger um livro com a biometria do aparelho, exigindo-a para abrir. | D |

### 7.10 Perfil e configurações (CFG)

| ID | Requisito | Prioridade |
| :--- | :--- | :--- |
| RF-CFG-01 | O sistema deve oferecer o tema Automático, Claro ou Escuro, lembrado no aparelho. | I |
| RF-CFG-02 | O sistema deve exibir um perfil com nome, e-mail, quantidade de livros, capítulos, grifos, marcadores e espaço usado. | D |

### 7.11 Painel e progresso de leitura (PAI)

| ID | Requisito | Prioridade |
| :--- | :--- | :--- |
| RF-PAI-01 | O sistema deve calcular o status de cada livro da estante (Quero ler, Lendo ou Lido) a partir da leitura real e exibi-lo no cartão, com percentual e barra de progresso. | I |
| RF-PAI-02 | O sistema deve permitir filtrar a estante por status, com a contagem de livros de cada um. | I |
| RF-PAI-03 | No leitor, o sistema deve mostrar página atual, total, percentual, data de início, previsão de término e data de conclusão, e permitir registrar a página atual. | I |
| RF-PAI-04 | O sistema deve concluir o livro ao ler a última página, permitir marcar como lido ou voltar para lendo, e avisar a conclusão. | I |
| RF-PAI-05 | O sistema deve registrar páginas lidas por dia e tempo de leitura, sem contar saltos de capítulo, voltas a páginas já lidas nem tempo parado acima de 5 minutos. | I |
| RF-PAI-06 | O perfil deve exibir um painel com livros lidos, em andamento e planejados, páginas lidas, tempo de leitura, média de páginas por dia, gráfico dos últimos 14 dias e 6 meses, comparativo com o mês e o ano anteriores e atividade recente, sempre com dados reais. | I |
| RF-PAI-07 | O usuário deve poder definir uma meta anual de livros concluídos e ver o progresso e quanto falta. | D |
| RF-LEI-01 | O leitor deve permitir ajustar fonte, tamanho, entrelinha, espaço entre parágrafos, largura, alinhamento e margens, com efeito imediato e sem alterar a página atual. | I |
| RF-LEI-02 | O leitor deve oferecer os temas Claro, Creme, Verde e Escuro, além do modo automático, e um brilho próprio que escurece apenas o leitor. | I |
| RF-LEI-03 | O leitor deve permitir ocultar os menus automaticamente, manter a tela ativa (quando houver suporte) e restaurar as configurações originais. | I |
| RF-LEI-04 | As preferências devem ser salvas por usuário e aplicadas a todos os livros nas próximas leituras. | I |
| RF-LEI-05 | O sumário deve listar os destaques do livro e levar até a folha de cada um. | I |
| RF-PAI-08 | Ao excluir um livro, o sistema deve remover também o seu registro de leitura, mantendo painel e livros coerentes. | I |

### 7.12 Falhas e estados (ERR)

| ID | Requisito | Prioridade |
| :--- | :--- | :--- |
| RF-ERR-01 | As listagens devem tratar os estados de carregamento, vazio e erro, com opção de tentar de novo. | E |
| RF-ERR-02 | Falhas de rede, Google Books, Gutenberg, IA, importação e exportação devem ser informadas com mensagem clara, sem travar o app. | E |
| RF-ERR-04 | Todo aviso e toda confirmação devem aparecer como diálogo do próprio app, igual no celular e na web, nunca como caixa do sistema ou do navegador. | E |
| RF-ERR-03 | Se a permissão de câmera for negada, o app deve explicar e continuar funcionando; se estiver bloqueada, oferecer abrir os ajustes do aparelho. | E |

## 8. Requisitos não funcionais

| ID | Requisito |
| :--- | :--- |
| RNF-01 | **Plataforma:** o app deve ser feito em Expo e rodar no Expo Go em celular real, além do navegador. |
| RNF-02 | **Persistência:** os dados devem permanecer após fechar e reabrir o app, no aparelho e na nuvem. |
| RNF-03 | **Isolamento:** cada pessoa acessa só os próprios dados, garantido pelas regras do Firestore e pela separação local por conta. |
| RNF-04 | **Segredos:** nenhuma chave de API pode ser versionada; a configuração fica em variáveis de ambiente (`.env`, modelo em `.env.example`) e a IA é chamada sem chave no aplicativo. |
| RNF-05 | **Tolerância a falhas:** nenhuma integração externa pode encerrar o app inesperadamente. |
| RNF-06 | **Usabilidade:** as operações principais devem ser alcançáveis em até dois toques a partir da estante; botões com área de toque mínima de 44 pontos e rótulos de acessibilidade. |
| RNF-07 | **Responsividade e tema:** as telas devem se adaptar a diferentes tamanhos e aos temas claro e escuro. |
| RNF-08 | **Desempenho:** listas e leitura devem permanecer fluidas com livros longos; o catálogo carrega por páginas de 30. |
| RNF-09 | **Integridade:** operações de gravação local são executadas em fila, e os identificadores são únicos, para que ações rápidas não percam dados. |

## 9. Estrutura conceitual dos dados

Detalhada em [EstruturaDados.md](EstruturaDados.md), com exemplo em [exemplo-dados.json](exemplo-dados.json).

- **Usuário:** identificador do Firebase, nome e e-mail.
- **Livro:** identificador, título, subtítulo, categoria, etiquetas, aparência (capas e folha), status (estante ou baú), proteção, marcadores, comentários, histórico, datas.
- **Capítulo:** identificador, ordem, título, conteúdo, grifos e foto opcional.

No Firestore: `users/{uid}/books/{bookId}` e a subcoleção `chapters`.

## 10. Integrações externas

| Serviço | Uso | Se falhar |
| :--- | :--- | :--- |
| Firebase Authentication | Login com Google | Mensagem na tela de entrada |
| Firestore | Sincronização dos livros | O app segue com os dados locais e tenta de novo |
| Firebase AI Logic (Gemini) | Companheira de leitura e transcrição de fotos | Aviso na tela; o leitor continua funcionando |
| Project Gutenberg (OPDS) | Busca, catálogo e texto completo de domínio público | Resultados do Google Books e mensagem de indisponibilidade |
| Google Books API | Busca complementar de livros | Resultados do Gutenberg e opção de criar o livro à mão |
| Câmera e galeria | Fotos de capa e de páginas | O app explica e segue sem a foto |
| Biometria do aparelho | Livros protegidos | Livro continua bloqueado; senha do aparelho como alternativa |

## 11. Escopo

**Dentro do escopo:** login com Google, sessão persistente, estante individual, criação e personalização de livros, categorias e etiquetas, capítulos com edição e ordem, leitura paginada com sumário, grifos, marcadores, comentários e histórico, importação (PDF, EPUB, TXT, JSON), câmera com transcrição por IA, busca e catálogo de domínio público, resumo por IA, exportação, baú, biometria, tema, sincronização com o Firestore e tratamento de falhas.

## 12. Fora do escopo

- Rede social pública entre usuários (seguidores, avaliações).
- Marketplace ou venda de livros.
- Publicação de livros para outros usuários e edição colaborativa simultânea.
- Biblioteca comercial de obras sob direitos autorais.
- Audiolivros e narração automática.
- Diagramação editorial profissional e impressão física.
- Treinamento de modelos próprios de IA.
- Login por e-mail e senha.
- Notificações e lembretes de leitura.

## 13. Decisões de arquitetura

As decisões completas, com alternativas e consequências, estão em [ExplicaçãoArquiteturaTelas.md](ExplicaçãoArquiteturaTelas.md) (DA01 a DA20). As quatro que moldam este PRD:

### DA01 — Firebase para autenticação e dados

**Decisão:** Firebase Authentication (Google) e Firestore, no plano gratuito.
**Alternativas:** back-end próprio em Node.js; PostgreSQL com API própria.
**Consequências:** menos infraestrutura para manter e login Google simples; dependência dos limites do serviço, mitigada com dados locais primeiro.

### DA02 — Expo e React Native

**Decisão:** Expo com React Navigation, testado no Expo Go.
**Alternativas:** apps nativos separados; Flutter.
**Consequências:** uma base de código para Android, iOS e web; recursos nativos limitados aos módulos do Expo Go.

### DA03 — Modelagem dos dados: usuário → livros → capítulos

**Decisão:** um documento por livro e uma subcoleção de capítulos, por usuário.
**Alternativas:** todo o livro em um único documento (estoura o limite de 1 MB); cada capítulo como documento solto, sem subcoleção; estrutura plana sem separação por entidade.
**Consequências:** edição e reordenação de capítulos isoladas e leitura sob demanda; exige manter a ordem explicitamente e dividir capítulos muito longos.

### DA04 — Integrações isoladas do fluxo principal

**Decisão:** câmera, IA, catálogos e exportação são recursos auxiliares, tolerantes a falha.
**Alternativas:** torná-los obrigatórios para o uso básico.
**Consequências:** criar, ler e editar livros funciona mesmo sem essas integrações; cada uma precisa de estados de carregamento e mensagens de erro próprios.

## 14. Critérios de aceitação

| # | Critério | Requisitos |
| :--- | :--- | :--- |
| 1 | Entrar com Google, fechar e reabrir sem novo login; sem login, nenhuma tela interna abre | AUT-01 a AUT-03 |
| 2 | Duas contas diferentes veem apenas os próprios livros | NUV-01, RNF-03 |
| 3 | Criar um livro, personalizar capa e folha, editar e categorizar | LIV-01 a LIV-05 |
| 4 | Enviar ao baú, restaurar e excluir definitivamente | BAU-01 a BAU-04 |
| 5 | Criar, editar, reordenar e excluir capítulos | CAP-01 a CAP-04 |
| 6 | Ler em páginas, abrir o sumário e voltar à página lida ao reabrir | LEI-01, LEI-02, LEI-05 |
| 7 | Grifar, marcar página e comentar | LEI-06 a LEI-08 |
| 8 | Importar um PDF, um EPUB, um TXT e um JSON | IMP-01, IMP-02 |
| 9 | Buscar "A" e "dom casmurro" e baixar uma obra pelo catálogo A-Z | IMP-04 a IMP-08 |
| 10 | Fotografar uma página, transcrever com IA e negar a permissão da câmera sem travar | CAP-05, IA-02, ERR-03 |
| 11 | Perguntar à companheira de leitura; com a IA indisponível o app avisa e continua | IA-01, IA-03 |
| 12 | Exportar um livro em TXT e em JSON | LIV-08 |
| 13 | Proteger um livro e abri-lo com a biometria | SEG-01 |
| 14 | Trocar o tema e apagar todos os dados | CFG-01, NUV-03 |
| 15 | Ver carregamento, lista vazia e erro nas listagens | ERR-01, ERR-02 |

## 15. Rastreabilidade

| Área | Tela principal | Código |
| :--- | :--- | :--- |
| AUT | `LoginScreen`, `SettingsScreen` | `services/auth.js`, `context/AuthContext.js`, `navigation/AppNavigator.js` |
| LIV | `BookshelfScreen`, `CreateBookScreen`, `BookEditModal` | `services/storage.js`, `services/exporter.js`, `services/textSearch.js` |
| BAU | `ChestScreen` | `services/storage.js` |
| CAP e LEI | `ReaderScreen`, `ChapterEditor`, `CommentsModal`, `ChangeHistoryModal` | `services/pagination.js`, `services/marks.js` |
| IMP | `CreateBookScreen`, `CatalogModal`, `GoogleBooksSearch` | `services/importer.js`, `publicDomain.js`, `googleBooks.js`, `googleImport.js`, `htmlText.js`, `pdfParser.js`, `epubParser.js` |
| IA | `ReaderScreen`, `ChapterEditor` | `services/ai.js` |
| NUV | todas | `services/cloud.js`, `firestore.rules` |
| SEG | `BookshelfScreen`, `BookEditModal` | `services/biometrics.js` |
| CFG | `ProfileScreen`, `SettingsScreen` | `theme/ThemeContext.js`, `theme/palettes.js`, `theme/tokens.js` |
| PAI | `ProfileScreen`, `BookshelfScreen`, `ReaderScreen` | `services/readingLog.js`, `services/readingStats.js`, `services/bookPages.js`, `components/GoalModal.js`, `components/ReadingProgressModal.js` |

## 16. Riscos e limitações

| Risco | Mitigação |
| :--- | :--- |
| Serviços externos (Gutenberg, Google Books, Gemini, Firebase) indisponíveis ou com limite de uso | Tratamento de erro, dados locais primeiro e recursos essenciais sem dependência externa |
| Qualidade da transcrição por IA varia com iluminação e fonte | A pessoa revisa e edita o texto antes de salvar |
| PDFs escaneados não têm texto extraível | Aviso e livro para transcrição manual |
| O navegador bloqueia (CORS) o download do texto do Gutenberg na web | O livro fica na estante com a sinopse e o download é retomado; no celular não há bloqueio |
| O Android não abre PDF dentro do app | No Android vale só o texto adaptado; PDF original no iOS e na web |
| Livros importados antes do PDF original não têm a cópia do arquivo | Reimportar o PDF |
| Lista alfabética do Gutenberg tem teto de cerca de 5 mil itens (o inglês passa dele) | Modo "mais baixados" para o inglês |
| Biometria não existe no navegador | Livros protegidos ficam bloqueados na web; o uso principal é o celular |
| Modelo de IA descontinuado | Modelo configurável por variável de ambiente |

## 17. Histórico de revisões

| Etapa | O que mudou em relação ao planejado |
| :--- | :--- |
| 1. Protótipos (28/09) | Primeira versão: estante, baú, páginas, Google Books, resumo por IA, login Google. |
| 2. Telas (30/10) | Persistência local com AsyncStorage; importação real de arquivos; leitor paginado. |
| 3. Final (30/11) | Sincronização com o Firestore (local primeiro); IA pelo Firebase AI Logic; biometria; grifos, marcadores, comentários e histórico; Gutenberg com texto completo, catálogo A-Z e formatação preservada; barra inferior com Estante, Novo Livro e Baú, e perfil pelo topo. **Retirado:** a sugestão de categoria e etiquetas por IA, por não agregar ao fluxo; o OCR por biblioteca foi substituído pela transcrição com IA. O nome do produto passou de "Estante Virtual" para "Entre Páginas". **Revisões posteriores:** avisos próprios do app (RF-ERR-04, DA20); importação com todas as imagens, estrutura preservada e capa por IA (RF-IMP-10, 12 e 13, DA19); PDF original com alternância para o texto adaptado (RF-IMP-11, DA18); livro do Gutenberg não é mais removido quando o download falha (RF-IMP-14, DA20). |
