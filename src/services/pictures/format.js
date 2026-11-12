import { deflate } from 'pako';
import { crc32 } from '../converter/zip.js';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export function mimeOf(bytes) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes.length > 8 && PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return 'image/png';
  if (bytes.length > 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  return null;
}

export function jpegInfo(bytes) {
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {
        height: (bytes[i + 5] << 8) | bytes[i + 6],
        width: (bytes[i + 7] << 8) | bytes[i + 8],
        components: bytes[i + 9],
      };
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return null;
}

export function imageSize(bytes) {
  const mime = mimeOf(bytes);
  if (mime === 'image/jpeg') {
    const info = jpegInfo(bytes);
    return info ? { mime, width: info.width, height: info.height, components: info.components } : null;
  }
  if (mime === 'image/png') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { mime, width: view.getUint32(16), height: view.getUint32(20), components: 3 };
  }
  if (mime === 'image/gif') {
    return { mime, width: bytes[6] | (bytes[7] << 8), height: bytes[8] | (bytes[9] << 8), components: 3 };
  }
  return null;
}

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function encodePng({ width, height, bitDepth, colorType, idat, palette }) {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = bitDepth;
  header[9] = colorType;
  const parts = [Uint8Array.from(PNG_SIGNATURE), chunk('IHDR', header)];
  if (palette) parts.push(chunk('PLTE', palette));
  parts.push(chunk('IDAT', idat), chunk('IEND', new Uint8Array(0)));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  parts.forEach((p) => {
    out.set(p, at);
    at += p.length;
  });
  return out;
}

export function pngFromRows({ width, height, bitDepth, colorType, rowBytes, rows, palette }) {
  if (rows.length < rowBytes * height) return null;
  const filtered = new Uint8Array((rowBytes + 1) * height);
  for (let y = 0; y < height; y += 1) {
    filtered.set(rows.subarray(y * rowBytes, (y + 1) * rowBytes), y * (rowBytes + 1) + 1);
  }
  return encodePng({ width, height, bitDepth, colorType, palette, idat: deflate(filtered) });
}
