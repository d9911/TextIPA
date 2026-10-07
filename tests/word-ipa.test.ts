import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ipaWords, readingTokens, validWordIpa, validateWordIpa, displayWordIpa } from '../src/domain/word-ipa.ts';
import { validateProject, validateLibrary, projectFromText } from '../src/domain/library.ts';
import { emptyLibrary } from '../src/domain/preferences.ts';
import { phraseVersion, projectColumns } from '../src/domain/columns.ts';

test('word annotation tokens preserve original punctuation, whitespace, contractions and numbers', () => {
  const text = 'Hello,  don’t go — 3.14 metres!\nПривет.';
  assert.equal(
    readingTokens(text)
      .map((token) => token.text)
      .join(''),
    text,
  );
  assert.deepEqual(ipaWords(text), ['Hello,', 'don’t', 'go', '3.14', 'metres!', 'Привет.']);
  const wordIpa = ipaWords(text).map((word) => ({ word, ipa: '[a]' }));
  assert.deepEqual(validateWordIpa(wordIpa, text), wordIpa);
  assert.ok(validWordIpa({ text, ipa: '[a]', ipaStatus: 'draft', wordIpa }));
  assert.equal(validWordIpa({ text: 'Changed.', ipa: '[a]', ipaStatus: 'draft', wordIpa }), false);
  assert.throws(() => validateWordIpa(wordIpa.slice(1), text), /INVALID_FILE/);
  assert.throws(() => validateWordIpa([{ word: 'wrong', ipa: '[a]' }], 'Hello.'), /INVALID_FILE/);
});

test('legacy sentence IPA keeps its symbols and only supplies unambiguous word segments', () => {
  const version = { text: 'Hola a todos.', ipa: '[ˈola a ˈtoðos]', ipaStatus: 'draft' as const };
  assert.deepEqual(displayWordIpa(version), [
    { word: 'Hola', ipa: '[ˈola]' },
    { word: 'a', ipa: '[a]' },
    { word: 'todos.', ipa: '[ˈtoðos]' },
  ]);
  assert.equal(version.ipa, '[ˈola a ˈtoðos]');
  assert.equal(displayWordIpa({ ...version, ipa: '[ˈola atoðos]' }), undefined);
  assert.equal(displayWordIpa({ ...version, ipa: 'not bracketed' }), undefined);
  const explicit = [
    { word: 'Hola', ipa: '[custom]' },
    { word: 'a', ipa: '[a]' },
    { word: 'todos.', ipa: '[custom]' },
  ];
  assert.deepEqual(displayWordIpa({ ...version, wordIpa: explicit }), explicit);
});

test('example annotations survive import for every language and reject stale word associations', () => {
  const sample = validateProject(JSON.parse(readFileSync(new URL('../examples/kolobok-es-ru.json', import.meta.url), 'utf8')));
  for (const phrase of sample.phrases) for (const code of projectColumns(sample)) assert.ok(validWordIpa(phraseVersion(sample, phrase, code)));
  const library = emptyLibrary();
  library.projects = [sample];
  library.activeId = sample.id;
  library.settings.ipaDisplay = 'line';
  assert.deepEqual(validateLibrary(JSON.parse(JSON.stringify(library))), library);
  const old = JSON.parse(JSON.stringify(library));
  delete old.settings.ipaDisplay;
  assert.equal(validateLibrary(old).settings.ipaDisplay, 'above');
  const stale = structuredClone(sample);
  stale.phrases[0]!.text = 'Texto diferente.';
  assert.throws(() => validateProject(stale), /INVALID_FILE/);
  const legacy = projectFromText('Legacy', 'Hola.', 'es');
  legacy.phrases[0]!.ipa = '[ˈola]';
  assert.equal(validWordIpa(validateProject(legacy).phrases[0]!), false);
});
