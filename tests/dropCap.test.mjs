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
