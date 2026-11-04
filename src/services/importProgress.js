const STAGES = {
  search: { floor: 0.1, label: 'Procurando o texto...' },
  download: { floor: 0.35, label: 'Baixando o livro...' },
  process: { floor: 0.9, label: 'Organizando as páginas...' },
};

const active = new Map();
const listeners = new Set();

function emit(type, id) {
  listeners.forEach(listener => listener(type, id));
}

export const importProgress = {
  start(id) {
    active.set(id, { value: 0.05, label: STAGES.search.label });
    emit('update', id);
  },

  stage(id, name) {
    const current = active.get(id);
    const stage = STAGES[name];
    if (!current || !stage) return;
    active.set(id, { value: Math.max(current.value, stage.floor), label: stage.label });
    emit('update', id);
  },

  creep(id) {
    const current = active.get(id);
    if (!current) return;
    active.set(id, { ...current, value: Math.min(0.88, current.value + (0.88 - current.value) * 0.06) });
    emit('update', id);
  },

  finish(id) {
    active.delete(id);
    emit('finish', id);
  },

  get(id) {
    return active.get(id) || null;
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
