import { cleanText } from './clean.js';
import { conserved, remapMarks } from './invariant.js';
import { buildLexicon, repairWords } from './words.js';
import { reflow } from './reflow.js';
import { assemblePages } from './pdfLayout.js';

export { conserved, remapMarks, assemblePages, cleanText, reflow, buildLexicon, repairWords };

export const REBUILD_VERSION = 1;
export const RAW_KEEP_LIMIT = 1_200_000;

const MAX_DOUBTS = 40;

export function rebuildText(raw, { source = 'plain', lex = null } = {}) {
  const original = String(raw || '');
  const report = { version: REBUILD_VERSION, source, steps: {}, doubts: [], invariant: 'ok', fallback: null };
  const cleaned = cleanText(original);
  report.steps.clean = cleaned.changes;
  let text = cleaned.text;
  const baseline = text;

  const tryStage = (name, produce) => {
    try {
      const result = produce(text);
      const check = conserved(baseline, result.text);
      if (!check.ok) {
        report.fallback = report.fallback || name;
        report.invariant = 'fallback';
        report.violation = { stage: name, at: check.at, expected: check.expected, found: check.found };
        return false;
      }
      text = result.text;
      return result;
    } catch {
      report.fallback = report.fallback || name;
      report.invariant = 'fallback';
      return false;
    }
  };

  if (source === 'pdf' || source === 'txt') {
    const stage = tryStage('reflow', (value) => reflow(value, { lex: lex || buildLexicon(value), wrapped: source === 'pdf' ? true : null }));
    if (stage) {
      report.steps.reflow = { joined: stage.stats.joined, hyphens: stage.stats.hyphens, paragraphs: stage.stats.paragraphs, verse: stage.stats.verse, wrapped: stage.stats.wrapped };
      report.doubts.push(...stage.stats.doubts);
    }
  }

  const words = tryStage('words', (value) => repairWords(value, lex || buildLexicon(value)));
  if (words) {
    report.steps.words = words.fixes;
    report.doubts.push(...words.doubts);
  }

  report.doubts = report.doubts.slice(0, MAX_DOUBTS);
  const final = conserved(baseline, text);
  if (!final.ok) {
    text = baseline;
    report.invariant = 'fallback';
    report.fallback = report.fallback || 'final';
  }
  return { content: text.trim(), report };
}

export function rebuildChapters(chapters, { source = 'plain', keepRaw = true } = {}) {
  const lex = buildLexicon(chapters.map((c) => c.content).join('\n\n'));
  const total = chapters.reduce((n, c) => n + c.content.length, 0);
  const store = keepRaw && total <= RAW_KEEP_LIMIT;
  const summary = { version: REBUILD_VERSION, source, chapters: chapters.length, fallbacks: 0, doubts: 0, joined: 0, hyphens: 0, fragments: 0, spacedLetters: 0, rawKept: store };
  const rebuilt = chapters.map((chapter) => {
    const { content, report } = rebuildText(chapter.content, { source, lex });
    if (report.invariant !== 'ok') summary.fallbacks += 1;
    summary.doubts += report.doubts.length;
    summary.joined += report.steps.reflow?.joined || 0;
    summary.hyphens += report.steps.reflow?.hyphens || 0;
    summary.fragments += report.steps.words?.fragments || 0;
    summary.spacedLetters += report.steps.words?.spacedLetters || 0;
    const next = { ...chapter, content: content || chapter.content };
    if (store && next.content !== chapter.content) next.raw = chapter.content;
    return next;
  });
  return { chapters: rebuilt, summary };
}

export function restoreRaw(chapter) {
  if (typeof chapter.raw !== 'string') return chapter;
  const { marks, lost } = remapMarks(chapter.content, chapter.raw, chapter.marks);
  const { raw, ...rest } = chapter;
  return { ...rest, content: raw, marks, lostMarks: lost };
}
