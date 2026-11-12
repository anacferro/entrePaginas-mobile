import test from 'node:test';
import assert from 'node:assert/strict';
import { dialog } from '../src/services/dialog.js';

test('dialogo: fila mostra um por vez e avanca ao fechar', () => {
  const seen = [];
  const off = dialog.subscribe((item) => seen.push(item?.title ?? null));
  dialog.alert('Primeiro', 'a');
  dialog.alert('Segundo', 'b', [{ text: 'Ok' }]);
  assert.deepEqual(seen, [null, 'Primeiro']);
  dialog.dismiss();
  assert.equal(seen.at(-1), 'Segundo');
  dialog.dismiss();
  assert.equal(seen.at(-1), null);
  off();
});
