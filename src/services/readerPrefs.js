import { READER_THEMES } from '../theme/readerThemes';

export const READER_LIMITS = {
  fontSize: { min: 14, max: 30 },
  lineHeight: { min: 1.3, max: 2.2 },
  margin: { min: 8, max: 48 },
  dim: { min: 0, max: 0.5 },
};

export const WIDTHS = [
  { id: 'estreita', label: 'Estreita', max: 520 },
  { id: 'media', label: 'Média', max: 680 },
  { id: 'larga', label: 'Larga', max: 860 },
  { id: 'total', label: 'Total', max: null },
];

export const PARAGRAPH_GAPS = [
  { id: 'compacto', label: 'Compacto', em: 0.25 },
  { id: 'normal', label: 'Normal', em: 0.8 },
  { id: 'amplo', label: 'Amplo', em: 1.5 },
];

export const TURN_CHOICES = [
  { id: 'slide', label: 'Deslizar' },
  { id: 'curl', label: 'Folha' },
  { id: 'simple', label: 'Simples' },
];

export const FONT_CHOICES = [
  { id: 'livro', label: 'Do livro' },
  { id: 'serif', label: 'Serifada' },
  { id: 'sans', label: 'Sem serifa' },
  { id: 'mono', label: 'Máquina' },
];

export const DEFAULT_READER_PREFS = {
  theme: 'auto',
  fontFamily: 'livro',
  fontSize: 17,
  lineHeight: 1.7,
  paragraphGap: 'normal',
  width: 'media',
  align: 'justify',
  indent: true,
  turn: 'slide',
  margin: 22,
  dim: 0,
  keepAwake: false,
  autoHide: false,
};

const clamp = (value, { min, max }, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

export function normalizePrefs(raw) {
  const d = DEFAULT_READER_PREFS;
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    theme: pick(r.theme, ['auto', ...READER_THEMES.map((t) => t.id)], d.theme),
    fontFamily: pick(r.fontFamily, FONT_CHOICES.map((f) => f.id), d.fontFamily),
    fontSize: Math.round(clamp(r.fontSize, READER_LIMITS.fontSize, d.fontSize)),
    lineHeight: Math.round(clamp(r.lineHeight, READER_LIMITS.lineHeight, d.lineHeight) * 10) / 10,
    paragraphGap: pick(r.paragraphGap, PARAGRAPH_GAPS.map((p) => p.id), d.paragraphGap),
    width: pick(r.width, WIDTHS.map((w) => w.id), d.width),
    align: pick(r.align, ['left', 'justify'], d.align),
    indent: r.indent === undefined ? d.indent : r.indent === true,
    turn: pick(r.turn, TURN_CHOICES.map((t) => t.id), d.turn),
    margin: Math.round(clamp(r.margin, READER_LIMITS.margin, d.margin)),
    dim: Math.round(clamp(r.dim, READER_LIMITS.dim, d.dim) * 100) / 100,
    keepAwake: r.keepAwake === true,
    autoHide: r.autoHide === true,
  };
}
