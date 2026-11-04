const covers = {
  clean: '#D9C8B5',
  floresta: '#215C50',
  musgo: '#4C6044',
  vinho: '#7A2E26',
  marinho: '#1F3347',
  ambar: '#9E6219',
  castanho: '#5C4033',
  grafite: '#2C3539',
};

export const lightColors = {
  background: '#E9E2D0',
  surface: '#FBF7EC',
  surfaceSoft: '#EFE9D9',
  surfaceWarm: '#FBF7EC',
  surfaceMuted: '#EBE4D1',
  card: '#FBF7EC',
  border: '#B5AA8F',
  borderLight: '#D9CFB8',

  primary: '#0F5A40',
  primaryDark: '#0A3F2D',
  primaryLight: '#D9EEE2',
  onPrimary: '#FFFFFF',

  secondary: '#9A6B0C',
  secondaryLight: '#EBE4D1',
  accentPeach: '#F2A68D',
  accentGold: '#9A6B0C',

  text: '#14231C',
  textSecondary: '#51625A',
  textMuted: '#51625A',
  textLight: '#FDFCFA',
  onDark: '#FFFFFF',

  success: '#217A50',
  successLight: '#E3F4EC',
  successBorder: '#B7DDB9',
  warning: '#C25A00',
  warningLight: '#FBF1DF',
  warningText: '#7A5615',
  warningBorder: '#F0CF9A',
  danger: '#D1544F',
  dangerLight: '#FBE5E4',
  dangerBorder: '#F0C4BA',

  diffAdd: '#BFE5C1',
  diffRemove: '#F8C9C4',
  formats: {
    pdf: { bg: '#FDECEA', fg: '#C62828' },
    epub: { bg: '#FFF3E0', fg: '#BF4A00' },
    txt: { bg: '#E3F2FD', fg: '#1565C0' },
    json: { bg: '#EDE7F6', fg: '#512DA8' },
  },

  hero: ['#0B3B2C', '#18694A'],
  heroText: '#FFFFFF',
  heroTextMuted: 'rgba(255,255,255,0.82)',
  heroSpines: ['#AE472F', '#E0AE5C', '#F4EAE0', '#7A2E26', '#4C6044'],

  statusBar: 'dark-content',
  overlay: 'rgba(0,0,0,0.5)',
  covers,
  reader: {
    background: '#E9E2D0',
    text: '#2B2523',
    card: '#FBF7EC',
  },
};

export const darkColors = {
  background: '#060A16',
  surface: '#0F1830',
  surfaceSoft: '#16244A',
  surfaceWarm: '#0F1830',
  surfaceMuted: '#16244A',
  card: '#0F1830',
  border: '#3D5283',
  borderLight: '#2A3A66',

  primary: '#5FE3A1',
  primaryDark: '#B8F2D6',
  primaryLight: '#123A2C',
  onPrimary: '#04140D',

  secondary: '#F2B632',
  secondaryLight: '#16244A',
  accentPeach: '#F2A68D',
  accentGold: '#F2B632',

  text: '#F4F7FF',
  textSecondary: '#A9B8DA',
  textMuted: '#A9B8DA',
  textLight: '#FDFCFA',
  onDark: '#FFFFFF',

  success: '#4CD08C',
  successLight: '#0E2B24',
  successBorder: '#3C6A40',
  warning: '#F29A4B',
  warningLight: '#3A2F1C',
  warningText: '#E8C27A',
  warningBorder: '#6B5527',
  danger: '#FF8C87',
  dangerLight: '#3A1C26',
  dangerBorder: '#6E3B36',

  diffAdd: '#2F5A33',
  diffRemove: '#6A332E',
  formats: {
    pdf: { bg: '#3D2421', fg: '#F2877D' },
    epub: { bg: '#3A2D1C', fg: '#F0A45C' },
    txt: { bg: '#1E2F3F', fg: '#7DB8EE' },
    json: { bg: '#2E2640', fg: '#B8A0F0' },
  },

  hero: ['#04100B', '#0E3A29'],
  heroText: '#FFFFFF',
  heroTextMuted: 'rgba(255,255,255,0.82)',
  heroSpines: ['#E58F79', '#E0AE5C', '#EFE9E2', '#B5574B', '#6E8A63'],

  statusBar: 'light-content',
  overlay: 'rgba(0,0,0,0.65)',
  covers,
  reader: {
    background: '#060A16',
    text: '#DDD5CD',
    card: '#0F1830',
  },
};
