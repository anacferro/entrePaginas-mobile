# Revisão do Documento de Requisitos e Decisões de Arquitetura

**Projeto:** Entre Páginas (Mobile)  
**Etapa:** Implementação de Telas, Navegação e Persistência Local  
**Data:** Outubro de 2026  

---

## 1. Contexto e Justificativa da Revisão

O documento de requisitos original ([PRD.md](file:///c:/Users/anacf/OneDrive/Documentos/vscode/aulas/entrePaginas-mobile/EntrePaginas/Docs/PRD.md)) previa a utilização direta de autenticação remota e banco em nuvem via Firebase (DA01). 

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
  3. **Erro (`ErrorView`):** Apresentação controlada de falha com botão de nova tentativa ("Tentar Novamente"), acionável via chave de simulação na tela de Perfil para auditoria e avaliação.

---

## 3. Mapeamento das Telas do Figma para a Implementação

| Tela Figma | Componente Implementado | Rota de Navegação | Parâmetros Recebidos |
| :--- | :--- | :--- | :--- |
| **01. Login** | [`LoginScreen.js`](file:///c:/Users/anacf/OneDrive/Documentos/vscode/aulas/entrePaginas-mobile/EntrePaginas/src/screens/LoginScreen.js) | `Login` | — |
| **02. Estante** | [`BookshelfScreen.js`](file:///c:/Users/anacf/OneDrive/Documentos/vscode/aulas/entrePaginas-mobile/EntrePaginas/src/screens/BookshelfScreen.js) | `MainTabs` -> `Estante` | — |
| **03. Criar Obra** | [`CreateBookScreen.js`](file:///c:/Users/anacf/OneDrive/Documentos/vscode/aulas/entrePaginas-mobile/EntrePaginas/src/screens/CreateBookScreen.js) | `MainTabs` -> `CriarObra` | `{ initialTab: 'create' }` |
| **04. Importar** | [`CreateBookScreen.js`](file:///c:/Users/anacf/OneDrive/Documentos/vscode/aulas/entrePaginas-mobile/EntrePaginas/src/screens/CreateBookScreen.js) | `MainTabs` -> `CriarObra` | `{ initialTab: 'import' }` |
| **05. Baú Literário** | [`ChestScreen.js`](file:///c:/Users/anacf/OneDrive/Documentos/vscode/aulas/entrePaginas-mobile/EntrePaginas/src/screens/ChestScreen.js) | `MainTabs` -> `Bau` | — |
| **06. Perfil** | [`ProfileScreen.js`](file:///c:/Users/anacf/OneDrive/Documentos/vscode/aulas/entrePaginas-mobile/EntrePaginas/src/screens/ProfileScreen.js) | `MainTabs` -> `Perfil` | — |
| **07. Leitor** | [`ReaderScreen.js`](file:///c:/Users/anacf/OneDrive/Documentos/vscode/aulas/entrePaginas-mobile/EntrePaginas/src/screens/ReaderScreen.js) | `Reader` (Stack) | `{ bookId, bookTitle }` |

---

## 4. Requisitos Funcionais Contemplados nesta Etapa

* **RF03 / RF06 (Estante & Detalhes):** Listagem em grade de 2 colunas com capas tatis personalizadas, busca em tempo real e menu de opções por livro.
* **RF04 / RF05 (Criação & Personalização):** Seleção interativa de cores de capa, títulos e folhas com live preview.
* **RF08 / RF09 / RF10 / RF11 (Ciclo do Baú):** Envio para o baú, visualização dedicada, restauração individual/em massa e exclusão definitiva.
* **RF13 (Importação):** Interface de importação com seleção de formatos (PDF, EPUB, TXT, JSON) e preenchimento automático.
* **RF18 / RF19 (Leitor & Sumário):** Modo leitor com paginação, ajuste de tamanho de fonte, alternância de tema claro/escuro e modal de sumário para salto direto entre capítulos.
* **RNF02 (Persistência):** Todos os dados manipulados persistem localmente entre fechamentos e aberturas do app.
