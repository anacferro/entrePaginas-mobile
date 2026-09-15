# PRD — Estante Virtual (porte mobile)

## 1. Visão geral

**Nome do produto:** Estante Virtual
**Tipo:** Porte para mobile de um projeto já existente — app de estante virtual de livros digitais
**Plataforma:** Mobile, desenvolvido com Expo/React Native
**Autenticação e armazenamento:** Firebase (login com conta Google)

Este documento descreve o porte para mobile de um projeto já existente. Cada usuário cria e mantém sua própria estante de livros digitais: monta um livro do zero, escolhendo cor da capa e avatar, adiciona páginas de conteúdo (escrevendo direto ou importando de arquivos PDF, EPUB, texto ou JSON, ou fotografando texto físico), organiza por categoria e lê tudo depois com sumário. Livros que o usuário não quer mais na estante não são apagados de vez — vão para um "baú", onde ficam guardados. Tudo fica salvo automaticamente na nuvem via Firebase, com sessão persistente.

---

## 2. Problema

Muita gente lê e/ou escreve trechos de texto de forma espalhada — fotos de páginas de livros físicos, anotações soltas, rascunhos no celular — sem um lugar único e organizado para guardar isso como se fossem "livros" pessoais, revisáveis e sempre à mão.

---

## 3. Solução proposta

Um app mobile onde cada usuário monta e mantém sua própria estante de livros digitais: cria um livro, adiciona páginas (escrevendo ou fotografando texto físico), organiza por categoria e lê tudo depois, de qualquer lugar, com os dados sincronizados na nuvem.

O fluxo principal é:

1. O usuário entra com sua conta Google.
2. O usuário acessa sua estante.
3. O usuário cria um novo livro, escolhendo cor da capa e avatar.
4. O usuário adiciona páginas: digitando, importando um arquivo (PDF, EPUB, texto ou JSON) ou fotografando uma página física (câmera/OCR).
5. O usuário organiza os livros por categoria.
6. O usuário lê o livro de forma organizada, com sumário.
7. O usuário pode exportar um livro para diferentes formatos de arquivo.
8. Livros que o usuário não quer mais na estante vão para o "baú", sem exclusão definitiva.
9. Os dados ficam sincronizados na nuvem (Firebase) e a sessão permanece persistente entre acessos.

---

## 4. Público-alvo

Estudantes e leitores que querem organizar anotações, resumos de leitura ou pequenos textos próprios em formato de "livro", sem depender de papel ou de apps de notas genéricos.

---

## 5. Proposta de valor

- Organização por livro/página, não uma lista plana de notas.
- Personalização visual de cada livro (cor da capa e avatar).
- Importação rápida de texto físico via câmera (OCR).
- Importação de conteúdo já existente em PDF, EPUB, texto ou JSON.
- Enriquecimento automático (capa, categoria) puxando de uma base pública de livros (Google Books).
- Resumo automático de trechos longos via IA, para revisão rápida.
- Exportação dos livros para diferentes formatos de arquivo.
- "Baú" para livros retirados da estante sem exclusão definitiva.
- Acesso de qualquer dispositivo (dados na nuvem) com sessão persistente.

---

## 6. Objetivos

### 6.1 Objetivo geral

Portar para mobile (Expo/React Native) o produto já existente, mantendo sua proposta de valor original e entregando um fluxo principal funcional e executável em um celular real via Expo Go.

### 6.2 Objetivos específicos

- Permitir autenticação com conta Google.
- Manter sessão persistente entre aberturas do aplicativo.
- Permitir criação e personalização de livros (cor da capa, avatar).
- Permitir criação, edição, leitura e exclusão de páginas.
- Permitir organização dos livros por categoria.
- Permitir importação de conteúdo (arquivo ou câmera/OCR).
- Integrar a API do Google Books para enriquecimento de dados.
- Disponibilizar resumo automático de textos via IA.
- Permitir exportação de livros em diferentes formatos.
- Manter os dados sincronizados na nuvem via Firebase.
- Tratar falhas de integrações externas sem comprometer o uso do app.

---

## 7. Requisitos funcionais

### RF01 — Autenticação com Google
O sistema deve permitir que o usuário faça login utilizando uma conta Google, via Firebase Authentication.

### RF02 — Sessão persistente
O sistema deve manter a sessão do usuário ativa entre fechamentos e reaberturas do aplicativo, enquanto a sessão for válida.

### RF03 — Estante do usuário
O sistema deve apresentar uma estante contendo apenas os livros pertencentes ao usuário autenticado.

### RF04 — Criação de livro
O sistema deve permitir criar um novo livro informando ao menos título, cor da capa e avatar.

### RF05 — Personalização da capa e avatar
O sistema deve permitir escolher a cor da capa e um avatar para o livro.

### RF06 — Edição do livro
O sistema deve permitir alterar as informações e características visuais de um livro já criado.

### RF07 — Categorização
O sistema deve permitir associar um livro a uma categoria, para facilitar sua organização e localização na estante.

### RF08 — Envio para o baú
O sistema deve permitir retirar um livro da estante sem apagá-lo definitivamente, enviando-o para o "baú".

### RF09 — Visualização do baú
O sistema deve permitir visualizar os livros armazenados no baú.

### RF10 — Restauração do baú
O sistema deve permitir restaurar um livro do baú de volta para a estante.

### RF11 — Exclusão definitiva
O sistema deve permitir excluir definitivamente um livro que esteja no baú, mediante confirmação do usuário.

### RF12 — Criação de página
O sistema deve permitir adicionar novas páginas a um livro, digitando o conteúdo diretamente.

### RF13 — Importação de arquivo
O sistema deve permitir importar conteúdo de arquivos nos formatos PDF, EPUB, texto (TXT) ou JSON, convertendo-o em páginas do livro.

### RF14 — Captura de conteúdo pela câmera (OCR)
O sistema deve permitir utilizar a câmera do dispositivo para fotografar uma página física e reconhecer seu texto (OCR), quando possível.

### RF15 — Edição de página
O sistema deve permitir editar o conteúdo de uma página existente.

### RF16 — Exclusão de página
O sistema deve permitir excluir uma página, mediante confirmação do usuário.

### RF17 — Ordenação das páginas
O sistema deve manter as páginas de um livro em uma ordem definida e editável.

### RF18 — Leitura do livro
O sistema deve permitir abrir um livro e navegar por suas páginas em modo de leitura.

### RF19 — Sumário
O sistema deve disponibilizar um sumário que permita visualizar e acessar diretamente as páginas do livro.

### RF20 — Consulta ao Google Books
O sistema deve permitir consultar a API do Google Books para enriquecer automaticamente dados do livro (como capa e categoria sugeridas).

### RF21 — Resumo por IA
O sistema deve permitir solicitar um resumo automático de um trecho longo de conteúdo, utilizando um serviço de IA.

### RF22 — Exportação de livro
O sistema deve permitir exportar o conteúdo de um livro para diferentes formatos de arquivo suportados pela aplicação.

### RF23 — Armazenamento e sincronização na nuvem
O sistema deve armazenar e sincronizar os dados dos livros e páginas na nuvem via Firebase, refletindo criações, edições e exclusões.

### RF24 — Tratamento de falhas de integrações externas
Falhas na câmera/OCR, no Google Books, no serviço de IA, na importação ou na exportação devem ser informadas ao usuário de forma clara, sem interromper o funcionamento do restante do aplicativo.

---

## 8. Requisitos não funcionais

### RNF01 — Plataforma
O aplicativo deve ser desenvolvido em Expo/React Native e executável via Expo Go em um celular real.

### RNF02 — Persistência
Os dados criados pelo usuário devem permanecer disponíveis após o fechamento e reabertura do aplicativo, uma vez sincronizados com a nuvem.

### RNF03 — Segurança de acesso
Cada usuário deve acessar apenas os livros e páginas associados à sua própria conta.

### RNF04 — Tolerância a falhas
Falhas em serviços externos (Google Books, IA, OCR) não devem causar o encerramento inesperado do aplicativo.

### RNF05 — Usabilidade
As operações principais — criar livro, adicionar página, ler conteúdo, editar/excluir página — devem ser acessíveis por navegação simples.

### RNF06 — Responsividade
As telas devem se adaptar a diferentes tamanhos de tela de dispositivos mobile.

---

## 9. Estrutura conceitual dos dados

### Usuário
- Identificador
- Dados de autenticação (Google/Firebase)
- Informações básicas de perfil

### Livro
- Identificador
- Identificador do usuário proprietário
- Título
- Cor da capa
- Avatar
- Categoria
- Status (estante ou baú)
- Data de criação e de atualização

### Página
- Identificador
- Identificador do livro
- Ordem da página
- Conteúdo
- Data de criação e de atualização

### Resumo (opcional, se persistido)
- Referência ao conteúdo original
- Texto do resumo gerado por IA

---

## 10. Integrações externas

- **Firebase**: autenticação (Google), armazenamento e sincronização dos dados.
- **Google Books API**: enriquecimento automático de dados do livro (capa, categoria sugerida).
- **Serviço de IA**: geração de resumos automáticos de trechos longos.
- **Câmera/OCR**: captura e reconhecimento de texto de páginas físicas.

---

## 11. Escopo

- Aplicativo mobile (Expo/React Native).
- Login com conta Google via Firebase.
- Sessão persistente.
- Estante individual por usuário.
- Criação e personalização de livros (cor da capa, avatar).
- Categorização de livros.
- Criação, leitura, edição e exclusão de páginas.
- Sumário.
- Importação de conteúdo via arquivo (PDF, EPUB, texto, JSON) e via câmera/OCR.
- Exportação de livros em formatos suportados.
- Enriquecimento de dados via Google Books.
- Resumo de conteúdo via IA.
- Baú (envio, restauração e exclusão definitiva).
- Persistência e sincronização na nuvem via Firebase.
- Tratamento controlado de falhas das integrações externas.

---

## 12. Fora do escopo

- Rede social pública entre usuários (seguidores, comentários, avaliações).
- Marketplace ou venda de livros.
- Publicação pública de livros para outros usuários.
- Edição colaborativa simultânea de um mesmo livro.
- Biblioteca comercial de livros protegidos por direitos autorais.
- Audiolivros e narração automática.
- Sistema avançado de diagramação editorial profissional.
- Impressão física dos livros.
- Treinamento de modelos próprios de IA.

---

## 13. Decisões de arquitetura

### DA01 — Firebase para autenticação e armazenamento

**Decisão:** utilizar Firebase (Authentication + Firestore/Storage) para login e persistência dos dados.

**Alternativas consideradas:**
- Backend próprio com Node.js.
- Banco PostgreSQL com API própria.
- Firebase.

**Consequências assumidas:**
- Redução de infraestrutura própria a desenvolver.
- Integração simplificada com login Google.
- Dependência de serviços externos do Firebase e de seus limites de uso.

### DA02 — Expo/React Native para o app mobile

**Decisão:** utilizar Expo para o desenvolvimento e execução do aplicativo mobile.

**Alternativas consideradas:**
- Desenvolvimento nativo separado (Android/iOS).
- Flutter.
- Expo/React Native.

**Consequências assumidas:**
- Desenvolvimento multiplataforma facilitado e testável em dispositivo real via Expo Go.
- Algumas funcionalidades nativas (câmera/OCR) podem depender de bibliotecas específicas do ecossistema Expo.

### DA03 — Modelagem dos dados: usuário, livro e página como entidades relacionadas

**Decisão:** representar usuário, livro e página como entidades separadas e relacionadas (usuário → livros → páginas), em vez de um único documento por livro.

**Alternativas consideradas:**
- Armazenar todo o conteúdo de um livro (todas as páginas) em um único documento.
- Armazenar cada página como um documento independente, relacionado ao livro.
- Estrutura totalmente plana, sem separação por entidade.

**Consequências assumidas:**
- Facilita edição, exclusão e reordenação individual de páginas.
- Permite que livros tenham quantidade variável de páginas sem custo alto de leitura/escrita.
- Exige controle explícito da relação usuário → livro → página e da ordenação das páginas.

### DA04 — Integrações externas isoladas do fluxo principal

**Decisão:** tratar câmera/OCR, Google Books, IA e exportação como funcionalidades auxiliares, tolerantes a falha, que não bloqueiam o fluxo principal (criar/ler/editar livro e página).

**Alternativas consideradas:**
- Tornar essas integrações obrigatórias para o funcionamento básico do app.
- Tratá-las como recursos complementares, com fallback manual em caso de falha.

**Consequências assumidas:**
- O usuário consegue criar, editar e ler livros mesmo se Google Books, IA ou OCR estiverem indisponíveis.
- Exige implementar estados de carregamento e mensagens de erro específicas para cada integração.

---

## 14. Critérios de aceitação do MVP

- É possível fazer login com conta Google e a sessão persiste ao reabrir o app.
- Um usuário não acessa os livros de outra conta.
- É possível criar, personalizar (cor da capa, avatar), editar e categorizar um livro.
- É possível enviar um livro para o baú, restaurá-lo e excluí-lo definitivamente do baú.
- É possível criar, ler, editar e excluir páginas, com ordem preservada.
- O sumário permite navegar entre páginas do livro.
- É possível importar conteúdo de arquivo (PDF/EPUB/texto/JSON) e, quando possível, via câmera/OCR.
- É possível consultar o Google Books e usar o resultado para enriquecer o livro.
- É possível solicitar um resumo de um trecho via IA.
- É possível exportar um livro em pelo menos um formato implementado.
- Falhas em qualquer integração externa são informadas ao usuário sem travar o app.
- Os dados permanecem persistidos e sincronizados no Firebase.

---

## 15. Riscos e limitações

**Dependência de serviços externos:** Google Books, serviço de IA e Firebase podem ficar indisponíveis ou mudar limites de uso.
*Mitigação:* tratar erros e manter as funcionalidades essenciais (criar/ler/editar livro e página) disponíveis mesmo sem essas integrações.

**Qualidade do OCR:** varia conforme iluminação, qualidade da foto e fonte da página física.
*Mitigação:* permitir revisão e edição do texto reconhecido antes de salvar.

**Formatos de importação/exportação:** cada formato (PDF, EPUB, texto, JSON) tem particularidades próprias de leitura/escrita.
*Mitigação:* definir um conjunto inicial controlado de formatos e validar o conteúdo gerado.

---

## 16. Resultado esperado

Ao final desta etapa, o Estante Virtual deverá ter, no mínimo, o fluxo principal funcional em um celular real via Expo Go: login, estante, criação/personalização de livro, gerenciamento de páginas (incluindo importação e leitura com sumário) e persistência no Firebase. As integrações complementares — câmera/OCR, Google Books, IA e exportação — devem funcionar quando disponíveis e falhar de forma controlada quando não.