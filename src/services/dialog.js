let current = null;
const listeners = new Set();
const queue = [];

function emit() {
  listeners.forEach((listener) => listener(current));
}

function next() {
  current = queue.shift() || null;
  emit();
}

export const dialog = {
  alert(title, message, buttons = []) {
    queue.push({ title, message, buttons });
    if (!current) next();
  },
  dismiss() {
    next();
  },
  subscribe(listener) {
    listeners.add(listener);
    listener(current);
    return () => listeners.delete(listener);
  },
};
