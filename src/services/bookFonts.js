import { Platform } from 'react-native';
import * as Font from 'expo-font';
import { Directory, File, Paths } from 'expo-file-system';

const webUris = new Map();

export const bookFonts = {
  async save(bookId, font) {
    const family = `book_${bookId}`;

    if (Platform.OS === 'web') {
      const type = font.ext === 'otf' ? 'font/otf' : 'font/ttf';
      webUris.set(family, URL.createObjectURL(new Blob([font.bytes], { type })));
      return { customFont: family, fontPath: null, fontLabel: font.family };
    }

    const dir = new Directory(Paths.document, 'fonts', bookId);
    dir.create({ idempotent: true, intermediates: true });
    const file = new File(dir, `font.${font.ext}`);
    file.create({ overwrite: true });
    await file.write(font.bytes);
    return { customFont: family, fontPath: `fonts/${bookId}/font.${font.ext}`, fontLabel: font.family };
  },

  async load(book) {
    const family = book?.customFont;
    if (!family) return false;
    if (Font.isLoaded(family)) return true;

    const uri = Platform.OS === 'web' ? webUris.get(family) : book.fontPath && new File(Paths.document, book.fontPath).uri;
    if (!uri) return false;

    try {
      await Font.loadAsync(family, { uri });
      return true;
    } catch {
      return false;
    }
  },
};
