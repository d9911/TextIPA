import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLibrary, preferredLocale } from '../src/domain/preferences.ts';
import { loadLibrary, storageKey } from '../src/infrastructure/storage.ts';
import { filterSounds, searchSounds, sounds } from '../src/features/pronunciation/sounds.ts';
test('first-run theme follows the system and locale follows supported browser preferences', () => {
  assert.equal(emptyLibrary().settings.theme, 'system');
  assert.equal(preferredLocale(['fr-FR', 'es-ES', 'en-US']), 'es');
  assert.equal(preferredLocale(['en-GB', 'ru-RU']), 'en');
  assert.equal(preferredLocale(['RU-ru']), 'ru');
  assert.equal(preferredLocale(['de-DE']), 'ru');
});
test('saved explicit choices take precedence over browser preferences', () => {
  const saved = emptyLibrary(['ru']);
  saved.settings.theme = 'dark';
  const store = { getItem: (key: string) => (key === storageKey ? JSON.stringify(saved) : null), setItem() {} };
  const result = loadLibrary(store, ['en']);
  assert.equal(result.library.settings.locale, 'ru');
  assert.equal(result.library.settings.theme, 'dark');
  assert.equal(loadLibrary({ getItem: () => null, setItem() {} }, ['es-MX']).library.settings.locale, 'es');
});
test('sound help separates languages and searches symbols, spelling and Russian hints', () => {
  assert.ok(filterSounds('es', 'ɲ').some((s) => s.spelling === 'ñ'));
  assert.ok(filterSounds('es', 'раскатистое').some((s) => s.symbol === 'r'));
  assert.ok(filterSounds('en', 'sheep').some((s) => s.symbol === 'iː'));
  assert.equal(filterSounds('es', 'sheep').length, 0);
  assert.equal(filterSounds('en', 'no-such-symbol').length, 0);
  assert.equal(new Set(sounds.map((s) => s.symbol)).size, sounds.length);
  for (const entry of sounds) for (const language of ['ru', 'en', 'es'] as const) assert.ok(entry.tip[language].trim());
});

test('old backups get an independent IPA size without losing text size, notes or preferences', () => {
  const saved = emptyLibrary(['es']);
  saved.settings.fontSize = 33;
  const legacy = JSON.parse(JSON.stringify(saved));
  delete legacy.settings.ipaFontSize;
  const store = { getItem: () => JSON.stringify(legacy), setItem() {} };
  const restored = loadLibrary(store, ['ru']).library;
  assert.equal(restored.settings.fontSize, 33);
  assert.equal(restored.settings.ipaFontSize, 28);
  assert.equal(restored.settings.locale, 'es');
  legacy.settings.ipaFontSize = 999;
  assert.equal(loadLibrary(store).library.settings.ipaFontSize, 48);
});

test('phrase following is opt-in, survives saved settings and defaults off in old backups', () => {
  const saved = emptyLibrary();
  assert.equal(saved.settings.scrollToPhrase, false);
  saved.settings.scrollToPhrase = true;
  const store = { getItem: () => JSON.stringify(saved), setItem() {} };
  assert.equal(loadLibrary(store).library.settings.scrollToPhrase, true);
  const legacy = JSON.parse(JSON.stringify(saved));
  delete legacy.settings.scrollToPhrase;
  assert.equal(loadLibrary({ getItem: () => JSON.stringify(legacy), setItem() {} }).library.settings.scrollToPhrase, false);
});

test('shared guide includes b and searches all language examples independently of hint language', () => {
  const b = searchSounds('vaca').find((entry) => entry.symbol === 'b');
  assert.ok(b);
  assert.match(b.example, /был/);
  assert.match(b.example, /book/);
  assert.equal(searchSounds('').length, sounds.length);
  assert.ok(searchSounds('палатализация').some((entry) => entry.symbol === 'ʲ'));
});

test('legacy shell preferences default to a pinned header and expanded sidebar; explicit choices persist', () => {
  const legacy = { ...emptyLibrary(), settings: { locale: 'ru', scrollToPhrase: true } };
  const restore = () => loadLibrary({ getItem: () => JSON.stringify(legacy), setItem() {} }).library;
  assert.equal(restore().settings.headerSticky, true);
  assert.equal(restore().settings.sidebarCollapsed, false);
  legacy.settings = { ...legacy.settings, headerSticky: false, sidebarCollapsed: true } as typeof legacy.settings;
  assert.equal(restore().settings.headerSticky, false);
  assert.equal(restore().settings.sidebarCollapsed, true);
});
