# Diário de Uso de IA

Este projeto foi desenvolvido com apoio do Claude Code (Anthropic), além do ChatGPT(OpenAI), como ferramentas de IA generativa para programação, conforme a disciplina é "AI-first". Este diário registra como a IA foi usada, quais decisões foram levadas e o que precisa ser revisado.

## 2026-09-11 — Da ideia original ao app mobile

**O que foi pedido:** havia um protótipo web anterior ("Entre Páginas" / pasta antiga "Aplicacao-Receitas"), feito em React + Vite, com o conceito de estante de livros pessoal. A tarefa da disciplina exige obrigatoriamente React Native + Expo — o protótipo web não atende esse requisito.

**O que a IA fez:**
1. Analisou o código do protótipo web existente (rotas, modelo de dados em `bookModel.js`, uso do Firebase) para entender a ideia original.
2. Comparou os requisitos da disciplina com o que já existia, identificando os pontos que faltavam: stack errada (web em vez de RN/Expo), falta de cadastro separado, falta de storage local, falta de API externa, falta de recurso nativo, falta de IA generativa, falta de toda a documentação e do repositório GitHub.
3. Apresentou esse gap de forma explícita antes de decidir qualquer coisa sozinha.

**Decisões que a IA perguntou pro usuário (não decidiu sozinha):**
- Recurso nativo a usar → usuário escolheu **câmera + notificações**.
- Funcionalidade de IA generativa → usuário escolheu **resumir página/capítulo + sugerir categoria**.
- Provedor de IA → usuário escolheu **Google Gemini API** (free tier, mais econômico para uso de estudante).
- Onde criar o projeto novo → usuário pediu para manter o app web antigo intacto e criar um projeto novo separado.

**Decisões técnicas que a IA tomou e justificou (a revisar com a usuário/professor):**
- Usar **Expo Router** em vez de configurar React Navigation manualmente — menos boilerplate, estrutura de pastas já organiza as rotas.
- Usar **email/senha** em vez de login Google no mobile, pra não lidar com a complexidade de OAuth nativo dentro do Expo Go.
- Reaproveitar o **mesmo projeto Firebase** (`receitas-utf`) do app web, em vez de criar um novo.
- Isolar toda chamada de IA num único serviço (`iaService.js`) que nunca lança erro — sempre retorna `null` em caso de falha, e cada tela decide como avisar o usuário.
- Usar `expo-image-picker` (em vez de `expo-camera` puro) para acionar a câmera nativa — mais simples de implementar mantendo o requisito de "recurso nativo: câmera" atendido.

**O que a usuário/grupo ainda precisa revisar:**
- Testar o app de ponta a ponta no celular via Expo Go e validar se o fluxo faz sentido na prática.
- Gerar a própria chave da Gemini API (gratuita) e configurar no arquivo `.env`.
- Criar o repositório no GitHub (a IA não tem acesso à conta do GitHub da usuário) e revisar o primeiro commit antes de enviar pro professor.
- Revisar o texto de todas as telas e a paleta de cores — foi feito um design funcional simples, não uma versão final de identidade visual.

# 2026-09-14 — Criação do documento PRD

**O que foi pedido:**

Com base nas definições que já haviam sido feitas para o projeto, criar um Documento de Requisitos do Produto (PRD) contendo os requisitos solicitados pela disciplina, incluindo problema, público-alvo, requisitos funcionais numerados, escopo, itens fora do escopo e decisões de arquitetura.

**O que a IA fez:**

1. Gerou uma primeira versão do PRD com base nas informações já definidas sobre o aplicativo.
2. Após o usuário indicar pontos que precisavam ser alterados ou complementados, gerou uma segunda versão mais completa, reorganizando os requisitos e incluindo as informações solicitadas.
3. Estruturou os requisitos funcionais e não funcionais, o fluxo principal, o escopo, o que ficaria fora do escopo, os critérios de aceitação e as decisões de arquitetura.
4. Utilizou as definições da primeira entrega como base, incluindo a ideia da estante digital, criação e personalização dos livros, páginas, importação de arquivos, baú e armazenamento em nuvem.

**Decisões que a IA perguntou ao usuário/grupo, em vez de decidir sozinha:**

- Quais funcionalidades deveriam fazer parte do aplicativo.
- Quais pontos da primeira versão estavam incorretos ou precisavam ser alterados.
- Quais características do aplicativo deveriam ser mantidas ou modificadas em relação ao que já havia sido definido.
- Se o conteúdo deveria ser apenas corrigido ou se deveria ser criada uma versão nova e mais completa do documento.
- Qual formato de arquivo deveria ser utilizado para o documento/projeto.

**Decisões técnicas que a IA sugeriu e justificou, mas que devem ser revisadas pelo usuário/grupo:**

- Usar **Expo Router** em vez de configurar o React Navigation manualmente, pois a estrutura baseada em arquivos reduz código de configuração e facilita a organização das telas e rotas.
- Usar **email e senha** para autenticação no aplicativo mobile em vez de depender inicialmente do login Google, considerando as limitações e a complexidade de autenticação OAuth no ambiente de desenvolvimento utilizado com Expo Go.
- Reaproveitar o **mesmo projeto Firebase** (`receitas-utf`) já utilizado no aplicativo web, em vez de criar outro projeto Firebase, caso essa estrutura continue adequada para o trabalho
- Separar conceitualmente **usuário, livro e página** na modelagem dos dados, permitindo que cada usuário possua vários livros e que cada livro possua várias páginas.
- Tratar as integrações externas — câmera/OCR, IA, API de livros e notificações — como funcionalidades que não devem impedir o funcionamento do restante do aplicativo caso apresentem falhas.

**O que foi aceito pelo usuário/grupo:**

As decisões e estruturas apresentadas pela IA foram utilizadas como base para a implementação e para a documentação do projeto, mas algumas decisões técnicas ainda precisam ser validadas antes da entrega final.

**O que foi recusado ou alterado:**

A primeira versão do documento foi considerada insuficiente em alguns pontos e foi solicitada uma versão mais completa e alinhada aos requisitos da disciplina. O documento foi então reorganizado e complementado.

**O que o usuário/grupo ainda precisa revisar:**

- Refatorar o aplicativo alterando eventuais erros e implementando funcionlidades.
- Validar se as decisões técnicas propostas pela IA são adequadas ao projeto e aos requisitos da disciplina.
- Verificar as configurações do Firebase antes da entrega.
- Revisar o texto apresentado nas telas do aplicativo.
- Revisar a paleta de cores e a identidade visual, pois a versão atual foi desenvolvida principalmente com foco na funcionalidade e não representa necessariamente a versão visual final.
- Verificar se todas as integrações previstas realmente funcionam no ambiente de avaliação.
- Validar se os formatos de importação e exportação definidos no PRD serão implementados integralmente na primeira versão.

# 2026-09-19 — Criação das telas

**O que foi pedido:**

Com base na descrição a respeito do projeto, foi pedido para o Stitch gerar telas base para o projeto.

**O que a IA fez:**

1. Gerou uma primeira versão das telas conforme foi solicitado.
2. Gerou icones, como o de configurações, tela inicial, criação de novo livro e etc.
3. Deu uma noção melhor de como as telas poderiam serfeitas.

**Decisões que a IA perguntou ao usuário/grupo, em vez de decidir sozinha:**

- Quais funcionalidades deveriam ter em cada página.
- O que deveria ou não ter em cada página.
- Paleta de cores e ícone do app

**Decisões técnicas que a IA sugeriu e justificou, mas que devem ser revisadas pelo usuário/grupo:**

- Formato base do layout App.

**O que foi aceito pelo usuário/grupo:**

O formato geral e posicionamento de alguns elementos, além dos icones.

**O que foi recusado ou alterado:**

A primeira versão do documento foi considerada insuficiente em alguns pontos e foi solicitada uma versão mais completa e alinhada aos requisitos da disciplina. O documento foi então reorganizado e complementado.

**O que o usuário/grupo ainda precisa revisar/revisou:**

- Refatorar o o layout do app para se parecer mais com o que foi imaginado
- Validar se as decisões técnicas propostas pela IA são adequadasaos conceitos bases de ux/ui.
- Verificar as configurações e quantidade de páginas necessárias.

# 2026-10-18 — Criação das telas

**O que foi pedido:**

Com a telas já prontas foi pedido a implementação das telas funcionais sem a parte de banco e backend

**O que a IA fez:**

1. Inicializou a estrutura com base no expo.
2. Implementou as telas com base no modelo feito pelo figma.
3. Programou a navegação e passagem de parâmetros.
4. fez uma persistência local temporária para poder realizar alterações.

**Decisões que a IA perguntou ao usuário/grupo, em vez de decidir sozinha:**

- Quais funcionalidades deveriam ter em cada página.
- Se tudo deveria estar de acordo com o figma ou se seriam realizadas alterações.
- A versão do expo utilizada para a aplicação.

**Decisões técnicas que a IA sugeriu e justificou, mas que devem ser revisadas pelo usuário/grupo:**

- Uso de persistência local durante essa etapa.

**O que foi aceito pelo usuário/grupo:**

O uso da persistência local para validar o funcionamento das telas.

**O que foi recusado ou alterado:**

Nem todos os elementos acabaram ficando exatamente iguais aos do figma por fins de praticidade até para programação.

**O que o usuário/grupo ainda precisa revisar/revisou:**

Funcionamento geral do app em diferentes modelos de celular

# 2026-10-30 a 2026-11-04 — Execução no celular, revisão das telas e novas funcionalidades (Claude Code)

**O que foi pedido:**

1. Clonar o repositório e fazer o app rodar no celular via Expo Go.
2. Corrigir o layout no Android, onde o cabeçalho ficava sob a barra de status e a barra de abas sob os botões de navegação.
3. Montar um roteiro curto para a apresentação da etapa 2, com perguntas prováveis do professor.
4. Revisar o app tela por tela e ajustar o que não funcionava, sem comentários no código e seguindo o padrão existente.
5. Revisar a escrita no livro e a importação de PDF, que até então era apenas uma simulação.
6. Implementar histórico de alterações (antes/depois) em livros que não são do usuário, marcadores de página com pin e título, e grifos com cores, negrito, itálico e sublinhado.
7. Comparar o enunciado do trabalho com o app e listar o que falta, do mais fácil ao mais difícil.

**O que a IA fez:**

1. Instalou as dependências e diagnosticou os problemas de conexão com o celular: o Expo Go da Play Store estava no SDK 58 enquanto o projeto usa o SDK 57, a rede da universidade bloqueava a conexão e o modo túnel (ngrok) foi bloqueado pelo antivírus da máquina.
2. Encontrou o motivo de o app ter parado de abrir: o texto `npx expo start --tunnel` havia sido colado por engano na primeira linha do `ProfileScreen.js`.
3. Trocou o `SafeAreaView` do React Native (que só funciona no iOS) pelo da biblioteca `react-native-safe-area-context` e ajustou a barra de abas aos botões do Android.
4. Como o celular não conseguiu conectar, configurou o app para rodar no navegador (Expo Web) e testou cada tela por lá.
5. Identificou que os alertas e confirmações (`Alert.alert`) não funcionam na web e criou o serviço `dialog.js`, que usa o alerta nativo no celular e o do navegador na web.
6. Corrigiu o avatar do leitor (não navegava), a numeração de páginas (era um número fixo), o botão "Excluir dados da biblioteca" (que na verdade restaurava os dados padrão) e textos de busca que citavam campos inexistentes.
7. Criou o editor de capítulos, a importação real de arquivos (PDF, TXT, Markdown e JSON), o histórico de alterações, os marcadores e o marca-texto.
8. Testou o leitor de PDF com arquivos gerados pelo navegador, incluindo um PDF só com imagem para validar o aviso de texto não extraível.
9. Removeu indicadores falsos das telas ("Firebase Ativo", "Sincronizado", "Tudo salvo na nuvem", "24.5 MB de 1 GB", "1.420 páginas lidas") e trocou por informações reais do armazenamento local.

**Decisões que a IA perguntou ao usuário/grupo, em vez de decidir sozinha:**

- Se o commit deveria ir direto para a branch `main` ou para uma branch separada, e depois se deveria ser enviado ao GitHub.
- O formato do roteiro de apresentação.
- Por onde começar a lista de pendências da etapa 3.

**Decisões técnicas que a IA sugeriu e justificou, mas que devem ser revisadas pelo usuário/grupo:**

- Escrever um leitor de PDF próprio (com a biblioteca `pako` para descompactar o texto) em vez de usar o `pdf.js`, que depende de recursos de navegador e não funciona de forma confiável no Expo Go.
- Considerar como "livro que não é do usuário" todo livro importado de arquivo, já que o app ainda não tem compartilhamento entre usuários.
- Guardar grifos e formatações como intervalos de caracteres sobre o texto puro do capítulo, em vez de transformar o texto em HTML ou rich text.

**O que foi aceito pelo usuário/grupo:**

As correções das telas, as novas funcionalidades do leitor, a importação real de arquivos e o uso do navegador como alternativa para demonstrar o app.

**O que foi recusado ou alterado:**

- O roteiro de apresentação foi refeito três vezes: o grupo recusou a versão com tabelas, depois a que tinha tempo estimado por parte, e pediu só texto com as respostas das perguntas.
- O modo túnel do Expo foi descartado porque o Windows da universidade bloqueia o ngrok.
- A importação de EPUB ficou de fora por enquanto e aparece como "Em breve" no app.

**O que o usuário/grupo ainda precisa revisar:**

- Testar no celular real a seleção de texto do marca-texto, que no Android e no iOS usa um mecanismo diferente do navegador.
- Implementar a etapa 3: autenticação, Firebase, API externa, recurso nativo e funcionalidade de IA.

## 2026-11-04 — Etapa 3: itens 4 a 16 da lista (Claude Code)

**O que foi pedido:** implementar, do mais fácil ao mais difícil, o que faltava em relação ao documento do professor: edição do livro, reordenar capítulos, exportar, importar EPUB, Google Books, câmera, Firebase (login e nuvem), IA e tutorial.

**O que a IA fez:**
1. Edição dos dados do livro (título, subtítulo, categoria e cores), reordenação de capítulos por setas no sumário e exportação em TXT e JSON.
2. Leitor de EPUB próprio, sem biblioteca nova além do `pako` já usado no PDF.
3. Busca no Google Books (API pública, sem chave) com estados de carregamento, erro e vazio.
4. Câmera para fotografar a página, com pedido de permissão e mensagens para permissão negada ou bloqueada.
5. Criou o projeto Firebase `entre-paginas-utf` pela linha de comando (o CLI já estava logado na conta do usuário), com app Web, Firestore, regras de segurança e login por e-mail e senha.
6. Login e cadastro reais, sessão persistente, telas privadas e sincronização dos livros com o Firestore (testada apagando os dados locais e recuperando da nuvem).
7. Resumo de capítulo e transcrição de foto com Gemini via Firebase AI Logic, com mensagens de erro e limite de tempo.
8. Acrescentou a proteção de livros por biometria, escolhida pelo usuário (menu do livro, cadeado na capa, bloqueio ao ir para segundo plano).
9. Documentou estrutura de dados, regras, decisões (DA10 a DA14) e escreveu o tutorial de uso.
10. Criou a sugestão de categoria, etiquetas e resumo curto com IA em JSON estruturado, com validação própria (`suggestion.js`) que recusa respostas fora do formato; testou os casos válidos, com cerca de crases, categoria desconhecida, lista, `null`, vazio e texto solto.
11. Gerou `Docs/exemplo-dados.json`, atualizou o PRD (login por e-mail e senha) e testou as regras do Firestore com duas contas temporárias (dono permitido; outra conta, dados inválidos e coleções não previstas negados), removendo as contas depois. Também retirou os comentários do código, a pedido do usuário, e achou e corrigiu uma função apagada por engano (`logChange`), que quebrava a edição de capítulos.
12. Criou a tela de Configurações com tema Automático, Claro e Escuro em todo o app (paletas com contraste conferido, contexto de tema e migração de todas as telas), sair da conta e apagar todos os dados do aparelho e da nuvem; verificou três vezes (lint e bundles, auditoria automática de contraste nos dois temas em todas as telas, e teste funcional de sair, entrar e apagar com uma conta temporária, removida depois). Corrigiu de passagem o contraste do botão *Esvaziar Baú* no escuro e o fato de *Excluir dados da biblioteca* só apagar no aparelho.
13. Trocou o login por e-mail e senha pelo login somente com Google: ativou o provedor Google pelo CLI, criou e publicou uma página de login no Firebase Hosting (necessária porque o Expo Go não tem botão nativo do Google), reescreveu a tela de login com um único botão, removeu o cadastro por e-mail e senha do código e fez o `firestore.rules` aceitar só contas Google (testado: conta de e-mail e senha recebe 403). Contas de teste criadas nesses testes foram removidas.

**Decisões que a IA sugeriu e justificou, mas que devem ser revisadas pelo usuário/grupo:**

- Fazer o login com Google por uma página no Firebase Hosting, já que o Expo Go não tem botão nativo do Google (DA10).
- Usar o Firebase AI Logic em vez de uma chave de IA no app (DA12).
- Novas contas começam com a estante vazia, em vez de receber os livros de exemplo.

**O que foi aceito pelo usuário/grupo:** o usuário autorizou a IA a seguir toda a lista sem pedir confirmação a cada item.

**Problemas encontrados e corrigidos durante o trabalho:**

- Uma linha com quebra de linha solta no importador deixou o app em branco; foi achada e corrigida na hora.
- O nome do modelo de IA sugerido pela documentação (`gemini-3.8-flash`) ficou sem responder, enquanto o `gemini-2.5-flash` foi recusado como indisponível; o `gemini-3.5-flash` respondeu em cerca de 3 segundos e virou o padrão. O caso serviu para validar o tratamento de falha da IA (limite de tempo e mensagem ao usuário).
- A API do Google Books respondeu com limite de consultas (erro 429) nos testes; a tela mostrou a mensagem prevista.

**O que o usuário/grupo ainda precisa revisar:**

- Testar no celular real a câmera, a permissão negada e o marca-texto.
- Conferir no console do Firebase se os dados de teste (conta `teste.entrepaginas@example.com` e um livro de teste) devem ser apagados antes da apresentação.

## 14. Rodada de ajustes de uso (revisão do usuário)

**O que foi pedido:** corrigir páginas sorteadas ao criar livro, busca do Google Books que lembrava a pesquisa anterior e dava limite de consultas, ficha do livro em blocos, capa com foto, modo de leitura sem menus, exportação, biometria em etapas, botão de configurações no cabeçalho, padronização de botões e campos, e retirada de itens sem utilidade (selo de sincronização, ferramentas de avaliação, sugestão de categoria com IA).

**O que foi feito:** o total de páginas passou a ser calculado pelo texto; a busca cai para a Open Library quando o Google Books recusa; os formulários ganharam blocos e campos de mesma altura; todos os botões passaram por um componente único com efeito ao passar o mouse e ao tocar; a biometria tenta a digital ou o rosto até 3 vezes e só depois pede a senha do aparelho.

**O que o usuário/grupo ainda precisa revisar:** testar no celular real a foto de capa (galeria e câmera), a exportação pelo compartilhamento e a biometria em etapas.

## 15. Busca de livros, catálogo A-Z e revisão geral (Claude Code)

**O que foi pedido:** melhorar a fonte e a formatação (negrito, itálico) dos livros vindos do Google, fazer a busca de livros ter sentido (inclusive para uma letra só), criar um catálogo de A a Z carregando 30 por vez, ampliar idiomas e resultados, centralizar o botão de Novo Livro na barra inferior, e revisar tela por tela procurando bugs.

**O que veio e o que foi aceito:** o texto passou a ser importado do HTML do Project Gutenberg, preservando negrito e itálico; a busca une Gutenberg e Google Books com ordenação por relevância; o catálogo A-Z com filtros de letra e idioma carrega de 30 em 30; o inglês usa o modo "mais baixados" porque a lista alfabética do Gutenberg para no limite de cerca de 5 mil itens. Na revisão, foram aceitas a fila de gravações locais, IDs únicos, retomada de downloads interrompidos, busca sem acentos, posição de leitura salva e a nova barra superior do leitor.

**O que foi recusado:** remover o resumo de capítulo por IA (mantido, pois atende ao requisito de funcionalidade de IA); a sugestão de categoria por IA, já retirada antes, segue fora e a documentação foi corrigida.

**O que o usuário/grupo ainda precisa revisar:** testar no iPhone (Expo Go) a barra inferior, o leitor e o catálogo; conferir a exclusão de contas de teste no Firebase Authentication.

## 16. Identidade visual, painel e progresso de leitura (Claude Code)

**O que foi pedido:** padronizar a identidade visual na paleta Verde + Creme + Madeira, criar um sistema de design, modernizar o modo escuro, implementar um painel de leitura com dados reais, acompanhar o progresso de cada livro e melhorar carregamento, avisos e responsividade.

**O que veio e o que foi aceito:** paleta e tokens centralizados (`theme/palettes.js`, `theme/tokens.js`), títulos em Lora, modo escuro em verde profundo; registro de leitura local (`services/readingLog.js`) com estatísticas testadas por script; painel no Perfil, status e progresso nos cartões, filtro por status, modal de progresso no leitor, avisos (toast) e skeleton.

**O que foi recusado ou adaptado:** o app não guarda autor nem avaliação por estrelas, então não foram inventados; o registro de leitura não sincroniza com o Firestore para não mudar o modelo de dados nem as regras de segurança; saltos de capítulo e tempo parado não contam como leitura.

**O que o usuário/grupo ainda precisa revisar:** conferir no celular o painel, o leitor com o novo indicador de página e o modo escuro; decidir se quer sincronizar o registro de leitura na nuvem.

## 17. Leitor personalizável (Claude Code)

**O que foi pedido:** transformar o leitor em uma experiência de leitura confortável e personalizável, com temas, tipografia, espaçamento, menus que somem, brilho, tela ativa, destaques e preferências salvas.

**O que veio e o que foi aceito:** painel de ajustes com prévia (`components/ReaderSettings.js`), preferências validadas e salvas por usuário (`services/readerPrefs.js`), temas (`theme/readerThemes.js`), menus com ocultação automática, película de brilho, tela ativa por `expo-keep-awake`, espaço entre parágrafos e aba Destaques no sumário. Como a paginação é por quantidade de texto, trocar a aparência nunca muda a página nem o progresso.

**O que foi recusado ou adaptado:** o brilho não altera o brilho do aparelho (só escurece o leitor); as preferências não sincronizam com a nuvem; não foi criada nota presa a trecho grifado, porque exigiria mudar o modelo sincronizado e as regras do Firestore (o app já tem comentários por folha); os formatos EPUB e PDF viram texto na importação, então as mesmas opções valem para todos.

**O que o usuário/grupo ainda precisa revisar:** testar no iPhone o painel, o gesto de tocar para mostrar os menus e a tela ativa; decidir se quer notas por trecho e sincronização das preferências.

## 18. Companheira de leitura: sem spoilers, explicação de trecho e mapa de personagens (Claude Code)

**O que foi pedido:** trocar o *Resumir página* pelo *Modo sem spoilers*, adicionar *Explique este trecho* e o *Mapa de personagens*, os três integrados e respeitando a posição de leitura.

**O que veio e o que foi aceito:** o resumo de capítulo (`AiSummary`) foi removido. O texto enviado à IA é montado só até a folha atual (`services/bookContext.js`), então o futuro nunca sai do aparelho. As respostas pedem citações literais, e o app confere cada uma no texto lido (`services/readingAssistant.js`): sem citação confirmada, a resposta é bloqueada. No mapa, o nome precisa aparecer no texto, os acontecimentos precisam de citação conferida e relações sem prova ficam como "não confirmadas". O mapa guardado só é exibido se foi gerado até a folha atual e se o texto não mudou. Testado com 13 verificações automáticas (prompt sem texto futuro, citação do futuro descartada, personagem inventado removido, cache invalidado ao voltar) e, no navegador, com chamadas reais ao Gemini em um livro de teste com um segredo no capítulo final: a IA recusou revelar o parentesco e a sabotagem, respondeu o que já constava com os trechos e gerou um mapa sem o vínculo oculto.

**O que foi recusado ou adaptado:** não é possível impedir que um modelo reconheça um clássico famoso pelo estilo do texto; por isso título e autor não são enviados e o prompt proíbe conhecimento prévio, mas a garantia é "o texto futuro não é enviado", não "o modelo nunca sabe". A explicação de palavras e referências culturais pode usar conhecimento geral da língua, nunca da trama. O Modo sem spoilers não tem interruptor (foi retirado a pedido, por confundir); ele fica sempre ativo. O mapa só se atualiza sob demanda. Livros longos são enviados com começo e trecho recente.

**O que o usuário/grupo ainda precisa revisar:** testar no iPhone; avaliar o tempo de resposta do mapa em livros longos e decidir se quer notas presas a trechos.

### Ajuste posterior

**O que foi pedido:** tirar o interruptor de spoilers, organizar melhor as opções na página e separar o mapa de personagens da parte de spoilers.

**O que foi feito:** o Modo sem spoilers ficou sempre ativo, sem interruptor. A página perdeu o selo grande acima do texto; no topo há um único ícone de IA que abre um menu com duas telas independentes (*Perguntar sobre a história* e *Mapa de personagens*). O selo de spoilers aparece só na tela de perguntas e na de explicação do trecho.
