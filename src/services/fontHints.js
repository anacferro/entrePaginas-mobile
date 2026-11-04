const MONO = /courier|mono|consolas|typewriter|menlo/i;
const SANS = /arial|helvetica|calibri|verdana|sans|tahoma|segoe|roboto|open ?sans|lato|futura|gothic|grotesk/i;
const SERIF = /times|georgia|garamond|palatino|book|cambria|serif|minion|baskerville|century|caslon|bembo|didot/i;

export function classifyFont(name) {
  if (!name) return null;
  if (MONO.test(name)) return 'mono';
  if (SANS.test(name)) return 'sans';
  if (SERIF.test(name)) return 'serif';
  return null;
}

export function dominantFont(names) {
  const count = {};
  names.forEach((name) => {
    const kind = classifyFont(name);
    if (kind) count[kind] = (count[kind] || 0) + 1;
  });
  const best = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
  return best || null;
}
