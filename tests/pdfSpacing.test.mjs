import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePdf } from '../src/services/pdfParser.js';

const latin = (text) => Uint8Array.from(text, (c) => c.charCodeAt(0));

function pdfWithContent(content, widths) {
  const parts = [
    '%PDF-1.4\n',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj\n',
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj\n`,
    `5 0 obj << /Type /Font /Subtype /TrueType /BaseFont /Teste /FirstChar 32 /LastChar 126 /Widths [${widths.join(' ')}] >> endobj\n`,
    '%%EOF',
  ];
  return latin(parts.join(''));
}

const widths = Array.from({ length: 95 }, () => 500);

function textOf(content) {
  const { text } = parsePdf(pdfWithContent(content, widths), { rebuild: false });
  return text;
}

test('pdf: partes da mesma palavra em posicoes consecutivas nao ganham espaco', () => {
  const content = ['BT /F1 10 Tf', '1 0 0 1 100 700 Tm (aventur) Tj', '1 0 0 1 135 700 Tm (as) Tj', '1 0 0 1 150 700 Tm (de) Tj', 'ET'].join('\n');
  assert.match(textOf(content), /aventuras de/);
});

test('pdf: lacuna real entre palavras continua virando espaco', () => {
  const content = ['BT /F1 10 Tf', '1 0 0 1 100 700 Tm (uma) Tj', '1 0 0 1 130 700 Tm (menina) Tj', 'ET'].join('\n');
  assert.match(textOf(content), /uma menina/);
});
