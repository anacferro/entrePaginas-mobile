import { Platform, Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const FORMATS = {
  txt: { mime: 'text/plain', uti: 'public.plain-text' },
  json: { mime: 'application/json', uti: 'public.json' },
};

function fileName(book, format) {
  const base = book.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${base || 'livro'}.${format}`;
}

function toText(book) {
  const header = [book.title, book.subtitle, `Categoria: ${book.category}`].filter(Boolean).join('\n');
  const chapters = (book.chapters || [])
    .map((chapter, index) => `Capítulo ${index + 1} — ${chapter.title}\n\n${chapter.content}`)
    .join('\n\n----------\n\n');
  return `${header}\n\n==========\n\n${chapters}\n`;
}

function toJson(book) {
  return JSON.stringify(
    {
      title: book.title,
      subtitle: book.subtitle,
      category: book.category,
      totalPages: book.totalPages,
      chapters: (book.chapters || []).map(chapter => ({
        title: chapter.title,
        content: chapter.content,
        marks: chapter.marks || [],
      })),
      bookmarks: book.bookmarks || [],
    },
    null,
    2
  );
}

function downloadOnWeb(content, name, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const exporter = {
  async exportBook(book, format) {
    const info = FORMATS[format];
    if (!info) throw new Error('Formato de exportação inválido.');

    const content = format === 'json' ? toJson(book) : toText(book);
    const name = fileName(book, format);

    if (Platform.OS === 'web') {
      downloadOnWeb(content, name, info.mime);
      return;
    }

    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing-unavailable');
      const file = new File(Paths.cache, name);
      if (file.exists) file.delete();
      file.create();
      file.write(content);
      await Sharing.shareAsync(file.uri, {
        mimeType: info.mime,
        UTI: info.uti,
        dialogTitle: `Exportar ${book.title}`,
      });
    } catch {
      await Share.share({ title: name, message: content });
    }
  },
};
