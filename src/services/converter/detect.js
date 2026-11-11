import { readZip, ZipError, LIMITS } from './zip.js';

export class ConvertError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const KIND_LABELS = {
  docx: 'Word (DOCX)',
  odt: 'OpenDocument (ODT)',
  rtf: 'Rich Text (RTF)',
  txt: 'Texto puro (TXT)',
  md: 'Markdown (MD)',
  html: 'Página HTML',
  xml: 'XML textual',
  pdf: 'PDF',
};

export const ACCEPTED = ['.docx', '.doc', '.odt', '.rtf', '.txt', '.md', '.markdown', '.html', '.htm', '.xml', '.pdf'];

const CP1252 = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š',
  0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

export function decodeText(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    let out = '';
    for (let i = 0; i < bytes.length; i += 1) {
      const b = bytes[i];
      out += CP1252[b] || String.fromCharCode(b);
    }
    return out;
  }
}

export function extensionOf(name) {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function startsWith(bytes, signature) {
  return signature.every((b, i) => bytes[i] === b);
}

function asciiHas(bytes, needle, limit = 200000) {
  const slice = bytes.subarray(0, Math.min(bytes.length, limit));
  let text = '';
  for (let i = 0; i < slice.length; i += 1) text += slice[i] === 0 ? '' : String.fromCharCode(slice[i]);
  return text.includes(needle);
}

export function detectFile({ name, bytes }) {
  const ext = extensionOf(name);
  const warnings = [];
  if (!bytes || bytes.length === 0) throw new ConvertError('empty', 'O arquivo está vazio.');
  if (bytes.length > LIMITS.maxFileBytes) {
    throw new ConvertError('too-large', `O arquivo tem ${(bytes.length / 1048576).toFixed(1).replace('.', ',')} MB e passa do limite de ${LIMITS.maxFileBytes / 1048576} MB.`);
  }

  let kind = null;

  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    let zip;
    try {
      zip = readZip(bytes);
    } catch (e) {
      if (e instanceof ZipError) throw new ConvertError(e.code, e.message);
      throw e;
    }
    if (zip.has('word/document.xml') && zip.has('[Content_Types].xml')) kind = 'docx';
    else if (zip.has('content.xml') && zip.has('mimetype') && /opendocument\.text/.test(zip.text('mimetype') || '')) kind = 'odt';
    else if (zip.has('META-INF/container.xml') && /epub/.test(zip.text('mimetype') || '')) {
      throw new ConvertError('unsupported', 'Este arquivo já é um EPUB. Use o quadro EPUB da importação para adicioná-lo direto.');
    } else if (zip.has('xl/workbook.xml') || zip.has('ppt/presentation.xml')) {
      throw new ConvertError('unsupported', 'Planilhas e apresentações não podem ser convertidas em livro.');
    } else if (zip.has('content.xml') && zip.has('mimetype')) {
      throw new ConvertError('unsupported', 'Só documentos de texto do OpenDocument (ODT) podem ser convertidos.');
    } else throw new ConvertError('invalid', 'O arquivo compactado não é um documento de texto compatível.');
  } else if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    if (asciiHas(bytes, 'EncryptedPackage') || asciiHas(bytes, 'StrongEncryptionDataSpace')) {
      throw new ConvertError('protected', 'O documento é protegido por senha. Remova a senha no editor e tente de novo.');
    }
    throw new ConvertError(
      'legacy-doc',
      'Este é um DOC antigo (formato binário do Word 97-2003). O app não consegue ler esse formato com segurança. Abra no Word ou no LibreOffice e use "Salvar como" DOCX, ODT ou RTF; depois converta aqui.'
    );
  } else if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) kind = 'pdf';
  else {
    const head = bytes.subarray(0, 4096);
    if (head.includes(0)) {
      if (!(head[0] === 0xff && head[1] === 0xfe) && !(head[0] === 0xfe && head[1] === 0xff)) {
        throw new ConvertError('invalid', 'O conteúdo do arquivo não é texto nem um documento reconhecido. Ele pode estar corrompido.');
      }
    }
    const peek = decodeText(head).replace(/^﻿/, '').trimStart();
    if (/^\{\\rtf/i.test(peek)) kind = 'rtf';
    else if (/^<!doctype html|^<html/i.test(peek) || ['html', 'htm', 'xhtml'].includes(ext)) kind = 'html';
    else if (/^<\?xml/i.test(peek) || ext === 'xml') kind = /<(html|body)\b/i.test(decodeText(bytes.subarray(0, 8192))) ? 'html' : 'xml';
    else if (ext === 'md' || ext === 'markdown') kind = 'md';
    else if (['txt', 'text', ''].includes(ext) || /^[\s\S]*$/.test(peek)) kind = 'txt';
  }

  const expected = { docx: 'docx', odt: 'odt', rtf: 'rtf', pdf: 'pdf' }[kind];
  if (expected && ext && ext !== expected) {
    warnings.push(`A extensão .${ext} não corresponde ao conteúdo real (${KIND_LABELS[kind]}). O conteúdo foi o que valeu.`);
  }
  if ((ext === 'docx' || ext === 'odt' || ext === 'pdf' || ext === 'rtf') && !expected) {
    throw new ConvertError('invalid', `O arquivo tem extensão .${ext}, mas o conteúdo não é desse formato. Ele pode estar corrompido.`);
  }
  return { kind, ext, warnings };
}
