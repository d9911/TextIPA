import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLibrary, defaultSettings } from '../src/domain/preferences.ts';
import { projectFromText, validateLibrary, validateProject, decodeImport, durationMs, mergeProjects, exportMarkdown } from '../src/domain/library.ts';
import { phraseVersion } from '../src/domain/columns.ts';

test('directions survive project import, translation selection and library backups independently from speech', () => {
  const project = projectFromText('Recording', 'Добрый день.', 'ru');
  project.columnLanguages = ['ru', 'es'];
  const phrase = project.phrases[0]!;
  phrase.stageDirection = 'Показать наклейку с моделью';
  phrase.translations = { es: { text: 'Buenos días.', ipa: '', ipaStatus: 'empty', stageDirection: 'Mostrar la etiqueta del modelo' } };
  const imported = decodeImport(JSON.stringify(project), 'recording.json', 'ru')[0]!;
  assert.equal(imported.phrases[0]!.stageDirection, phrase.stageDirection);
  assert.equal(phraseVersion(imported, imported.phrases[0]!, 'es').stageDirection, 'Mostrar la etiqueta del modelo');
  assert.equal(phraseVersion(imported, imported.phrases[0]!, 'es').text, 'Buenos días.');
  assert.equal(durationMs(imported.phrases[0]!.text, 120, 1000), 2000);
  const library = emptyLibrary();
  library.projects = [project];
  library.activeId = project.id;
  library.settings.stageDirectionColor = '#ff9900';
  assert.deepEqual(validateLibrary(JSON.parse(JSON.stringify(library))), library);
});
test('legacy settings get a default cue color; invalid colors cannot enter a style property', () => {
  const legacy = JSON.parse(JSON.stringify(emptyLibrary()));
  delete legacy.settings.stageDirectionColor;
  assert.equal(validateLibrary(legacy).settings.stageDirectionColor, defaultSettings.stageDirectionColor);
  for (const color of ['red; display:none', 'url(https://example.com)', '#xyzxyz', '#f00', 42]) {
    legacy.settings.stageDirectionColor = color;
    assert.equal(validateLibrary(legacy).settings.stageDirectionColor, defaultSettings.stageDirectionColor);
  }
});
test('malformed or oversized primary and translated cues reject the import', () => {
  const p = projectFromText('x', 'Hola.', 'es');
  for (const value of [42, 'x'.repeat(3001)]) {
    assert.throws(() => validateProject({ ...p, phrases: [{ ...p.phrases[0], stageDirection: value }] }), /INVALID_FILE/);
    assert.throws(
      () =>
        validateProject({
          ...p,
          phrases: [{ ...p.phrases[0], translations: { ru: { text: 'Привет.', ipa: '', ipaStatus: 'empty', stageDirection: value } } }],
        }),
      /INVALID_FILE/,
    );
  }
});

test('editing only a direction is a distinct import and Markdown keeps it outside the spoken text', () => {
  const original = projectFromText('Script', 'Hola.', 'es');
  const revised = structuredClone(original);
  revised.phrases[0]!.stageDirection = 'Mostrar la etiqueta';
  assert.equal(mergeProjects([original], [revised]).added, 1);
  assert.equal(mergeProjects([revised], [structuredClone(revised)]).added, 0);
  const markdown = exportMarkdown(revised);
  assert.ok(markdown.includes('es direction (do not read aloud)'));
  assert.ok(markdown.includes('{Mostrar la etiqueta}'));
  assert.equal(revised.phrases[0]!.text, 'Hola.');
});
