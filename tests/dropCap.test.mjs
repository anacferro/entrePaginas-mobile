import test from 'node:test';
import assert from 'node:assert/strict';
import { assemblePages } from '../src/services/textRebuild/pdfLayout.js';

const line = (text, y, size = 12, x = 100) => ({ text, y, size, x });

function page(lines) {
  return { lines, height: 800 };
}

test('layout: letra capitular volta para a palavra e as linhas recuadas continuam no mesmo paragrafo', () => {
  const body = [
    page([line('PRIMEIRO', 700, 24), line('A', 660, 48), line('TITULO LONGO', 640, 24), line('lice ja estava cansada de ficar sentada', 600, 12, 140), line('no banco sem nada para fazer. Por uma', 585, 12, 140), line('ou duas vezes ela xeretou o livro que', 570, 12, 140), line('a irma lia a seu lado, mas nele nao havia nada.', 555, 12, 100)]),
    page([line('SEGUNDO', 700, 24), line('Texto de outro capitulo comeca aqui com palavras.', 650, 12), line('E segue na linha seguinte do mesmo paragrafo.', 635, 12), line('TERCEIRO', 500, 24), line('Mais texto de corpo para completar a pagina.', 460, 12)]),
  ];
  const { text } = assemblePages(body);
  assert.match(text, /Alice ja estava cansada de ficar sentada\nno banco sem nada para fazer\. Por uma\nou duas vezes ela xeretou o livro que\na irma lia/);
  assert.match(text, /# PRIMEIRO\n\n# TITULO LONGO|# PRIMEIRO TITULO LONGO/);
  assert.ok(!/\nA\n/.test(text));
});

test('layout: versos ficam juntos por estrofe, mesmo com eixo y invertido', () => {
  const verses = ['Vamos nos na tarde dourada', 'Cair suavemente;', 'Bracinhos remando sem arte', 'Levam a proa a frente,', 'Maozinhas apontam o norte,', 'Pretensiosamente.'];
  const second = ['Oh, Trio terrivel! Bem na hora', 'Da vadiagem boa,', 'Elas imploram por um conto', 'Uma historinha a toa!'];
  const prose = Array.from({ length: 6 }, (_, i) => line('Linha de prosa bem comprida que ocupa a largura toda da pagina inteira numero ' + i, 0, 12));
  const lines = [...prose, ...verses.map((t, i) => line(t, 0, 12)), ...second.map((t, i) => line(t, 0, 12)), ...prose];
  const ys = [];
  let y = 100;
  lines.forEach((l, i) => {
    if (i === prose.length + verses.length) y += 36;
    ys.push(y);
    y += 15;
  });
  const flipped = lines.map((l, i) => ({ ...l, y: ys[i] }));
  const { text } = assemblePages([{ lines: flipped, height: 800 }]);
  assert.match(text, /Vamos nos na tarde dourada\nCair suavemente;\nBracinhos remando sem arte\nLevam a proa a frente,\nMaozinhas apontam o norte,\nPretensiosamente\.\n\nOh, Trio terrivel! Bem na hora\nDa vadiagem boa,/);
});

test('layout: pedacos da mesma linha em blocos separados voltam a ser uma linha so', () => {
  const rows = [
    { text: 'O rotulo dizia ', x: 10, y: 700, size: 12, end: 100 },
    { text: 'geleia de laranja', x: 100, y: 700, size: 12, end: 200 },
    { text: '; contudo estava vazio.', x: 200, y: 700, size: 12, end: 320 },
    { text: 'Outra linha de texto qualquer aqui.', x: 10, y: 685, size: 12, end: 200 },
  ];
  const { text } = assemblePages([{ lines: rows, height: 800 }]);
  assert.match(text, /O rotulo dizia geleia de laranja; contudo estava vazio\./);
});
