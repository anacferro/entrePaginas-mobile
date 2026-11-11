import { inflate, deflate } from 'pako';

function u32(b, o) {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

export function jpegInfo(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  let adobe = false;
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
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker === 0xee && length >= 12) adobe = true;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      if (marker !== 0xc0 && marker !== 0xc1 && marker !== 0xc2) return null;
      return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8], components: bytes[i + 9], adobe };
    }
    i += 2 + length;
  }
  return null;
}

export function jpegPdfImage(bytes) {
  const info = jpegInfo(bytes);
  if (!info || ![1, 3, 4].includes(info.components) || !info.width || !info.height) return null;
  const space = info.components === 1 ? '/DeviceGray' : info.components === 3 ? '/DeviceRGB' : '/DeviceCMYK';
  const decode = info.components === 4 && info.adobe ? ' /Decode [1 0 1 0 1 0 1 0]' : '';
  return {
    width: info.width,
    height: info.height,
    dict: `/Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} /ColorSpace ${space} /BitsPerComponent 8 /Filter /DCTDecode${decode}`,
    data: bytes,
  };
}

function hex(bytes) {
  let out = '';
  bytes.forEach((b) => {
    out += b.toString(16).padStart(2, '0');
  });
  return out;
}

export function pngPdfImage(bytes) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!sig.every((b, i) => bytes[i] === b)) return null;
  let pos = 8;
  let header = null;
  let palette = null;
  const parts = [];
  while (pos + 12 <= bytes.length) {
    const length = u32(bytes, pos);
    const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    const data = bytes.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') header = { width: u32(data, 0), height: u32(data, 4), depth: data[8], color: data[9], interlace: data[12] };
    else if (type === 'PLTE') palette = data;
    else if (type === 'IDAT') parts.push(data);
    else if (type === 'IEND') break;
    pos += 12 + length;
  }
  if (!header || !parts.length || header.interlace) return null;
  const { width, height, depth, color } = header;
  const idat = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  parts.forEach((p) => {
    idat.set(p, at);
    at += p.length;
  });

  if ((color === 0 || color === 2 || color === 3) && [1, 2, 4, 8].includes(depth) && !(color === 2 && depth !== 8)) {
    const colors = color === 2 ? 3 : 1;
    let space = color === 2 ? '/DeviceRGB' : '/DeviceGray';
    if (color === 3) {
      if (!palette) return null;
      space = `[/Indexed /DeviceRGB ${palette.length / 3 - 1} <${hex(palette)}>]`;
    }
    return {
      width,
      height,
      dict: `/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace ${space} /BitsPerComponent ${depth} /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors ${colors} /BitsPerComponent ${depth} /Columns ${width} >>`,
      data: idat,
    };
  }

  if ((color === 4 || color === 6) && depth === 8) {
    let raw;
    try {
      raw = inflate(idat);
    } catch {
      return null;
    }
    const bpp = color === 4 ? 2 : 4;
    const stride = width * bpp;
    if (raw.length < (stride + 1) * height) return null;
    const rows = new Uint8Array(stride * height);
    for (let y = 0; y < height; y += 1) {
      const filter = raw[y * (stride + 1)];
      const src = y * (stride + 1) + 1;
      for (let x = 0; x < stride; x += 1) {
        const a = x >= bpp ? rows[y * stride + x - bpp] : 0;
        const b = y > 0 ? rows[(y - 1) * stride + x] : 0;
        const c = x >= bpp && y > 0 ? rows[(y - 1) * stride + x - bpp] : 0;
        let v = raw[src + x];
        if (filter === 1) v += a;
        else if (filter === 2) v += b;
        else if (filter === 3) v += Math.floor((a + b) / 2);
        else if (filter === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        rows[y * stride + x] = v & 255;
      }
    }
    const channels = color === 4 ? 1 : 3;
    const flat = new Uint8Array(width * height * channels);
    for (let i = 0; i < width * height; i += 1) {
      const alpha = rows[i * bpp + channels] / 255;
      for (let ch = 0; ch < channels; ch += 1) flat[i * channels + ch] = Math.round(rows[i * bpp + ch] * alpha + 255 * (1 - alpha));
    }
    return {
      width,
      height,
      dict: `/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace ${channels === 1 ? '/DeviceGray' : '/DeviceRGB'} /BitsPerComponent 8 /Filter /FlateDecode`,
      data: deflate(flat),
    };
  }
  return null;
}

export function pdfImageFor(mime, bytes) {
  if (mime === 'image/jpeg') return jpegPdfImage(bytes);
  if (mime === 'image/png') return pngPdfImage(bytes);
  return null;
}
