import { Platform } from 'react-native';

export const COVER_COLORS = [
  { label: 'Clean', color: '#D9C8B5' },
  { label: 'Floresta', color: '#244C3A' },
  { label: 'Oliva', color: '#527A5B' },
  { label: 'Vinho', color: '#7A2E26' },
  { label: 'Marinho', color: '#1F3347' },
  { label: 'Madeira', color: '#6B4A32' },
];

export const TITLE_COLORS = [
  { label: 'Castanho', color: '#332722' },
  { label: 'Bege', color: '#EFE7DC' },
  { label: 'Sálvia', color: '#A8B99A' },
  { label: 'Off-white', color: '#FAF8F1' },
];

export const PAPER_COLORS = [
  { label: 'Comum', color: '#F4EAE0' },
  { label: 'Escuro', color: '#22201E' },
  { label: 'Mofo', color: '#DCD4C5' },
  { label: 'Pergaminho', color: '#EFE2C4' },
];

export const DEFAULT_COVER_COLOR = '#244C3A';
export const DEFAULT_TITLE_COLOR = '#FAF8F1';
export const DEFAULT_PAPER_COLOR = '#F4EAE0';

export const BOOK_FONTS = [
  { id: 'serif', label: 'Serifada' },
  { id: 'sans', label: 'Sem serifa' },
  { id: 'mono', label: 'Máquina de escrever' },
];

const FONT_FAMILIES = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
  sans: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'system-ui, sans-serif' }),
  mono: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'Courier New, monospace' }),
};

export const fontFamilyFor = (id) => FONT_FAMILIES[id] || FONT_FAMILIES.serif;

export function isDarkColor(hex) {
  const value = (hex || '').replace('#', '');
  if (value.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.45;
}

export const DEFAULT_CATEGORIES = ['Literatura', 'Memórias', 'Filosofia'];

export const CATEGORIES = DEFAULT_CATEGORIES;
