# Entre Páginas — Aplicativo Mobile

Aplicativo mobile desenvolvido em **React Native com Expo (JavaScript)** onde cada usuário cria e organiza sua própria estante de livros digitais: monta encadernações artesanais personalizadas, arquiva volumes em descanso em um baú literário e lê seus compêndios com controle de tipografia e sumário interativo.

---

## 📱 Telas Implementadas (Figma)

O design foi rigorosamente inspirado nas telas concebidas no protótipo Figma (disponível em `Telas/` e `Docs/TelasMockup.md`):

1. **Tela de Autenticação (`LoginScreen`):** Identidade visual editorial vintage, login e cadastro com e-mail e senha (Firebase Authentication), sessão que permanece salva e rodapé institucional.
2. **Minha Estante (`BookshelfScreen`):** Vitrine da coleção em grade de 2 colunas com capas táteis personalizadas, barra de busca com filtro em tempo real, banners de atalho rápido e menu de opções por livro.
3. **Criar Obra (`CreateBookScreen`):** Ateliê de encadernação com **Visualização Tátil ao vivo** (live preview), paletas para cor da capa, cor do título e textura da folha, metadados da ficha catalográfica e campo para escrever o primeiro capítulo.
4. **Importar Conteúdo (`CreateBookScreen` - Aba Importar):** Seleção de um arquivo real do aparelho (`expo-document-picker`) nos formatos PDF com texto, EPUB, Texto Puro (.txt / .md) e Estrutura JSON. O texto é extraído e dividido em capítulos automaticamente. PDFs digitalizados (imagem) geram um aviso e um livro para transcrição.
5. **Baú Literário (`ChestScreen`):** Repositório de volumes em descanso, permitindo restauração individual, restauração em massa (`Restaurar Todos`) ou exclusão definitiva.
6. **Perfil do Leitor (`ProfileScreen`):** Estatísticas de leitura (livros ativos, livros no baú, páginas lidas), medidor de armazenamento, preferências de tema (Claro / Escuro) e utilitários para auditoria de estados.
7. **Modo Leitor (`ReaderScreen`):** Experiência de leitura imersiva com paginação, ajuste de tamanho de fonte (A- / A+), alternância de tema no leitor e modal de **Sumário** para salto direto entre capítulos. Inclui:
   - **Escrita:** editor em tela cheia para editar, criar e excluir capítulos.
   - **Marcadores:** marcação da página com título e cor do pin, listados na aba *Marcadores* do sumário.
   - **Marca-texto:** grifos em 5 cores, negrito, itálico e sublinhado sobre trechos selecionados.
   - **Histórico de alterações:** em livros importados (que não são de autoria do usuário), toda edição fica registrada com a versão anterior e a nova, visível no menu `⋮` do livro.

---

## 🚀 Como Executar a partir de um Clone Limpo

### Pré-requisitos

- **Node.js** (versão 18 ou superior recomendada)
- **npm** (incluso com o Node)
- Aplicativo **Expo Go** instalado no smartphone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) ou [iOS](https://apps.apple.com/app/expo-go/id982107779)) ou um emulador/simulador configurado.

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/anacferro/entrePaginas-mobile.git
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
   - **No navegador Web:** Pressione a tecla `w` no terminal, ou rode `npx expo start --web`.

> **O celular não conecta?** O celular e o computador precisam estar na mesma rede Wi-Fi, e redes corporativas ou de universidade costumam bloquear essa conexão. Nesse caso, use um roteador próprio (ou o roteamento do celular) e, se o QR Code mostrar `exp://127.0.0.1`, inicie informando o IP do computador:
> ```bash
> REACT_NATIVE_PACKAGER_HOSTNAME=<ip-do-computador> npx expo start --lan
> ```

---

## 🧪 Como Testar os Requisitos desta Etapa

Antes de testar, configure o Firebase (seção seguinte). O passo a passo completo de uso está em [Docs/Tutorial.md](Docs/Tutorial.md).

| Requisito | Como verificar |
| :--- | :--- |
| **Autenticação e sessão persistente** | Em **Criar conta**, informe nome, e-mail e senha. Feche e abra o app: a sessão continua. Em **Perfil > Desconectar da conta** a tela de login volta. Sem login, nenhuma tela interna é acessível. |
| **Telas privadas** | As telas (Estante, Novo Livro, Baú, Perfil, Leitor) só são registradas no navegador de rotas para usuário autenticado (`src/navigation/AppNavigator.js`). |
| **CRUD com persistência local e remota** | Crie, edite (menu `⋮` > *Editar Livro*), arquive (*Mover para o Baú*) e exclua livros e capítulos. Os dados ficam no AsyncStorage e no Firestore; o selo do cabeçalho mostra *Sincronizado*. Apague os dados do app, entre de novo e os livros voltam da nuvem. |
| **Uso offline** | Desligue a internet: o app continua funcionando e o selo muda para *Offline*; ao religar, sincroniza sozinho. |
| **API externa com carregamento e erro** | Em **Novo Livro**, use *Buscar no Google Books*. Há estados de carregamento, erro (rede, tempo esgotado, limite) e lista vazia. |
| **Recurso nativo com permissão negada** | No editor de capítulo, toque em **Fotografar**. Se negar a câmera, o app explica e permite continuar; se o sistema bloquear, oferece abrir os ajustes. A biometria (*Proteger com biometria*, menu `⋮`) também explica quando não há biometria cadastrada. |
| **IA que continua funcionando se falhar** | *Resumir capítulo com IA* (leitor), *Transcrever* (foto) e *Sugerir categoria e etiquetas com IA* (Novo Livro e Editar Livro). Sem rede, com erro do serviço ou resposta fora do formato, o app mostra a mensagem e nada é alterado; o resto do app segue normal. |
| **Regras do Firestore** | `firestore.rules` permite ler e gravar apenas o dono (`request.auth.uid == uid`) e nega todo o resto. Teste feito com duas contas: o dono lê e grava; outra conta, dados inválidos e coleções não previstas recebem `403` (tabela em [Docs/EstruturaDados.md](Docs/EstruturaDados.md)). |
| **Estrutura dos dados** | [Docs/EstruturaDados.md](Docs/EstruturaDados.md) e o arquivo de exemplo [Docs/exemplo-dados.json](Docs/exemplo-dados.json). |

### Estados de listagem (carregamento, vazio e erro)

Na aba **Perfil**, a seção de avaliação ajuda a validar:

- **Carregamento:** puxe a lista para baixo (pull-to-refresh) na Estante ou no Baú.
- **Vazio:** use *Testar Estado Vazio* no Perfil ou busque um termo inexistente.
- **Erro:** ative *Simular Erro nas Listagens*; Estante e Baú mostram o erro tratado com **Tentar Novamente**. *Restaurar Padrões* devolve o acervo original.

---

## 🔥 Configuração do Firebase (autenticação e nuvem)

O login, a sincronização e a IA usam o Firebase. Cada pessoa usa o próprio projeto Firebase, sem chaves no repositório. Sem o `.env`, a tela de login avisa que o Firebase não está configurado.

1. No [console do Firebase](https://console.firebase.google.com), crie um projeto e registre um app **Web** (ícone `</>`).
2. Em **Authentication**, ative o provedor **E-mail/senha**.
3. Em **Firestore Database**, crie o banco em modo produção e publique as regras do arquivo `firestore.rules` (`firebase deploy --only firestore`).
4. Em **AI Logic**, ative o provedor **Gemini Developer API** (usado no resumo por IA e na transcrição de fotos).
5. Copie `.env.example` para `.env` e preencha com os valores do app Web:

| Variável | Onde encontrar |
| :--- | :--- |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `appId` |

6. Opcional: `EXPO_PUBLIC_GEMINI_MODEL` troca o modelo de IA (padrão `gemini-3.5-flash`).
7. Reinicie o Metro com cache limpo: `npx expo start -c`.

**Para quem vai avaliar o projeto:** o `.env` não está no repositório. Há duas opções: usar o `.env` enviado junto com a entrega (por exemplo, anexado no Moodle), copiando-o para a raiz do projeto, ou criar o próprio projeto Firebase seguindo os passos acima (leva alguns minutos). Depois, `npm install` e `npx expo start -c`.

O arquivo `.env` está no `.gitignore` e nunca deve ser commitado. A chave de API do Firebase para apps clientes identifica o projeto e não é um segredo; quem protege os dados são as regras do Firestore e a autenticação.

## 📁 Estrutura do Projeto

```
entrePaginas-mobile/
├── assets/                    # Ícones e recursos do Expo
├── Docs/                      # Documentação do projeto
│   ├── PRD.md                 # Documento de Requisitos de Produto
│   ├── TelasMockup.md         # Referência do mockup no Figma
│   ├── diarioIA.md            # Diário de uso de IA
│   ├── EstruturaDados.md      # Estrutura JSON, Firestore e regras de segurança
│   ├── exemplo-dados.json     # Exemplo da estrutura de dados com livros fictícios
│   ├── Tutorial.md            # Passo a passo de uso do aplicativo
│   └── ExplicaçãoArquiteturaTelas.md  # Revisão das decisões de arquitetura
├── Telas/                     # Telas e vetores exportados do Figma
├── src/
│   ├── context/
│   │   └── AuthContext.js     # Usuário autenticado e sessão persistente
│   ├── components/            # Componentes reutilizáveis
│   │   ├── AiSuggest.js       # Sugestão de categoria e etiquetas por IA
│   │   ├── AiSummary.js       # Resumo do capítulo por IA
│   │   ├── Avatar.js          # Iniciais do usuário
│   │   ├── AnnotatedText.js   # Texto do leitor com grifos e seleção de trechos
│   │   ├── BookCard.js        # Card de livro com menu de ações
│   │   ├── BookEditModal.js   # Edição de título, categoria e cores do livro
│   │   ├── BookCover.js       # Capa de livro artesanal tátil
│   │   ├── ChangeHistoryModal.js # Histórico de alterações (antes/depois)
│   │   ├── ChapterEditor.js   # Editor de capítulos em tela cheia
│   │   ├── CustomTabBar.js    # Barra de navegação inferior customizada
│   │   ├── EmptyView.js       # Tratamento de estado vazio
│   │   ├── ErrorView.js       # Tratamento de estado de erro com retry
│   │   ├── GoogleBooksSearch.js # Busca de dados no Google Books
│   │   ├── Header.js          # Barra superior institucional
│   │   └── LoadingView.js     # Tratamento de estado de carregamento
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
│   │   ├── biometrics.js      # Proteção de livros com biometria do aparelho
│   │   ├── camera.js          # Foto de página com tratamento de permissão
│   │   ├── ai.js              # Resumo, transcrição e sugestão por IA (Gemini via Firebase AI Logic)
│   │   ├── auth.js            # Cadastro, login e logout (Firebase Authentication)
│   │   ├── cloud.js           # Sincronização dos livros com o Firestore
│   │   ├── dialog.js          # Alertas e confirmações (nativo e web)
│   │   ├── epubParser.js      # Extração de texto de EPUBs
│   │   ├── exporter.js        # Exportação de livro em TXT e JSON
│   │   ├── firebase.js        # Inicialização do Firebase (variáveis do .env)
│   │   ├── googleBooks.js     # Consulta à API do Google Books
│   │   ├── importer.js        # Seleção e importação de arquivos
│   │   ├── marks.js           # Grifos, marcadores e comparação antes/depois
│   │   ├── mockData.js        # Dados seminais de livros e usuário
│   │   ├── pdfParser.js       # Extração de texto e páginas de PDFs
│   │   ├── storage.js         # Camada de persistência local (AsyncStorage)
│   │   └── suggestion.js      # Validação da resposta estruturada da IA
│   └── theme/
│       ├── bookOptions.js     # Cores de capa e categorias
│       └── colors.js          # Paleta de cores e temas (Claro / Escuro)
├── App.js                     # Ponto de entrada do aplicativo
├── .env.example               # Variáveis do Firebase (copiar para .env)
├── firestore.rules            # Regras de segurança do Firestore
├── app.json                   # Metadados e configuração do Expo
├── package.json               # Dependências e scripts
└── README.md                  # Este documento
```

---

## 📜 Documentos Vinculados

- [Revisão das Decisões de Arquitetura e Requisitos](Docs/ExplicaçãoArquiteturaTelas.md)
- [PRD — Estante Virtual](Docs/PRD.md)
- [Estrutura dos dados e regras de segurança](Docs/EstruturaDados.md) e [exemplo de dados](Docs/exemplo-dados.json)
- [Tutorial de uso](Docs/Tutorial.md)
- [Diário de uso de IA](Docs/diarioIA.md)
