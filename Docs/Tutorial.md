# Tutorial de Uso — Entre Páginas

Passo a passo para usar o aplicativo e para apresentá-lo ao vivo, na ordem sugerida.

## 1. Criar a conta e entrar

1. Abra o app e toque em **Continuar com o Google**.
2. Escolha a conta Google. No celular a escolha abre no navegador e volta sozinha para o app; no computador abre uma janela do Google. O primeiro acesso cria sua estante vazia.
3. Se você fechar a janela do Google, o app avisa que o login foi cancelado e você pode tentar de novo.
4. Feche e abra o app: a sessão continua ativa. Para sair, vá em **Perfil > Configurações > Sair da conta**.

O selo no topo mostra o estado da sincronização: **Sincronizado**, **Sincronizando**, **Offline** ou **Falha ao sincronizar**.

## 2. Criar um livro

1. Toque em **Novo Livro** (o **+** central da barra inferior).
2. Escolha as cores da capa, do título e da folha. A capa muda ao vivo.
3. Opcional: em **Buscar no Google Books**, digite um título, autor ou uma letra e toque em um resultado para preencher título, autor, categoria e páginas. A busca também consulta o Project Gutenberg (domínio público): esses livros trazem o texto completo, baixado em segundo plano com a formatação original (negrito e itálico). Em **Catálogo A-Z** você navega por letra e idioma, 30 livros por vez, com rolagem infinita.
4. Preencha o título e, se quiser, escreva o primeiro capítulo. Toque em **Salvar Livro na Estante**.

## 3. Importar um arquivo

1. Em **Novo Livro**, abra a aba **Importar** e escolha o formato: PDF, EPUB, Texto Puro ou JSON.
2. Toque em selecionar, escolha o arquivo e confira título e subtítulo.
3. Salve. O texto vira capítulos. PDFs só com imagem geram um aviso e um livro para transcrição.

Livros importados são considerados de terceiros: toda edição fica registrada no **Histórico de Alterações** (menu `⋮` do livro), com a versão anterior e a nova.

## 4. Ler, escrever e anotar

1. Na **Estante**, toque em um livro para ler; o app reabre na última página lida. O botão **Sumário** abre capítulos e marcadores; as setas ao lado de cada capítulo mudam a ordem.
2. **Editar capítulo** (lápis): altera título e texto. **Escrever novo capítulo** adiciona ao final.
3. **Marca-texto** (pincel): selecione um trecho e escolha grifo em 5 cores, negrito, itálico ou sublinhado.
4. **Marcar página** (fita): dê um título e escolha a cor do pin. Os marcadores ficam na aba *Marcadores* do sumário.
5. **Tamanho do texto** ajusta a fonte; o leitor tem o próprio botão **Claro/Escuro**, independente do tema do app.

## 5. Câmera e transcrição por IA

1. No editor de capítulo, toque em **Fotografar** e permita o uso da câmera. Se negar, o app explica e você segue escrevendo normalmente; se o sistema bloquear, há o atalho para abrir os ajustes.
2. Com a foto na tela, toque em **Transcrever**: a IA lê a página e coloca o texto no capítulo. Revise antes de salvar.
3. No leitor, o botão **Resumir capítulo com IA** mostra um resumo curto. Se a IA estiver indisponível, aparece a mensagem e o botão **Tentar novamente**.

## 6. Gerenciar os livros

- **Editar Livro** (menu `⋮`): título, subtítulo, categoria, etiquetas e cores.
- A busca da Estante também encontra livros pelas etiquetas.
- **Exportar como TXT** ou **JSON** (menu `⋮`): no celular abre o compartilhamento; no navegador baixa o arquivo.
- **Mover para o Baú**: arquiva sem apagar. No **Baú** é possível restaurar um livro, restaurar todos ou excluir de vez.

## 7. Configurações: tema, conta e dados

Abra **Perfil** e toque em **Configurações**.

1. **Aparência:** escolha **Automático** (segue o tema do aparelho), **Claro** ou **Escuro**. A mudança vale para todas as telas e fica salva.
2. **Conta:** mostra o e-mail e tem o botão **Sair da conta**.
3. **Dados:** **Apagar todos os dados** remove todos os livros, capítulos, marcadores e grifos do aparelho e da nuvem, depois de uma confirmação. Se a nuvem não responder, nada é apagado e o app avisa para tentar de novo com internet.

## 8. Proteger livros com biometria

1. No menu `⋮` de um livro da estante, toque em **Proteger com biometria** e confirme com a digital, o rosto ou a senha do aparelho.
2. O livro ganha um cadeado na capa. Para abrir, exportar ou remover a proteção, o app pede a biometria de novo.
3. Se o app for para segundo plano enquanto você lê um livro protegido, ele volta para a estante.
4. Sem biometria cadastrada no aparelho, o app explica como cadastrar. Na versão para navegador a proteção não está disponível, e livros protegidos só abrem no celular.

## 9. Roteiro sugerido para a apresentação (5 a 7 minutos)

1. Mostrar o login com o Google; reabrir o app e mostrar a sessão preservada.
2. Criar um livro usando a busca do Google Books.
3. Importar um PDF ou EPUB e abrir o Histórico de Alterações depois de editar um capítulo.
4. No leitor: grifar, marcar a página e reordenar capítulos.
5. Fotografar uma página, transcrever com IA e resumir o capítulo; proteger um livro com biometria.
6. Desligar a internet do aparelho: mostrar que o app continua funcionando e que o selo muda para **Offline**; religar e mostrar **Sincronizado**.
7. Apagar os dados do app, entrar de novo e mostrar os livros voltando da nuvem.
8. Mostrar o `firestore.rules`, o `.env.example` (sem chaves) e o `Docs/EstruturaDados.md`.
