export const READER_THEMES = [
  { id: 'claro', label: 'Claro', background: '#FAF8F1', text: '#2B2823', muted: '#6B665B', bar: '#F3EFE2', dark: false },
  { id: 'creme', label: 'Creme', background: '#E9E2D0', text: '#2E281D', muted: '#675E49', bar: '#DDD5BF', dark: false },
  { id: 'verde', label: 'Verde', background: '#DCE5D3', text: '#1F2D24', muted: '#4B5F4C', bar: '#CFDBC5', dark: false },
  { id: 'escuro', label: 'Escuro', background: '#11201A', text: '#E4EADF', muted: '#9FB0A3', bar: '#17291F', dark: true },
];

export const readerThemeOf = (id) => READER_THEMES.find((t) => t.id === id) || null;
