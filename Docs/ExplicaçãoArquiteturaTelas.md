# Revisão do Documento de Requisitos e Decisões de Arquitetura

**Projeto:** Entre Páginas (Mobile)  
**Etapa:** Implementação de Telas, Navegação e Persistência Local  
**Data:** Outubro de 2026 (atualizado em novembro de 2026)  

---

## 1. Contexto e Justificativa da Revisão

O documento de requisitos original ([PRD.md](PRD.md)) previa a utilização direta de autenticação remota e banco em nuvem via Firebase (DA01). 

Para a presente etapa avaliativa, conforme as diretrizes do projeto:
> *"Telas implementadas, com navegação funcionando e persistência local, sem a implementação das regras de negócio completas, da persistência remota nem da autenticação de usuários."*

Foi realizada uma revisão planejada das decisões de arquitetura e dos requisitos atendidos para garantir que a aplicação funcione de forma autônoma, offline-first e reprodutível a partir de um clone limpo, sem dependência de chaves de API secretas ou configuração prévia de backend na nuvem pelos avaliadores.

---

## 2. Decisões de Arquitetura Revisadas

### DA01 (Revisada) — Persistência Local via AsyncStorage para a Etapa de Telas

* **Decisão Original no PRD:** Conexão direta com Firebase Authentication e Cloud Firestore/Storage.
* **Decisão Adotada na Etapa:** Utilização do `@react-native-async-storage/async-storage` encapsulado em um serviço modular (`src/services/storage.js`).
* **Motivação:** 
  - Permitir a execução imediata em qualquer máquina/dispositivo com `npm install` e `npx expo start`, sem a necessidade de credenciais `.env` ou projetos Firebase criados externamente.
  - O contrato do serviço de armazenamento (`getBooks`, `addBook`, `moveToChest`, `restoreFromChest`, `deleteBookPermanently`) foi modelado de forma idêntica ao esquema do Firestore (`usuário → livros → capítulos/páginas`), possibilitando a substituição transparente pelo SDK do Firebase na etapa subsequente.

### DA02 (Mantida e Especificada) — Expo SDK e React Navigation

* **Decisão:** Desenvolvimento com Expo SDK 57 e **React Navigation** (`@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`) em **JavaScript puro**.
* **Motivação:**
  - Garantir compatibilidade nativa estável e sem fricção com o Expo Go em celulares Android e iOS.
  - Implementação de barra de navegação inferior customizada (`CustomTabBar`) idêntica ao protótipo do Figma, com botão central em destaque ("Novo Livro").
  - Navegação entre telas com passagem declarativa de parâmetros (`navigation.navigate('Reader', { bookId, bookTitle })`).

### DA05 (Nova Decisão) — Tratamento Padronizado dos Estados de Listagem

* **Decisão:** Criação de componentes dedicados para os três estados fundamentais de listagem em dispositivos móveis:
  1. **Carregamento (`LoadingView`):** Feedback visual suave durante a leitura assíncrona do armazenamento local.
  2. **Vazio (`EmptyView`):** Ilustração, mensagem contextual e botão de ação primária (ex.: "Criar Primeiro Livro") quando o acervo não possuir volumes.
  3. **Erro (`ErrorView`):** Apresentação controlada de falha com botão de nova tentativa ("Tentar Novamente"), acionada quando a leitura dos dados locais ou o carregamento do catálogo falha de verdade.

### DA06 (Nova Decisão) — Importação de Arquivos com Leitor de PDF Próprio

* **Decisão:** Selecionar o arquivo com `expo-document-picker`, ler o conteúdo com `expo-file-system` e extrair o texto do PDF com um leitor próprio (`src/services/pdfParser.js`), usando apenas a biblioteca `pako` para descompactar os dados.
* **Alternativas consideradas:**
  - **`pdf.js` (Mozilla):** descartado porque depende de recursos de navegador (workers, canvas) e não funciona de forma confiável no Expo Go.
  - **Serviço externo de conversão:** descartado porque exigiria enviar o arquivo do usuário para terceiros e uma chave de API.
  - **Manter a importação simulada:** descartado porque a tela prometia uma funcionalidade que não existia.
* **Consequências assumidas:**
  - Funciona com PDFs que possuem texto, inclusive os gerados pelo Word, Google Docs e navegadores (fontes com mapa ToUnicode).
  - PDFs digitalizados (apenas imagem) não têm texto extraível: o app avisa e cria o livro com uma página para transcrição.
  - PDFs protegidos por senha são recusados com mensagem clara.

### DA07 (Nova Decisão) — Grifos Armazenados como Intervalos sobre o Texto Puro

* **Decisão:** O conteúdo do capítulo continua sendo texto puro. Grifos, negrito, itálico e sublinhado são guardados à parte, como uma lista de marcas `{ start, end, type, color, text }` em cada capítulo (`src/services/marks.js`).
* **Alternativas consideradas:**
  - **Converter o capítulo para HTML ou rich text:** descartado porque o React Native não possui editor rico nativo, e o texto deixaria de ser simples para busca, importação e exportação.
  - **Biblioteca de editor rico em WebView:** descartada pelo peso e pela experiência pouco nativa no celular.
* **Consequências assumidas:**
  - Ao editar o texto, cada marca é reposicionada procurando o trecho original. Se o trecho deixar de existir, a marca é descartada.
  - A seleção de texto usa `TextInput` somente leitura no Android/iOS e a seleção do navegador na web, então o comportamento é testado separadamente em cada plataforma.

### DA08 (Nova Decisão) — Histórico de Alterações em Livros de Terceiros

* **Decisão:** Cada livro tem o campo `isOwn`. Livros criados no app são do usuário. Livros importados de arquivo são considerados de terceiros, e toda criação, edição ou exclusão de capítulo neles gera uma entrada em `changeLog` com a versão anterior e a nova.
* **Alternativas consideradas:**
  - **Registrar o histórico em todos os livros:** descartado para não poluir os livros autorais, em que o usuário é o próprio autor.
  - **Guardar versões completas do livro a cada edição:** descartado pelo custo de armazenamento. A tela de histórico mostra apenas o trecho alterado, com contexto.
* **Consequências assumidas:** grifos e marcadores não entram no histórico, pois são anotações pessoais e não alteram o texto da obra.

### DA09 (Nova Decisão) — Serviço Único de Alertas para Celular e Web

* **Decisão:** Todas as telas usam `dialog.alert` (`src/services/dialog.js`) em vez de `Alert.alert` diretamente.
* **Motivação:** o `Alert.alert` do React Native não faz nada quando o app roda no navegador, o que deixava confirmações de exclusão, restauração e saída sem resposta. O serviço usa o alerta nativo no celular e as caixas de diálogo do navegador na web.

### DA10 (Nova Decisão) — Autenticação Somente com Google, por Página Hospedada

* **Decisão:** a única forma de entrar é a conta Google (RF-AUT-01), via Firebase Authentication. No navegador usa a janela do Firebase (`signInWithPopup`). No celular, como o botão nativo do Google não existe no Expo Go e o Google não aceita o endereço `exp://` de retorno, o app abre uma página no Firebase Hosting (`hosting/index.html`), que faz o login com Google e devolve o resultado ao app por um endereço de retorno validado (só `entrepaginas://` e `exp://` de rede local ou túnel); o app então entra com `signInWithCredential`.
* **Alternativas consideradas:** biblioteca nativa de login do Google (descartado: exige build de desenvolvimento e não roda no Expo Go); `expo-auth-session` com cliente OAuth próprio (descartado: o Expo Go não oferece endereço de retorno aceito pelo Google); manter também e-mail e senha (descartado: o requisito é entrar só com Google).
* **Consequências assumidas:** o login depende de internet e da página hospedada. O servidor reforça a regra: o `firestore.rules` só libera dados para quem entrou com o provedor `google.com`, então contas criadas por e-mail e senha não leem nem gravam nada, mesmo que o provedor esteja ativo no console.

### DA11 (Nova Decisão) — Livros no Firestore em Subcoleções, com Local Primeiro

* **Decisão:** guardar `users/{uid}/books/{bookId}` e os capítulos em `.../chapters/{chapterId}`. O AsyncStorage continua sendo a fonte de leitura, e a nuvem é uma cópia sincronizada.
* **Alternativas consideradas:** um documento único por livro (descartado: livros importados passam do limite de 1 MB); ler direto do Firestore (descartado: o app deixaria de funcionar offline).
* **Consequências assumidas:** em edição simultânea em dois aparelhos vence a versão mais recente; fotos de página ficam só no aparelho.

### DA12 (Nova Decisão) — IA pelo Firebase AI Logic, sem Chave no App

* **Decisão:** chamar o Gemini pelo Firebase AI Logic (`firebase/ai`), que usa o próprio projeto Firebase e não exige uma chave de IA no repositório nem no `.env`.
* **Alternativas consideradas:** chave do Google AI Studio em variável `EXPO_PUBLIC_` (descartado: qualquer chave `EXPO_PUBLIC_` vai dentro do app instalado e pode ser extraída).
* **Consequências assumidas:** a IA depende de o projeto Firebase estar ativo; o modelo é configurável por `EXPO_PUBLIC_GEMINI_MODEL`, pois os nomes de modelo mudam com frequência (o `gemini-2.5-flash` já estava indisponível para novos projetos).
* **Resiliência:** toda chamada tem limite de 40 segundos e mensagem de erro própria; sem IA, criar, ler e editar livros continuam funcionando.

### DA13 (Nova Decisão) — Proteção de Livros por Biometria no Aparelho

* **Decisão:** guardar apenas o indicador `locked` no livro e verificar a identidade com a biometria do próprio sistema, sem criar PIN ou senha própria no app.
* **Alternativas consideradas:** PIN próprio do app (descartado: exigiria guardar e proteger um segredo e criar telas de recuperação); criptografar o conteúdo dos livros (descartado: custo e risco de perda de dados para o escopo da disciplina).
* **Consequências assumidas:** a proteção é uma barreira de uso, não criptografia: o texto continua armazenado normalmente no aparelho e na nuvem. No navegador não há biometria, então livros protegidos ficam bloqueados na web.

### DA14 (Descartada) — Sugestão de Categoria e Etiquetas por IA

* **Decisão:** a sugestão automática de categoria, etiquetas e sinopse em JSON estruturado foi implementada, validada e depois retirada do aplicativo, e o código correspondente foi removido.
* **Alternativas consideradas:** manter o botão em Criar Livro e Editar Livro (descartado: a categoria é uma escolha rápida de três opções e a sugestão não tornava o app melhor, contra o teste do enunciado de que a IA precisa ser útil no fluxo); manter o código sem interface (descartado: código morto).
* **Consequências assumidas:** categorias e etiquetas passam a ser sempre manuais. A IA fica concentrada no resumo de capítulo e na transcrição de fotos, os dois usos em que ela faz algo trabalhoso para código convencional.

### DA15 (Nova Decisão) — Tema Claro e Escuro por Contexto

* **Decisão:** duas paletas (`src/theme/palettes.js`) escolhidas por um `ThemeContext`. Cada tela monta os estilos a partir da paleta ativa (`useThemedStyles`) e nenhuma cor de interface fica fixa no código, só as cores dos livros (capas, folhas) e sobreposições sobre capas.
* **Alternativas consideradas:** trocar só o fundo do leitor (descartado: o app ficava meio claro e meio escuro); biblioteca de temas (descartado: nova dependência sem necessidade).
* **Consequências assumidas:** o modo *Automático* acompanha o aparelho; a escolha fica no AsyncStorage do aparelho e não vai para a nuvem. O leitor tem um botão próprio, aplicado só dentro dele (`ThemeScope`). O contraste das duas paletas foi conferido (texto comum acima de 4,5:1) e os textos de todas as telas passaram por uma checagem automática no navegador.

---

### DA16 (Nova Decisão) — Painel de leitura com registro local

* **Decisão:** guardar o progresso em um registro de leitura separado dos livros (`services/readingLog.js`), calculado por funções puras (`services/readingStats.js`) e exibido no painel do Perfil.
* **Alternativas consideradas:** gravar os campos dentro de cada livro (descartado: mudaria o modelo sincronizado e as regras do Firestore); sincronizar o registro (descartado por ora: exigiria nova coleção e novas regras).
* **Consequências assumidas:** o painel é por aparelho, como a última página lida. O app não guarda autor nem avaliação, então o painel e os cartões não os exibem. Todos os números vêm de eventos reais de leitura.

### DA17 (Nova Decisão) — Sistema de design em tokens

* **Decisão:** paleta, espaçamento, raios, sombras e tipografia centralizados em `theme/palettes.js` e `theme/tokens.js`. Títulos em Lora; texto corrido na fonte do sistema.
* **Consequências assumidas:** telas novas e componentes novos usam os tokens; telas antigas foram migradas nas cores e fontes, mas parte dos tamanhos e margens ainda são valores locais.

## 3. Mapeamento das Telas do Figma para a Implementação

| Tela Figma | Componente Implementado | Rota de Navegação | Parâmetros Recebidos |
| :--- | :--- | :--- | :--- |
| **01. Login** | [`LoginScreen.js`](../src/screens/LoginScreen.js) | `Login` | — |
| **02. Estante** | [`BookshelfScreen.js`](../src/screens/BookshelfScreen.js) | `MainTabs` -> `Estante` | — |
| **03. Criar Obra** | [`CreateBookScreen.js`](../src/screens/CreateBookScreen.js) | `MainTabs` -> `CriarObra` | `{ initialTab: 'create' }` |
| **04. Importar** | [`CreateBookScreen.js`](../src/screens/CreateBookScreen.js) | `MainTabs` -> `CriarObra` | `{ initialTab: 'import' }` |
| **05. Baú Literário** | [`ChestScreen.js`](../src/screens/ChestScreen.js) | `MainTabs` -> `Bau` | — |
| **06. Perfil** | [`ProfileScreen.js`](../src/screens/ProfileScreen.js) | `MainTabs` -> `Perfil` (aberto pelo avatar do topo; fora da barra inferior) | — |
| **08. Configurações** | [`SettingsScreen.js`](../src/screens/SettingsScreen.js) | `Settings` (Stack) | — |
| **07. Leitor** | [`ReaderScreen.js`](../src/screens/ReaderScreen.js) | `Reader` (Stack) | `{ bookId, bookTitle }` |

---

## 4. Requisitos Funcionais Contemplados nesta Etapa

* **RF-LIV-06 (Estante):** Listagem em grade de 2 colunas com capas táteis personalizadas, busca em tempo real e menu de opções por livro.
* **RF-LIV-01 / RF-LIV-02 (Criação & Personalização):** Seleção interativa de cores de capa, títulos e folhas com live preview.
* **RF-BAU-01 a RF-BAU-04 (Ciclo do Baú):** Envio para o baú, visualização dedicada, restauração individual/em massa e exclusão definitiva.
* **RF-CAP-01 / RF-CAP-02 / RF-CAP-03 (Capítulos):** Criação, edição e exclusão de capítulos pelo editor do leitor, além do primeiro capítulo escrito na criação do livro.
* **RF-LIV-04 (Edição do livro):** pelo menu `⋮` da estante, é possível alterar título, subtítulo, categoria e cores de capa, título e folha, com pré-visualização da capa.
* **RF-IMP-01 (Importação):** Seleção de arquivo real do aparelho e extração do texto em capítulos para PDF (com texto), EPUB, TXT, Markdown e JSON.
* **RF-CAP-04 (Ordem dos capítulos):** no sumário do leitor, setas sobem e descem cada capítulo; em livros importados a mudança entra no histórico de alterações.
* **RF-IMP-04 a RF-IMP-06 (Busca e catálogo):** na aba Criar Livro, o cartão "Buscar no Google Books" consulta a API pública (sem chave) e o Project Gutenberg (OPDS, domínio público, com texto completo e formatação em HTML), mescla e ordena por relevância, e lista os resultados; o botão "Catálogo A-Z" navega por letra e idioma de 30 em 30 e preenche título, autor, categoria e número de páginas. Tem estados de carregamento, erro (rede, tempo esgotado, limite de consultas) e lista vazia; o restante do formulário continua funcionando se a consulta falhar.
* **RF-LIV-08 (Exportação):** o menu `⋮` do livro exporta em TXT ou JSON. No celular abre a folha de compartilhamento (`expo-sharing`); no navegador baixa o arquivo.
* **Câmera (recurso nativo):** no editor de capítulo, o botão "Fotografar" pede permissão de câmera, guarda a foto no aparelho e a mostra acima do texto no leitor. Se a permissão for negada, o app explica e segue funcionando; se estiver bloqueada, oferece abrir os ajustes do aparelho.
* **RF-LEI-01 / RF-LEI-02 (Leitor & Sumário):** Modo leitor com paginação, ajuste de tamanho de fonte, alternância de tema claro/escuro e modal de sumário para salto direto entre capítulos.
* **RNF-02 (Persistência):** Todos os dados manipulados persistem localmente entre fechamentos e aberturas do app.

### Funcionalidades adicionadas além do PRD

* **Marcadores de página:** cada página pode receber um marcador com título e cor do pin, listado na aba *Marcadores* do sumário.
* **Marca-texto:** grifos em 5 cores, negrito, itálico e sublinhado aplicados a trechos selecionados no leitor.
* **Histórico de alterações:** em livros importados, toda edição registra a versão anterior e a nova, consultável no menu `⋮` do livro.

### Requisitos da etapa 3 atendidos

* **RF-AUT-01 / RF-AUT-02 (Autenticação e sessão):** login e logout somente com a conta Google (Firebase Authentication). A sessão permanece salva e as telas internas só são registradas para usuário autenticado.
* **RF-NUV-01 (Nuvem):** livros, capítulos, marcadores e grifos são sincronizados com o Firestore, por usuário, com uso offline. Estrutura e regras em [EstruturaDados.md](EstruturaDados.md).
* **RF-CAP-05 (Câmera e transcrição):** a foto da página pode ser transcrita para texto com IA, direto no editor de capítulo.
* **RF-IA-01 (Modo sem spoilers):** o leitor tem um ícone de IA que abre um menu com *Perguntar sobre a história* (sempre sem spoilers) e *Mapa de personagens*, em telas separadas. A IA só recebe o texto até a folha atual (`services/bookContext.js`), as citações da resposta são conferidas no texto e há *Explique este trecho* e *Mapa de personagens*. Se a IA falhar (sem rede, limite, modelo indisponível), o app mostra a mensagem e o leitor continua funcionando.

* **Configurações e tema:** tela com tema Automático, Claro ou Escuro, saída da conta e exclusão de todos os dados do aparelho e da nuvem (só apaga o aparelho se a nuvem confirmar).
* **Etiquetas:** as etiquetas do livro ficam salvas, sincronizam com a nuvem e entram na busca da estante.
* **Recurso nativo adicional (biometria):** o usuário escolhe quais livros ficam protegidos. Abrir, exportar ou remover a proteção exige a biometria do aparelho (`expo-local-authentication`, com senha do aparelho como alternativa). O app também fecha o livro protegido ao ir para segundo plano.

### Pendências

* Teste dos recursos nativos (câmera, seleção de texto do marca-texto) em um celular real.
