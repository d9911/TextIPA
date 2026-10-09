import test from 'node:test';
import assert from 'node:assert/strict';
import { readerCommand } from '../src/app/reader-keys.ts';
const event = (key: string, code = '') => ({ key, code, altKey: false, ctrlKey: false, metaKey: false, isComposing: false, repeat: false });
test('navigation accepts arrows and English or Russian letters in either case', () => {
  for (const key of ['ArrowLeft', 'ArrowUp', 'a', 'w', 'ф', 'ц']) {
    assert.equal(readerCommand(event(key)), 'previous');
    assert.equal(readerCommand(event(key.toUpperCase())), 'previous');
  }
  for (const key of ['ArrowRight', 'ArrowDown', 's', 'd', 'ы', 'в']) {
    assert.equal(readerCommand(event(key)), 'next');
    assert.equal(readerCommand(event(key.toUpperCase())), 'next');
  }
  for (const key of ['<', ',', 'б', 'Б', 'Home']) assert.equal(readerCommand(event(key)), 'first');
  for (const key of ['>', '.', 'ю', 'Ю', 'End']) assert.equal(readerCommand(event(key)), 'last');
  for (const key of ['p', 'P', 'з', 'З', ' ']) assert.equal(readerCommand(event(key)), 'toggle');
});
test('physical keys work in other layouts and held pause keys do not repeatedly toggle', () => {
  assert.equal(readerCommand(event('é', 'KeyW')), 'previous');
  assert.equal(readerCommand(event('ж', 'Period')), 'last');
  assert.equal(readerCommand({ ...event('P', 'KeyP'), repeat: true }), null);
  assert.equal(readerCommand({ ...event(' ', 'Space'), repeat: true }), null);
  assert.equal(readerCommand({ ...event('a'), repeat: true }), 'previous');
});
test('system shortcuts, composition and unrelated letters are left alone', () => {
  for (const field of ['altKey', 'ctrlKey', 'metaKey', 'isComposing']) assert.equal(readerCommand({ ...event('p', 'KeyP'), [field]: true }), null);
  assert.equal(readerCommand(event('x', 'KeyX')), null);
});
