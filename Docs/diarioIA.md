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