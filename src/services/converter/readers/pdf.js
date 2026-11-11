import { parsePdf } from '../../pdfParser.js';
import { newDoc } from '../model.js';

function countImages(bytes) {
  let raw = '';
  for (let i = 0; i < bytes.length; i += 8192) raw += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return (raw.match(/\/Subtype\s*\/Image\b/g) || []).length;
}

function readable(text) {
  if (text.length < 30) return false;
  const letters = text.match(/[A-Za-zÀ-ÿ]/g)?.length || 0;
  return letters / text.length > 0.55;
}

export function readPdf(bytes) {
  const parsed = parsePdf(bytes);
  const doc = newDoc();
  doc.title = parsed.title || '';
  doc.meta.pages = parsed.pages;
  doc.meta.fonts = parsed.fontHint ? [parsed.fontHint] : [];
  doc.meta.images = countImages(bytes);
  doc.meta.fromPdf = true;

  if (!readable(parsed.text)) {
    doc.meta.scanned = true;
    doc.meta.notes.push('Não foi possível extrair texto confiável deste PDF. Ele deve ser digitalizado (imagens) ou usar fontes protegidas, e o app não faz OCR.');
    return doc;
  }

  parsed.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).forEach((paragraph) => {
    if (/^(cap[ií]tulo|parte)\b/i.test(paragraph) && paragraph.length < 80) doc.blocks.push({ t: 'h', level: 1, text: paragraph });
    else doc.blocks.push({ t: 'p', text: paragraph });
  });

  doc.meta.notes.push('A conversão de PDF depende da extração do texto e pode errar parágrafos, colunas, tabelas, cabeçalhos e rodapés repetidos.');
  if (doc.meta.images) doc.meta.notes.push(`${doc.meta.images} imagem(ns) do PDF não são extraídas: só o texto é convertido.`);
  doc.meta.lossy = true;
  return doc;
}
