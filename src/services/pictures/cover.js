import { ai } from '../ai';
import { coverCandidates, guessCover } from './select.js';
import { base64Of } from './store';

const AI_IMAGE_LIMIT = 1.2 * 1024 * 1024;

export async function chooseCover(pictures) {
  const candidates = coverCandidates(pictures);
  if (!candidates.length) return null;

  const sendable = candidates.filter((p) => p.bytes.length <= AI_IMAGE_LIMIT);
  if (ai.isAvailable && sendable.length) {
    try {
      const answer = await ai.pickCover(sendable.map((p) => ({ mime: p.mime, base64: base64Of(p) })));
      if (answer && answer.indice === null) return null;
      const chosen = Number.isInteger(answer?.indice) ? sendable[answer.indice] : null;
      if (chosen && answer.confianca !== 'baixa') return chosen;
    } catch {
      return guessCover(pictures);
    }
  }
  return guessCover(pictures);
}
