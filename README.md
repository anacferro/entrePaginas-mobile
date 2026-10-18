# Entre Páginas — Aplicativo Mobile

Aplicativo mobile desenvolvido em **React Native com Expo (JavaScript)** onde cada usuário cria e organiza sua própria estante de livros digitais: monta encadernações artesanais personalizadas, arquiva volumes em descanso em um baú literário e lê seus compêndios com controle de tipografia e sumário interativo.

---

## 📱 Telas Implementadas (Figma)

O design foi rigorosamente inspirado nas telas concebidas no protótipo Figma (disponível em `Telas/` e `Docs/TelasMockup.md`):

1. **Tela de Autenticação (`LoginScreen`):** Identidade visual editorial vintage, botão de login via Google, destaques de valor e rodapé institucional.
2. **Minha Estante (`BookshelfScreen`):** Vitrine da coleção em grade de 2 colunas com capas táteis personalizadas, barra de busca com filtro em tempo real, banners de atalho rápido e menu de opções por livro.
3. **Criar Obra (`CreateBookScreen`):** Ateliê de encadernação com **Visualização Tátil ao vivo** (live preview), paletas para cor da capa, cor do título e textura da folha, além de metadados da ficha catalográfica.
4. **Importar Conteúdo (`CreateBookScreen` - Aba Importar):** Interface para importação de livros nos formatos PDF, EPUB, Texto Puro (.txt) e Estrutura JSON, com reconhecimento automático de sumário.
5. **Baú Literário (`ChestScreen`):** Repositório de volumes em descanso, permitindo restauração individual, restauração em massa (`Restaurar Todos`) ou exclusão definitiva.
6. **Perfil do Leitor (`ProfileScreen`):** Estatísticas de leitura (livros ativos, livros no baú, páginas lidas), medidor de armazenamento, preferências de tema (Claro / Escuro) e utilitários para auditoria de estados.
7. **Modo Leitor (`ReaderScreen`):** Experiência de leitura imersiva com paginação, ajuste de tamanho de fonte (A- / A+), alternância de tema no leitor, marcador de página e modal de **Sumário** para salto direto entre capítulos.

---

## 🚀 Como Executar a partir de um Clone Limpo

### Pré-requisitos

- **Node.js** (versão 18 ou superior recomendada)
- **npm** (incluso com o Node)
- Aplicativo **Expo Go** instalado no smartphone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) ou [iOS](https://apps.apple.com/app/expo-go/id982107779)) ou um emulador/simulador configurado.

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/anacfs/entrePaginas-mobile.git
   cd entrePaginas-mobile
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npx expo start
   ```

4. **Abra o aplicativo:**
   - **No celular físico:** Abra a câmera (iOS) ou o app Expo Go (Android) e escaneie o **QR Code** exibido no terminal.
   - **No emulador Android:** Pressione a tecla `a` no terminal.
   - **No simulador iOS (macOS):** Pressione a tecla `i` no terminal.
   - **No navegador Web:** Pressione a tecla `w` no terminal.

---

## 🧪 Como Testar os Requisitos desta Etapa

### 1. Navegação com Passagem de Parâmetros
- Na tela de **Login**, toque em *"Continuar com Google"* para ingressar na aplicação.
- Na **Estante**, toque em qualquer livro (ex.: *"Crônicas do Silêncio"* ou *"Cantos de Marés"*). O app navega para o **Leitor**, repassando o ID e o título da obra via rota (`route.params`), carregando o respectivo conteúdo e sumário.
- Toque no banner *"Novo Livro"* para ser direcionado diretamente à aba de criação.

### 2. Persistência Local (Offline-First com AsyncStorage)
- Crie um novo livro na aba **Novo Livro**, personalize as cores e clique em *"Salvar Livro na Estante"*.
- O livro aparecerá imediatamente na estante.
- Mova um livro para o baú através do menu `⋮` > *"Mover para o Baú"*. Ele sairá da estante e aparecerá na aba **Baú**.
- Feche e reabra o aplicativo: todos os dados permanecem salvos no armazenamento local do dispositivo.

### 3. Tratamento dos Três Estados nas Listagens (Carregamento, Vazio e Erro)
Na aba **Perfil**, foi incluída uma seção de ferramentas de avaliação para facilitar a validação dos requisitos:

- **Estado de Carregamento (Loading):** Puxe a lista para baixo (Pull-to-refresh) na Estante ou no Baú para visualizar o spinner suave com mensagem contextual (*LoadingView*).
- **Estado Vazio (Empty):** 
  - Toque no botão *"Testar Estado Vazio"* na aba **Perfil** (ou filtre por um termo inexistente na barra de busca). A listagem exibirá a ilustração temática de acervo vazio e botão de ação direta (*EmptyView*).
- **Estado de Erro (Error):** 
  - Ative a opção *"Simular Erro nas Listagens"* na aba **Perfil**.
  - Retorne à **Estante** ou ao **Baú**: a aplicação exibirá o componente de erro tratado (*ErrorView*) com explicação clara e o botão **"Tentar Novamente"** para restabelecer a consulta.
  - Para restaurar o acervo original a qualquer momento, clique em *"Restaurar Padrões"* na tela de Perfil.

---

## 📁 Estrutura do Projeto

```
EntrePaginas/
├── assets/                    # Ícones e recursos do Expo
├── Docs/                      # Documentação do projeto
│   ├── PRD.md                 # Documento de Requisitos de Produto
│   ├── TelasMockup.md         # Referência do mockup no Figma
│   ├── diarioIA.md            # Diário de interações
│   └── Decisoes_Arquitetura_Revisao.md  # Revisão das decisões desta etapa
├── Telas/                     # Telas e vetores exportados do Figma
├── src/
│   ├── components/            # Componentes reutilizáveis
│   │   ├── BookCard.js        # Card de livro com menu de ações
│   │   ├── BookCover.js       # Capa de livro artesanal tátil
│   │   ├── CustomTabBar.js    # Barra de navegação inferior customizada
│   │   ├── EmptyView.js       # Tratamento de estado vazio
│   │   ├── ErrorView.js       # Tratamento de estado de erro com retry
│   │   ├── Header.js          # Barra superior institucional
│   │   └── LoadingView.js      # Tratamento de estado de carregamento
│   ├── navigation/
│   │   └── AppNavigator.js    # Configuração de rotas (Stack e Bottom Tabs)
│   ├── screens/               # Telas do fluxo da aplicação
│   │   ├── BookshelfScreen.js # Estante de livros (Home)
│   │   ├── ChestScreen.js     # Baú de livros arquivados
│   │   ├── CreateBookScreen.js# Criação e importação de obras
│   │   ├── LoginScreen.js     # Tela de login
│   │   ├── ProfileScreen.js   # Perfil, preferências e testes de estados
│   │   └── ReaderScreen.js    # Leitor de livros com sumário e tipografia
│   ├── services/
│   │   ├── mockData.js        # Dados seminais de livros e usuário
│   │   └── storage.js         # Camada de persistência local (AsyncStorage)
│   └── theme/
│       └── colors.js          # Paleta de cores e temas (Claro / Escuro)
├── App.js                     # Ponto de entrada do aplicativo
├── app.json                   # Metadados e configuração do Expo
├── package.json               # Dependências e scripts
└── README.md                  # Este documento
```

---

## 📜 Documentos Vinculados

- [Revisão das Decisões de Arquitetura e Requisitos](Docs/ExplicaçãoArquiteturaTelas.md)
- [PRD — Estante Virtual](Docs/PRD.md)
