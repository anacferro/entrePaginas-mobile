import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_BOOKS, INITIAL_USER } from './mockData';

const KEYS = {
  BOOKS: '@entre_paginas_books_v1',
  USER: '@entre_paginas_user_v1',
  SIMULATE_ERROR: '@entre_paginas_simulate_error',
};

export const storage = {
  /**
   * Inicializa o armazenamento local caso ainda esteja vazio.
   */
  async init() {
    try {
      const stored = await AsyncStorage.getItem(KEYS.BOOKS);
      if (!stored) {
        await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(INITIAL_BOOKS));
      }
      const user = await AsyncStorage.getItem(KEYS.USER);
      if (!user) {
        await AsyncStorage.setItem(KEYS.USER, JSON.stringify(INITIAL_USER));
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
      coverColor: bookData.coverColor || '#215C50',
      titleColor: bookData.titleColor || '#FFFFFF',
      paperColor: bookData.paperColor || '#F4EAE0',
      totalPages: bookData.totalPages || Math.floor(Math.random() * 80) + 12,
      status: 'estante',
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
    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(list));
    return newBook;
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
      await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(list));
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
      await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(list));
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
    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(list));
    return list;
  },

  /**
   * Esvazia o Baú (exclui definitivamente os livros arquivados).
   */
  async emptyChest() {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const remaining = list.filter(b => b.status !== 'bau');
    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(remaining));
    return remaining;
  },

  /**
   * Exclusão definitiva de um livro específico.
   */
  async deleteBookPermanently(id) {
    const json = await AsyncStorage.getItem(KEYS.BOOKS);
    const list = json ? JSON.parse(json) : [...INITIAL_BOOKS];
    const filtered = list.filter(b => b.id !== id);
    await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(filtered));
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
