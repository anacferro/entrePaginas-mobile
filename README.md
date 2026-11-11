# Entre Páginas — Aplicativo Mobile

Aplicativo mobile desenvolvido em **React Native com Expo (JavaScript)** onde cada usuário cria e organiza sua própria estante de livros digitais: monta encadernações artesanais personalizadas, arquiva volumes em descanso em um baú literário e lê seus compêndios com controle de tipografia e sumário interativo.

---

## 📱 Telas Implementadas (Figma)

O design foi rigorosamente inspirado nas telas concebidas no protótipo Figma (disponível em `Telas/` e `Docs/TelasMockup.md`):

1. **Tela de Autenticação (`LoginScreen`):** Identidade visual editorial vintage, login somente com a conta Google (Firebase Authentication), sessão que permanece salva e rodapé institucional.
2. **Minha Estante (`BookshelfScreen`):** Vitrine da coleção em grade de 2 colunas com capas táteis personalizadas, barra de busca com filtro em tempo real, banners de atalho rápido e menu de opções por livro. **Seleção múltipla:** segure um livro para selecioná-lo, toque nos outros para somar à seleção e use *Excluir* (ou *Todos*) na barra que aparece no topo. Livros que ainda estão baixando mostram uma barra de progresso na capa.
3. **Criar Obra (`CreateBookScreen`):** Ateliê de encadernação com **Visualização Tátil ao vivo** (live preview), paletas para cor da capa, cor do título e textura da folha, metadados da ficha catalográfica, categorias editáveis (três padrão, com cadastro e exclusão), capa por foto (galeria ou câmera), cor da folha e **tipo de letra** (serifada, sem serifa ou máquina de escrever), e campo para escrever o primeiro capítulo. A busca do Google Books lista **apenas obras com texto completo** (domínio público, via Project Gutenberg): ao tocar em uma, o livro vai para a estante na hora, o app volta para a Estante e o texto é baixado em segundo plano com barra de progresso. O texto vem preferencialmente da versão HTML do Gutenberg, o que preserva **negrito e itálico** do livro original (se o HTML não estiver disponível, usa o texto simples, só com itálico). Obras repetidas são avisadas antes de adicionar.
4. **Importar Conteúdo (`CreateBookScreen` - Aba Importar):** Seleção de um arquivo real do aparelho (`expo-document-picker`) nos formatos PDF com texto, EPUB, Texto Puro (.txt / .md) e Estrutura JSON. O texto é extraído e dividido em capítulos automaticamente. PDFs digitalizados (imagem) geram um aviso e um livro para transcrição. Cada formato tem seu quadro, onde também dá para arrastar o arquivo (web). **Fontes:** em EPUBs com fonte embutida (`.ttf`/`.otf`, inclusive ofuscada) a letra original é guardada no aparelho e usada na leitura (opção *Original do livro* em *Editar Livro*); em PDFs o app identifica a família (Times, Arial, Courier) e usa a letra equivalente.
5. **Baú Literário (`ChestScreen`):** Repositório de volumes em descanso, permitindo restauração individual, restauração em massa (`Restaurar Todos`) ou exclusão definitiva.
6. **Perfil do Leitor (`ProfileScreen`):** Aberto pelo avatar no topo de Estante, Novo Livro e Baú (a barra inferior tem só Estante, o botão central **+** de Novo Livro e Baú). Estatísticas de leitura (livros ativos, livros no baú, páginas lidas), medidor de armazenamento.
7. **Configurações (`SettingsScreen`):** aberta pela engrenagem no topo de Estante, Novo Livro, Baú e Perfil. Tema do aplicativo (Automático, Claro ou Escuro, salvo no aparelho), dados da conta com **Sair da conta** e **Apagar todos os dados** (livros do aparelho e da nuvem).
8. **Modo Leitor (`ReaderScreen`):** Experiência de leitura imersiva com páginas de cerca de 1.800 caracteres, ajuste de tamanho de fonte (A- / A+), alternância de tema no leitor e modal de **Sumário** para salto direto entre capítulos. Inclui:
   - **Páginas:** o texto é dividido em páginas reais; passe de página **arrastando para o lado** (ou com *Anterior* e *Próxima*). O arrasto fica desligado enquanto você grifa.
   - **Folha e letra:** o leitor usa a cor da folha e o tipo de letra definidos no livro (ou a fonte original do EPUB); em folha escura o texto clareia sozinho.
   - **Posição de leitura:** a última página lida de cada livro é guardada no aparelho e restaurada ao reabrir; se o livro não existir mais, o leitor mostra um aviso em vez de capítulos de exemplo.
   - **Modo foco:** botão que esconde os menus para ler sem distração.
   - **Escrita:** editor em tela cheia para editar, criar e excluir capítulos (somente em livros de autoria própria).
   - **Comentários:** em obras de terceiros (Google Books ou importadas) o texto não pode ser alterado; o botão de comentários registra anotações presas à página, mostradas abaixo do texto.
   - **Marcadores:** marcação da página com título e cor do pin, e também **pino em trecho**: com o marca-texto ligado, selecione um texto, toque no ícone de marcador, dê um nome e escolha a cor. O trecho fica sublinhado em pontilhado na cor do pino e aparece, com a citação, na aba *Marcadores* do sumário (toque para ir até a folha; a lixeira remove).
   - **Marca-texto:** grifos em 5 cores, negrito, itálico e sublinhado sobre trechos selecionados.
   - **Histórico de alterações:** registro das edições feitas em livros que não são de autoria do usuário (versão anterior e nova), visível no menu `⋮` do livro.
   - **Buscas e downloads:** a busca da Estante e do Baú ignora acentos e maiúsculas; downloads de texto completo interrompidos (Project Gutenberg) são retomados uma vez por sessão; as gravações locais são serializadas e os IDs são únicos para não perder dados em operações rápidas.
   - **Capítulos longos:** capítulos importados com mais de 150 mil caracteres são divididos em partes, para que nada seja cortado ao sincronizar com a nuvem; posições de leitura de livros apagados também são removidas.

---

## 🚀 Como Executar a partir de um Clone Limpo

### Pré-requisitos

- **Node.js 22.13 ou superior** (o Expo SDK 58 e o React Native 0.88 não funcionam com Node 18 ou 20). Confira com `node -v`; se for mais antigo, instale a versão LTS atual em https://nodejs.org
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
| **Autenticação e sessão persistente** | Toque em **Continuar com o Google** e escolha sua conta (não há e-mail e senha). Feche e abra o app: a sessão continua. Na engrenagem do topo, em **Configurações > Sair da conta** a tela de login volta. Sem login, nenhuma tela interna é acessível. |
| **Telas privadas** | As telas (Estante, Novo Livro, Baú, Perfil, Leitor) só são registradas no navegador de rotas para usuário autenticado (`src/navigation/AppNavigator.js`). |
| **Tema claro e escuro** | Na engrenagem do topo, em **Configurações > Aparência**, escolha *Claro*, *Escuro* ou *Automático* (segue o aparelho). Todas as telas mudam na hora e a escolha continua ao reabrir. |
| **Apagar dados** | Na engrenagem do topo, em **Configurações > Dados**, *Apagar todos os dados* remove os livros do aparelho e da nuvem. Se a nuvem não responder, nada é apagado e o app avisa. |
| **CRUD com persistência local e remota** | Crie, edite (menu `⋮` > *Editar Livro*), arquive (*Mover para o Baú*) e exclua livros e capítulos. Os dados ficam no AsyncStorage e no Firestore. Apague os dados do app, entre de novo e os livros voltam da nuvem. |
| **Uso offline** | Desligue a internet: o app continua funcionando com os dados do aparelho; ao religar, sincroniza sozinho. |
| **API externa com carregamento e erro** | Em **Novo Livro**, use *Buscar no Google Books*. Há estados de carregamento, erro (rede, tempo esgotado, limite) e lista vazia. A busca consulta ao mesmo tempo o catálogo do Project Gutenberg (por título ou autor) e o Google Books, e junta os dois: só aparecem obras com texto completo, ordenadas por relevância (título igual ao digitado primeiro, depois título parecido, depois autor), sem repetidas, com o idioma da edição e a capa e as páginas do Google quando houver. Se o Google Books estiver sem cota (erro 429) ou fora do ar, usa o Open Library e, no limite, só o Gutenberg; a busca só falha se tudo estiver indisponível. Buscas de duas letras ou só com palavras curtas (como "ab" ou "de o") não são enviadas: o app pede um trecho do título ou o nome do autor. Digitar **uma letra** (ou tocar em *Catálogo A-Z*) abre o catálogo em ordem alfabética: mostra as 30 primeiras obras daquela letra e carrega mais 30 a cada vez que a lista chega ao fim, até acabarem as obras da letra. Dá para trocar a letra e o idioma (todos os cerca de 70 idiomas do Gutenberg, com português, inglês, espanhol, francês, alemão e italiano primeiro). O Gutenberg só entrega as primeiras ~5 mil obras de cada listagem, o que cobre o alfabeto inteiro em todos os idiomas, menos o inglês: nele o catálogo mostra as obras **mais baixadas** em vez de A a Z, e para as demais vale a busca por título ou autor. O total de obras depende do próprio Gutenberg (por exemplo, cerca de 650 em português). Os marcadores de página valem por página, não por capítulo. |
| **Recurso nativo com permissão negada** | No editor de capítulo, toque em **Fotografar**. Se negar a câmera, o app explica e permite continuar; se o sistema bloquear, oferece abrir os ajustes. A biometria (*Proteger com biometria*, menu `⋮`) também explica quando não há biometria cadastrada. |
| **IA que continua funcionando se falhar** | *Modo sem spoilers*, *Explique este trecho* e *Mapa de personagens* (leitor) e *Transcrever* (foto). Sem rede, com erro do serviço ou resposta fora do formato, o app mostra a mensagem e nada é alterado; o resto do app segue normal. |
| **Regras do Firestore** | `firestore.rules` permite ler e gravar apenas o dono (`request.auth.uid == uid`) que entrou com o Google e nega todo o resto. Teste feito com duas contas: o dono lê e grava; outra conta, dados inválidos e coleções não previstas recebem `403` (tabela em [Docs/EstruturaDados.md](Docs/EstruturaDados.md)). |
| **Estrutura dos dados** | [Docs/EstruturaDados.md](Docs/EstruturaDados.md) e o arquivo de exemplo [Docs/exemplo-dados.json](Docs/exemplo-dados.json). |

### Estados de listagem (carregamento, vazio e erro)

- **Carregamento:** puxe a lista para baixo (pull-to-refresh) na Estante ou no Baú; na busca, o Google Books mostra o indicador de carregamento.
- **Vazio:** busque um termo inexistente na Estante ou use uma conta sem livros.
- **Erro:** sem internet, a busca do Google Books mostra o erro tratado com **Tentar novamente**.

---

## 🔥 Configuração do Firebase (autenticação e nuvem)

O login, a sincronização e a IA usam o Firebase. Cada pessoa usa o próprio projeto Firebase, sem chaves no repositório. Sem o `.env`, a tela de login avisa que o Firebase não está configurado.

1. No [console do Firebase](https://console.firebase.google.com), crie um projeto e registre um app **Web** (ícone `</>`).
2. Em **Authentication > Sign-in method**, ative o provedor **Google** e informe um e-mail de suporte. Se existir o provedor **E-mail/senha**, desative.
3. Em **Firestore Database**, crie o banco em modo produção e publique as regras do arquivo `firestore.rules` (`firebase deploy --only firestore`).
4. Publique a página de login (`hosting/index.html`), usada pelo celular para abrir o login do Google: `firebase deploy --only hosting`. No navegador o login abre direto, sem essa página.
5. Em **AI Logic**, ative o provedor **Gemini Developer API** (usado na companheira de leitura e na transcrição de fotos).
6. Copie `.env.example` para `.env` e preencha com os valores do app Web:

| Variável | Onde encontrar |
| :--- | :--- |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `appId` |

7. Opcional: `EXPO_PUBLIC_GEMINI_MODEL` troca o modelo de IA (padrão `gemini-3.5-flash`).
8. Opcional: `EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY` aumenta a cota da busca do Google Books. Sem ela, a busca usa a cota compartilhada e, se ela estourar, cai automaticamente para a Open Library.
8. Reinicie o Metro com cache limpo: `npx expo start -c`.

**Para quem vai avaliar o projeto:** o `.env` não está no repositório. Há duas opções: usar o `.env` enviado junto com a entrega (por exemplo, anexado no Moodle), copiando-o para a raiz do projeto, ou criar o próprio projeto Firebase seguindo os passos acima (leva alguns minutos). Depois, `npm install` e `npx expo start -c`.

O arquivo `.env` está no `.gitignore` e nunca deve ser commitado. A chave de API do Firebase para apps clientes identifica o projeto e não é um segredo; quem protege os dados são as regras do Firestore e a autenticação.

## 🎨 Identidade Visual

Paleta **Verde + Creme + Madeira**, definida em um só lugar (`src/theme/palettes.js`) e usada por todas as telas pelos tokens do tema, sem cores soltas nos componentes.

| Cor | Valor | Uso |
|---|---|---|
| Verde floresta | `#244C3A` | Botões primários, navegação, ações importantes |
| Verde oliva | `#527A5B` | Elementos secundários e variações |
| Verde sálvia | `#A8B99A` | Destaques suaves, indicadores, seleção |
| Bege areia | `#E9E2D0` | Superfícies secundárias, divisórias, contraste sutil |
| Off-white | `#FAF8F1` | Fundo das telas no modo claro |
| Madeira | `#7A5233` | Acentos e ações secundárias |

O modo escuro usa superfícies verde-escuras (`#0F1A15` e `#16241D`) com verde claro como cor de ação, e não uma simples inversão do claro. Vermelho, amarelo e verde de estados (erro, aviso, sucesso) têm tons ajustados à paleta. Novos componentes devem usar `useThemedStyles` e as chaves de `colors`, sem escrever cores diretamente.

---

## ✨ Companheira de Leitura (IA)

Substitui o antigo *Resumir capítulo*. No topo do leitor há um único ícone de brilho (✦) que abre um menu com **Perguntar sobre a história** e **Mapa de personagens**, cada um em sua própria tela. O **Explicar** aparece ao selecionar um trecho com o marca-texto.

- **Modo sem spoilers (sempre ativo):** a IA recebe **somente o texto até a folha em que você está**. O texto das folhas seguintes nem sai do aparelho, então não há como a resposta usá-lo. O limite acompanha a folha atual, inclusive se você voltar. As telas de perguntas e de explicação mostram o selo *Sem spoilers · até a folha N*.
- **Perguntar:** pergunte sobre a história. A IA cita trechos literais do que você já leu, com capítulo e folha, e o app **confere cada citação no texto**. Se a pergunta exigir algo que vem depois, ou se nenhuma citação puder ser confirmada, a resposta é bloqueada com um aviso em vez de arriscar um spoiler.
- **Explique este trecho:** selecione uma palavra, frase ou parágrafo (ative o marca-texto, selecione e toque em *Explicar*). A IA explica significados, figuras e referências usando o contexto lido, indica capítulo e folha e aceita perguntas de acompanhamento. O texto do livro não é alterado.
- **Mapa de personagens:** nós ligados por linhas coloridas por tipo de vínculo (parentesco, amizade, amor, rivalidade, aliança, trabalho). Ao tocar em um personagem: descrição, personalidade, relações e acontecimentos com a folha de origem. Só entram personagens cujo nome aparece no texto lido, acontecimentos com citação conferida e relações cujos dois lados existem; relação sem citação confirmada aparece como **não confirmada** (linha tracejada). Apelidos são fundidos e nomes parecidos não são juntados à força. O mapa fica guardado no aparelho e só é mostrado se foi gerado até a folha atual; se você voltou no livro, é preciso gerar de novo, para não mostrar o que está à frente. Ele é atualizado sob demanda (*Atualizar*).

Limites assumidos: a IA ainda pode reconhecer um clássico famoso pelo estilo do texto; por isso o app não envia título nem autor e proíbe o uso de conhecimento prévio da obra, e a checagem de citações reduz, mas não elimina, esse risco. Livros muito longos são enviados com o começo e o trecho mais recente (o meio é omitido). A geração do mapa leva alguns segundos e precisa de internet.

---

## 📖 Leitor Personalizável

Toque em **Aa** no topo do leitor para abrir o painel de ajustes, com prévia do texto e quatro abas:

- **Aparência:** tema *Auto* (segue o app e o papel do livro), *Claro* (#FAF8F1), *Creme* (#E9E2D0), *Verde* suave e *Escuro* verde profundo; brilho do leitor (escurece só a tela do leitor, sem mexer no brilho do aparelho).
- **Tipografia:** fonte (a do livro, serifada, sem serifa ou máquina), tamanho de 14 a 30 e alinhamento (esquerda ou justificado).
- **Espaçamento:** entrelinha, margens laterais, espaço entre parágrafos e largura da coluna (efeito visível em telas largas).
- **Leitura:** ocultar menus automaticamente (somem em 4 s; toque no texto para voltar), manter a tela ativa e **restaurar configurações originais**.

As escolhas valem na hora, não recarregam o livro e **não mudam a página**: a paginação é por quantidade de texto, independente da aparência. São salvas **por livro** (fonte, cor da página, brilho e demais ajustes são individuais de cada obra), por usuário, no aparelho; livros ainda sem ajuste próprio começam no padrão. O Sumário tem a aba **Grifos**, que lista todos os trechos grifados do livro, leva até a folha deles e permite remover cada um.

Limites assumidos: as preferências não sincronizam entre aparelhos; a anotação continua sendo o comentário por folha (não há nota presa a um trecho grifado); o "brilho" é uma película escura sobre o leitor; manter a tela ativa depende do suporte do aparelho.

---

## 📈 Painel e Progresso de Leitura

- **Cartão do livro:** status (*Quero ler*, *Lendo*, *Lido*) e, quando em leitura, percentual e barra de progresso. A estante tem filtros por status com contagem.
- **Leitor:** toque em "Página N de M" para ver progresso, início, previsão de término (depois de ler em 2 dias diferentes), conclusão, **registrar a página atual** e marcar como lido ou voltar para lendo. Ao ler a última página, o livro é concluído e o app avisa.
- **Painel no Perfil:** livros lidos, em andamento e planejados; páginas lidas; tempo de leitura; média de páginas por dia (últimos 30 dias); gráfico de 14 dias e de 6 meses; comparativo com o mês e o ano anteriores; **meta anual** de livros; atividade recente.
- **Dados reais:** tudo vem do registro de leitura (`services/readingLog.js`), guardado só no aparelho. Páginas lidas contam avanços de 1 ou 2 páginas e o registro manual; saltos pelo sumário e voltas não contam, e o tempo parado acima de 5 minutos é descartado. Detalhes em `Docs/EstruturaDados.md`.
- **Avisos e carregamento:** confirmações discretas no topo (salvar, excluir, restaurar, meta), *skeleton* na estante, no baú e no painel, e confirmação antes de excluir.
- **Limites assumidos:** o app não guarda autor nem avaliação por estrelas, então não são exibidos. O registro de leitura não sincroniza com a nuvem.

---

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
│   │   ├── AiChat.js          # Conversa com a IA (respostas, trechos de apoio e entrada)
│   │   ├── CharacterMap.js    # Mapa de personagens: grafo, detalhes, relações e acontecimentos
│   │   ├── AiMenu.js          # Menu do ícone de IA no leitor (perguntar ou mapa de personagens)
│   │   ├── AskBook.js         # Perguntar sobre a história, sem spoilers
│   │   ├── CharacterMapModal.js # Tela do mapa de personagens
│   │   ├── ExplainPassage.js  # Explique este trecho (painel com conversa)
│   │   ├── SpoilerBadge.js    # Selo "Sem spoilers · até a folha N"
│   │   ├── Avatar.js          # Iniciais do usuário
│   │   ├── AnnotatedText.js   # Texto do leitor com grifos e seleção de trechos
│   │   ├── BarChart.js        # Gráfico de barras do painel de leitura
│   │   ├── BookCard.js        # Card de livro com menu de ações, status e progresso
│   │   ├── BookEditModal.js   # Edição de título, categoria e cores do livro
│   │   ├── BookCover.js       # Capa de livro artesanal tátil
│   │   ├── ChangeHistoryModal.js # Histórico de alterações (antes/depois)
│   │   ├── ChapterEditor.js   # Editor de capítulos em tela cheia
│   │   ├── CommentsModal.js   # Comentários em obras de terceiros
│   │   ├── CustomTabBar.js    # Barra de navegação inferior customizada
│   │   ├── EmptyView.js       # Tratamento de estado vazio
│   │   ├── ErrorView.js       # Tratamento de estado de erro com retry
│   │   ├── FormatCard.js      # Quadro de importação por formato (toque ou arraste)
│   │   ├── FormBlocks.js      # Campos, seções, botões e seletores padronizados do formulário
│   │   ├── GoogleBooksSearch.js # Busca no Google Books limitada a obras com texto completo
│   │   ├── Header.js          # Barra superior institucional
│   │   ├── LoadingView.js     # Tratamento de estado de carregamento
│   │   ├── ProgressBar.js     # Barra de progresso animada e acessível
│   │   ├── ReadingDashboard.js # Painel de leitura do Perfil
│   │   ├── ReaderSettings.js  # Painel de ajustes do leitor (aparência, tipografia, espaçamento, leitura)
│   │   ├── ReadingProgressModal.js # Progresso do livro e registro de página no leitor
│   │   ├── Skeleton.js        # Carregamento em esqueleto (estante, baú e painel)
│   │   ├── StatusChip.js      # Selo de status do livro
│   │   ├── Toast.js           # Avisos discretos de sucesso, erro e informação
│   │   └── Touchable.js       # Botão base com cor ao passar o mouse e ao tocar
│   ├── navigation/
│   │   └── AppNavigator.js    # Configuração de rotas (Stack e Bottom Tabs)
│   ├── screens/               # Telas do fluxo da aplicação
│   │   ├── BookshelfScreen.js # Estante de livros (Home)
│   │   ├── ChestScreen.js     # Baú de livros arquivados
│   │   ├── CreateBookScreen.js# Criação e importação de obras
│   │   ├── LoginScreen.js     # Tela de login
│   │   ├── ProfileScreen.js   # Perfil e painel de leitura
│   │   ├── ReaderScreen.js    # Leitor de livros com sumário e tipografia
│   │   └── SettingsScreen.js  # Tema, conta (sair) e apagar dados
│   ├── services/
│   │   ├── biometrics.js      # Proteção de livros com biometria do aparelho
│   │   ├── bookFonts.js       # Guarda e carrega a fonte original de livros importados
│   │   ├── camera.js          # Foto de página com tratamento de permissão
│   │   ├── ai.js              # Chamadas ao Gemini via Firebase AI Logic (companheira de leitura e transcrição de fotos)
│   │   ├── bookContext.js     # Monta o texto enviado à IA só até a folha liberada e confere citações
│   │   ├── readingAssistant.js # Perguntas, explicação de trecho e mapa de personagens, com validação das respostas
│   │   ├── auth.js            # Cadastro, login e logout (Firebase Authentication)
│   │   ├── categories.js      # Categorias editáveis do usuário
│   │   ├── cloud.js           # Sincronização dos livros com o Firestore
│   │   ├── dialog.js          # Alertas e confirmações (nativo e web)
│   │   ├── epubParser.js      # Extração de texto e fonte embutida de EPUBs
│   │   ├── exporter.js        # Exportação de livro em TXT e JSON
│   │   ├── firebase.js        # Inicialização do Firebase (variáveis do .env)
│   │   ├── fontHints.js       # Classifica fontes (serifada, sem serifa, monoespaçada)
│   │   ├── googleBooks.js     # Consulta à API do Google Books
│   │   ├── googleImport.js    # Baixa o texto completo de um livro em segundo plano
│   │   ├── importProgress.js  # Progresso dos livros em download
│   │   ├── importer.js        # Seleção e importação de arquivos
│   │   ├── marks.js           # Grifos, marcadores e comparação antes/depois
│   │   ├── mockData.js        # Dados seminais de livros e usuário
│   │   ├── bookPages.js       # Contagem de páginas de leitura de cada livro (a mesma do leitor)
│   │   ├── readerPrefs.js     # Preferências do leitor: padrões, limites e validação
│   │   ├── readingLog.js      # Registro de leitura: páginas por dia, tempo, início, conclusão e meta
│   │   ├── readingStats.js    # Estatísticas do painel, status e previsão de término
│   │   ├── pagination.js      # Divide os capítulos em páginas de leitura
│   │   ├── pdfParser.js       # Extração de texto, páginas e fonte de PDFs
│   │   ├── publicDomain.js    # Busca e baixa textos do Project Gutenberg
│   │   ├── htmlText.js        # Converte o HTML do Gutenberg em texto com negrito e itálico
│   │   ├── storage.js         # Camada de persistência local (AsyncStorage)
│   │   └── textSearch.js      # Busca sem acentos e sem diferença de maiúsculas
│   └── theme/
│       ├── bookOptions.js     # Cores de capa, folha, categorias e tipos de letra
│       ├── palettes.js        # Identidade visual: cores da marca e paletas Claro e Escuro
│       ├── readerThemes.js    # Temas de leitura (claro, creme, verde, escuro)
│       ├── tokens.js          # Tipografia, espaçamento, raios, sombras e animações
│       └── ThemeContext.js    # Tema do app (provedor, hooks e escopo do leitor)
├── App.js                     # Ponto de entrada do aplicativo
├── .env.example               # Variáveis do Firebase (copiar para .env)
├── firestore.rules            # Regras de segurança do Firestore (só dono, só conta Google)
├── hosting/index.html         # Página de login com Google usada pelo celular (Firebase Hosting)
├── app.json                   # Metadados e configuração do Expo
├── package.json               # Dependências e scripts
└── README.md                  # Este documento
```

---

## 📜 Documentos Vinculados

- [Revisão das Decisões de Arquitetura e Requisitos](Docs/ExplicaçãoArquiteturaTelas.md)
- [PRD — Entre Páginas](Docs/PRD.md)
- [Estrutura dos dados e regras de segurança](Docs/EstruturaDados.md) e [exemplo de dados](Docs/exemplo-dados.json)
- [Tutorial de uso](Docs/Tutorial.md)
- [Diário de uso de IA](Docs/diarioIA.md)
