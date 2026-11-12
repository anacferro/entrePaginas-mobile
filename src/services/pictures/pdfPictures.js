import { inflate } from 'pako';
import { jpegInfo, encodePng, pngFromRows } from './format.js';

const UNSUPPORTED = /\/(CCITTFaxDecode|CCF|JBIG2Decode|JPXDecode|LZWDecode|LZW|ASCII85Decode|A85|ASCIIHexDecode|AHx|RunLengthDecode|RL)\b/;

function number(text, key) {
  const match = new RegExp(`/${key}\\s+(\\d+)`).exec(text || '');
  return match ? Number(match[1]) : null;
}

function inflated(data) {
  try {
    return inflate(data);
  } catch {
    return null;
  }
}

function exactData(obj) {
  const length = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(obj.dict);
  if (length && Number(length[1]) <= obj.data.length && Number(length[1]) > 0) return obj.data.subarray(0, Number(length[1]));
  let end = obj.data.length;
  if (end && obj.data[end - 1] === 0x0a) end -= 1;
  if (end && obj.data[end - 1] === 0x0d) end -= 1;
  return obj.data.subarray(0, end);
}

function hexBytes(hex) {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function createPictureReader({ objects, dictValue }) {
  const dictOf = (value) => (value?.ref ? objects.get(value.ref)?.dict || '' : value || '');

  function streamBytes(obj) {
    if (!obj?.data) return null;
    if (/\/FlateDecode|\/Fl\b/.test(obj.dict)) return inflated(obj.data);
    return /\/Filter/.test(obj.dict) ? null : obj.data;
  }

  function colorSpace(dict) {
    const raw = dictValue(dict, 'ColorSpace');
    const text = String(dictOf(raw)).trim();
    if (!text) return null;
    if (/^\/?(DeviceGray|CalGray|G)\b/.test(text)) return { comps: 1 };
    if (/^\/?(DeviceRGB|CalRGB|RGB)\b/.test(text)) return { comps: 3 };
    if (/^\/?(DeviceCMYK|CMYK)\b/.test(text)) return { comps: 4 };
    const icc = /\/ICCBased\s+(\d+)\s+\d+\s+R/.exec(text);
    if (icc) {
      const n = number(objects.get(Number(icc[1]))?.dict, 'N');
      return n === 1 || n === 3 || n === 4 ? { comps: n } : null;
    }
    const indexed = /^\[\s*\/(?:Indexed|I)\s+([\s\S]*)\]$/.exec(text);
    if (indexed) {
      const rest = indexed[1].trim();
      const baseMatch = /^(\/\w+|\[[^\]]*\]|\d+\s+\d+\s+R)\s+(\d+)\s+([\s\S]*)$/.exec(rest);
      if (!baseMatch) return null;
      const baseText = baseMatch[1].startsWith('[') || /^\d/.test(baseMatch[1]) ? String(dictOf(baseMatch[1].startsWith('[') ? baseMatch[1] : { ref: Number(baseMatch[1].split(/\s+/)[0]) })) : baseMatch[1];
      const icc2 = /\/ICCBased\s+(\d+)\s+\d+\s+R/.exec(baseText);
      const baseComps = /RGB/.test(baseText) ? 3 : /Gray/.test(baseText) ? 1 : icc2 ? number(objects.get(Number(icc2[1]))?.dict, 'N') : null;
      if (baseComps !== 1 && baseComps !== 3) return null;
      const hival = Number(baseMatch[2]);
      const tail = baseMatch[3].trim();
      let table = null;
      const hex = /^<([0-9a-fA-F\s]*)>/.exec(tail);
      const ref = /^(\d+)\s+\d+\s+R/.exec(tail);
      if (hex) table = hexBytes(hex[1]);
      else if (ref) table = streamBytes(objects.get(Number(ref[1])));
      if (!table || table.length < (hival + 1) * baseComps) return null;
      const palette = new Uint8Array((hival + 1) * 3);
      for (let i = 0; i <= hival; i += 1) {
        for (let c = 0; c < 3; c += 1) palette[i * 3 + c] = baseComps === 3 ? table[i * 3 + c] : table[i];
      }
      return { comps: 1, palette };
    }
    return null;
  }

  function decodeImage(obj) {
    const dict = obj.dict;
    const width = number(dict, 'Width');
    const height = number(dict, 'Height');
    if (!width || !height || !obj.data) return null;
    const data = exactData(obj);
    if (/\/ImageMask\s+true/.test(dict) || UNSUPPORTED.test(dict) || /\/Decode\s*\[/.test(dict)) return null;

    const dct = /\/DCTDecode|\/DCT\b/.test(dict);
    const flate = /\/FlateDecode|\/Fl\b/.test(dict);

    if (dct) {
      const bytes = flate ? inflated(data) : data;
      const info = bytes && jpegInfo(bytes);
      if (!info || info.components === 4) return null;
      return { mime: 'image/jpeg', bytes, width: info.width || width, height: info.height || height };
    }
    if (!flate) return null;

    const space = colorSpace(dict);
    if (!space || space.comps === 4) return null;
    const bitDepth = number(dict, 'BitsPerComponent') || 8;
    if (![1, 2, 4, 8, 16].includes(bitDepth) || (space.palette && bitDepth > 8)) return null;
    const colorType = space.palette ? 3 : space.comps === 3 ? 2 : 0;
    const rowBytes = Math.ceil((width * space.comps * bitDepth) / 8);

    const parms = String(dictOf(dictValue(dict, 'DecodeParms') || dictValue(dict, 'DP')));
    const predictor = number(parms, 'Predictor') || 1;
    if (predictor === 2) return null;

    if (predictor >= 10) {
      if ((number(parms, 'Columns') || 1) !== width || (number(parms, 'Colors') || 1) !== space.comps) return null;
      if (/\/Filter\s*\[/.test(dict)) return null;
      return { mime: 'image/png', bytes: encodePng({ width, height, bitDepth, colorType, idat: data, palette: space.palette }), width, height };
    }

    const rows = inflated(data);
    if (!rows) return null;
    const bytes = pngFromRows({ width, height, bitDepth, colorType, rowBytes, rows, palette: space.palette });
    return bytes ? { mime: 'image/png', bytes, width, height } : null;
  }

  function picturesOfPage(stream, resources, pageIndex) {
    const xobjects = String(dictOf(dictValue(String(dictOf(resources)), 'XObject')));
    if (!xobjects) return [];
    const names = new Map();
    for (const m of xobjects.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g)) names.set(m[1], Number(m[2]));

    const found = [];
    const seen = new Set();
    for (const m of String(stream).matchAll(/\/([^\s/<>[\]()]+)\s+Do\b/g)) {
      const id = names.get(m[1]);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const obj = objects.get(id);
      if (!obj || !/\/Subtype\s*\/Image/.test(obj.dict)) continue;
      const width = number(obj.dict, 'Width');
      const height = number(obj.dict, 'Height');
      if (!width || !height) continue;
      found.push({ id, pageIndex, order: found.length, width, height, obj });
    }
    return found;
  }

  return { picturesOfPage, decodeImage };
}
