# Tutorial de Uso — Entre Páginas

Passo a passo para usar o aplicativo e para apresentá-lo ao vivo, na ordem sugerida.

## 1. Criar a conta e entrar

1. Abra o app. Na tela inicial, toque em **Criar conta**.
2. Informe nome, e-mail e uma senha de pelo menos 6 caracteres e toque em **Criar conta**.
3. Para entrar depois, use **Entrar**. Se esquecer a senha, toque em **Esqueci minha senha** e confira o e-mail.
4. Feche e abra o app: a sessão continua ativa. Para sair, vá em **Perfil > Desconectar da conta**.

O selo no topo mostra o estado da sincronização: **Sincronizado**, **Sincronizando**, **Offline** ou **Falha ao sincronizar**.

## 2. Criar um livro

1. Toque em **Novo Livro** (botão central).
2. Escolha as cores da capa, do título e da folha. A capa muda ao vivo.
3. Opcional: em **Buscar no Google Books**, digite um título ou autor e toque em um resultado para preencher título, autor, categoria e páginas.
4. Preencha o título e, se quiser, escreva o primeiro capítulo. Toque em **Salvar Livro na Estante**.

## 3. Importar um arquivo

1. Em **Novo Livro**, abra a aba **Importar** e escolha o formato: PDF, EPUB, Texto Puro ou JSON.
2. Toque em selecionar, escolha o arquivo e confira título e subtítulo.
3. Salve. O texto vira capítulos. PDFs só com imagem geram um aviso e um livro para transcrição.

Livros importados são considerados de terceiros: toda edição fica registrada no **Histórico de Alterações** (menu `⋮` do livro), com a versão anterior e a nova.

## 4. Ler, escrever e anotar

1. Na **Estante**, toque em um livro para ler. O botão **Sumário** abre capítulos e marcadores; as setas ao lado de cada capítulo mudam a ordem.
2. **Editar capítulo** (lápis): altera título e texto. **Escrever novo capítulo** adiciona ao final.
3. **Marca-texto** (pincel): selecione um trecho e escolha grifo em 5 cores, negrito, itálico ou sublinhado.
4. **Marcar página** (fita): dê um título e escolha a cor do pin. Os marcadores ficam na aba *Marcadores* do sumário.
5. **Tamanho do texto** ajusta a fonte; o tema claro ou escuro fica em **Perfil**.

## 5. Câmera e transcrição por IA

1. No editor de capítulo, toque em **Fotografar** e permita o uso da câmera. Se negar, o app explica e você segue escrevendo normalmente; se o sistema bloquear, há o atalho para abrir os ajustes.
2. Com a foto na tela, toque em **Transcrever**: a IA lê a página e coloca o texto no capítulo. Revise antes de salvar.
3. No leitor, o botão **Resumir capítulo com IA** mostra um resumo curto. Se a IA estiver indisponível, aparece a mensagem e o botão **Tentar novamente**.

## 6. Gerenciar os livros

- **Editar Livro** (menu `⋮`): título, subtítulo, categoria e cores.
- **Exportar como TXT** ou **JSON** (menu `⋮`): no celular abre o compartilhamento; no navegador baixa o arquivo.
- **Mover para o Baú**: arquiva sem apagar. No **Baú** é possível restaurar um livro, restaurar todos ou excluir de vez.

## 7. Proteger livros com biometria

1. No menu `⋮` de um livro da estante, toque em **Proteger com biometria** e confirme com a digital, o rosto ou a senha do aparelho.
2. O livro ganha um cadeado na capa. Para abrir, exportar ou remover a proteção, o app pede a biometria de novo.
3. Se o app for para segundo plano enquanto você lê um livro protegido, ele volta para a estante.
4. Sem biometria cadastrada no aparelho, o app explica como cadastrar. Na versão para navegador a proteção não está disponível, e livros protegidos só abrem no celular.

## 8. Roteiro sugerido para a apresentação (5 a 7 minutos)

1. Mostrar o login e criar uma conta nova; reabrir o app e mostrar a sessão preservada.
2. Criar um livro usando a busca do Google Books.
3. Importar um PDF ou EPUB e abrir o Histórico de Alterações depois de editar um capítulo.
4. No leitor: grifar, marcar a página e reordenar capítulos.
5. Fotografar uma página, transcrever com IA e resumir o capítulo; proteger um livro com biometria.
6. Desligar a internet do aparelho: mostrar que o app continua funcionando e que o selo muda para **Offline**; religar e mostrar **Sincronizado**.
7. Apagar os dados do app, entrar de novo e mostrar os livros voltando da nuvem.
8. Mostrar o `firestore.rules`, o `.env.example` (sem chaves) e o `Docs/EstruturaDados.md`.
