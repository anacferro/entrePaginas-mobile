import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_BOOKS, INITIAL_USER } from './mockData';
import { relocateMarks } from './marks';
import { cloud } from './cloud';

let userId = null;

const keyFor = (name) => `@entre_paginas_${name}_v1${userId ? `_${userId}` : ''}`;

const KEYS = {
  get BOOKS() { return userId ? keyFor('books') : '@entre_paginas_books_v1'; },
  get USER() { return userId ? keyFor('user') : '@entre_paginas_user_v1'; },
  get SIMULATE_ERROR() { return userId ? keyFor('simulate_error') : '@entre_paginas_simulate_error'; },
};

async function saveBooks(list) {
  await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(list));
  cloud.schedule(list);
}

function logChange(book, type, chapterTitle, before, after) {
  if (book.isOwn !== false) return;
  book.changeLog = [
    {
      id: `change-${Date.now()}`,
      type,
      chapterTitle,
      before: before ? { title: before.title, content: before.content } : null,
      after: after ? { title: after.title, content: after.content } : null,
      date: new Date().toISOString(),
    },
    ...(book.changeLog || []),
  ];
}

function profileFor(authUser) {
  if (!authUser) return INITIAL_USER;
  return {
    readerTheme: INITIAL_USER.readerTheme,
    fontSize: INITIAL_USER.fontSize,
    name: authUser.displayName || authUser.email.split('@')[0],
    email: authUser.email,
  };
}

export const storage = {
  setUser(uid) {
    userId = uid || null;
    if (!uid) cloud.reset();
  },

  async syncFromCloud() {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const local = json ? JSON.parse(json) : [];
    const merged = await cloud.pullAndMerge(local);
    await saveBooks(merged);
  },

  /**
   * Inicializa o armazenamento local caso ainda esteja vazio.
   */
  async init(authUser) {
    try {
      const stored = await AsyncStorage.getItem(KEYS.BOOKS);
      if (!stored) {
        await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(authUser ? [] : INITIAL_BOOKS));
      }
      const user = await AsyncStorage.getItem(KEYS.USER);
      if (!user) {
        await AsyncStorage.setItem(KEYS.USER, JSON.stringify(profileFor(authUser)));
      }
    } catch (e) {
      console.error('Erro ao inicializar AsyncStorage:', e);
    }
  },

  /**
   * Retorna os livros da Estante (status = 'estante').
   * Permite simulação de atraso e erro para fins avaliativos de UI.
   */
  async getBooks(delayMs = 400) {
    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }

    const simError = await this.getSimulateError();
    if (simError) {
      throw new Error('Falha simulada na leitura dos dados locais. Tente novamente.');
    }

    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : INITIAL_BOOKS;
    return list.filter(b => b.status === 'estante');
  },

  /**
   * Retorna os livros arquivados no Baú (status = 'bau').
   */
  async getChestBooks(delayMs = 400) {
    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }

    const simError = await this.getSimulateError();
    if (simError) {
      throw new Error('Falha simulada ao carregar o Baú Literário.');
    }

    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : INITIAL_BOOKS;
    return list.filter(b => b.status === 'bau');
  },

  /**
   * Busca um livro por ID (para o leitor e detalhes).
   */
  async getBookById(id) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : INITIAL_BOOKS;
    return list.find(b => b.id === id) || null;
  },

  /**
   * Adiciona um novo livro à estante com persistência local.
   */
  async addBook(bookData) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];

    const newBook = {
      id: `book-${Date.now()}`,
      title: bookData.title?.trim() || 'Nova Obra Sem Título',
      subtitle: bookData.subtitle?.trim() || 'Obra artesanal recém-encadernada',
      category: bookData.category || 'Geral',
      tags: bookData.tags || [],
      coverColor: bookData.coverColor || '#215C50',
      titleColor: bookData.titleColor || '#FFFFFF',
      paperColor: bookData.paperColor || '#F4EAE0',
      totalPages: bookData.totalPages || Math.floor(Math.random() * 80) + 12,
      status: 'estante',
      isOwn: bookData.isOwn !== false,
      bookmarks: [],
      changeLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: bookData.chapters && bookData.chapters.length > 0 ? bookData.chapters : [
        {
          id: `chap-${Date.now()}-1`,
          title: 'Primeiras Linhas',
          content: bookData.initialContent || 'Aqui começa a encadernação deste livro. As páginas em branco acolhem as ideias recém-nascidas do leitor e do autor.'
        }
      ]
    };

    list.unshift(newBook);
    await saveBooks(list);
    return newBook;
  },

  async updateBook(bookId, updates) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    book.title = updates.title?.trim() || book.title;
    book.subtitle = updates.subtitle?.trim() || book.subtitle;
    book.category = updates.category || book.category;
    if (updates.tags) book.tags = updates.tags;
    book.coverColor = updates.coverColor || book.coverColor;
    book.titleColor = updates.titleColor || book.titleColor;
    book.paperColor = updates.paperColor || book.paperColor;
    book.updatedAt = new Date().toISOString();
    await saveBooks(list);
    return book;
  },

  async setBookLocked(bookId, locked) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    book.locked = !!locked;
    book.updatedAt = new Date().toISOString();
    await saveBooks(list);
    return book;
  },

  async addChapter(bookId, chapterData) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    const newChapter = {
      id: `chap-${Date.now()}`,
      title: chapterData.title?.trim() || `Capítulo ${book.chapters.length + 1}`,
      content: chapterData.content || '',
      photo: chapterData.photo || null,
    };

    book.chapters.push(newChapter);
    logChange(book, 'add', newChapter.title, null, newChapter);
    book.updatedAt = new Date().toISOString();
    await saveBooks(list);
    return book;
  },

  async updateChapter(bookId, chapterId, updates) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    const chapter = book?.chapters.find(c => c.id === chapterId);
    if (!chapter) return null;

    const before = { title: chapter.title, content: chapter.content, photo: chapter.photo };
    chapter.title = updates.title?.trim() || chapter.title;
    chapter.content = updates.content ?? chapter.content;
    if ('photo' in updates) chapter.photo = updates.photo;

    const photoChanged = (before.photo || null) !== (chapter.photo || null);
    if (before.title === chapter.title && before.content === chapter.content && !photoChanged) {
      return book;
    }

    chapter.marks = relocateMarks(chapter.marks, chapter.content);
    logChange(book, 'edit', chapter.title, before, chapter);
    book.updatedAt = new Date().toISOString();
    await saveBooks(list);
    return book;
  },

  async moveChapter(bookId, chapterId, direction) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    const from = book.chapters.findIndex(c => c.id === chapterId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= book.chapters.length) return book;

    const [chapter] = book.chapters.splice(from, 1);
    book.chapters.splice(to, 0, chapter);
    logChange(book, 'move', chapter.title, { title: `Posição ${from + 1}` }, { title: `Posição ${to + 1}` });
    book.updatedAt = new Date().toISOString();
    await saveBooks(list);
    return book;
  },

  async deleteChapter(bookId, chapterId) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    const removed = book.chapters.find(c => c.id === chapterId);
    book.chapters = book.chapters.filter(c => c.id !== chapterId);
    book.bookmarks = (book.bookmarks || []).filter(bm => bm.chapterId !== chapterId);
    if (removed) logChange(book, 'delete', removed.title, removed, null);
    book.updatedAt = new Date().toISOString();
    await saveBooks(list);
    return book;
  },

  async updateChapterMarks(bookId, chapterId, marks) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    const chapter = book?.chapters.find(c => c.id === chapterId);
    if (!chapter) return null;

    chapter.marks = marks;
    await saveBooks(list);
    return book;
  },

  async addBookmark(bookId, bookmarkData) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    book.bookmarks = [
      ...(book.bookmarks || []).filter(bm => bm.chapterId !== bookmarkData.chapterId),
      {
        id: `pin-${Date.now()}`,
        chapterId: bookmarkData.chapterId,
        title: bookmarkData.title?.trim() || 'Marcador',
        color: bookmarkData.color,
        page: bookmarkData.page,
        createdAt: new Date().toISOString(),
      },
    ];
    await saveBooks(list);
    return book;
  },

  async removeBookmark(bookId, bookmarkId) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const book = list.find(b => b.id === bookId);
    if (!book) return null;

    book.bookmarks = (book.bookmarks || []).filter(bm => bm.id !== bookmarkId);
    await saveBooks(list);
    return book;
  },

  /**
   * Move um livro para o Baú.
   */
  async moveToChest(id) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const index = list.findIndex(b => b.id === id);
    if (index !== -1) {
      list[index].status = 'bau';
      list[index].updatedAt = new Date().toISOString();
      await saveBooks(list);
    }
    return list;
  },

  /**
   * Restaura um livro do Baú de volta para a Estante.
   */
  async restoreFromChest(id) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const index = list.findIndex(b => b.id === id);
    if (index !== -1) {
      list[index].status = 'estante';
      list[index].updatedAt = new Date().toISOString();
      await saveBooks(list);
    }
    return list;
  },

  /**
   * Restaura todos os livros do Baú de volta para a Estante.
   */
  async restoreAllFromChest() {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    list.forEach(b => {
      if (b.status === 'bau') {
        b.status = 'estante';
        b.updatedAt = new Date().toISOString();
      }
    });
    await saveBooks(list);
    return list;
  },

  /**
   * Esvazia o Baú (exclui definitivamente os livros arquivados).
   */
  async emptyChest() {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const remaining = list.filter(b => b.status !== 'bau');
    await saveBooks(remaining);
    return remaining;
  },

  /**
   * Exclusão definitiva de um livro específico.
   */
  async deleteBookPermanently(id) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const filtered = list.filter(b => b.id !== id);
    await saveBooks(filtered);
    return filtered;
  },

  /**
   * Perfil do usuário e preferências
   */
  async getUserProfile() {
    const json = await AsyncStorage.getItem(KEYS.USER);
    return json ? JSON.parse(json) : INITIAL_USER;
  },

  async updateUserProfile(updates) {
    const current = await this.getUserProfile();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(updated));
    return updated;
  },

  /**
   * Utilitários de controle para simulação de estados (Erro / Vazio)
   */
  async setSimulateError(flag) {
    await AsyncStorage.setItem(KEYS.SIMULATE_ERROR, JSON.stringify(!!flag));
  },

  async getSimulateError() {
    const val = await AsyncStorage.getItem(KEYS.SIMULATE_ERROR);
    return val ? JSON.parse(val) : false;
  },

  /**
   * Limpar toda a estante (para testar estado vazio)
   */
  async clearAllBooks() {
    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify([]));
  },

  /**
   * Redefinir para o estado padrão inicial
   */
  async resetToDefaults() {
    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(INITIAL_BOOKS));
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(INITIAL_USER));
    await AsyncStorage.setItem(KEYS.SIMULATE_ERROR, JSON.stringify(false));
  }
};
