const LIGATURES = {
  'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl', 'ﬅ': 'st', 'ﬆ': 'st',
  'Ĳ': 'IJ', 'ĳ': 'ij',
};

const MOJIBAKE = /[ÂÃ][\u0080-¿]|â€[\u0080-¿™œ“”˜]/;

const CP1252_REVERSE = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };

function fixMojibake(text) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const mapped = code < 256 ? code : CP1252_REVERSE[code];
    if (mapped === undefined) return null;
    bytes[i] = mapped;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function cleanText(input) {
  const changes = { softHyphens: 0, invisible: 0, ligatures: 0, mojibake: 0, spaces: 0, separators: 0, controls: 0 };
  let text = String(input || '');

  if (MOJIBAKE.test(text)) {
    const segments = text.split(/(\s+)/);
    let fixedCount = 0;
    const repaired = segments.map((segment) => {
      if (!MOJIBAKE.test(segment)) return segment;
      const fixed = fixMojibake(segment);
      if (fixed && !fixed.includes('�') && fixed.length < segment.length) {
        fixedCount += 1;
        return fixed;
      }
      return segment;
    });
    text = repaired.join('');
    changes.mojibake = fixedCount;
  }

  text = text.replace(/­/g, () => {
    changes.softHyphens += 1;
    return '';
  });
  text = text.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, () => {
    changes.invisible += 1;
    return '';
  });
  text = text.replace(/[\uFB00-\uFB06\u0132\u0133]/g, (char) => {
    changes.ligatures += 1;
    return LIGATURES[char];
  });
  text = text.replace(/[\u2028\u2029\u0085\u000B\u000C]/g, () => {
    changes.separators += 1;
    return '\n';
  });
  text = text.replace(/\r\n?/g, '\n');
  text = text.replace(/[\u0000-\u0008\u000E-\u001F\u007F]/g, () => {
    changes.controls += 1;
    return '';
  });
  text = text.replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
  text = text.replace(/[ \t]{2,}/g, () => {
    changes.spaces += 1;
    return ' ';
  });
  text = text.replace(/ +\n/g, '\n').replace(/\n +/g, '\n');
  return { text: text.normalize('NFC'), changes };
}

export function foldForCompare(text) {
  let out = '';
  for (const char of String(text || '').normalize('NFC')) {
    if (LIGATURES[char]) out += LIGATURES[char];
    else if (/[A-Za-z0-9À-ɏͰ-ϿЀ-ӿ]/.test(char)) out += char;
  }
  return out;
}
