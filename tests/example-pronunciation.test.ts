import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateProject } from '../src/domain/library.ts';
import { restoreExamplePronunciation } from '../src/domain/example-pronunciation.ts';
import { validWordIpa } from '../src/domain/word-ipa.ts';

const example = validateProject(JSON.parse(readFileSync(new URL('../examples/kolobok-es-ru.json', import.meta.url), 'utf8')));
test('missing Spanish demo IPA and word annotations are restored without losing rehearsal data', () => {
  const saved = structuredClone(example);
  saved.phrases[0]!.ipa = '';
  saved.phrases[0]!.ipaStatus = 'empty';
  delete saved.phrases[0]!.wordIpa;
  delete saved.phrases[1]!.wordIpa;
  saved.phrases[0]!.note = 'My note';
  saved.phrases[0]!.done = true;
  assert.equal(restoreExamplePronunciation(saved, example), true);
  assert.equal(saved.phrases[0]!.ipa, example.phrases[0]!.ipa);
  assert.ok(saved.phrases.every(validWordIpa));
  assert.equal(saved.phrases[0]!.note, 'My note');
  assert.equal(saved.phrases[0]!.done, true);
  assert.equal(restoreExamplePronunciation(saved, example), false);
});
test('demo restoration preserves changed texts, custom/reviewed IPA, dialects and unrelated scripts', () => {
  const saved = structuredClone(example);
  saved.phrases[0]!.text = 'Edited sentence.';
  saved.phrases[0]!.ipa = '';
  delete saved.phrases[0]!.wordIpa;
  saved.phrases[1]!.ipa = '[custom]';
  delete saved.phrases[1]!.wordIpa;
  saved.phrases[2]!.ipaStatus = 'reviewed';
  delete saved.phrases[2]!.wordIpa;
  const before = structuredClone(saved);
  assert.equal(restoreExamplePronunciation(saved, example), false);
  assert.deepEqual(saved, before);
  for (const field of ['id', 'dialect'] as const) {
    const other = structuredClone(example);
    other[field] = field === 'id' ? 'another-script' : 'es-MX';
    other.phrases[0]!.ipa = '';
    assert.equal(restoreExamplePronunciation(other, example), false);
    assert.equal(other.phrases[0]!.ipa, '');
  }
});
test('Kolobok keeps all three language transcriptions when switching Spanish pronunciation', () => {
  const saved = structuredClone(example);
  const translations = structuredClone(saved.phrases.map((phrase) => phrase.translations));
  for (const dialect of ['es-419', 'es-ES'] as const) {
    saved.dialect = dialect;
    for (const phrase of saved.phrases) {
      phrase.ipa = '';
      phrase.ipaStatus = 'empty';
      delete phrase.wordIpa;
    }
    assert.equal(restoreExamplePronunciation(saved, example), true);
    for (const [index, phrase] of saved.phrases.entries()) {
      const source = example.phrases[index]!;
      assert.equal(phrase.ipa, dialect === 'es-419' ? source.ipa.replace(/θ/g, 's') : source.ipa);
      assert.ok(validWordIpa(phrase));
      assert.deepEqual(
        phrase.wordIpa,
        source.wordIpa!.map((pair) => ({ ...pair, ipa: dialect === 'es-419' ? pair.ipa.replace(/θ/g, 's') : pair.ipa })),
      );
      assert.deepEqual(phrase.translations, translations[index]);
    }
    assert.equal(restoreExamplePronunciation(saved, example), false);
  }
});
