import { foldForCompare } from './clean.js';

export function conserved(before, after) {
  const a = foldForCompare(before);
  const b = foldForCompare(after);
  if (a === b) return { ok: true, before: a.length, after: b.length };
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return {
    ok: false,
    before: a.length,
    after: b.length,
    at: i,
    expected: a.slice(Math.max(0, i - 20), i + 20),
    found: b.slice(Math.max(0, i - 20), i + 20),
  };
}

export function mapOffsets(oldText, newText, offsets) {
  const keep = (char) => /[A-Za-z0-9À-ɏͰ-ϿЀ-ӿ]/.test(char);
  const oldIndex = [];
  let count = 0;
  for (let i = 0; i < oldText.length; i += 1) {
    oldIndex.push(count);
    if (keep(oldText[i])) count += 1;
  }
  oldIndex.push(count);
  const newPositions = [];
  for (let i = 0; i < newText.length; i += 1) if (keep(newText[i])) newPositions.push(i);
  return offsets.map((offset) => {
    const rank = oldIndex[Math.max(0, Math.min(offset, oldText.length))];
    if (rank >= newPositions.length) return newText.length;
    return newPositions[rank];
  });
}

export function remapMarks(oldText, newText, marks) {
  if (!marks?.length) return { marks: marks || [], lost: 0 };
  if (!conserved(oldText, newText).ok) return { marks: marks.filter(() => false), lost: marks.length, reason: 'texto-diferente' };
  const result = [];
  let lost = 0;
  marks.forEach((mark) => {
    const [start, endRaw] = mapOffsets(oldText, newText, [mark.start, mark.end]);
    let end = endRaw;
    if (mark.end > mark.start && end > start) {
      const lastOld = oldText.slice(0, mark.end).search(/[A-Za-z0-9À-ɏͰ-ϿЀ-ӿ][^A-Za-z0-9À-ɏͰ-ϿЀ-ӿ]*$/);
      if (lastOld >= 0) {
        const [lastNew] = mapOffsets(oldText, newText, [lastOld]);
        end = Math.max(start + 1, Math.min(newText.length, lastNew + 1));
      }
    }
    if (end <= start) {
      lost += 1;
      return;
    }
    result.push({ ...mark, start, end, text: newText.slice(start, end) });
  });
  return { marks: result, lost };
}
