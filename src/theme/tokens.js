export const fonts = {
  heading: 'Lora_700Bold',
  headingMedium: 'Lora_600SemiBold',
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const type = {
  title: { fontSize: 24, lineHeight: 30, fontFamily: fonts.heading },
  heading: { fontSize: 18, lineHeight: 24, fontFamily: fonts.heading },
  subheading: { fontSize: 15, lineHeight: 20, fontFamily: fonts.headingMedium },
  body: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
  number: { fontSize: 24, lineHeight: 28, fontFamily: fonts.heading },
};

export const layout = {
  maxWidth: 760,
  minTouch: 44,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const motion = {
  fast: 150,
  base: 220,
};
