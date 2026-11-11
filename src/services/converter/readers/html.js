import { newDoc, decodeEntities, BOLD_OPEN, BOLD_CLOSE, ITALIC_OPEN, ITALIC_CLOSE, stripMarks } from '../model.js';

const BLOCK = new Set(['p', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'figure', 'figcaption', 'ul', 'ol', 'dl', 'dt', 'dd', 'hr', 'address', 'center']);

function decodeDataUri(src) {
  const m = src.match(/^data:(image\/(?:png|jpeg|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!m) return null;
  try {
    const bin = atob(m[2].replace(/\s/g, ''));
    const data = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) data[i] = bin.charCodeAt(i);
    return { data, mime: m[1].toLowerCase() };
  } catch {
    return null;
  }
}

export function readHtml(source) {
  const doc = newDoc();
  const clean = source
    .replace(/^﻿/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|iframe|object|embed|template|svg|canvas)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed)\b[^>]*\/?>/gi, '');

  doc.title = decodeEntities(clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
  doc.author = decodeEntities(clean.match(/<meta[^>]+name=["']author["'][^>]*content=["']([^"']*)["']/i)?.[1] || '').trim();
  doc.language = (clean.match(/<html[^>]*\blang=["']([a-z]{2})/i)?.[1] || 'pt').toLowerCase();
  const body = clean.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || clean.replace(/<head[\s\S]*?<\/head>/i, '');
  doc.meta.pagesEstimated = true;

  let text = '';
  let kind = 'p';
  let level = 0;
  let quote = 0;
  let pre = false;
  const lists = [];
  let table = null;
  let row = null;
  let cell = null;
  let dropped = 0;

  const flush = () => {
    const value = pre ? text.replace(/^\n+|\n+$/g, '') : text.replace(/[ \t\n\r ]+/g, ' ').replace(/\u0002 \u0001/g, ' ').trim();
    const plain = stripMarks(value).trim();
    text = '';
    if (!plain) return;
    if (cell !== null) {
      cell += `${cell ? ' ' : ''}${value}`;
      return;
    }
    if (kind === 'h') doc.blocks.push({ t: 'h', level, text: plain.replace(/\s+/g, ' ') });
    else if (kind === 'li') doc.blocks.push({ t: 'li', text: value, ordered: lists[lists.length - 1] === 'ol' });
    else if (pre) doc.blocks.push({ t: 'pre', text: value });
    else if (quote > 0) doc.blocks.push({ t: 'quote', text: value });
    else doc.blocks.push({ t: 'p', text: value });
  };

  body.split(/(<[^>]+>)/).forEach((token) => {
    if (!token) return;
    if (token[0] !== '<') {
      text += pre ? decodeEntities(token) : decodeEntities(token.replace(/[ \t\n\r]+/g, ' '));
      return;
    }
    const m = token.match(/^<(\/?)\s*([a-z][a-z0-9]*)/i);
    if (!m) return;
    const closing = Boolean(m[1]);
    const name = m[2].toLowerCase();

    if (/^h[1-6]$/.test(name)) {
      flush();
      kind = closing ? 'p' : 'h';
      level = Number(name[1]);
      if (closing) {
        kind = 'h';
        flush();
        kind = 'p';
      }
    } else if (name === 'b' || name === 'strong') {
      if (kind !== 'h') text += closing ? BOLD_CLOSE : BOLD_OPEN;
    } else if (name === 'i' || name === 'em' || name === 'cite') {
      if (kind !== 'h') text += closing ? ITALIC_CLOSE : ITALIC_OPEN;
    } else if (name === 'br') {
      text += '\n';
    } else if (name === 'pre') {
      flush();
      pre = !closing;
    } else if (name === 'blockquote') {
      flush();
      quote += closing ? -1 : 1;
      if (quote < 0) quote = 0;
    } else if (name === 'ul' || name === 'ol') {
      flush();
      if (closing) lists.pop();
      else lists.push(name);
    } else if (name === 'li') {
      flush();
      kind = closing ? 'p' : 'li';
      if (closing) {
        kind = 'li';
        flush();
        kind = 'p';
      }
    } else if (name === 'table') {
      flush();
      if (closing) {
        if (table?.length) doc.blocks.push({ t: 'table', rows: table });
        table = null;
      } else table = [];
    } else if (name === 'tr') {
      if (closing) {
        if (row && table) table.push(row);
        row = null;
      } else row = [];
    } else if (name === 'td' || name === 'th') {
      if (closing) {
        flush();
        if (row && cell !== null) row.push(cell);
        cell = null;
      } else {
        flush();
        cell = '';
      }
    } else if (name === 'img' && !closing) {
      flush();
      const src = token.match(/\bsrc=["']([^"']+)["']/i)?.[1] || '';
      const alt = decodeEntities(token.match(/\balt=["']([^"']*)["']/i)?.[1] || '').trim();
      const decoded = decodeDataUri(src);
      if (!decoded) dropped += 1;
      doc.blocks.push({ t: 'img', alt, data: decoded?.data || null, mime: decoded?.mime || null });
    } else if (BLOCK.has(name)) {
      flush();
    }
  });
  flush();

  if (dropped) doc.meta.notes.push(`${dropped} imagem(ns) apontam para arquivos externos ou da internet e não foram baixadas (por segurança): ficaram como "[Imagem]".`);
  const h1 = doc.blocks.filter((b) => b.t === 'h' && b.level === 1);
  if (!doc.title && h1.length === 1) doc.title = stripMarks(h1[0].text);
  return doc;
}
