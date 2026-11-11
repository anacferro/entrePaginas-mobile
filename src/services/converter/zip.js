import { inflateRaw, deflateRaw } from 'pako';

export const LIMITS = {
  maxFileBytes: 30 * 1024 * 1024,
  maxEntries: 3000,
  maxUncompressedBytes: 150 * 1024 * 1024,
  maxEntryBytes: 60 * 1024 * 1024,
  maxRatio: 1000,
};

const decoder = new TextDecoder('utf-8');
const encoder = new TextEncoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export class ZipError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function readZip(bytes, limits = LIMITS) {
  if (bytes.length < 22) throw new ZipError('corrupt', 'O arquivo está incompleto ou corrompido.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  const floor = Math.max(0, bytes.length - 22 - 65535);
  while (end >= floor && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  if (end < floor) throw new ZipError('corrupt', 'O arquivo está incompleto ou corrompido.');

  const count = view.getUint16(end + 10, true);
  if (count > limits.maxEntries) throw new ZipError('too-large', 'O arquivo tem itens demais para ser processado com segurança.');
  let offset = view.getUint32(end + 16, true);
  const entries = new Map();
  let total = 0;

  for (let i = 0; i < count; i += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) {
      throw new ZipError('corrupt', 'O arquivo está incompleto ou corrompido.');
    }
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (flags & 1) throw new ZipError('protected', 'O arquivo é protegido por senha e não pode ser convertido.');
    total += size;
    if (size > limits.maxEntryBytes || total > limits.maxUncompressedBytes) {
      throw new ZipError('too-large', 'O conteúdo do arquivo é grande demais para ser processado com segurança.');
    }
    if (compressedSize > 0 && size / compressedSize > limits.maxRatio && size > 1024 * 1024) {
      throw new ZipError('unsafe', 'O arquivo tem uma taxa de compactação suspeita e foi recusado por segurança.');
    }
    entries.set(name, { method, crc, compressedSize, size, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  function raw(name) {
    const entry = entries.get(name);
    if (!entry) return null;
    if (entry.localOffset + 30 > bytes.length || view.getUint32(entry.localOffset, true) !== 0x04034b50) {
      throw new ZipError('corrupt', 'O arquivo está incompleto ou corrompido.');
    }
    const start = entry.localOffset + 30 + view.getUint16(entry.localOffset + 26, true) + view.getUint16(entry.localOffset + 28, true);
    return { entry, data: bytes.subarray(start, start + entry.compressedSize) };
  }

  function bytesOf(name) {
    const found = raw(name);
    if (!found) return null;
    const { entry, data } = found;
    let out;
    if (entry.method === 0) out = data.slice();
    else if (entry.method === 8) {
      try {
        out = inflateRaw(data);
      } catch {
        throw new ZipError('corrupt', 'O arquivo está corrompido e não pôde ser descompactado.');
      }
    } else throw new ZipError('unsupported', 'O arquivo usa um tipo de compactação não suportado.');
    if (out.length !== entry.size) throw new ZipError('corrupt', 'O arquivo está corrompido (tamanho inesperado).');
    return out;
  }

  return {
    names: () => [...entries.keys()],
    has: (name) => entries.has(name),
    bytes: bytesOf,
    text(name) {
      const data = bytesOf(name);
      return data ? decoder.decode(data) : null;
    },
  };
}

function toBytes(data) {
  return typeof data === 'string' ? encoder.encode(data) : data;
}

export function writeZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const u16 = (v) => [v & 255, (v >>> 8) & 255];
  const u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];

  files.forEach(({ name, data, store }) => {
    const raw = toBytes(data);
    const nameBytes = encoder.encode(name);
    const crc = crc32(raw);
    const packed = store || raw.length < 64 ? raw : deflateRaw(raw);
    const method = packed === raw ? 0 : 8;
    const local = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, ...u16(20), ...u16(0x0800), ...u16(method), ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(packed.length), ...u32(raw.length), ...u16(nameBytes.length), ...u16(0),
    ]);
    chunks.push(local, nameBytes, packed);
    central.push({ nameBytes, crc, method, packedLength: packed.length, rawLength: raw.length, offset });
    offset += local.length + nameBytes.length + packed.length;
  });

  const centralStart = offset;
  central.forEach((c) => {
    const header = new Uint8Array([
      0x50, 0x4b, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(c.method), ...u16(0), ...u16(0x21),
      ...u32(c.crc), ...u32(c.packedLength), ...u32(c.rawLength), ...u16(c.nameBytes.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(c.offset),
    ]);
    chunks.push(header, c.nameBytes);
    offset += header.length + c.nameBytes.length;
  });

  const end = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length),
    ...u32(offset - centralStart), ...u32(centralStart), ...u16(0),
  ]);
  chunks.push(end);

  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  chunks.forEach((c) => {
    out.set(c, pos);
    pos += c.length;
  });
  return out;
}
