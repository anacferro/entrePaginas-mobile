import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORIES } from '../theme/bookOptions';

const KEY = '@entre_paginas_categories_v1';

async function save(list) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

export const categories = {
  async list() {
    try {
      const json = await AsyncStorage.getItem(KEY);
      const saved = json ? JSON.parse(json) : null;
      return Array.isArray(saved) ? saved : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },

  async add(name) {
    const clean = name.trim().slice(0, 30);
    const current = await this.list();
    if (!clean || current.some(c => c.toLowerCase() === clean.toLowerCase())) return current;
    return save([...current, clean]);
  },

  async remove(name) {
    const current = await this.list();
    return save(current.filter(c => c !== name));
  },
};
