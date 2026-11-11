import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { rebuildText, rebuildChapters, restoreRaw, conserved, remapMarks, cleanText, reflow, buildLexicon, repairWords, assemblePages } from '../src/services/textRebuild/index.js';
import { parsePdf } from '../src/services/pdfParser.js';
import { parseEpub } from '../src/services/epubParser.js';
import { buildPdf } from '../src/services/converter/writers/pdf.js';
import { newDoc } from '../src/services/converter/model.js';

const fixture = (name) => new URL(`./fixtures/${name}`, import.meta.url);
const txt = fs.readFileSync(fixture('dom-casmurro.txt'), 'utf8');

test('limpeza: mojibake, ligaduras, hifen suave e invisiveis', () => {
  const broken = 'Ã©poca ﬁnal ﬂuxo des­espero zero​width coraÃ§Ã£o';
  const { text, changes } = cleanText(broken);
  assert.equal(text, 'época final fluxo desespero zerowidth coração');
  assert.ok(changes.mojibake >= 1 && changes.ligatures === 2 && changes.softHyphens === 1 && changes.invisible === 1);
  assert.equal(cleanText('texto limpo e correto, acentuação já certa: ação').text, 'texto limpo e correto, acentuação já certa: ação');
});

test('invariante detecta qualquer letra alterada e ignora espacos e hifens de quebra', () => {
  assert.ok(conserved('uma pala-\nvra  e\n\ntexto', 'uma palavra e texto').ok);
  assert.equal(conserved('texto original', 'texto originai').ok, false);
  assert.equal(conserved('abc def', 'abc de').ok, false);
});

test('texto puro real com quebra em largura fixa vira paragrafos continuos sem perder letras', () => {
  const { content, report } = rebuildText(txt, { source: 'txt' });
  assert.equal(report.invariant, 'ok');
  assert.ok(conserved(txt, content).ok);
  const paragraphs = content.split(/\n\n/);
  const wrapped = paragraphs.filter((p) => p.length > 200 && /\n/.test(p));
  assert.equal(wrapped.length, 0);
  assert.ok(report.steps.reflow.joined > 150);
  assert.ok(paragraphs.some((p) => p.length > 400));
  assert.ok(content.length < txt.length);
});

test('dialogos continuam em paragrafos separados e titulos nao sao colados ao texto', () => {
  const source = 'CAPITULO I\n\nDO TITULO\n\nAbri a porta e perguntei se alguem estava em casa naquela\nhora tardia. Ninguem respondeu logo.\n— Quem e? disse uma voz\nvinda do fundo da sala.\n— Sou eu, respondi com a\nvoz mais firme que pude.\nFechei a porta.';
  const { content } = rebuildText(source, { source: 'txt' });
  const parts = content.split('\n\n');
  assert.ok(parts.includes('CAPITULO I'));
  assert.ok(parts.some((p) => p.startsWith('— Quem e? disse uma voz vinda do fundo da sala.')));
  assert.ok(parts.some((p) => p.startsWith('— Sou eu, respondi com a voz mais firme que pude.')));
  assert.ok(conserved(source, content).ok);
});

test('poema e preservado com as quebras de verso e registrado como duvida', () => {
  const poem = 'Tenho em mim um mar de calma\nNao sei de onde ele veio\nTranquilo como uma alma\nQue repousa sem receio\nE o vento passa sem pressa\nLevando o que ja nao presta\nE o dia segue depressa\nNuma tarde quase em festa';
  const prose = 'Esta e uma longa linha de prosa escrita pelo autor para mostrar o comprimento de uma\nlinha regular em um arquivo de texto com quebra rigida na largura fixa de oitenta\ncolunas, o que permite medir a largura tipica do texto antes de decidir o que fazer.\nO paragrafo segue por mais algumas palavras ate chegar ao seu ponto final natural.';
  const { content, report } = rebuildText(`${prose}\n\n${poem}\n\n${prose}`, { source: 'txt' });
  assert.ok(content.includes(poem));
  assert.ok(report.doubts.some((d) => d.kind === 'verso'));
});

test('hifenizacao de fim de linha: junta quando a palavra existe e preserva compostos', () => {
  const book = 'O guarda-chuva ficou na porta. Outro guarda-chuva apareceu. Ele sentiu desespero. O desespero cresceu.\n\nNa varanda o guarda-\nchuva secava e o seu desespe-\nro ia passando devagar sem que ninguem notasse o fim do dia.';
  const { content } = rebuildText(book, { source: 'txt' });
  assert.ok(content.includes('guarda-chuva secava'));
  assert.ok(content.includes('seu desespero ia'));
  assert.ok(conserved(book, content).ok);
});

test('palavras fragmentadas: junta so com evidencia e preserva pares ambiguos', () => {
  const lex = buildLexicon('Havia desespero e historia. O desespero e a historia voltaram. Alice chegou. de mais por que a gente agente demais porque afinal');
  const fixed = repairWords('Era puro desespe ro e a histor ia de Alice.', lex);
  assert.equal(fixed.text, 'Era puro desespero e a historia de Alice.');
  const ambiguous = repairWords('Comeu de mais, perguntou por que, e a gente foi.', lex);
  assert.equal(ambiguous.text, 'Comeu de mais, perguntou por que, e a gente foi.');
  assert.ok(ambiguous.doubts.length >= 1);
  const spaced = repairWords('E ela disse: A l i c e voltou.', lex);
  assert.equal(spaced.text, 'E ela disse: Alice voltou.');
  const unknown = repairWords('Veja X y z w ao lado.', lex);
  assert.equal(unknown.text, 'Veja X y z w ao lado.');
  assert.ok(unknown.doubts.length === 1);
  assert.equal(repairWords('Da viagem de Macunaima voltou', lex).text, 'Da viagem de Macunaima voltou');
});

test('nome proprio ou palavra fora do dicionario nunca e alterada', () => {
  const source = 'Fulano Beltrano e Sicrano de Tal chegaram a Pindorama com o neologismo xablau na mochila.';
  const { content } = rebuildText(source, { source: 'plain' });
  assert.equal(content, source);
});

test('EPUB real: sem quebras rigidas dentro dos paragrafos e texto conservado', () => {
  const bytes = new Uint8Array(fs.readFileSync(fixture('dom-casmurro.epub')));
  const parsed = parseEpub(bytes);
  const { chapters, summary } = rebuildChapters(parsed.chapters, { source: 'epub' });
  assert.equal(summary.fallbacks, 0);
  assert.ok(chapters.length >= 5);
  chapters.forEach((chapter, i) => {
    assert.ok(conserved(parsed.chapters[i].content, chapter.content).ok);
    const inner = chapter.content.split(/\n\n/).filter((p) => /\n/.test(p) && p.length > 300);
    assert.equal(inner.length, 0);
  });
});

test('PDF com texto posicionado: cabecalho, rodape e numero de pagina saem; paragrafos nao viram linhas', () => {
  const doc = newDoc();
  doc.title = 'Livro de teste';
  doc.blocks.push({ t: 'h', level: 1, text: 'Capitulo I' });
  const para = (n) => `Paragrafo ${n}. ${'A historia seguia pelo caminho comprido, com muitas palavras seguidas para ocupar varias linhas na pagina. '.repeat(6)}`.trim();
  for (let i = 1; i <= 14; i += 1) doc.blocks.push({ t: 'p', text: para(i) });
  const out = buildPdf(doc, { header: true, pageNumbers: true, includeToc: false });
  const parsed = parsePdf(out.bytes);
  assert.ok(parsed.rebuild.layout);
  const paragraphs = parsed.text.split(/\n\n/);
  const real = paragraphs.filter((p) => /^Paragrafo \d+\./.test(p));
  assert.equal(real.length, 14);
  real.forEach((p) => assert.ok(!/\n/.test(p)));
  assert.ok(parsed.rebuild.removed['numero-de-pagina'] >= 2);
  assert.ok(!/\bLivro de teste\b[\s\S]*\bLivro de teste\b[\s\S]*\bLivro de teste\b/.test(parsed.text));
});

test('assemblePages: recuo, intervalo vertical e paragrafo que atravessa a pagina', () => {
  const line = (y, text, x = 50) => ({ x, y, size: 12, text });
  const pages = [
    { height: 800, lines: [line(700, 'Primeira linha do paragrafo um que continua', 50), line(686, 'na linha seguinte e termina aqui mesmo.'), line(672, 'Segundo paragrafo com recuo comecando agora', 62), line(658, 'e que atravessa a pagina sem ponto final')] },
    { height: 800, lines: [line(700, 'e continua na pagina seguinte ate o fim.'), line(686, 'Terceiro paragrafo com recuo na pagina', 62), line(672, 'dois e seu final.')] },
  ];
  const { text } = assemblePages(pages);
  const parts = text.split('\n\n');
  assert.equal(parts.length, 3);
  assert.ok(parts[1].includes('sem ponto final\ne continua na pagina seguinte'));
});

test('migracao de marcacoes: o trecho marcado continua o mesmo depois da reconstrucao', () => {
  const before = 'A casa antiga ficava na\nrua de Matacavallos e tinha\numa varanda ao fundo.\n\nOutra frase vem depois.';
  const { content } = rebuildText(before, { source: 'txt' });
  const start = before.indexOf('Matacavallos');
  const marks = [{ id: 'm1', type: 'highlight', color: '#FFE680', start, end: start + 'Matacavallos e tinha'.length, text: 'Matacavallos e tinha' }];
  const moved = remapMarks(before, content, marks);
  assert.equal(moved.lost, 0);
  assert.equal(moved.marks[0].text.replace(/\s+/g, ' '), 'Matacavallos e tinha');
  assert.ok(content.slice(moved.marks[0].start, moved.marks[0].end).startsWith('Matacavallos'));
  const bad = remapMarks(before, 'texto totalmente diferente', marks);
  assert.equal(bad.lost, 1);
});

test('texto original guardado e restauravel sem perder marcacoes', () => {
  const chapters = [{ id: 'c1', title: 'Um', content: txt.slice(0, 3000), marks: [] }];
  const { chapters: rebuilt, summary } = rebuildChapters(chapters, { source: 'txt' });
  assert.equal(summary.rawKept, true);
  assert.equal(rebuilt[0].raw, chapters[0].content);
  const at = rebuilt[0].content.indexOf('Matacavallos');
  const withMark = { ...rebuilt[0], marks: at >= 0 ? [{ id: 'm', type: 'highlight', color: null, start: at, end: at + 12, text: 'Matacavallos' }] : [] };
  const restored = restoreRaw(withMark);
  assert.equal(restored.content, chapters[0].content);
  assert.equal(restored.raw, undefined);
  if (withMark.marks.length) assert.ok(restored.content.slice(restored.marks[0].start, restored.marks[0].end).startsWith('Matacavallos'));
});

test('livro grande: processamento rapido e invariante mantida', () => {
  const big = Array.from({ length: 40 }, () => txt).join('\n\n');
  const t0 = Date.now();
  const { content, report } = rebuildText(big, { source: 'txt' });
  const ms = Date.now() - t0;
  assert.equal(report.invariant, 'ok');
  assert.ok(conserved(big, content).ok);
  assert.ok(ms < 6000, `levou ${ms} ms para ${big.length} caracteres`);
});

test('reflow sem evidencia de quebra rigida nao junta linhas', () => {
  const lines = 'Linha curta um\nOutra linha\nMais uma\nE fim';
  const { text, stats } = reflow(lines, { lex: null });
  assert.equal(stats.wrapped, false);
  assert.equal(text, lines.split('\n').join('\n\n'));
});
