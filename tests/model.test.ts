import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { projectFromText, validateLibrary, validateProject, mergeProjects, decodeImport, durationMs, exportMarkdown } from '../src/domain/library.ts';
import { emptyLibrary } from '../src/domain/preferences.ts';
import { loadLibrary, saveLibrary, storageKey } from '../src/infrastructure/storage.ts';

test('text import preserves words, decimal measurements and distinct paragraphs', () => {
  const source = 'Hola a todos. Un cable de 3.14 metros, con dos salidas de 3.5 mm.\n\nSegundo bloque: cuesta 23,19 euros.';
  const p = projectFromText('Test', source, 'es');
  assert.equal(p.phrases.map((q) => q.text).join(' '), source.replace(/\s+/g, ' '));
  assert.deepEqual([...new Set(p.phrases.map((q) => q.block))], ['Bloque 1', 'Bloque 2']);
  assert.ok(p.phrases.some((q) => q.text.includes('3.14')));
  assert.equal(p.phrases.at(-1)?.pauseMs, 2000);
});
test('empty initial input is rejected, blank phrase drafts survive reload', () => {
  assert.throws(() => projectFromText('x', '   ', 'es'), /EMPTY_TEXT/);
  const p = projectFromText('x', 'Hola.', 'es');
  p.phrases[0]!.text = '';
  assert.equal(validateProject(p).phrases[0]!.text, '');
});
test('exact repeated imports are suppressed, changed versions preserve prior work', () => {
  const p = projectFromText('x', 'Hello.', 'en');
  p.phrases[0]!.note = 'Keep my note';
  const repeat = structuredClone(p);
  repeat.phrases[0]!.note = '';
  const same = mergeProjects([p], [repeat, repeat]);
  assert.equal(same.added, 0);
  assert.equal(same.projects[0]?.phrases[0]?.note, 'Keep my note');
  const changed = structuredClone(p);
  changed.phrases[0]!.text = 'A revised sentence.';
  const merged = mergeProjects([p], [changed]);
  assert.equal(merged.added, 1);
  assert.notEqual(merged.projects[0]?.id, merged.projects[1]?.id);
  assert.equal(merged.projects[0]?.phrases[0]?.text, 'Hello.');
});
test('backup roundtrip retains progress, notes, dialect and preferences', () => {
  const library = emptyLibrary();
  const p = projectFromText('English', 'This is a test.', 'en');
  p.dialect = 'en-US';
  p.phrases[0]!.done = true;
  p.phrases[0]!.note = 'Check th';
  p.phrases[0]!.ipa = '[ðɪs]';
  library.projects = [p];
  library.activeId = p.id;
  library.settings.locale = 'es';
  library.settings.fontSize = 32;
  assert.deepEqual(validateLibrary(JSON.parse(JSON.stringify(library))), library);
  assert.equal(decodeImport(JSON.stringify(library), 'backup.json', 'ru')[0]?.dialect, 'en-US');
});
test('malformed import rejects the complete file instead of dropping unknown records', () => {
  const p = projectFromText('x', 'Hola.', 'es');
  const q = structuredClone(p);
  q.phrases[0]!.pauseMs = -1;
  assert.throws(() => decodeImport(JSON.stringify(q), 'bad.json', 'es'), /INVALID_FILE/);
  assert.throws(() => decodeImport('{', 'bad.json', 'es'), /INVALID_FILE/);
});
test(
  'optional cable sample contains all 205 source phrases in original order',
  { skip: !existsSync(new URL('../examples/cable-es.json', import.meta.url)) },
  () => {
    const sample = validateProject(JSON.parse(readFileSync(new URL('../examples/cable-es.json', import.meta.url), 'utf8')));
    assert.equal(sample.phrases.length, 205);
    assert.equal(sample.phrases[0]?.text, 'Hola a todos.');
    assert.equal(sample.phrases[0]?.ipa, '[ˈola a ˈtoðos]');
  },
);
test('storage failure remains visible and corrupt original data is not overwritten', () => {
  const memory = new Map<string, string>([[storageKey, '{bad']]);
  const store = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: () => {
      throw new Error('quota');
    },
  };
  assert.equal(loadLibrary(store).error, true);
  assert.equal(memory.get(storageKey), '{bad');
  assert.equal(saveLibrary(store, emptyLibrary()), false);
});
test('rehearsal timing uses requested pace and pauses; Markdown escapes cells', () => {
  assert.equal(durationMs('one two three four', 120, 800, 2), 3600);
  const p = projectFromText('x', 'Hello.', 'en');
  p.phrases[0]!.note = 'a | b\nnext';
  const md = exportMarkdown(p);
  assert.ok(md.includes('a \\| b<br>next'));
  assert.ok(md.includes('Block 1'));
});

test('plain text imports respect storage limits before changing the library', () => {
  assert.throws(() => projectFromText('x', 'a'.repeat(1501), 'es'), /INVALID_FILE/);
  assert.throws(() => projectFromText('x'.repeat(201), 'Hola.', 'es'), /INVALID_FILE/);
  assert.throws(() => projectFromText('x', '# ' + 'a'.repeat(251) + '\nHola.', 'es'), /INVALID_FILE/);
  assert.equal(validateProject(projectFromText('x', 'a'.repeat(1500), 'es')).phrases[0]?.text.length, 1500);
});

test('translated examples retain both languages, edits and saved preferences through export and import', () => {
  const p = validateProject(JSON.parse(readFileSync(new URL('../examples/kolobok-es-ru.json', import.meta.url), 'utf8')));
  assert.equal(p.language, 'es');
  assert.equal(p.translationLanguage, 'ru');
  assert.ok(p.phrases.every((q) => q.translation?.trim() && q.ipa && q.ipaStatus === 'draft'));
  const library = emptyLibrary();
  library.projects = [p];
  library.activeId = p.id;
  library.settings.showTranslation = true;
  assert.deepEqual(validateLibrary(JSON.parse(JSON.stringify(library))), library);
  assert.ok(exportMarkdown(p).includes(p.phrases[0]!.translation!));
  const changed = structuredClone(p);
  changed.phrases[0]!.translation = 'Другой перевод';
  assert.equal(mergeProjects([p], [changed]).added, 1);
  const invalid = structuredClone(p);
  invalid.phrases[0]!.translation = 'x'.repeat(3001);
  assert.throws(() => validateProject(invalid), /INVALID_FILE/);
  assert.throws(() => validateProject({ ...p, translationLanguage: 'invalid_tag!' }), /INVALID_FILE/);
  const old = JSON.parse(JSON.stringify(library));
  delete old.settings.showTranslation;
  assert.equal(validateLibrary(old).settings.showTranslation, false);
});

test('multilingual scripts keep independent IPA, generic language tags and hidden versions', () => {
  const sample = validateProject(JSON.parse(readFileSync(new URL('../examples/kolobok-es-ru.json', import.meta.url), 'utf8')));
  assert.deepEqual(sample.columnLanguages, ['es', 'en', 'ru']);
  assert.ok(sample.phrases.every((q) => q.translations?.en?.text && q.translations.en.ipa && q.translations.ru?.ipa));
  const custom = projectFromText('Portuguese', 'Olá, mundo.', 'pt-BR');
  assert.equal(validateProject(custom).language, 'pt-BR');
  custom.columnLanguages = ['pt-BR', 'fr'];
  custom.phrases[0]!.translations = { fr: { text: 'Bonjour.', ipa: '[bɔ̃ʒuʁ]', ipaStatus: 'reviewed' } };
  const imported = decodeImport(JSON.stringify(custom), 'custom.json', 'ru')[0]!;
  assert.deepEqual(imported, custom);
  assert.ok(exportMarkdown(custom).includes('[bɔ̃ʒuʁ]'));
  custom.columnLanguages = ['pt-BR'];
  assert.equal(validateProject(custom).phrases[0]!.translations?.fr?.text, 'Bonjour.');
  assert.throws(() => validateProject({ ...custom, columnLanguages: ['fr', 'FR'] }), /INVALID_FILE/);
  assert.throws(() => validateProject({ ...custom, language: '../file' }), /INVALID_FILE/);
});
